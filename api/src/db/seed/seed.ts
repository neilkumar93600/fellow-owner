import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type {
  ClickPlatform,
  CommunityIcon,
  LinkItem,
  NotificationKind,
  PitchStatus,
  PitchType,
  PlatformEntry,
  PostStatus,
  PostType,
  PromotionDrafts,
  TasteProfile,
  TeamStatus,
  Tint,
} from '@fellow-owners/shared';
import { eq, like } from 'drizzle-orm';
import { DEMO_NAMES, ensureDemoUsers } from '../../auth/demo.js';
import { buildContainer, type CoreDeps } from '../../container.js';
import { daysAgo } from '../../lib/dates.js';
import { contentHash } from '../../lib/hash.js';
import { closeDb } from '../client.js';
import { type NewUserRow, user } from '../schema/auth.js';
import type { NewCommunityMemberRow } from '../schema/communities.js';
import type { NewInboundRow } from '../schema/inbound.js';
import { asks } from '../schema/later.js';
import type { NewMembershipRow } from '../schema/memberships.js';
import type { NewPostRow } from '../schema/posts.js';
import type { NewClickEventRow, NewPromotionRow } from '../schema/promotions.js';
import type { NewCommentRow, NewSignalRow, NewTeamMemberRow } from '../schema/social.js';

/**
 * pnpm db:seed — loads data/*.json into the demo space (05-backend-schema section 9).
 *
 * The JSON is written once by generate-content.ts and committed, AI fields included, so every P0
 * screen works with no OPENROUTER_API_KEY. Seeding itself never calls a model.
 *
 * Idempotent: it deletes the existing demo space (cascade) and rebuilds it, so running it twice
 * leaves one demo space. The two demo accounts are created or repaired by ensureDemoUsers, which
 * the demo reset uses too.
 *
 *   pnpm db:seed              load the committed JSON as it is
 *   pnpm db:seed --reanalyze  load it, then clear the AI fields and run live triage
 */

// ---------------------------------------------------------------- the JSON contract
// Cross-references are by index into the arrays (members[], posts[]) or by community slug, so the
// files carry no uuids and can be regenerated without touching the database.

/** AI fields prefilled in the JSON (05 section 9), written straight onto the row. */
export interface SeedAiFields {
  summary: string;
  /** A PostType for posts, a PitchType for pitches. */
  category: string;
  fitScore: number;
  fitReason: string;
  tags: string[];
  skills: string[];
  isSpam: boolean;
}

export interface SeedSpace {
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  platforms: PlatformEntry[];
  tasteProfile: TasteProfile;
}

export interface SeedCommunity {
  slug: string;
  name: string;
  description: string | null;
  tint: Tint;
  icon: CommunityIcon;
}

export interface SeedMember {
  name: string;
  /** Unique; the demo fan's address must match DEMO_FAN_EMAIL. */
  email: string;
  headline: string | null;
  intro: string | null;
  skills: string[];
  links: LinkItem[];
  /** Community slugs this member joined. */
  communities: string[];
  joinedDaysAgo: number;
  /** True for the one member who is the seeded demo fan (03-app-flow J7). */
  isDemoFan?: boolean;
  /** A creator shout-out ("Fans of the week"): memberships.spotlight_note / spotlight_at. */
  spotlight?: { note: string; daysAgo: number };
}

export interface SeedPost {
  community: string;
  authorIndex: number;
  type: PostType;
  title: string;
  body: string;
  status: PostStatus;
  rolesNeeded: string[];
  links: LinkItem[];
  createdDaysAgo: number;
  /** Member indices that signalled. The author never signals their own post. */
  signals: { use: number[]; build: number[] };
  /** Set when the creator has marked the post "Loved by": days ago. */
  lovedDaysAgo?: number;
  /** Index into challenges[]: the post is an entry to that challenge (posts.ask_id). */
  challenge?: number;
  /** Projects only. The author is added as Lead by the seed, not listed here. */
  team: Array<{ memberIndex: number; role: string; status: TeamStatus }>;
  ai: SeedAiFields;
}

export interface SeedComment {
  postIndex: number;
  authorIndex: number;
  body: string;
  createdDaysAgo: number;
}

export interface SeedPitch {
  senderIndex: number;
  type: PitchType;
  subject: string;
  body: string;
  links: LinkItem[];
  status: PitchStatus;
  isFiltered: boolean;
  creatorReply: string | null;
  createdDaysAgo: number;
  ai: SeedAiFields;
}

export interface SeedPromotion {
  postIndex: number;
  headline: string | null;
  drafts: PromotionDrafts;
  showcaseSlug: string;
  shortCode: string;
  publishedDaysAgo: number;
  /** One entry per (platform, day); `count` clicks are recorded for it. */
  clicks: Array<{ platform: ClickPlatform; daysAgo: number; count: number }>;
}

/** A creator challenge (asks row). Entries are ordinary posts in posts[] with `challenge` set. */
export interface SeedChallenge {
  community: string;
  title: string;
  body: string;
  createdDaysAgo: number;
  /** Days until due; negative once past. */
  dueInDays: number;
  status: 'open' | 'closed';
  /** Closed challenges only: indices into posts[] with the AI's reason for each. */
  shortlist: Array<{ postIndex: number; reason: string }> | null;
  winnerPostIndex: number | null;
}

export interface SeedData {
  space: SeedSpace;
  communities: SeedCommunity[];
  members: SeedMember[];
  posts: SeedPost[];
  comments: SeedComment[];
  pitches: SeedPitch[];
  promotions: SeedPromotion[];
  /** Optional so small test data sets need not carry them. */
  challenges?: SeedChallenge[];
}

export const SEED_FILES = [
  'space',
  'communities',
  'members',
  'posts',
  'comments',
  'pitches',
  'promotions',
  'challenges',
] as const;

const dataUrl = (name: string) => new URL(`./data/${name}.json`, import.meta.url);

async function readJson<T>(name: string): Promise<T> {
  const text = await readFile(dataUrl(name), 'utf8');
  if (text.trim() === '') throw new Error(`data/${name}.json is empty; run generate-content.ts`);
  return JSON.parse(text) as T;
}

/** Reads every data/*.json. Throws with the file name when one is missing or empty. */
export async function readSeedData(): Promise<SeedData> {
  const [space, communities, members, posts, comments, pitches, promotions, challenges] =
    await Promise.all([
      readJson<SeedSpace>('space'),
      readJson<SeedCommunity[]>('communities'),
      readJson<SeedMember[]>('members'),
      readJson<SeedPost[]>('posts'),
      readJson<SeedComment[]>('comments'),
      readJson<SeedPitch[]>('pitches'),
      readJson<SeedPromotion[]>('promotions'),
      readJson<SeedChallenge[]>('challenges'),
    ]);
  return { space, communities, members, posts, comments, pitches, promotions, challenges };
}

// ---------------------------------------------------------------- seeding

export interface SeedResult {
  spaceId: string;
  handle: string;
  communities: number;
  members: number;
  posts: number;
  comments: number;
  signals: number;
  teamMembers: number;
  pitches: number;
  promotions: number;
  clickEvents: number;
}

export interface SeedOptions {
  /** Clear the AI fields after loading and run live triage (pnpm db:seed --reanalyze). */
  reanalyze?: boolean;
  /** Fixed "now" so repeated runs place rows at the same instants (tests). */
  now?: Date;
}

/** Deterministic user id, so a reseed reuses the same ids for the same member. */
const memberUserId = (index: number) => `seed-member-${String(index).padStart(4, '0')}`;

/**
 * Deletes the existing demo space and rebuilds it from `data`.
 *
 * Order follows the foreign keys: users -> space -> owner membership -> communities -> member
 * memberships -> community_members -> posts -> signals/teams/comments -> counters -> pitches ->
 * promotions -> click_events.
 *
 * ponytail: one row set per statement batch (the repos' `insertMany` chunk internally), not one
 * big transaction. A seed is a rebuild from a fixed file: if it fails halfway the fix is to run
 * it again, which starts by deleting the demo space.
 */
export async function seedDemoSpace(
  deps: CoreDeps,
  data: SeedData,
  options: SeedOptions = {},
): Promise<SeedResult> {
  const { repos, auth, env, logger } = deps;
  const now = options.now ?? new Date();
  const at = (days: number) => daysAgo(days, now);

  const fanIndex = data.members.findIndex((m) => m.isDemoFan);
  if (fanIndex === -1) throw new Error('members.json has no member with isDemoFan: true');

  // The two accounts behind "Enter as creator / fan", created or repaired with DEMO_PASSWORD.
  const demoUsers = await ensureDemoUsers(auth, env, {
    creator: data.space.displayName,
    fan: data.members[fanIndex]?.name ?? DEMO_NAMES.fan,
  });

  await repos.spaces.deleteDemoSpaces();
  // Seeded fans are rebuilt from the JSON too: insertUsers skips existing ids, so a rename in the
  // data would otherwise leave last run's names behind.
  await deps.db.delete(user).where(like(user.id, 'seed-member-%'));

  const space = await repos.spaces.insert({
    ownerUserId: demoUsers.creator.id,
    handle: data.space.handle,
    displayName: data.space.displayName,
    bio: data.space.bio,
    avatarUrl: data.space.avatarUrl,
    platforms: data.space.platforms,
    tasteProfile: data.space.tasteProfile,
    isDemo: true,
  });

  const ownerMembership = await repos.memberships.insert({
    spaceId: space.id,
    userId: demoUsers.creator.id,
    role: 'owner',
  });

  const communities = await repos.communities.insertMany(
    data.communities.map((community, i) => ({
      spaceId: space.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      tint: community.tint,
      icon: community.icon,
      sortOrder: i,
    })),
  );
  const communityIdBySlug = new Map(communities.map((c) => [c.slug, c.id]));
  const communityId = (slug: string): string => {
    const id = communityIdBySlug.get(slug);
    if (!id) throw new Error(`posts.json references unknown community "${slug}"`);
    return id;
  };

  // Members: one user row each (the demo fan reuses the account ensureDemoUsers made, so
  // "Enter as fan" signs into a member with real content), then one membership each.
  const userRows: NewUserRow[] = data.members.map((member, i) => ({
    id: i === fanIndex ? demoUsers.fan.id : memberUserId(i),
    name: member.name,
    email: i === fanIndex ? demoUsers.fan.email : member.email,
    emailVerified: true,
    createdAt: at(member.joinedDaysAgo),
  }));
  await repos.memberships.insertUsers(userRows);

  const membershipRows: NewMembershipRow[] = data.members.map((member, i) => ({
    spaceId: space.id,
    userId: userRows[i]?.id as string,
    role: 'member',
    headline: member.headline,
    intro: member.intro,
    skills: member.skills,
    links: member.links,
    joinedAt: at(member.joinedDaysAgo),
    spotlightAt: member.spotlight ? at(member.spotlight.daysAgo) : null,
    spotlightNote: member.spotlight?.note ?? null,
  }));
  const memberships = await repos.memberships.insertMany(membershipRows);
  const membershipId = (index: number): string => {
    const id = memberships[index]?.id;
    if (!id) throw new Error(`seed references member index ${index}, which does not exist`);
    return id;
  };

  const communityMemberRows: NewCommunityMemberRow[] = [];
  for (const [i, member] of data.members.entries()) {
    for (const slug of member.communities) {
      communityMemberRows.push({
        communityId: communityId(slug),
        membershipId: membershipId(i),
        joinedAt: at(member.joinedDaysAgo),
      });
    }
  }
  await repos.memberships.insertCommunityMembers(communityMemberRows);

  // Challenges (asks) go in before the posts, so entries can point at them with ask_id.
  const challenges = data.challenges ?? [];
  const askRows = challenges.length
    ? await deps.db
        .insert(asks)
        .values(
          challenges.map((challenge) => ({
            spaceId: space.id,
            communityId: communityId(challenge.community),
            title: challenge.title,
            body: challenge.body,
            dueAt: at(-challenge.dueInDays),
            status: challenge.status,
            createdAt: at(challenge.createdDaysAgo),
          })),
        )
        .returning()
    : [];

  // Posts carry their AI fields, so the inbox, ideas and briefing screens have scores with no key.
  const postRows: NewPostRow[] = data.posts.map((post) => ({
    spaceId: space.id,
    communityId: communityId(post.community),
    authorMembershipId: membershipId(post.authorIndex),
    askId: post.challenge === undefined ? null : (askRows[post.challenge]?.id ?? null),
    lovedAt: post.lovedDaysAgo === undefined ? null : at(post.lovedDaysAgo),
    type: post.type,
    title: post.title,
    body: post.body,
    status: post.status,
    rolesNeeded: post.rolesNeeded,
    links: post.links,
    createdAt: at(post.createdDaysAgo),
    updatedAt: at(post.createdDaysAgo),
    contentHash: contentHash(post.title, post.body),
    ...aiColumns(post.ai, space.tasteVersion),
  }));
  const posts = await repos.posts.insertMany(postRows);

  const signalRows: NewSignalRow[] = [];
  const teamRows: NewTeamMemberRow[] = [];
  for (const [i, post] of data.posts.entries()) {
    const row = posts[i];
    if (!row) continue;
    for (const kind of ['use', 'build'] as const) {
      for (const memberIndex of post.signals[kind]) {
        if (memberIndex === post.authorIndex) continue; // nobody signals their own post
        signalRows.push({
          postId: row.id,
          membershipId: membershipId(memberIndex),
          kind,
          createdAt: at(post.createdDaysAgo),
        });
      }
    }
    if (post.type === 'project') {
      // The project author is Lead, accepted (social.ts LEAD_ROLE).
      teamRows.push({
        postId: row.id,
        membershipId: membershipId(post.authorIndex),
        role: 'Lead',
        status: 'accepted',
        createdAt: row.createdAt,
        decidedAt: row.createdAt,
      });
      for (const member of post.team) {
        if (member.memberIndex === post.authorIndex) continue;
        teamRows.push({
          postId: row.id,
          membershipId: membershipId(member.memberIndex),
          role: member.role,
          status: member.status,
          createdAt: at(post.createdDaysAgo),
          decidedAt: member.status === 'requested' ? null : at(post.createdDaysAgo),
        });
      }
    }
  }
  await repos.signals.insertMany(signalRows);
  await repos.teams.insertMany(teamRows);

  const commentRows: NewCommentRow[] = data.comments.flatMap((comment) => {
    const post = posts[comment.postIndex];
    if (!post) return [];
    return [
      {
        postId: post.id,
        spaceId: space.id,
        authorMembershipId: membershipId(comment.authorIndex),
        body: comment.body,
        createdAt: at(comment.createdDaysAgo),
      },
    ];
  });
  await repos.comments.insertMany(commentRows);

  // The seed-only inserts skip counter maintenance on purpose; put the counters right once.
  await repos.posts.recountCounters(space.id);
  await repos.communities.recountMembers(space.id);

  // Closed challenges keep the AI shortlist and the winner (asks.response_summary).
  for (const [i, challenge] of challenges.entries()) {
    const ask = askRows[i];
    if (!ask || !challenge.shortlist) continue;
    const winner = challenge.winnerPostIndex === null ? null : posts[challenge.winnerPostIndex];
    await deps.db
      .update(asks)
      .set({
        responseSummary: {
          shortlist: challenge.shortlist.flatMap(({ postIndex, reason }) => {
            const post = posts[postIndex];
            const author = data.posts[postIndex]?.authorIndex;
            return post && author !== undefined
              ? [
                  {
                    postId: post.id,
                    title: post.title,
                    authorName: data.members[author]?.name ?? 'A fan',
                    reason,
                  },
                ]
              : [];
          }),
          winnerPostId: winner?.id ?? null,
        },
      })
      .where(eq(asks.id, ask.id));
  }

  // A few "Your moments" for the demo fan, so /mira/me has something to show on day one.
  const fanUserIdForMoments = demoUsers.fan.id;
  const moments: Array<{ kind: NotificationKind; payload: Record<string, unknown>; days: number }> =
    [];
  for (const [i, post] of data.posts.entries()) {
    const row = posts[i];
    if (!row || post.authorIndex !== fanIndex) continue;
    if (post.lovedDaysAgo !== undefined) {
      moments.push({
        kind: 'post_loved',
        payload: { postId: row.id, title: row.title },
        days: post.lovedDaysAgo,
      });
    }
  }
  const fanSpotlight = data.members[fanIndex]?.spotlight;
  if (fanSpotlight) {
    moments.push({
      kind: 'spotlighted',
      payload: { note: fanSpotlight.note },
      days: fanSpotlight.daysAgo,
    });
  }
  for (const [i, challenge] of challenges.entries()) {
    const ask = askRows[i];
    if (ask && challenge.status === 'open') {
      const bank = data.communities.find((c) => c.slug === challenge.community);
      moments.push({
        kind: 'ask_posted',
        payload: { askId: ask.id, title: ask.title, communityName: bank?.name ?? null },
        days: challenge.createdDaysAgo,
      });
    }
  }
  for (const notification of moments) {
    await repos.notifications.insert({
      userId: fanUserIdForMoments,
      spaceId: space.id,
      kind: notification.kind,
      payload: notification.payload,
      createdAt: at(notification.days),
    });
  }

  const pitchRows: NewInboundRow[] = data.pitches.map((pitch) => ({
    spaceId: space.id,
    senderMembershipId: membershipId(pitch.senderIndex),
    type: pitch.type,
    subject: pitch.subject,
    body: pitch.body,
    links: pitch.links,
    status: pitch.status,
    isFiltered: pitch.isFiltered,
    creatorReply: pitch.creatorReply,
    repliedAt: pitch.creatorReply ? at(Math.max(0, pitch.createdDaysAgo - 1)) : null,
    createdAt: at(pitch.createdDaysAgo),
    updatedAt: at(pitch.createdDaysAgo),
    contentHash: contentHash(pitch.subject, pitch.body),
    ...aiColumns(pitch.ai, space.tasteVersion),
  }));
  const pitches = await repos.pitches.insertMany(pitchRows);

  const promotionRows: NewPromotionRow[] = data.promotions.flatMap((promotion) => {
    const post = posts[promotion.postIndex];
    if (!post) return [];
    return [
      {
        spaceId: space.id,
        postId: post.id,
        headline: promotion.headline,
        drafts: promotion.drafts,
        showcaseSlug: promotion.showcaseSlug,
        shortCode: promotion.shortCode,
        publishedAt: at(promotion.publishedDaysAgo),
        createdByUserId: demoUsers.creator.id,
        createdAt: at(promotion.publishedDaysAgo),
        updatedAt: at(promotion.publishedDaysAgo),
      },
    ];
  });
  const promotions = await repos.promotions.insertMany(promotionRows);

  const clickRows: NewClickEventRow[] = [];
  for (const [i, promotion] of data.promotions.entries()) {
    const row = promotions[i];
    if (!row) continue;
    for (const bucket of promotion.clicks) {
      for (let n = 0; n < bucket.count; n += 1) {
        clickRows.push({
          promotionId: row.id,
          platform: bucket.platform,
          referrerHost: referrerHostFor(bucket.platform),
          // One visitor per (promotion, platform, day, n): unique counts stay believable.
          visitorHash: `seed-${row.shortCode}-${bucket.platform}-${bucket.daysAgo}-${n}`,
          createdAt: at(bucket.daysAgo),
        });
      }
    }
  }
  await repos.clicks.insertMany(clickRows);
  await repos.clicks.recountPromotionClicks(space.id);

  // A published promotion marks its post as featured (the showcase and bio page read this).
  for (const [i, promotion] of data.promotions.entries()) {
    const post = posts[promotion.postIndex];
    if (post && promotions[i]) await repos.posts.setFeatured(space.id, post.id, true);
    // "Your idea made it": the demo fan hears about a featured project she is credited on.
    const seedPost = data.posts[promotion.postIndex];
    const credited = seedPost?.team.some(
      (member) => member.memberIndex === fanIndex && member.status === 'accepted',
    );
    if (post && credited) {
      await repos.notifications.insert({
        userId: demoUsers.fan.id,
        spaceId: space.id,
        kind: 'project_featured',
        payload: { postId: post.id, title: post.title },
        createdAt: at(promotion.publishedDaysAgo),
      });
    }
  }

  // Follower roster (F23): imported-looking followers with notes, some tagged by the creator or
  // the AI, the rest left for "Auto-tag with AI". `memberIndex` links one to a seeded member
  // (same email, as a join would). Read here so callers passing `data` need no followers key.
  const followerSeeds =
    await readJson<
      Array<{
        name: string;
        handle: string | null;
        platform: PlatformEntry['platform'] | null;
        email: string | null;
        note: string | null;
        communities: string[];
        taggedBy?: 'creator' | 'ai';
        memberIndex?: number;
        createdDaysAgo: number;
      }>
    >('followers');
  const seededFollowers = await repos.followers.insertMany(
    followerSeeds.map((follower) => {
      // Smaller data sets (tests) may not have the member: the follower stays unlinked.
      const linked =
        follower.memberIndex === undefined ? undefined : memberships[follower.memberIndex];
      return {
        spaceId: space.id,
        name: follower.name,
        handle: follower.handle,
        platform: follower.platform,
        email: linked ? (userRows[follower.memberIndex ?? -1]?.email ?? null) : follower.email,
        note: follower.note,
        source: 'csv' as const,
        membershipId: linked?.id ?? null,
        createdAt: at(follower.createdDaysAgo),
      };
    }),
  );
  for (const taggedBy of ['creator', 'ai'] as const) {
    await repos.followers.addTags(
      followerSeeds.flatMap((follower, i) => {
        const row = seededFollowers[i];
        if (!row || follower.taggedBy !== taggedBy) return [];
        return follower.communities.flatMap((slug) => {
          const id = communityIdBySlug.get(slug);
          return id ? [{ followerId: row.id, communityId: id }] : [];
        });
      }),
      taggedBy,
    );
  }

  const result: SeedResult = {
    spaceId: space.id,
    handle: space.handle,
    communities: communities.length,
    members: memberships.length,
    posts: posts.length,
    comments: commentRows.length,
    signals: signalRows.length,
    teamMembers: teamRows.length,
    pitches: pitches.length,
    promotions: promotions.length,
    clickEvents: clickRows.length,
  };

  if (options.reanalyze) {
    await reanalyze(
      deps,
      space.id,
      posts.map((p) => p.id),
      pitches.map((p) => p.id),
    );
  }

  logger.info({ ...result, ownerMembershipId: ownerMembership.id }, 'demo space seeded');
  return result;
}

/** The prefilled AI columns for a post or pitch row: `done` for the space's current taste version. */
function aiColumns(ai: SeedAiFields, tasteVersion: number) {
  return {
    analysisStatus: 'done' as const,
    analysisAttempts: 1,
    analysisError: null,
    analysisClaimedAt: null,
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

/** Where a click says it came from, so the Promote screen's referrer column is not empty. */
function referrerHostFor(platform: ClickPlatform): string | null {
  switch (platform) {
    case 'x':
      return 't.co';
    case 'instagram':
      return 'l.instagram.com';
    case 'linkedin':
      return 'lnkd.in';
    case 'youtube':
      return 'www.youtube.com';
    default:
      return null;
  }
}

/**
 * --reanalyze: clears the committed AI fields and runs the real analyzer over every seeded item,
 * which is how the live triage prompt gets exercised against realistic content. Needs an API key;
 * with the fake AI it simply rewrites deterministic values.
 */
async function reanalyze(
  deps: CoreDeps,
  spaceId: string,
  postIds: string[],
  pitchIds: string[],
): Promise<void> {
  const { repos, analyzer, background, logger } = deps;
  for (const id of postIds) await repos.posts.resetAnalysis(spaceId, id, { clearEmbedding: true });
  for (const id of pitchIds)
    await repos.pitches.resetAnalysis(spaceId, id, { clearEmbedding: true });

  // sweep() claims at most LIMITS.sweep.claimMax items per call, so loop until nothing is left.
  let guard = 0;
  for (;;) {
    const { claimed, remaining } = await analyzer.sweep(spaceId);
    await background.whenIdle();
    logger.info({ claimed, remaining }, 'reanalyze sweep');
    if (claimed === 0 || remaining === 0) break;
    guard += 1;
    if (guard > 200) {
      logger.warn({ remaining }, 'reanalyze stopped after 200 sweeps');
      break;
    }
  }
}

// ---------------------------------------------------------------- CLI

async function main(): Promise<void> {
  const reanalyze = process.argv.includes('--reanalyze');
  const started = Date.now();
  const container = buildContainer();
  try {
    const data = await readSeedData();
    const result = await seedDemoSpace(container, data, { reanalyze });
    console.info(
      `[seed] /${result.handle}: ${result.members} members, ${result.posts} posts, ` +
        `${result.comments} comments, ${result.pitches} pitches, ${result.promotions} promotions, ` +
        `${result.clickEvents} clicks in ${Date.now() - started} ms`,
    );
    if (container.ai.mode === 'fake' && reanalyze) {
      console.warn('[seed] --reanalyze ran with the fake AI (no OPENROUTER_API_KEY)');
    }
  } catch (error) {
    console.error('[seed] failed:', error);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
