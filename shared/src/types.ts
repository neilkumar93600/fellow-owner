// API response shapes. The api returns exactly these; web/src/api types its client with them.
// Dates are ISO 8601 strings. Lists use cursor pagination: { items, nextCursor }.
// AI fields (AiInsight) only ever appear in /api/studio responses (owner view).

import type {
  AnalysisStatus,
  BriefingRefType,
  ClickPlatform,
  CommunityIcon,
  FeedbackVerdict,
  InboxTab,
  MembershipRole,
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
}

export interface TeamMember extends MemberRef {
  role: string;
  status: TeamStatus;
  isLead: boolean;
  createdAt: ISODate;
}

/** GET /api/spaces/:handle/showcase/:slug (public). */
export interface Showcase {
  space: Pick<PublicSpace, 'handle' | 'displayName' | 'avatarUrl'>;
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
}

/** GET /api/spaces/:handle/me */
export interface MySpace {
  space: Pick<PublicSpace, 'handle' | 'displayName' | 'avatarUrl'>;
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
  isDemo: boolean;
  createdAt: ISODate;
  communityCount: number;
  ownerName: string;
}

/** GET /api/studio/handle-check?handle= */
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
