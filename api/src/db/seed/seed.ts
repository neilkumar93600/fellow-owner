import { fileURLToPath } from 'node:url';
import {
  CLICK_PLATFORMS,
  type ClickPlatform,
  COMMUNITY_ICONS,
  LIMITS,
  linkSchema,
  PITCH_STATUSES,
  PITCH_TYPES,
  POST_STATUSES,
  POST_TYPES,
  PROMOTION_PLATFORMS,
  platformEntrySchema,
  promotionDraftsSchema,
  TEAM_STATUSES,
  TINTS,
  tasteProfileSchema,
} from '@fellow-owners/shared';
import { and, asc, eq, isNull, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { type DemoUsers, ensureDemoUsers } from '../../auth/demo.js';
import type { Auth } from '../../auth/index.js';
import type { Env } from '../../config/env.js';
import { HOUR_MS } from '../../lib/dates.js';
import { contentHash, sha256Hex } from '../../lib/hash.js';
import type { Logger } from '../../lib/logger.js';
import type { Repos } from '../../repositories/index.js';
import type { Db, Tx } from '../client.js';
import { user } from '../schema/auth.js';
import type { NewCommunityMemberRow } from '../schema/communities.js';
import { inbound, type NewInboundRow } from '../schema/inbound.js';
import type { NewMembershipRow } from '../schema/memberships.js';
import { type NewPostRow, posts } from '../schema/posts.js';
import type { NewClickEventRow, NewPromotionRow } from '../schema/promotions.js';
import {
  LEAD_ROLE,
  type NewCommentRow,
  type NewSignalRow,
  type NewTeamMemberRow,
} from '../schema/social.js';
import { spaces } from '../schema/spaces.js';

/**
 * The demo space seed (05 §9): `pnpm db:seed [--reanalyze]`, the daily demo reset
 * (workers/demo-reset.ts) and the lazy first-run seed behind POST /api/demo/session.
 *
 * - Loads db/seed/data/*.json (written once by generate-content.ts and committed), validates the
 *   shapes with zod and every cross reference, then rebuilds the demo space in ONE transaction:
 *   delete the `is_demo` space (cascade) and the seeded member users, insert everything again in
 *   batches. Idempotent; concurrent runs are serialized with an advisory lock.
 * - Never calls the LLM: AI fields are prefilled in the JSON, so every screen works without a key.
 *   `--reanalyze` inserts posts and pitches as pending instead and runs the analyzer.
 * - Times in the JSON are ages ("hours before the seed ran"), so the demo always looks recent.
 * - Ids are derived from the JSON keys (seedUuid), so links into the demo survive a reset.
 * - The demo users (DEMO_CREATOR_EMAIL / DEMO_FAN_EMAIL / DEMO_PASSWORD) come from
 *   ensureDemoUsers; the ~1,200 other members are plain `user` rows on a reserved .invalid
 *   domain, so nobody can ever sign in as them.
 *
 * Only type imports of the app's runtime modules at the top: callers pass db, auth, env and repos,
 * so generate-content.ts can import the schemas below without opening a database pool.
 */

// ---------------------------------------------------------------- constants

/** Seeded member users get emails on this reserved domain (RFC 2606: never deliverable). */
export const SEED_EMAIL_DOMAIN = 'members.fellow-owners.invalid';

/** pg_advisory_xact_lock key: one demo seed at a time across every API instance. */
const SEED_LOCK_KEY = 'fellow-owners:demo-seed';

/** Rows per INSERT statement (well under Postgres' 65,535 parameter limit). */
const BATCH = 500;

// ---------------------------------------------------------------- JSON shapes

const keySchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'keys are lowercase kebab-case');

/** Hours before the seed time (the JSON never stores absolute dates). */
const ageSchema = z.number().finite().min(0).max(24 * 400);

const skillSchema = z
  .string()
  .min(1)
  .max(LIMITS.membership.skills.itemMax)
  .refine((skill) => skill === skill.trim().toLowerCase(), 'skills are trimmed and lowercase');

/** The prefilled triage result (what ai/tasks/triage-item.ts would have written). */
export const seedAiSchema = z.object({
  summary: z.string().min(1).max(LIMITS.ai.summaryMax),
  category: z.string().min(1).max(30),
  fitScore: z.number().int().min(0).max(100),
  fitReason: z.string().min(1).max(LIMITS.ai.fitReasonMax),
  tags: z.array(z.string().min(1).max(40)).max(LIMITS.ai.tagsMax),
  skills: z.array(skillSchema).max(LIMITS.ai.skillsMax),
  isSpam: z.boolean(),
});

export const seedSpaceSchema = z.object({
  handle: z
    .string()
    .min(LIMITS.handle.min)
    .max(LIMITS.handle.max)
    .regex(LIMITS.handle.pattern),
  displayName: z.string().min(LIMITS.space.displayName.min).max(LIMITS.space.displayName.max),
  bio: z.string().max(LIMITS.space.bio.max).nullable(),
  /** Usually a path on the web origin (web/public/demo/mira.jpg). */
  avatarUrl: z.string().max(LIMITS.link.urlMax).nullable(),
  platforms: z.array(platformEntrySchema).max(LIMITS.space.platforms.max),
  tasteProfile: tasteProfileSchema,
  aiDailyTokenBudget: z.number().int().min(0),
  ageHours: ageSchema,
  owner: z.object({
    headline: z.string().max(LIMITS.membership.headline.max).nullable(),
    intro: z.string().max(LIMITS.membership.intro.max).nullable(),
    skills: z.array(skillSchema).max(LIMITS.membership.skills.max),
    links: z.array(linkSchema).max(LIMITS.membership.links.max),
  }),
});

export const seedCommunitySchema = z.object({
  slug: z
    .string()
    .min(LIMITS.community.slug.min)
    .max(LIMITS.community.slug.max)
    .regex(LIMITS.community.slug.pattern),
  name: z.string().min(LIMITS.community.name.min).max(LIMITS.community.name.max),
  description: z.string().max(LIMITS.community.description.max).nullable(),
  tint: z.enum(TINTS),
  icon: z.enum(COMMUNITY_ICONS),
  sortOrder: z.number().int().min(0),
});

export const seedMemberSchema = z.object({
  key: keySchema,
  name: z.string().min(LIMITS.membership.name.min).max(LIMITS.membership.name.max),
  headline: z.string().max(LIMITS.membership.headline.max).nullable(),
  intro: z.string().max(LIMITS.membership.intro.max).nullable(),
  skills: z.array(skillSchema).max(LIMITS.membership.skills.max),
  links: z.array(linkSchema).max(LIMITS.membership.links.max),
  /** Community slugs. Empty for pitch-only memberships (05 §5). */
  communities: z.array(z.string()),
  joinedAgeHours: ageSchema,
  /** `fan`: this member is the demo fan account (DEMO_FAN_EMAIL), not a seeded user. */
  demo: z.literal('fan').optional(),
});

const ageNullable = ageSchema.nullable();

export const seedTeamEntrySchema = z.object({
  member: keySchema,
  role: z
    .string()
    .min(LIMITS.post.rolesNeeded.itemMin)
    .max(LIMITS.post.rolesNeeded.itemMax),
  status: z.enum(TEAM_STATUSES),
  ageHours: ageSchema,
  decidedAgeHours: ageNullable,
});

export const seedPostSchema = z.object({
  key: keySchema,
  community: z.string(),
  /** Null: the author deleted their account ("Former member"). */
  author: keySchema.nullable(),
  type: z.enum(POST_TYPES),
  status: z.enum(POST_STATUSES),
  title: z.string().min(LIMITS.post.title.min).max(LIMITS.post.title.max),
  body: z.string().min(LIMITS.post.body.min).max(LIMITS.post.body.max),
  rolesNeeded: z
    .array(
      z.string().min(LIMITS.post.rolesNeeded.itemMin).max(LIMITS.post.rolesNeeded.itemMax),
    )
    .max(LIMITS.post.rolesNeeded.max),
  links: z.array(linkSchema).max(LIMITS.post.links.max),
  ageHours: ageSchema,
  hiddenAgeHours: ageNullable,
  deletedAgeHours: ageNullable,
  /** Team rows besides the author's own `Lead` row (added by the seed for projects). */
  team: z.array(seedTeamEntrySchema),
  signals: z.object({ use: z.array(keySchema), build: z.array(keySchema) }),
  /** Null: analysis still pending (the sweep picks it up on the first dashboard load). */
  ai: seedAiSchema.nullable(),
});

export const seedCommentSchema = z.object({
  key: keySchema,
  post: keySchema,
  author: keySchema.nullable(),
  body: z.string().min(LIMITS.comment.body.min).max(LIMITS.comment.body.max),
  ageHours: ageSchema,
  hiddenAgeHours: ageNullable,
  deletedAgeHours: ageNullable,
});

export const seedPitchSchema = z.object({
  key: keySchema,
  sender: keySchema,
  type: z.enum(PITCH_TYPES),
  status: z.enum(PITCH_STATUSES),
  subject: z.string().min(LIMITS.pitch.subject.min).max(LIMITS.pitch.subject.max),
  body: z.string().min(LIMITS.pitch.body.min).max(LIMITS.pitch.body.max),
  links: z.array(linkSchema).max(LIMITS.pitch.links.max),
  ageHours: ageSchema,
  isFiltered: z.boolean(),
  creatorReply: z.string().min(LIMITS.pitch.reply.min).max(LIMITS.pitch.reply.max).nullable(),
  repliedAgeHours: ageNullable,
  ai: seedAiSchema.nullable(),
});

const clickCountSchema = z.number().int().min(0).max(100_000);

/** Clicks of one UTC-agnostic day window (`daysAgo` 0 = the last 24 hours), per platform. */
export const seedClickDaySchema = z.object({
  daysAgo: z.number().int().min(0).max(365),
  x: clickCountSchema,
  instagram: clickCountSchema,
  linkedin: clickCountSchema,
  youtube: clickCountSchema,
  other: clickCountSchema,
});

export const seedPromotionSchema = z.object({
  key: keySchema,
  post: keySchema,
  headline: z.string().max(LIMITS.promotion.headline.max).nullable(),
  drafts: promotionDraftsSchema,
  draftErrors: z.array(z.enum(PROMOTION_PLATFORMS)),
  showcaseSlug: z
    .string()
    .min(2)
    .max(60)
    .regex(LIMITS.community.slug.pattern)
    .nullable(),
  shortCode: z
    .string()
    .regex(new RegExp(`^[0-9A-Za-z]{${LIMITS.promotion.shortCodeLength}}$`))
    .nullable(),
  createdAgeHours: ageSchema,
  publishedAgeHours: ageNullable,
  unpublishedAgeHours: ageNullable,
  clicks: z.array(seedClickDaySchema),
});

export const seedDataSchema = z.object({
  space: seedSpaceSchema,
  communities: z.array(seedCommunitySchema).min(1).max(LIMITS.community.perSpace.max),
  members: z.array(seedMemberSchema),
  posts: z.array(seedPostSchema),
  comments: z.array(seedCommentSchema),
  pitches: z.array(seedPitchSchema),
  promotions: z.array(seedPromotionSchema),
});

export type SeedAi = z.output<typeof seedAiSchema>;
export type SeedSpace = z.output<typeof seedSpaceSchema>;
export type SeedCommunity = z.output<typeof seedCommunitySchema>;
export type SeedMember = z.output<typeof seedMemberSchema>;
export type SeedTeamEntry = z.output<typeof seedTeamEntrySchema>;
export type SeedPost = z.output<typeof seedPostSchema>;
export type SeedComment = z.output<typeof seedCommentSchema>;
export type SeedPitch = z.output<typeof seedPitchSchema>;
export type SeedClickDay = z.output<typeof seedClickDaySchema>;
export type SeedPromotion = z.output<typeof seedPromotionSchema>;
export type SeedData = z.output<typeof seedDataSchema>;

/** The JSON files under db/seed/data, one per collection. */
export const SEED_FILES = [
  'space',
  'communities',
  'members',
  'posts',
  'comments',
  'pitches',
  'promotions',
] as const satisfies ReadonlyArray<keyof SeedData>;

// ---------------------------------------------------------------- validation

export class SeedDataError extends Error {
  constructor(readonly issues: string[]) {
    const shown = issues.slice(0, 25).map((issue) => `  - ${issue}`);
    if (issues.length > shown.length) shown.push(`  ... and ${issues.length - shown.length} more`);
    super(`Invalid demo seed data (db/seed/data/*.json):\n${shown.join('\n')}`);
    this.name = 'SeedDataError';
  }
}

/** Long dashes are banned from demo content (house style); plain hyphens and commas only. */
const LONG_DASH = /[–—]/;

function collectStrings(value: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectStrings(item, `${path}.${key}`, out);
  }
}

/**
 * Everything zod cannot see: unique keys, references between files, the business rules of 05
 * (no signal on your own post, teams only on projects with open roles, posting only in joined
 * communities, one promotion per post) and a coherent timeline (nobody acts before joining).
 */
export function checkSeedData(data: SeedData): string[] {
  const issues: string[] = [];
  const unique = (label: string, keys: string[]) => {
    const seen = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) issues.push(`${label}: duplicate key "${key}"`);
      seen.add(key);
    }
    return seen;
  };

  const communitySlugs = unique(
    'communities',
    data.communities.map((c) => c.slug),
  );
  unique(
    'communities (name)',
    data.communities.map((c) => c.name),
  );
  const members = new Map(data.members.map((m) => [m.key, m]));
  unique(
    'members',
    data.members.map((m) => m.key),
  );
  const fans = data.members.filter((m) => m.demo === 'fan');
  if (fans.length !== 1) issues.push(`members: exactly one demo fan expected, found ${fans.length}`);
  for (const member of data.members) {
    for (const slug of member.communities) {
      if (!communitySlugs.has(slug)) issues.push(`member ${member.key}: unknown community ${slug}`);
    }
    if (new Set(member.communities).size !== member.communities.length) {
      issues.push(`member ${member.key}: duplicate community`);
    }
    if (member.joinedAgeHours > data.space.ageHours) {
      issues.push(`member ${member.key}: joined before the space existed`);
    }
  }

  const postsByKey = new Map(data.posts.map((p) => [p.key, p]));
  unique(
    'posts',
    data.posts.map((p) => p.key),
  );
  const memberAge = (key: string) => members.get(key)?.joinedAgeHours ?? -1;
  for (const post of data.posts) {
    const where = `post ${post.key}`;
    if (!communitySlugs.has(post.community)) issues.push(`${where}: unknown community`);
    if (post.author) {
      const author = members.get(post.author);
      if (!author) issues.push(`${where}: unknown author ${post.author}`);
      else {
        if (!author.communities.includes(post.community)) {
          issues.push(`${where}: author ${post.author} has not joined ${post.community}`);
        }
        if (author.joinedAgeHours < post.ageHours) {
          issues.push(`${where}: posted before the author joined`);
        }
      }
    }
    if (post.type !== 'project' && (post.team.length > 0 || post.rolesNeeded.length > 0)) {
      issues.push(`${where}: only projects have roles and teams`);
    }
    const teamKeys = new Set<string>();
    const filled = new Set<string>();
    for (const entry of post.team) {
      if (!members.has(entry.member)) issues.push(`${where}: unknown team member ${entry.member}`);
      if (entry.member === post.author) issues.push(`${where}: the author is already Lead`);
      if (teamKeys.has(entry.member)) issues.push(`${where}: ${entry.member} twice on the team`);
      teamKeys.add(entry.member);
      if (!post.rolesNeeded.includes(entry.role)) {
        issues.push(`${where}: team role "${entry.role}" is not in rolesNeeded`);
      }
      if (entry.status === 'accepted') {
        if (filled.has(entry.role)) issues.push(`${where}: role "${entry.role}" filled twice`);
        filled.add(entry.role);
      }
      if (entry.ageHours > post.ageHours || entry.ageHours > memberAge(entry.member)) {
        issues.push(`${where}: team request by ${entry.member} predates the post or their join`);
      }
      if ((entry.status === 'requested') !== (entry.decidedAgeHours === null)) {
        issues.push(`${where}: decidedAgeHours must be set exactly when the request is decided`);
      }
      if (entry.decidedAgeHours !== null && entry.decidedAgeHours > entry.ageHours) {
        issues.push(`${where}: team decision predates the request`);
      }
    }
    for (const kind of ['use', 'build'] as const) {
      const keys = post.signals[kind];
      if (new Set(keys).size !== keys.length) issues.push(`${where}: duplicate ${kind} signal`);
      for (const key of keys) {
        if (!members.has(key)) issues.push(`${where}: unknown ${kind} signaler ${key}`);
        if (key === post.author) issues.push(`${where}: the author signals their own post`);
      }
    }
    if (post.hiddenAgeHours !== null && post.hiddenAgeHours > post.ageHours) {
      issues.push(`${where}: hidden before it was posted`);
    }
    if (post.deletedAgeHours !== null && post.deletedAgeHours > post.ageHours) {
      issues.push(`${where}: deleted before it was posted`);
    }
  }

  unique(
    'comments',
    data.comments.map((c) => c.key),
  );
  for (const comment of data.comments) {
    const where = `comment ${comment.key}`;
    const post = postsByKey.get(comment.post);
    if (!post) issues.push(`${where}: unknown post ${comment.post}`);
    else if (comment.ageHours > post.ageHours) issues.push(`${where}: predates its post`);
    if (comment.author && !members.has(comment.author)) {
      issues.push(`${where}: unknown author ${comment.author}`);
    }
    if (comment.author && memberAge(comment.author) < comment.ageHours) {
      issues.push(`${where}: written before the author joined`);
    }
  }

  unique(
    'pitches',
    data.pitches.map((p) => p.key),
  );
  for (const pitch of data.pitches) {
    const where = `pitch ${pitch.key}`;
    if (!members.has(pitch.sender)) issues.push(`${where}: unknown sender ${pitch.sender}`);
    else if (memberAge(pitch.sender) < pitch.ageHours) issues.push(`${where}: sent before joining`);
    if ((pitch.status === 'replied') !== (pitch.creatorReply !== null)) {
      issues.push(`${where}: status replied goes with a creator reply`);
    }
    if ((pitch.creatorReply === null) !== (pitch.repliedAgeHours === null)) {
      issues.push(`${where}: creatorReply and repliedAgeHours go together`);
    }
    if (pitch.repliedAgeHours !== null && pitch.repliedAgeHours > pitch.ageHours) {
      issues.push(`${where}: replied before it was sent`);
    }
    if (pitch.isFiltered && pitch.ai && !pitch.ai.isSpam) {
      issues.push(`${where}: filtered without the AI spam flag`);
    }
  }

  unique(
    'promotions',
    data.promotions.map((p) => p.key),
  );
  unique(
    'promotions (post)',
    data.promotions.map((p) => p.post),
  );
  unique(
    'promotions (showcaseSlug)',
    data.promotions.flatMap((p) => (p.showcaseSlug ? [p.showcaseSlug] : [])),
  );
  unique(
    'promotions (shortCode)',
    data.promotions.flatMap((p) => (p.shortCode ? [p.shortCode] : [])),
  );
  for (const promotion of data.promotions) {
    const where = `promotion ${promotion.key}`;
    const post = postsByKey.get(promotion.post);
    if (!post) issues.push(`${where}: unknown post ${promotion.post}`);
    else if (post.hiddenAgeHours !== null || post.deletedAgeHours !== null) {
      issues.push(`${where}: hidden or deleted posts cannot be promoted`);
    }
    const published = promotion.publishedAgeHours !== null;
    if (published && (!promotion.showcaseSlug || !promotion.shortCode)) {
      issues.push(`${where}: published promotions need a showcase slug and a short code`);
    }
    if (!published && (promotion.clicks.length > 0 || promotion.unpublishedAgeHours !== null)) {
      issues.push(`${where}: drafts have no clicks and cannot be unpublished`);
    }
    if (published) {
      const hasDraft = Object.values(promotion.drafts).some((d) => d && d.text.trim().length > 0);
      if (!hasDraft) issues.push(`${where}: publishing requires a non-empty draft`);
      const windowDays = Math.ceil((promotion.publishedAgeHours ?? 0) / 24);
      for (const day of promotion.clicks) {
        if (day.daysAgo > windowDays) issues.push(`${where}: clicks before it was published`);
      }
    }
  }

  const strings: Array<[string, string]> = [];
  collectStrings(data, 'data', strings);
  for (const [path, value] of strings) {
    if (LONG_DASH.test(value)) issues.push(`${path}: contains a long dash (use a hyphen or comma)`);
  }
  return issues;
}

/** zod shapes + cross checks; throws SeedDataError listing every problem. */
export function parseSeedData(raw: Record<keyof SeedData, unknown>): SeedData {
  const parsed = seedDataSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SeedDataError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  const issues = checkSeedData(parsed.data);
  if (issues.length > 0) throw new SeedDataError(issues);
  return parsed.data;
}

let cachedData: Promise<SeedData> | null = null;

/**
 * Reads and validates db/seed/data/*.json (cached per process). JSON module imports keep the
 * files visible to bundlers and file tracing (Vercel), and tsc copies them into dist.
 */
export function loadSeedData(): Promise<SeedData> {
  cachedData ??= (async () => {
    const [space, communities, members, postsJson, comments, pitches, promotions] =
      await Promise.all([
        import('./data/space.json', { with: { type: 'json' } }),
        import('./data/communities.json', { with: { type: 'json' } }),
        import('./data/members.json', { with: { type: 'json' } }),
        import('./data/posts.json', { with: { type: 'json' } }),
        import('./data/comments.json', { with: { type: 'json' } }),
        import('./data/pitches.json', { with: { type: 'json' } }),
        import('./data/promotions.json', { with: { type: 'json' } }),
      ]);
    return parseSeedData({
      space: space.default as unknown,
      communities: communities.default as unknown,
      members: members.default as unknown,
      posts: postsJson.default as unknown,
      comments: comments.default as unknown,
      pitches: pitches.default as unknown,
      promotions: promotions.default as unknown,
    });
  })();
  cachedData.catch(() => {
    cachedData = null;
  });
  return cachedData;
}

// ---------------------------------------------------------------- deterministic ids and times

/**
 * A stable uuid for a seed row (RFC 9562 version 8, name-based on sha256), so the same JSON key
 * gets the same id after every reset: `?item=` links and bookmarks into the demo keep working.
 */
export function seedUuid(kind: string, key: string): string {
  const hex = sha256Hex(`fellow-owners-demo:${kind}:${key}`).slice(0, 32).split('');
  hex[12] = '8';
  hex[16] = ((Number.parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** user.id of a seeded member (Better Auth ids are text). */
export function seedUserId(memberKey: string): string {
  return `seed_${memberKey}`;
}

export function seedUserEmail(memberKey: string): string {
  return `${memberKey}@${SEED_EMAIL_DOMAIN}`;
}

/** A number in [0, 1) derived from a string (stable signal times, click spread). */
function unitHash(value: string): number {
  return Number.parseInt(sha256Hex(value).slice(0, 8), 16) / 0x1_0000_0000;
}

/** mulberry32: a tiny deterministic PRNG for spreading clicks over a day. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

/** Where a click on each platform comes from (host only, like /r/:code records it). */
const REFERRERS: Record<ClickPlatform, Array<string | null>> = {
  x: ['t.co', 't.co', 't.co', null],
  instagram: ['l.instagram.com', 'l.instagram.com', null],
  linkedin: ['www.linkedin.com', 'lnkd.in', null],
  youtube: ['www.youtube.com', 'm.youtube.com', null],
  other: [null, null, 'www.google.com', 'news.ycombinator.com'],
};

/** Share of repeat visitors in the click history (visitor_hash is per visitor and day). */
const REPEAT_VISITOR_SHARE = 0.18;

// ---------------------------------------------------------------- seeding

export interface SeedDeps {
  db: Db;
  auth: Auth;
  env: Env;
  repos: Repos;
  logger: Logger;
}

export interface SeedOptions {
  /** The moment every `ageHours` is measured from (default: now). */
  now?: Date;
  /** --reanalyze: insert posts and pitches pending, without the prefilled AI fields. */
  pendingAnalysis?: boolean;
  /** Seed only when no demo space exists (first demo sign-in on a fresh database). */
  onlyIfMissing?: boolean;
  /** Pre-loaded data (tests); defaults to loadSeedData(). */
  data?: SeedData;
}

export interface SeedCounts {
  users: number;
  memberships: number;
  communities: number;
  communityMembers: number;
  posts: number;
  teamMembers: number;
  signals: number;
  comments: number;
  pitches: number;
  promotions: number;
  clickEvents: number;
}

export interface SeedResult {
  /** False when `onlyIfMissing` found a demo space already. */
  seeded: boolean;
  spaceId: string;
  handle: string;
  seededAt: Date;
  counts: SeedCounts | null;
  ms: number;
}

const EMPTY_COUNTS: SeedCounts = {
  users: 0,
  memberships: 0,
  communities: 0,
  communityMembers: 0,
  posts: 0,
  teamMembers: 0,
  signals: 0,
  comments: 0,
  pitches: 0,
  promotions: 0,
  clickEvents: 0,
};

async function insertBatches<T>(rows: T[], insert: (part: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) await insert(rows.slice(i, i + BATCH));
}

type AnalysisColumns = Pick<
  NewPostRow,
  | 'analysisStatus'
  | 'analysisAttempts'
  | 'scoredTasteVersion'
  | 'aiSummary'
  | 'aiCategory'
  | 'aiFitScore'
  | 'aiFitReason'
  | 'aiTags'
  | 'aiSkills'
  | 'aiIsSpam'
>;

function analysisColumns(
  ai: SeedAi | null,
  tasteVersion: number,
  pending: boolean,
): AnalysisColumns {
  if (!ai || pending) {
    return {
      analysisStatus: 'pending',
      analysisAttempts: 0,
      scoredTasteVersion: null,
      aiSummary: null,
      aiCategory: null,
      aiFitScore: null,
      aiFitReason: null,
      aiTags: null,
      aiSkills: null,
      aiIsSpam: null,
    };
  }
  return {
    analysisStatus: 'done',
    analysisAttempts: 1,
    scoredTasteVersion: tasteVersion,
    aiSummary: ai.summary,
    aiCategory: ai.category,
    aiFitScore: ai.fitScore,
    aiFitReason: ai.fitReason,
    aiTags: ai.tags,
    aiSkills: ai.skills,
    aiIsSpam: ai.isSpam,
  };
}

/** Builds every row from the JSON (pure: no database access). */
export function buildSeedRows(
  data: SeedData,
  demoUsers: DemoUsers,
  now: Date,
  { pendingAnalysis = false }: { pendingAnalysis?: boolean } = {},
) {
  const at = (ageHours: number) => new Date(now.getTime() - ageHours * HOUR_MS);
  const atOrNull = (ageHours: number | null) => (ageHours === null ? null : at(ageHours));
  const tasteVersion = 1;

  const spaceId = seedUuid('space', data.space.handle);
  const spaceCreatedAt = at(data.space.ageHours);
  const ownerMembershipId = seedUuid('membership', '@owner');
  const membershipId = (key: string) => seedUuid('membership', key);
  const communityId = new Map(data.communities.map((c) => [c.slug, seedUuid('community', c.slug)]));
  const memberByKey = new Map(data.members.map((m) => [m.key, m]));
  const postId = (key: string) => seedUuid('post', key);

  const fan = data.members.find((m) => m.demo === 'fan');

  const users = data.members
    .filter((m) => m.demo !== 'fan')
    .map((m) => ({
      id: seedUserId(m.key),
      name: m.name,
      email: seedUserEmail(m.key),
      emailVerified: true,
      image: null,
      createdAt: at(m.joinedAgeHours + 0.05),
      updatedAt: at(m.joinedAgeHours + 0.05),
    }));

  const space = {
    id: spaceId,
    ownerUserId: demoUsers.creator.id,
    handle: data.space.handle,
    displayName: data.space.displayName,
    bio: data.space.bio,
    avatarUrl: data.space.avatarUrl,
    platforms: data.space.platforms,
    tasteProfile: data.space.tasteProfile,
    tasteVersion,
    aiDailyTokenBudget: data.space.aiDailyTokenBudget,
    isDemo: true,
    createdAt: spaceCreatedAt,
    updatedAt: spaceCreatedAt,
  };

  const communities = data.communities.map((c, i) => ({
    id: communityId.get(c.slug) as string,
    spaceId,
    slug: c.slug,
    name: c.name,
    description: c.description,
    tint: c.tint,
    icon: c.icon,
    sortOrder: c.sortOrder,
    memberCount: 0,
    createdAt: at(data.space.ageHours - (i + 1) / 60),
  }));

  const memberships: NewMembershipRow[] = [
    {
      id: ownerMembershipId,
      spaceId,
      userId: demoUsers.creator.id,
      role: 'owner',
      headline: data.space.owner.headline,
      intro: data.space.owner.intro,
      skills: data.space.owner.skills,
      links: data.space.owner.links,
      joinedAt: spaceCreatedAt,
    },
    ...data.members.map((m) => ({
      id: membershipId(m.key),
      spaceId,
      userId: m.demo === 'fan' ? demoUsers.fan.id : seedUserId(m.key),
      role: 'member' as const,
      headline: m.headline,
      intro: m.intro,
      skills: m.skills,
      links: m.links,
      joinedAt: at(m.joinedAgeHours),
    })),
  ];

  const communityMembers: NewCommunityMemberRow[] = data.members.flatMap((m) =>
    m.communities.map((slug) => ({
      communityId: communityId.get(slug) as string,
      membershipId: membershipId(m.key),
      joinedAt: at(m.joinedAgeHours),
    })),
  );

  // Live promotions set posts.featured_at (cleared again on unpublish).
  const featuredAt = new Map<string, Date>();
  for (const promotion of data.promotions) {
    if (promotion.publishedAgeHours !== null && promotion.unpublishedAgeHours === null) {
      featuredAt.set(promotion.post, at(promotion.publishedAgeHours));
    }
  }

  const postRows: NewPostRow[] = data.posts.map((p) => ({
    id: postId(p.key),
    spaceId,
    communityId: communityId.get(p.community) as string,
    authorMembershipId: p.author ? membershipId(p.author) : null,
    type: p.type,
    title: p.title,
    body: p.body,
    status: p.status,
    rolesNeeded: p.rolesNeeded,
    links: p.links,
    featuredAt: featuredAt.get(p.key) ?? null,
    hiddenAt: atOrNull(p.hiddenAgeHours),
    deletedAt: atOrNull(p.deletedAgeHours),
    createdAt: at(p.ageHours),
    updatedAt: at(p.ageHours),
    contentHash: contentHash(p.title, p.body),
    ...analysisColumns(p.ai, tasteVersion, pendingAnalysis),
  }));

  const teamRows: NewTeamMemberRow[] = data.posts.flatMap((p) => {
    if (p.type !== 'project') return [];
    const rows: NewTeamMemberRow[] = p.team.map((entry) => ({
      postId: postId(p.key),
      membershipId: membershipId(entry.member),
      role: entry.role,
      status: entry.status,
      createdAt: at(entry.ageHours),
      decidedAt: atOrNull(entry.decidedAgeHours),
    }));
    if (p.author) {
      rows.unshift({
        postId: postId(p.key),
        membershipId: membershipId(p.author),
        role: LEAD_ROLE,
        status: 'accepted',
        createdAt: at(p.ageHours),
        decidedAt: at(p.ageHours),
      });
    }
    return rows;
  });

  // Signals land soon after the post (or after the member joined, if later), most in the
  // first day: elapsed = window * u^2.
  const signalRows: NewSignalRow[] = data.posts.flatMap((p) =>
    (['use', 'build'] as const).flatMap((kind) =>
      p.signals[kind].map((key) => {
        const joined = memberByKey.get(key)?.joinedAgeHours ?? p.ageHours;
        const window = Math.min(p.ageHours, joined);
        const u = unitHash(`signal:${p.key}:${key}:${kind}`);
        const age = Math.max(0.01, window - window * u * u);
        return { postId: postId(p.key), membershipId: membershipId(key), kind, createdAt: at(age) };
      }),
    ),
  );

  const commentRows: NewCommentRow[] = data.comments.map((c) => ({
    id: seedUuid('comment', c.key),
    postId: postId(c.post),
    spaceId,
    authorMembershipId: c.author ? membershipId(c.author) : null,
    body: c.body,
    hiddenAt: atOrNull(c.hiddenAgeHours),
    deletedAt: atOrNull(c.deletedAgeHours),
    createdAt: at(c.ageHours),
  }));

  const pitchRows: NewInboundRow[] = data.pitches.map((p) => {
    const analysis = analysisColumns(p.ai, tasteVersion, pendingAnalysis);
    return {
      id: seedUuid('pitch', p.key),
      spaceId,
      senderMembershipId: membershipId(p.sender),
      type: p.type,
      subject: p.subject,
      body: p.body,
      links: p.links,
      status: p.status,
      // Pending items get is_filtered from the analyzer's first spam verdict.
      isFiltered: analysis.analysisStatus === 'done' ? p.isFiltered : false,
      creatorReply: p.creatorReply,
      repliedAt: atOrNull(p.repliedAgeHours),
      createdAt: at(p.ageHours),
      updatedAt: at(p.repliedAgeHours ?? p.ageHours),
      contentHash: contentHash(p.subject, p.body),
      ...analysis,
    };
  });

  const promotionRows: NewPromotionRow[] = data.promotions.map((p) => {
    const touched = [p.createdAgeHours, p.publishedAgeHours, p.unpublishedAgeHours].filter(
      (age): age is number => age !== null,
    );
    return {
      id: seedUuid('promotion', p.key),
      spaceId,
      postId: postId(p.post),
      headline: p.headline,
      drafts: p.drafts,
      draftErrors: p.draftErrors,
      showcaseSlug: p.showcaseSlug,
      shortCode: p.shortCode,
      clickCount: 0,
      publishedAt: atOrNull(p.publishedAgeHours),
      unpublishedAt: atOrNull(p.unpublishedAgeHours),
      createdByUserId: demoUsers.creator.id,
      createdAt: at(p.createdAgeHours),
      updatedAt: at(Math.min(...touched)),
    };
  });

  const clickRows: NewClickEventRow[] = data.promotions.flatMap((p) => {
    if (p.publishedAgeHours === null) return [];
    const published = p.publishedAgeHours;
    const ended = p.unpublishedAgeHours ?? 0;
    const random = prng(Number.parseInt(sha256Hex(`clicks:${p.key}`).slice(0, 8), 16));
    const total = p.clicks.reduce(
      (sum, day) => sum + CLICK_PLATFORMS.reduce((n, platform) => n + day[platform], 0),
      0,
    );
    const visitors = Math.max(1, Math.round(total * (1 - REPEAT_VISITOR_SHARE)));
    const rows: NewClickEventRow[] = [];
    for (const day of p.clicks) {
      for (const platform of CLICK_PLATFORMS) {
        const referrers = REFERRERS[platform];
        for (let i = 0; i < day[platform]; i += 1) {
          // Spread over the day window, never before publishing or after unpublishing.
          const raw = day.daysAgo * 24 + random() * 24;
          const age = Math.min(published - 0.02, Math.max(ended + 0.02, raw));
          rows.push({
            promotionId: seedUuid('promotion', p.key),
            platform,
            referrerHost: referrers[Math.floor(random() * referrers.length)] ?? null,
            visitorHash: sha256Hex(`demo-visitor:${p.key}:${Math.floor(random() * visitors)}`),
            createdAt: at(age),
          });
        }
      }
    }
    return rows;
  });

  return {
    spaceId,
    users,
    space,
    communities,
    memberships,
    communityMembers,
    posts: postRows,
    teamMembers: teamRows,
    signals: signalRows,
    comments: commentRows,
    pitches: pitchRows,
    promotions: promotionRows,
    clickEvents: clickRows,
    creatorProfile: { name: data.space.displayName, image: data.space.avatarUrl },
    fanName: fan?.name ?? null,
  };
}

/** The demo space currently in the database, if any (newest first when there are several). */
async function findDemoSpace(db: Db | Tx, handle: string) {
  const rows = await db
    .select({ id: spaces.id, handle: spaces.handle })
    .from(spaces)
    .where(eq(spaces.isDemo, true))
    .orderBy(asc(spaces.createdAt));
  return rows.find((row) => row.handle === handle) ?? rows[0] ?? null;
}

/**
 * Rebuilds the demo space from the seed data (see the top of this file). Returns what it did;
 * throws if the data is invalid or the demo handle belongs to a real (non-demo) space.
 */
export async function seedDemoSpace(
  deps: SeedDeps,
  options: SeedOptions = {},
): Promise<SeedResult> {
  const started = Date.now();
  const { db, auth, env, repos } = deps;
  const log = deps.logger.child({ module: 'seed' });
  const data = options.data ?? (await loadSeedData());
  const now = options.now ?? new Date();

  if (options.onlyIfMissing) {
    const existing = await findDemoSpace(db, data.space.handle);
    if (existing) {
      return {
        seeded: false,
        spaceId: existing.id,
        handle: existing.handle,
        seededAt: now,
        counts: null,
        ms: Date.now() - started,
      };
    }
  }

  // Better Auth owns user + account rows for the two demo accounts (outside our transaction).
  const fanMember = data.members.find((m) => m.demo === 'fan');
  const demoUsers = await ensureDemoUsers(auth, env, {
    creator: data.space.displayName,
    ...(fanMember ? { fan: fanMember.name } : {}),
  });
  const rows = buildSeedRows(data, demoUsers, now, { pendingAnalysis: options.pendingAnalysis });

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${SEED_LOCK_KEY}))`);

    if (options.onlyIfMissing) {
      const existing = await findDemoSpace(tx, data.space.handle);
      if (existing) return { seeded: false as const, spaceId: existing.id };
    }

    const [taken] = await tx
      .select({ id: spaces.id })
      .from(spaces)
      .where(and(eq(spaces.handle, data.space.handle), eq(spaces.isDemo, false)))
      .limit(1);
    if (taken) {
      throw new Error(`The demo handle "${data.space.handle}" belongs to a real (non-demo) space`);
    }
    const [owned] = await tx
      .select({ handle: spaces.handle })
      .from(spaces)
      .where(and(eq(spaces.ownerUserId, demoUsers.creator.id), eq(spaces.isDemo, false)))
      .limit(1);
    if (owned) {
      throw new Error(`The demo creator account already owns the real space "${owned.handle}"`);
    }

    const deletedSpaces = await repos.spaces.deleteDemoSpaces(tx);
    await tx.delete(user).where(like(user.email, `%@${SEED_EMAIL_DOMAIN}`));
    await tx
      .update(user)
      .set({ name: rows.creatorProfile.name, image: rows.creatorProfile.image })
      .where(eq(user.id, demoUsers.creator.id));

    await insertBatches(rows.users, (part) => repos.memberships.insertUsers(part, tx));
    await repos.spaces.insert(rows.space, tx);
    await repos.communities.insertMany(rows.communities, tx);
    await insertBatches(rows.memberships, (part) => repos.memberships.insertMany(part, tx));
    await repos.memberships.insertCommunityMembers(rows.communityMembers, tx);
    await repos.communities.recountMembers(rows.spaceId, tx);

    await insertBatches(rows.posts, (part) => repos.posts.insertMany(part, tx));
    await repos.teams.insertMany(rows.teamMembers, tx);
    await repos.signals.insertMany(rows.signals, tx);
    await repos.comments.insertMany(rows.comments, tx);
    await repos.posts.recountCounters(rows.spaceId, tx);

    await insertBatches(rows.pitches, (part) => repos.pitches.insertMany(part, tx));
    await repos.promotions.insertMany(rows.promotions, tx);
    await repos.clicks.insertMany(rows.clickEvents, tx);
    await repos.clicks.recountPromotionClicks(rows.spaceId, tx);

    return { seeded: true as const, spaceId: rows.spaceId, deletedSpaces };
  });

  if (!outcome.seeded) {
    return {
      seeded: false,
      spaceId: outcome.spaceId,
      handle: data.space.handle,
      seededAt: now,
      counts: null,
      ms: Date.now() - started,
    };
  }

  const counts: SeedCounts = {
    ...EMPTY_COUNTS,
    users: rows.users.length,
    memberships: rows.memberships.length,
    communities: rows.communities.length,
    communityMembers: rows.communityMembers.length,
    posts: rows.posts.length,
    teamMembers: rows.teamMembers.length,
    signals: rows.signals.length,
    comments: rows.comments.length,
    pitches: rows.pitches.length,
    promotions: rows.promotions.length,
    clickEvents: rows.clickEvents.length,
  };
  const ms = Date.now() - started;
  log.info(
    { handle: data.space.handle, replaced: outcome.deletedSpaces, ms, ...counts },
    'demo space seeded',
  );
  return {
    seeded: true,
    spaceId: rows.spaceId,
    handle: data.space.handle,
    seededAt: now,
    counts,
    ms,
  };
}

// ---------------------------------------------------------------- --reanalyze

export interface ReanalyzeDeps {
  db: Db;
  logger: Logger;
  /** workers/analyze-item.ts createAnalyzer(...).analyze */
  analyze: (ref: { kind: 'post' | 'inbound'; id: string }) => Promise<string>;
}

/**
 * Runs the analyzer over every post and pitch of a space, `concurrency` at a time, and tallies
 * the outcomes (done, postponed when the AI budget runs out, failed, ...). Postponed items stay
 * pending; the dashboard's sweep picks them up later.
 */
export async function reanalyzeSpace(
  deps: ReanalyzeDeps,
  spaceId: string,
  { concurrency = LIMITS.sweep.batchSize, onProgress }: {
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<Record<string, number>> {
  const postIds = await deps.db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.spaceId, spaceId), isNull(posts.deletedAt)))
    .orderBy(asc(posts.createdAt));
  const pitchIds = await deps.db
    .select({ id: inbound.id })
    .from(inbound)
    .where(eq(inbound.spaceId, spaceId))
    .orderBy(asc(inbound.createdAt));
  const refs = [
    ...pitchIds.map((row) => ({ kind: 'inbound' as const, id: row.id })),
    ...postIds.map((row) => ({ kind: 'post' as const, id: row.id })),
  ];

  const tally: Record<string, number> = {};
  let next = 0;
  let finished = 0;
  const worker = async () => {
    for (;;) {
      const ref = refs[next];
      next += 1;
      if (!ref) return;
      const outcome = await deps.analyze(ref);
      tally[outcome] = (tally[outcome] ?? 0) + 1;
      finished += 1;
      onProgress?.(finished, refs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return tally;
}

// ---------------------------------------------------------------- CLI

const USAGE = `Usage: pnpm db:seed [--reanalyze]

Rebuilds the demo space (is_demo) from src/db/seed/data/*.json with prefilled AI fields.
  --reanalyze   insert posts and pitches as pending and run the analyzer (live AI with
                OPENROUTER_API_KEY, otherwise the deterministic fake)`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.info(USAGE);
    return;
  }
  const unknown = args.filter((arg) => arg !== '--reanalyze');
  if (unknown.length > 0) {
    console.error(`[seed] unknown option(s): ${unknown.join(' ')}\n\n${USAGE}`);
    process.exitCode = 1;
    return;
  }
  const reanalyze = args.includes('--reanalyze');

  // Imported here, not at the top: they read the environment and open the database pool.
  const { env } = await import('../../config/env.js');
  const { db, closeDb } = await import('../client.js');
  const { auth } = await import('../../auth/index.js');
  const { createRepos } = await import('../../repositories/index.js');
  const { logger: rootLogger } = await import('../../lib/logger.js');
  const logger = rootLogger.child({ script: 'seed' }, { level: 'warn' });
  const repos = createRepos(db);

  try {
    const target = new URL(env.DATABASE_URL);
    console.info(`[seed] seeding the demo space into ${target.host}${target.pathname}`);
    const result = await seedDemoSpace(
      { db, auth, env, repos, logger },
      { pendingAnalysis: reanalyze },
    );
    console.info(`[seed] /${result.handle} (space ${result.spaceId}) in ${result.ms} ms`);
    if (result.counts) {
      for (const [table, count] of Object.entries(result.counts)) {
        console.info(`[seed]   ${table.padEnd(17)} ${count}`);
      }
    }
    console.info(
      `[seed] demo accounts: ${env.DEMO_CREATOR_EMAIL} (creator), ${env.DEMO_FAN_EMAIL} (fan)`,
    );

    if (reanalyze) {
      const { createAiServices } = await import('../../ai/index.js');
      const { createAnalyzer } = await import('../../workers/analyze-item.js');
      const { createBackgroundRunner } = await import('../../workers/schedule.js');
      const ai = createAiServices({ env, logger, repos });
      const background = createBackgroundRunner(logger);
      const analyzer = createAnalyzer({ repos, ai, background, logger });
      console.info(`[seed] reanalyzing with the ${ai.mode} AI ...`);
      let lastShown = 0;
      const tally = await reanalyzeSpace(
        { db, logger, analyze: (ref) => analyzer.analyze(ref) },
        result.spaceId,
        {
          onProgress: (done, total) => {
            if (done === total || done - lastShown >= 25) {
              lastShown = done;
              console.info(`[seed]   ${done}/${total}`);
            }
          },
        },
      );
      await background.whenIdle();
      console.info(`[seed] analysis: ${JSON.stringify(tally)}`);
      if (tally.postponed) {
        console.info(
          '[seed] some items were postponed (AI off or the daily token budget is used up); ' +
            'they stay pending and the dashboard sweep analyzes them later.',
        );
      }
    }
  } finally {
    await closeDb();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await main();
  } catch (error) {
    console.error('[seed] failed:', error instanceof Error ? error.message : error);
    if (!(error instanceof SeedDataError) && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  }
  // pino-pretty runs in a worker thread in development; do not wait for it.
  process.exit(process.exitCode ?? 0);
}
