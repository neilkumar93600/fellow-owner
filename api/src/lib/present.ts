import {
  type AiInsight,
  type AnalysisStatus,
  type FanSpotlight,
  LIMITS,
  type LinkItem,
  type MemberRef,
  type Pitch,
  type PlatformEntry,
  type PostCredit,
  type PublicCommunity,
  type TeamMember,
} from '@fellow-owners/shared';
import { LEAD_ROLE } from '../db/schema/social.js';
import { addHours, toIso, toIsoOrNull } from './dates.js';

/**
 * Pure row -> response helpers shared by the services. Nothing here touches the database.
 * Rule of thumb: members never get an email or an AI field from these helpers; AI fields only
 * come from `aiInsight`, which only studio services call.
 */

/** Shown when a membership was deleted (posts and comments keep author_membership_id = null). */
export const FORMER_MEMBER_NAME = 'Former member';

/** OTP sign-in without a name creates a user with name ''. */
export const FALLBACK_MEMBER_NAME = 'Member';

export function displayName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_MEMBER_NAME;
}

export const FORMER_MEMBER: Readonly<MemberRef> = Object.freeze({
  membershipId: null,
  name: FORMER_MEMBER_NAME,
  headline: null,
  image: null,
});

/** The person fields other people may see. `null`/missing -> "Former member". */
export function memberRef(
  row:
    | { membershipId: string; name: string | null; headline: string | null; image: string | null }
    | null
    | undefined,
): MemberRef {
  if (!row) return { ...FORMER_MEMBER };
  return {
    membershipId: row.membershipId,
    name: displayName(row.name),
    headline: row.headline,
    image: row.image,
  };
}

/** One-line preview of a body: whitespace collapsed, cut on a word boundary with an ellipsis. */
export function excerpt(text: string, max: number = LIMITS.post.excerptMax): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:!?-]+$/, '')}…`;
}

export function totalFollowers(platforms: PlatformEntry[] | null | undefined): number {
  return (platforms ?? []).reduce((sum, entry) => sum + Math.max(0, entry.followers || 0), 0);
}

export function publicCommunity(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tint: PublicCommunity['tint'];
  icon: PublicCommunity['icon'];
  memberCount: number;
  sortOrder: number;
}): PublicCommunity {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    tint: row.tint,
    icon: row.icon,
    memberCount: row.memberCount,
    sortOrder: row.sortOrder,
  };
}

// ---------------------------------------------------------------- roles and teams

/** Role comparison key: trimmed, case-insensitive. */
export function roleKey(role: string): string {
  return role.trim().toLowerCase();
}

export function isLeadRole(role: string): boolean {
  return roleKey(role) === roleKey(LEAD_ROLE);
}

/** Roles deduplicated case-insensitively, keeping the first spelling. */
export function dedupeRoles(roles: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const role of roles) {
    const trimmed = role.trim();
    const key = roleKey(trimmed);
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** The rolesNeeded spelling matching `requested`, or null when the project does not list it. */
export function matchRole(rolesNeeded: readonly string[], requested: string): string | null {
  const key = roleKey(requested);
  return rolesNeeded.find((role) => roleKey(role) === key) ?? null;
}

/** rolesNeeded minus the roles an accepted team member already holds. */
export function openRoles(
  rolesNeeded: readonly string[],
  acceptedRoles: readonly string[],
): string[] {
  const filled = new Set(acceptedRoles.map(roleKey));
  return rolesNeeded.filter((role) => !filled.has(roleKey(role)));
}

export function teamMember(row: {
  membershipId: string;
  name: string | null;
  headline: string | null;
  image: string | null;
  role: string;
  status: TeamMember['status'];
  createdAt: Date;
}): TeamMember {
  return {
    ...memberRef(row),
    role: row.role,
    status: row.status,
    isLead: isLeadRole(row.role),
    createdAt: toIso(row.createdAt),
  };
}

/** "Fans of the week" entry (F6). */
export function fanSpotlight(row: {
  membershipId: string;
  name: string | null;
  image: string | null;
  note: string;
  spotlightAt: Date;
  communityName: string | null;
}): FanSpotlight {
  return {
    membershipId: row.membershipId,
    name: displayName(row.name),
    avatarUrl: row.image,
    note: row.note,
    spotlightAt: toIso(row.spotlightAt),
    communityName: row.communityName,
  };
}

/** Role shown for the post author in a showcase's "Made by" block. */
export const AUTHOR_CREDIT_ROLE = 'Started it';

/**
 * "Made by" credits: the author first ("Started it"), then accepted team members with their
 * roles. The author's own Lead row is skipped; a deleted author is left out.
 */
export function showcaseCredits(
  author: { membershipId: string; name: string | null; image: string | null } | null | undefined,
  accepted: ReadonlyArray<{
    membershipId: string;
    name: string | null;
    image: string | null;
    role: string;
  }>,
): PostCredit[] {
  const credits: PostCredit[] = author
    ? [{ name: displayName(author.name), role: AUTHOR_CREDIT_ROLE, avatarUrl: author.image }]
    : [];
  for (const member of accepted) {
    if (member.membershipId === author?.membershipId) continue;
    credits.push({ name: displayName(member.name), role: member.role, avatarUrl: member.image });
  }
  return credits;
}

// ---------------------------------------------------------------- posts

/** Authors may edit content until this instant (LIMITS.post.editWindowHours after creation). */
export function editableUntil(createdAt: Date): Date {
  return addHours(createdAt, LIMITS.post.editWindowHours);
}

export function canEditContent(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() < editableUntil(createdAt).getTime();
}

// ---------------------------------------------------------------- AI fields (studio only)

export interface AiFieldsRow {
  analysisStatus: AnalysisStatus;
  analysisAttempts: number;
  analysisError: string | null;
  aiSummary: string | null;
  aiCategory: string | null;
  aiFitScore: number | null;
  aiFitReason: string | null;
  aiTags: string[] | null;
  aiSkills: string[] | null;
  aiIsSpam: boolean | null;
  scoredTasteVersion: number | null;
}

/**
 * AI fields for the owner's view. `stale` = scored with an older taste profile than the space's
 * current one (scored_taste_version < taste_version).
 */
export function aiInsight(row: AiFieldsRow, tasteVersion: number): AiInsight {
  return {
    status: row.analysisStatus,
    attempts: row.analysisAttempts,
    error: row.analysisError,
    summary: row.aiSummary,
    category: row.aiCategory,
    fitScore: row.aiFitScore,
    fitReason: row.aiFitReason,
    tags: row.aiTags ?? [],
    skills: row.aiSkills ?? [],
    isSpam: row.aiIsSpam,
    scoredTasteVersion: row.scoredTasteVersion,
    stale: row.scoredTasteVersion !== null && row.scoredTasteVersion < tasteVersion,
  };
}

// ---------------------------------------------------------------- pitches

export function pitchView(row: {
  id: string;
  type: Pitch['type'];
  subject: string;
  body: string;
  links: LinkItem[];
  status: Pitch['status'];
  creatorReply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
}): Pitch {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    body: row.body,
    links: row.links ?? [],
    status: row.status,
    creatorReply: row.creatorReply,
    repliedAt: toIsoOrNull(row.repliedAt),
    createdAt: toIso(row.createdAt),
    canWithdraw: row.status === 'new',
  };
}

// ---------------------------------------------------------------- misc

/** Distinct values in first-seen order. */
export function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

/** Clamps to [min, max]; NaN becomes min. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
