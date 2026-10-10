// API response shapes. The api returns exactly these; web/src/api types its client with them.
// Dates are ISO 8601 strings. Lists use cursor pagination: { items, nextCursor }.
// AI fields (AiInsight) only ever appear in /api/studio responses (owner view).

import type {
  AnalysisStatus,
  BriefingRefType,
  ClickPlatform,
  CommunityIcon,
  FeedbackVerdict,
  FollowerSource,
  FollowerTagger,
  InboxTab,
  MembershipRole,
  NotificationKind,
  PitchStatus,
  PitchType,
  Platform,
  PostStatus,
  PostType,
  PromotionPlatform,
  PromotionState,
  SignalKind,
  TeamStatus,
  Tint,
} from './enums.js';

export type ISODate = string;

// ---------------------------------------------------------------- common

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export type ApiErrorCode =
  | 'bad_request'
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'handle_taken'
  | 'daily_cap_reached'
  | 'rate_limited'
  | 'edit_window_closed'
  | 'demo_disabled'
  | 'ai_unavailable'
  | 'internal_error';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** zod issues for validation_error, suggestions for handle_taken, etc. */
    details?: unknown;
  };
}

export interface PlatformEntry {
  platform: Platform;
  url: string;
  followers: number;
  /** Set by the profile lookup. */
  handle?: string;
  /** ISO time `followers` was last fetched; the daily refresh goes oldest first. */
  fetchedAt?: string;
}

export interface LinkItem {
  label: string;
  url: string;
}

export interface TasteProfile {
  promote: string[];
  never: string[];
  voice: string[];
}

/**
 * A person as other people see them. Never includes an email.
 * When the membership was deleted, membershipId is null and name is "Former member".
 */
export interface MemberRef {
  membershipId: string | null;
  name: string;
  headline: string | null;
  image: string | null;
}

/** AI fields on posts and pitches. Owner view only. */
export interface AiInsight {
  status: AnalysisStatus;
  attempts: number;
  error: string | null;
  summary: string | null;
  category: string | null;
  fitScore: number | null;
  fitReason: string | null;
  tags: string[];
  skills: string[];
  isSpam: boolean | null;
  scoredTasteVersion: number | null;
  /** Scored with an older taste profile than the current one ("Scored with an older profile"). */
  stale: boolean;
}

// ---------------------------------------------------------------- session and demo

export interface DemoSessionResponse {
  as: 'creator' | 'fan';
  /** Where to send the browser next: /dashboard or /{handle}. */
  redirectTo: string;
}

// ---------------------------------------------------------------- public: bio page and showcase

export interface PublicSpace {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  platforms: PlatformEntry[];
  totalFollowers: number;
  memberCount: number;
  /** The seeded demo space: the web shows its demo cover and art. */
  isDemo: boolean;
}

export interface PublicCommunity {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tint: Tint;
  icon: CommunityIcon;
  memberCount: number;
  sortOrder: number;
}

/** A promoted project shown under "Featured by {creator}" on the bio page. */
export interface FeaturedProject {
  showcaseSlug: string;
  postId: string;
  title: string;
  headline: string | null;
  excerpt: string;
  type: PostType;
  communityName: string;
  tint: Tint;
  teamSize: number;
  publishedAt: ISODate;
}

/** GET /api/spaces/:handle (public, cached 60s). */
export interface SpacePage {
  space: PublicSpace;
  communities: PublicCommunity[];
  featured: FeaturedProject[];
  /** "Fans of the week": latest spotlights first, at most 6. */
  spotlights: FanSpotlight[];
}

/** A fan the creator gave a shout-out (memberships.spotlight_at / spotlight_note). */
export interface FanSpotlight {
  membershipId: string;
  name: string;
  avatarUrl: string | null;
  /** The creator-approved note, at most 280 characters. */
  note: string;
  spotlightAt: ISODate;
  communityName: string | null;
}

/** One contributor in a showcase's "Made by" block. */
export interface PostCredit {
  name: string;
  /** "Started it" for the author, else the accepted team role. */
  role: string;
  avatarUrl: string | null;
}

export interface TeamMember extends MemberRef {
  role: string;
  status: TeamStatus;
  isLead: boolean;
  createdAt: ISODate;
}

/** GET /api/spaces/:handle/showcase/:slug (public). */
export interface Showcase {
  space: Pick<PublicSpace, 'handle' | 'displayName' | 'avatarUrl' | 'isDemo'>;
  promotion: {
    showcaseSlug: string;
    headline: string | null;
    publishedAt: ISODate | null;
    /** False once unpublished: the page shows "No longer featured" with a Join CTA. */
    live: boolean;
  };
  /** Null when the promotion is no longer live. */
  post: {
    id: string;
    type: PostType;
    title: string;
    body: string;
    status: PostStatus;
    links: LinkItem[];
    rolesNeeded: string[];
    openRoles: string[];
    useCount: number;
    buildCount: number;
    community: Pick<PublicCommunity, 'slug' | 'name' | 'tint' | 'icon'>;
    author: MemberRef;
  } | null;
  /** Accepted team members only. */
  team: TeamMember[];
  /** "Made by": the author first, then accepted members with their roles; empty when not live. */
  credits: PostCredit[];
}

// ---------------------------------------------------------------- member side

/** GET /api/spaces/:handle/membership: who the viewer is in this space. */
export interface ViewerMembership {
  signedIn: boolean;
  isOwner: boolean;
  membership: OwnMembership | null;
}

export interface OwnMembership {
  id: string;
  role: MembershipRole;
  name: string;
  headline: string | null;
  intro: string | null;
  skills: string[];
  links: LinkItem[];
  communityIds: string[];
  joinedAt: ISODate;
}

export interface CommunitySuggestion {
  communityId: string;
  slug: string;
  /** 0..1 */
  confidence: number;
}

/** POST /api/spaces/:handle/suggest-communities */
export interface SuggestCommunitiesResponse {
  /** False when the AI failed: show all communities unselected + "Suggestions unavailable". */
  available: boolean;
  suggestions: CommunitySuggestion[];
}

/** POST /api/spaces/:handle/join */
export interface JoinResponse {
  membership: OwnMembership;
  /** Where the join flow lands: the first joined community. */
  firstCommunitySlug: string;
  /** True when the user was already a member (Join goes straight to the first community). */
  alreadyMember: boolean;
}

export interface PostCard {
  id: string;
  type: PostType;
  status: PostStatus;
  title: string;
  excerpt: string;
  rolesNeeded: string[];
  openRoles: string[];
  community: Pick<PublicCommunity, 'id' | 'slug' | 'name' | 'tint' | 'icon'>;
  author: MemberRef;
  useCount: number;
  buildCount: number;
  commentCount: number;
  /** Accepted team members, up to 4, for the avatar stack. */
  teamPreview: MemberRef[];
  teamSize: number;
  featured: boolean;
  createdAt: ISODate;
  /** The viewer's own signals on this post. */
  viewerSignals: SignalKind[];
  isAuthor: boolean;
  /** Pinned to the top of its community feed (an Answer Once answer). Optional until the API sends it. */
  pinned?: boolean;
  /** Set when this post is the creator's answer to a repeated question (F32). */
  answerGroup?: { id: string; askedCount: number } | null;
  /** When the creator loved it ("Loved by {creator}"); null when not loved. */
  lovedAt: ISODate | null;
  /** Set when the post is an entry to a creator challenge (posts.ask_id). */
  challenge: { id: string; title: string; status: ChallengeStatus } | null;
}

/** A blurred placeholder shown to non-members (first 3 titles only). */
export interface LockedPostPreview {
  id: string;
  type: PostType;
  title: string;
}

/** GET /api/spaces/:handle/communities/:slug/posts */
export interface FeedPage extends Page<PostCard> {
  community: PublicCommunity;
  counts: Record<PostType, number>;
  /** True when the viewer is not a member of the space: items is empty and preview has 3 titles. */
  locked: boolean;
  preview: LockedPostPreview[];
  /** Posting needs membership of this specific community. */
  viewerJoinedCommunity: boolean;
}

export interface CommentItem {
  id: string;
  body: string;
  author: MemberRef;
  createdAt: ISODate;
  isOwn: boolean;
}

export interface RoleSlot {
  role: string;
  filled: boolean;
  filledBy: MemberRef | null;
  /** Number of pending requests for this role. */
  requestCount: number;
}

/** GET /api/posts/:id (member view: no AI fields). */
export interface PostDetail extends PostCard {
  body: string;
  links: LinkItem[];
  updatedAt: ISODate;
  /** Author may edit content within 24 hours of creating the post. */
  canEdit: boolean;
  editableUntil: ISODate;
  roles: RoleSlot[];
  /** Accepted members for everyone; the author also sees requested and declined. */
  team: TeamMember[];
  viewerTeam: { role: string; status: TeamStatus } | null;
  comments: CommentItem[];
}

/** PUT/DELETE /api/posts/:id/signals/:kind */
export interface SignalState {
  useCount: number;
  buildCount: number;
  viewerSignals: SignalKind[];
}

/** A pitch as its sender sees it. */
export interface Pitch {
  id: string;
  type: PitchType;
  subject: string;
  body: string;
  links: LinkItem[];
  status: PitchStatus;
  creatorReply: string | null;
  repliedAt: ISODate | null;
  createdAt: ISODate;
  canWithdraw: boolean;
  // Pitch Tracker (F31). Optional until the API sends them.
  /** First time the creator opened it; null when unread or when read receipts are off. */
  readAt?: ISODate | null;
  shortlistedAt?: ISODate | null;
  /** Set when the reply came from Answer Once (F32): how many people got it, and the pinned post. */
  answeredGroup?: { count: number; postHref: string } | null;
}

/** GET /api/spaces/:handle/me */
export interface MySpace {
  /** showReadReceipts: whether the tracker draws a Read step (the creator's setting). */
  space: Pick<PublicSpace, 'handle' | 'displayName' | 'avatarUrl'> & { showReadReceipts?: boolean };
  membership: OwnMembership;
  communities: PublicCommunity[];
  posts: PostCard[];
  teams: Array<{ post: PostCard; role: string; status: TeamStatus; isLead: boolean }>;
  pitches: Pitch[];
  caps: { pitchesLeftToday: number; postsLeftToday: number };
}

// ---------------------------------------------------------------- creator studio

/** GET /api/studio/space: the creator's own space. 404 when the user has none. */
export interface StudioSpace extends PublicSpace {
  tasteProfile: TasteProfile;
  tasteVersion: number;
  createdAt: ISODate;
  communityCount: number;
  ownerName: string;
  /** Fans see when their pitch was read (F31). Optional until the API sends it. */
  showReadReceipts?: boolean;
}

// ---------------------------------------------------------------- pitch loop (F30, F32)

/** One line of the Idea Coach checklist. `found` quotes what the coach saw; `tip` says what to add. */
export interface CoachCheck {
  key: string;
  label: string;
  ok: boolean;
  found: string | null;
  tip: string | null;
}

/** POST /api/spaces/:handle/coach: clarity only, never a score or a prediction about the creator. */
export interface CoachResult {
  checks: CoachCheck[];
  suggestion: { subject: string; body: string } | null;
  checksLeftToday: number;
}

export interface QuestionAsker {
  pitchId: string;
  member: MemberRef;
  community: Pick<PublicCommunity, 'slug' | 'name' | 'tint'>;
  /** The asker's own words, cut to a quote. */
  quote: string;
  createdAt: ISODate;
}

/** GET /api/studio/question-groups: three or more pitches asking the same thing (F32 Answer Once). */
export interface QuestionGroup {
  id: string;
  /** The AI's one-line version of the question. */
  question: string;
  askedCount: number;
  askers: QuestionAsker[];
  communities: Array<Pick<PublicCommunity, 'id' | 'slug' | 'name' | 'tint' | 'icon'>>;
  /** AI draft in the creator's voice; null while the AI is pending. */
  draft: string | null;
  status: 'open' | 'answered' | 'dismissed';
  firstAskedAt: ISODate;
  answeredAt: ISODate | null;
  answer: string | null;
  pinnedIn: string[];
  /** The pinned answer post, once sent with pinning on. */
  postId: string | null;
  redraftsLeft: number;
}

/**
 * GET /api/studio/handle-check?handle= and the public GET /api/handle-available?h=. A handle is
 * taken when a space has it as its handle or a user has it as their username (one namespace).
 */
export interface HandleCheck {
  handle: string;
  available: boolean;
  reason: 'taken' | 'reserved' | 'invalid' | null;
  suggestions: string[];
}

export interface StatValue {
  value: number;
  previous: number;
  /** Percentage change vs previous; null when previous is 0. */
  changePct: number | null;
}

export interface TotalMonthToday {
  total: number;
  month: number;
  today: number;
}

export interface InboxMixSlice {
  /** AI category (pitch type) or `spam` for filtered pitches. */
  key: PitchType | 'spam';
  label: string;
  count: number;
}

export interface ActivityWeek {
  weekStart: ISODate;
  joins: number;
  ideas: number;
}

/** GET /api/studio/overview (Today). */
export interface Overview {
  stats: {
    members: StatValue;
    ideasThisWeek: StatValue;
    opportunitiesWaiting: StatValue;
  };
  thisWeek: {
    joins: TotalMonthToday;
    ideas: TotalMonthToday;
    pitches: TotalMonthToday;
  };
  inboxMix: InboxMixSlice[];
  activity: ActivityWeek[];
  /** Items still waiting for AI analysis. */
  pendingAnalysis: number;
  /** True when today's AI token budget is used up: "AI paused until tomorrow". */
  aiPaused: boolean;
}

/** POST /api/studio/sweep */
export interface SweepResponse {
  claimed: number;
  remaining: number;
}

export interface BriefingHighlight {
  index: number;
  refType: BriefingRefType;
  refId: string;
  title: string;
  why: string;
  fitScore: number | null;
  /** Dashboard link for the source item, e.g. /dashboard/ideas?item=... */
  href: string;
  feedback: FeedbackVerdict | null;
}

/** GET /api/studio/briefing, POST /api/studio/briefing/regenerate */
export interface Briefing {
  id: string | null;
  periodDate: string;
  /** `unavailable` when the AI failed or the budget is used up; counts still render. */
  status: 'ready' | 'unavailable';
  headline: string;
  highlights: BriefingHighlight[];
  watchouts: string[];
  regenerationsLeft: number;
  model: string | null;
  generatedAt: ISODate | null;
}

export interface InboxItem {
  id: string;
  type: PitchType;
  subject: string;
  excerpt: string;
  status: PitchStatus;
  isFiltered: boolean;
  sender: MemberRef;
  createdAt: ISODate;
  ai: AiInsight;
  /** The AI's category differs from the type the sender picked ("re-categorized"). */
  recategorized: boolean;
}

/** GET /api/studio/inbox */
export interface InboxPage extends Page<InboxItem> {
  counts: Record<InboxTab, number>;
}

/** GET /api/studio/inbox/:id: side panel. */
export interface InboxDetail extends InboxItem {
  body: string;
  links: LinkItem[];
  creatorReply: string | null;
  repliedAt: ISODate | null;
  senderProfile: {
    skills: string[];
    links: LinkItem[];
    joinedAt: ISODate;
    communities: Array<Pick<PublicCommunity, 'slug' | 'name' | 'tint'>>;
    pitchCount: number;
    postCount: number;
  };
  feedback: FeedbackVerdict | null;
}

/** A post in the creator's Ideas view, with AI fields and its ranking score. */
export interface IdeaItem extends PostCard {
  ai: AiInsight;
  /** Idea score 0..1 from 02-trd: 0.5 fit + 0.3 signal + 0.2 recency. */
  score: number;
  hidden: boolean;
  promotion: { id: string; state: PromotionState } | null;
}

export interface CommunityCount {
  communityId: string;
  slug: string;
  name: string;
  tint: Tint;
  count: number;
}

/** GET /api/studio/ideas */
export interface IdeasPage extends Page<IdeaItem> {
  counts: CommunityCount[];
  total: number;
}

/** GET /api/studio/posts/:id: post side panel. */
export interface StudioPostDetail extends IdeaItem {
  body: string;
  links: LinkItem[];
  roles: RoleSlot[];
  team: TeamMember[];
  comments: CommentItem[];
  feedback: FeedbackVerdict | null;
}

export interface PersonRow {
  membershipId: string;
  name: string;
  image: string | null;
  headline: string | null;
  skills: string[];
  links: LinkItem[];
  joinedAt: ISODate;
  communities: Array<Pick<PublicCommunity, 'slug' | 'name' | 'tint'>>;
  contributions: {
    posts: number;
    comments: number;
    signalsReceived: number;
    teams: number;
  };
  /** Rising score over the last 14 days (02-trd). */
  risingScore: number;
}

/** GET /api/studio/people */
export interface PeoplePage extends Page<PersonRow> {
  /** Top 10 rising contributors this fortnight. */
  rising: PersonRow[];
  total: number;
}

export interface StudioCommunity extends PublicCommunity {
  archivedAt: ISODate | null;
  postCount: number;
  postsThisWeek: number;
  joinsThisWeek: number;
  /** Member growth vs a week ago, percent; null when there were none. */
  trendPct: number | null;
  /** One-line digest (P1); null until community digests ship. */
  digest: string | null;
  createdAt: ISODate;
}

/** GET /api/studio/communities/:slug */
export interface StudioCommunityDetail {
  community: StudioCommunity;
  members: PersonRow[];
  posts: IdeaItem[];
}

export interface PromotionDraft {
  text: string;
  hashtags: string[];
}

export type PromotionDrafts = Partial<Record<PromotionPlatform, PromotionDraft>>;

export interface Promotion {
  id: string;
  postId: string;
  post: {
    title: string;
    excerpt: string;
    type: PostType;
    community: Pick<PublicCommunity, 'slug' | 'name' | 'tint'>;
    author: MemberRef;
  };
  headline: string | null;
  drafts: PromotionDrafts;
  /** Platforms the AI could not draft last time ("Couldn't draft" + Retry). */
  draftErrors: PromotionPlatform[];
  state: PromotionState;
  showcaseSlug: string | null;
  shortCode: string | null;
  /** Path on the web origin, e.g. /r/Ab3dE9xY. Null until published. */
  shortPath: string | null;
  /** Path of the public showcase, e.g. /mira/s/gym-log-app. Null until published. */
  showcasePath: string | null;
  clickCount: number;
  clicksByPlatform: Record<ClickPlatform, number>;
  publishedAt: ISODate | null;
  unpublishedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** GET /api/studio/promotions/post/:postId: composer bootstrap. */
export interface PromotionComposer {
  post: StudioPostDetail;
  promotion: Promotion | null;
}

/** GET /api/studio/promotions */
export interface PromotionsPage extends Page<Promotion> {
  counts: Record<PromotionState, number>;
  totalClicks: number;
}

/** POST /api/studio/feedback */
export interface FeedbackResponse {
  refType: string;
  refId: string;
  verdict: FeedbackVerdict | null;
}

// ---------------------------------------------------------------- followers (F23)

/** A community tag on a follower. */
export interface FollowerCommunity
  extends Pick<PublicCommunity, 'id' | 'slug' | 'name' | 'tint' | 'icon'> {
  taggedBy: FollowerTagger;
}

/**
 * A person on the creator's follower roster (imported or added by hand). Owner view only.
 * membershipId is set once the follower joined the space.
 */
export interface Follower {
  id: string;
  name: string;
  /** Without the leading @. */
  handle: string | null;
  platform: Platform | null;
  email: string | null;
  note: string | null;
  source: FollowerSource;
  communities: FollowerCommunity[];
  membershipId: string | null;
  joinedAt: ISODate | null;
  createdAt: ISODate;
}

/** GET /api/studio/followers. total follows the filters; counts are for the whole roster. */
export interface FollowersPage extends Page<Follower> {
  total: number;
  counts: { all: number; untagged: number; joined: number };
}

/** A community the AI proposes from an import's notes (clusterImport). Not created until the owner does. */
export interface ImportSuggestion {
  name: string;
  description: string;
  sampleQuotes: string[];
}

/** POST /api/studio/followers/import (201) */
export interface ImportResult {
  importId: string;
  source: Exclude<FollowerSource, 'manual'>;
  created: number;
  /** Rows matching an existing follower (same email, or same platform + handle). */
  duplicates: number;
  /** Rows that could not be read; the first 50 are listed in errors. */
  skipped: number;
  errors: Array<{ line: number; reason: string }>;
  /** Empty when suggest was false, the AI was unavailable or there were too few notes. */
  suggestions: ImportSuggestion[];
}

/** POST /api/studio/followers/tag */
export interface TagFollowersResult {
  updated: number;
}

/** POST /api/studio/followers/auto-tag */
export interface AutoTagResult {
  tagged: number;
  skipped: number;
  /** True when the AI budget is used up or the AI is unavailable: nothing was tagged. */
  aiPaused: boolean;
}

// ---------------------------------------------------------------- challenges (asks)

export type ChallengeStatus = 'open' | 'closed';

/** One shortlisted entry; stored in asks.response_summary when the challenge closes. */
export interface ChallengeShortlistItem {
  postId: string;
  title: string;
  authorName: string;
  /**
   * Why it made the list. Studio: the entry's AI reason, or a signal count. Fan list: never the AI
   * reason, only "{n} fans said they'd use this" or "Picked by {creator}".
   */
  reason: string;
}

/** The shape stored in asks.response_summary. */
export interface ChallengeResponseSummary {
  shortlist: ChallengeShortlistItem[] | null;
  winnerPostId: string | null;
}

/** A creator challenge, for the studio list and the fan list. */
export interface ChallengeSummary {
  id: string;
  title: string;
  body: string | null;
  /** Null = all communities. */
  communityId: string | null;
  communityName: string | null;
  dueAt: ISODate;
  status: ChallengeStatus;
  entryCount: number;
  /** Null until the challenge is closed. */
  shortlist: ChallengeShortlistItem[] | null;
  winnerPostId: string | null;
  createdAt: ISODate;
}

// ---------------------------------------------------------------- notifications (F21)

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  /** One plain sentence rendered by the server, e.g. "Arjun posted a new idea: Gym log app". */
  text: string;
  /** Web path to open, built like web/lib/routes.ts. */
  href: string;
  spaceHandle: string;
  readAt: ISODate | null;
  createdAt: ISODate;
}

/** GET /api/notifications */
export interface NotificationsPage extends Page<NotificationItem> {
  unread: number;
}

/** GET /api/notifications/unread, POST /api/notifications/read */
export interface UnreadCount {
  unread: number;
}

// ---------------------------------------------------------------- insights

/** One community's activity over the window. score: communityActivityScore() in limits.ts. */
export interface CommunityActivity {
  id: string;
  slug: string;
  name: string;
  tint: Tint;
  icon: CommunityIcon;
  /** Current member count. */
  members: number;
  /** Joins in the window. */
  newMembers: number;
  posts: number;
  comments: number;
  signals: number;
  /** Distinct members who posted, commented or signalled in the window. */
  activeMembers: number;
  /** Followers tagged into the community (roster, not members). */
  followers: number;
  score: number;
  /** Score over the window before this one. */
  previousScore: number;
  /** Percent change vs previousScore; null when previousScore is 0. */
  change: number | null;
}

/** GET /api/studio/analytics/communities. Sorted by score desc; archived communities excluded. */
export interface CommunityActivityReport {
  days: number;
  from: ISODate;
  to: ISODate;
  communities: CommunityActivity[];
}
