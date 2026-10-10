import type {
  BriefingRefType,
  CommunityIcon,
  LinkItem,
  PitchType,
  PlatformProfile,
  PostStatus,
  PostType,
  PromotionDraft,
  PromotionPlatform,
  TasteProfile,
  Tint,
} from '@fellow-owners/shared';

// The contract between the domain services (callers) and the AI module (implementations).
// Domain code depends only on these types; `container.ts` decides which implementation is used:
// the live OpenRouter one (ai/run.ts + ai/tasks/*) or the deterministic fake (ai/fake.ts).
//
// Rules every implementation follows (02-trd "AI tasks", "Prompt injection and trust"):
// - fan text is untrusted data; outputs are data only (scores, summaries, drafts)
// - scores are clamped to 0..100, texts truncated to the shared LIMITS
// - returned ids are checked against the candidates given in the input
// - every call is budget-checked and writes one ai_runs row (live implementation)
// - failures throw AiUnavailableError; callers degrade (AI fields stay pending, briefing
//   `unavailable`, suggestions `available: false`), they never fail the request because of AI

/** Who an AI call is for: budget (space), per-user caps (user) and the ai_runs row (ref). */
export interface AiContext {
  /**
   * The space whose budget pays and whose ai_runs row records the call. Null only for onboarding
   * calls made before a space exists (suggestSetup): no budget check and no ai_runs row, so the
   * caller caps them (platform.controller.ts).
   */
  spaceId: string | null;
  /** The user who triggered the call, for per-user caps. Null for background work. */
  userId?: string | null;
  /** ai_runs.ref_type: 'post' | 'inbound' | 'digest' | 'promotion' | 'membership'. */
  refType?: string;
  /** ai_runs.ref_id (uuid). */
  refId?: string;
}

export type AiTaskName =
  | 'triageItem'
  | 'embedItem'
  | 'suggestCommunities'
  | 'briefing'
  | 'promoteDrafts'
  | 'communityDigest'
  | 'suggestReply'
  | 'spotlightNote'
  | 'clusterImport'
  | 'askAI'
  | 'tagFollowers'
  | 'suggestSetup'
  /** fal.ai media (ai/media.ts): no v1 route uses these yet. */
  | 'generateImage'
  | 'generateVideo';

export type AiTier = 'fast' | 'smart' | 'embedding';

export type AiUnavailableReason = 'disabled' | 'budget' | 'cap' | 'provider';

/**
 * Thrown by every AI service method when the AI cannot answer:
 * - `disabled`: AI is off (no key) and no fake is wired for this task
 * - `budget`:   the space used today's ai_daily_token_budget ("AI paused until tomorrow")
 * - `cap`:      a per-task cap from shared DAILY_CAPS / HOURLY_CAPS is reached
 * - `provider`: the model call failed, timed out, or returned output that failed validation
 */
export class AiUnavailableError extends Error {
  readonly reason: AiUnavailableReason;
  readonly task: AiTaskName | undefined;

  constructor(
    reason: AiUnavailableReason,
    message?: string,
    options: { task?: AiTaskName; cause?: unknown } = {},
  ) {
    super(message ?? defaultMessage(reason), { cause: options.cause });
    this.name = 'AiUnavailableError';
    this.reason = reason;
    this.task = options.task;
  }
}

function defaultMessage(reason: AiUnavailableReason): string {
  switch (reason) {
    case 'disabled':
      return 'AI is turned off';
    case 'budget':
      return "Today's AI budget for this space is used up";
    case 'cap':
      return 'AI limit reached for now';
    case 'provider':
      return 'The AI provider failed';
  }
}

export function isAiUnavailable(error: unknown): error is AiUnavailableError {
  return error instanceof AiUnavailableError;
}

// ---------------------------------------------------------------- triageItem (fast)

export type ItemKind = 'post' | 'inbound';

export interface TriageInput {
  kind: ItemKind;
  /** The type the author picked (post type, or pitch type for inbound). */
  type: PostType | PitchType;
  /** Post title or pitch subject. */
  title: string;
  /** Cut to LIMITS.ai.inputCharsMax by the implementation. */
  body: string;
  links: LinkItem[];
  /** Posts only: the community it was posted in. */
  communityName: string | null;
  tasteProfile: TasteProfile;
  creatorName: string;
}

export interface TriageResult {
  /** The AI's view of the type: a PostType for posts, a PitchType for inbound. */
  category: PostType | PitchType;
  isSpam: boolean;
  /** <= LIMITS.ai.summaryMax (140) chars. */
  summary: string;
  /** Integer 0..100. */
  fitScore: number;
  /** <= LIMITS.ai.fitReasonMax (220) chars. */
  fitReason: string;
  /** <= 5. */
  tags: string[];
  /** <= 5, lowercase. */
  skills: string[];
}

// ---------------------------------------------------------------- embedItem (embedding)

export interface EmbedInput {
  title: string;
  body: string;
}

/** LIMITS.ai.embeddingDimensions (1536) numbers. */
export type Embedding = number[];

// ---------------------------------------------------------------- suggestCommunities (fast)

export interface SuggestCommunitiesInput {
  intro: string;
  communities: Array<{ slug: string; name: string; description: string | null }>;
}

export interface SuggestCommunitiesOutput {
  /** Only slugs from the input, best first, confidence 0..1. */
  suggestions: Array<{ slug: string; confidence: number }>;
}

// ---------------------------------------------------------------- briefing (smart)

export interface BriefingCandidate {
  refType: BriefingRefType;
  refId: string;
  title: string;
  summary: string | null;
  fitScore: number | null;
  /** use + build signals (posts) or contributions (people). */
  signals?: number;
  /** AI fit reason or a code-written reason (e.g. "3 accepted team joins this week"). */
  reason?: string | null;
}

export interface BriefingCounts {
  members: number;
  newMembers7d: number;
  ideas7d: number;
  pitches7d: number;
  opportunitiesWaiting: number;
  filteredSpam7d: number;
  pendingAnalysis: number;
  perCommunity: Array<{ slug: string; name: string; posts7d: number; joins7d: number }>;
}

export interface BriefingInput {
  creatorName: string;
  tasteProfile: TasteProfile;
  /** Max LIMITS.briefing.candidatesMax (40). Highlights may only reference these. */
  candidates: BriefingCandidate[];
  counts: BriefingCounts;
  /** UTC day `YYYY-MM-DD`. */
  periodDate: string;
}

export interface BriefingOutput {
  /** <= LIMITS.briefing.headlineMax chars. */
  headline: string;
  /** 3..5, each referencing a candidate (unknown refs already dropped). */
  highlights: Array<{ refType: BriefingRefType; refId: string; why: string }>;
  /** 0..2. */
  watchouts: string[];
  /** Model id that wrote it (digests.model). */
  model: string;
}

// ---------------------------------------------------------------- promoteDrafts (smart)

export interface PromoteDraftsInput {
  post: {
    id: string;
    type: PostType;
    status: PostStatus;
    title: string;
    body: string;
    links: LinkItem[];
    rolesNeeded: string[];
    communityName: string;
    authorName: string;
  };
  /** Accepted team members. */
  team: Array<{ name: string; role: string }>;
  tasteProfile: TasteProfile;
  /** The creator's voice samples (tasteProfile.voice). */
  voice: string[];
  creatorName: string;
  /** Absolute showcase URL once known (on regenerate after publish). */
  showcaseUrl?: string | null;
  /** Platforms to draft; all four when omitted. */
  platforms?: PromotionPlatform[];
}

export interface PromoteDraftsOutput {
  /** Each within LIMITS.promotion.text[platform]; hashtags without '#', <= 5. */
  drafts: Partial<Record<PromotionPlatform, PromotionDraft>>;
  /** Requested platforms that could not be drafted. */
  failed: PromotionPlatform[];
  /** Optional suggested headline, <= LIMITS.promotion.headline.max. */
  headline: string | null;
  model: string;
}

// ---------------------------------------------------------------- P1 tasks

export interface CommunityDigestInput {
  communityName: string;
  periodDate: string;
  posts: Array<{ id: string; title: string; summary: string | null; signals: number }>;
}

export interface CommunityDigestOutput {
  summary: string;
  themes: string[];
  standouts: Array<{ refId: string; why: string }>;
  model: string;
}

export interface SuggestReplyInput {
  pitch: { type: PitchType; subject: string; body: string; senderName: string };
  tasteProfile: TasteProfile;
  voice: string[];
  creatorName: string;
}

export interface SuggestReplyOutput {
  reply: string;
  model: string;
}

/** F6 "Fans of the week": a short shout-out to one fan, in the creator's voice. */
export interface SpotlightNoteInput {
  fan: {
    name: string;
    intro: string | null;
    communities: string[];
    /** The fan's most-signalled visible post, if any. */
    topPost: { title: string; excerpt: string } | null;
  };
  voice: string[];
  creatorName: string;
}

export interface SpotlightNoteOutput {
  note: string;
  model: string;
}

/** P1 audience import (F24): cluster pasted comments into suggested communities. */
export interface ClusterImportInput {
  creatorName: string;
  /** Up to 500 comments; each is cut to 300 characters by the implementation. */
  comments: string[];
  /** Names of the space's existing communities, so suggestions do not repeat them. */
  existingCommunities: string[];
}

export interface ClusterImportOutput {
  /** 2..6 suggestions; sampleQuotes are verbatim comments from the input (<= 3 each). */
  communities: Array<{ name: string; description: string; sampleQuotes: string[] }>;
  model: string;
}

/** Followers per tagFollowers call (the followers service batches larger sets). */
export const TAG_FOLLOWERS_BATCH = 100;

/** F23 auto-tag: follower notes matched to the space's active communities. */
export interface TagFollowersInput {
  /** Active communities (creator-written name + description). */
  communities: Array<{ id: string; slug: string; name: string; description: string | null }>;
  /** At most TAG_FOLLOWERS_BATCH (100) per call; notes are untrusted. */
  followers: Array<{ id: string; name: string; note: string }>;
}

export interface TagFollowersOutput {
  /** Only ids from the input; 1..2 community ids per follower, followers with no match left out. */
  tags: Array<{ followerId: string; communityIds: string[] }>;
  model: string;
}

/** P1 "Ask your AI": a question answered from the top semantic matches only. */
export interface AskAiInput {
  question: string;
  creatorName: string;
  tasteProfile: TasteProfile;
  /** Up to 20 items found by embedding search, best first. */
  matches: Array<{
    refType: BriefingRefType;
    refId: string;
    title: string;
    summary: string | null;
    excerpt: string;
  }>;
}

export interface AskAiOutput {
  /** Inline citations are written as [1], [2] ... and index into `citations`. */
  answer: string;
  citations: Array<{ refType: BriefingRefType; refId: string; title: string }>;
  model: string;
}

/** Onboarding auto-fetch (Round 4 §6): imported public profiles -> setup suggestions. */
export interface SuggestSetupInput {
  /** At most 4 profiles with at most 10 recent posts each; captions are untrusted. */
  profiles: PlatformProfile[];
}

export interface SuggestSetupOutput {
  /** "What you love" lines (TasteProfile.promote). */
  loves: string[];
  /** Caption quotes (TasteProfile.voice); the caller keeps only verbatim ones. */
  voice: string[];
  /**
   * Suggested groups. `posts` are indices into the numbered recent posts (flattenRecent order);
   * the demand hint is counted from them in code, never taken from the model.
   */
  groups: Array<{
    name: string;
    description: string;
    /** Plural noun phrase for the hint: "budget trips". */
    topic: string;
    icon: CommunityIcon;
    tint: Tint;
    posts: number[];
  }>;
  model: string;
}

// ---------------------------------------------------------------- services

/** What domain services call. Implementations: live (OpenRouter) and fake (ai/fake.ts). */
export interface AiServices {
  /** `live` calls models; `fake` is deterministic and offline. */
  readonly mode: 'live' | 'fake';
  triageItem(input: TriageInput, ctx: AiContext): Promise<TriageResult>;
  embedItem(input: EmbedInput, ctx: AiContext): Promise<Embedding>;
  suggestCommunities(
    input: SuggestCommunitiesInput,
    ctx: AiContext,
  ): Promise<SuggestCommunitiesOutput>;
  briefing(input: BriefingInput, ctx: AiContext): Promise<BriefingOutput>;
  promoteDrafts(input: PromoteDraftsInput, ctx: AiContext): Promise<PromoteDraftsOutput>;
  /** P1, not wired to routes yet. */
  communityDigest?(input: CommunityDigestInput, ctx: AiContext): Promise<CommunityDigestOutput>;
  /** F1 "Reply in my voice" (POST /api/studio/inbox/:id/suggest-reply). */
  suggestReply?(input: SuggestReplyInput, ctx: AiContext): Promise<SuggestReplyOutput>;
  /** F6 spotlight draft (POST /api/studio/people/:membershipId/spotlight/draft). */
  spotlightNote?(input: SpotlightNoteInput, ctx: AiContext): Promise<SpotlightNoteOutput>;
  /** P1, not wired to routes yet. */
  clusterImport?(input: ClusterImportInput, ctx: AiContext): Promise<ClusterImportOutput>;
  /** P1, not wired to routes yet. */
  askAI?(input: AskAiInput, ctx: AiContext): Promise<AskAiOutput>;
  /** F23 auto-tag (POST /api/studio/followers/auto-tag). */
  tagFollowers?(input: TagFollowersInput, ctx: AiContext): Promise<TagFollowersOutput>;
  /** Onboarding setup suggestions (POST /api/studio/setup-suggestions); ctx.spaceId is null. */
  suggestSetup?(input: SuggestSetupInput, ctx: AiContext): Promise<SuggestSetupOutput>;
}

// ---------------------------------------------------------------- background work

/**
 * Runs work after the response: `waitUntil` on Vercel, fire-and-forget locally.
 * `run` never throws and never rejects; failures are logged with `label`.
 */
export interface BackgroundRunner {
  run(label: string, task: () => Promise<void>): void;
  /** Resolves once every task started so far has settled (tests, graceful shutdown). */
  whenIdle(): Promise<void>;
}

export interface ItemRef {
  kind: ItemKind;
  id: string;
}

export interface SweepResult {
  /** Items claimed by this call (max LIMITS.sweep.claimMax). */
  claimed: number;
  /** Pending items in the space not claimed by this call. */
  remaining: number;
}

/**
 * Item analysis (02-trd data flows 1 and 2). Domain services call `runInBackground` with
 * `analyzer.analyzeItem(...)` after inserting or editing a post/pitch, and `sweep` from
 * POST /api/studio/sweep.
 */
export interface Analyzer {
  /**
   * Triage + embedding for one item, then saveAnalysis (done) or markFailed (attempts + 1,
   * `failed` after 3). Skips items already done for the same content hash and taste version.
   * Never throws for AI failures (they are recorded on the row).
   */
  analyzeItem(ref: ItemRef): Promise<void>;
  /** Claims up to 25 pending items of the space and analyzes them 5 at a time in the background. */
  sweep(spaceId: string): Promise<SweepResult>;
}
