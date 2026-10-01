// Every enum here mirrors a Postgres enum in api/src/db/schema/enums.ts (see 05-backend-schema).
// Keep the value lists in the same order as the database.

export const ANALYSIS_STATUSES = ['pending', 'done', 'failed'] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export const MEMBERSHIP_ROLES = ['owner', 'member'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const POST_TYPES = ['idea', 'project', 'discussion'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_STATUSES = ['open', 'forming_team', 'building', 'launched'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const SIGNAL_KINDS = ['use', 'build'] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

export const TEAM_STATUSES = ['requested', 'accepted', 'declined'] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export const PITCH_TYPES = ['collab', 'investment', 'idea', 'press', 'fan_note', 'other'] as const;
export type PitchType = (typeof PITCH_TYPES)[number];

export const PITCH_STATUSES = ['new', 'shortlisted', 'replied', 'archived', 'withdrawn'] as const;
export type PitchStatus = (typeof PITCH_STATUSES)[number];

export const TINTS = ['peach', 'lavender', 'aqua', 'lime', 'white'] as const;
export type Tint = (typeof TINTS)[number];

/** Platforms a creator lists on their space (spaces.platforms). */
export const PLATFORMS = ['youtube', 'instagram', 'x', 'tiktok', 'linkedin', 'other'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Platforms the Promote composer drafts for (promotions.drafts keys). */
export const PROMOTION_PLATFORMS = ['x', 'instagram', 'linkedin', 'youtube'] as const;
export type PromotionPlatform = (typeof PROMOTION_PLATFORMS)[number];

/** Values accepted in `?p=` on /r/{code} (click_events.platform). */
export const CLICK_PLATFORMS = ['x', 'instagram', 'linkedin', 'youtube', 'other'] as const;
export type ClickPlatform = (typeof CLICK_PLATFORMS)[number];

export const PROMOTION_STATES = ['draft', 'live', 'unpublished'] as const;
export type PromotionState = (typeof PROMOTION_STATES)[number];

export const FEEDBACK_REF_TYPES = ['post', 'inbound', 'briefing_highlight'] as const;
export type FeedbackRefType = (typeof FEEDBACK_REF_TYPES)[number];

export const FEEDBACK_VERDICTS = ['up', 'down'] as const;
export type FeedbackVerdict = (typeof FEEDBACK_VERDICTS)[number];

/** What a briefing highlight points at. */
export const BRIEFING_REF_TYPES = ['post', 'inbound', 'membership'] as const;
export type BriefingRefType = (typeof BRIEFING_REF_TYPES)[number];

/** Inbox tabs in the creator dashboard. `filtered` holds pitches the AI flagged as spam. */
export const INBOX_TABS = [
  'all',
  'collabs',
  'investment',
  'ideas',
  'press',
  'fan_notes',
  'filtered',
] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

/** Pitch type shown in each inbox tab. `all` and `filtered` are not type-based. */
export const INBOX_TAB_PITCH_TYPE: Record<Exclude<InboxTab, 'all' | 'filtered'>, PitchType> = {
  collabs: 'collab',
  investment: 'investment',
  ideas: 'idea',
  press: 'press',
  fan_notes: 'fan_note',
};

export const INBOX_SORTS = ['fit', 'newest'] as const;
export type InboxSort = (typeof INBOX_SORTS)[number];

export const IDEAS_VIEWS = ['ranked', 'board'] as const;
export type IdeasView = (typeof IDEAS_VIEWS)[number];

/** Lucide icon names a community can use (kebab-case, as in lucide's icon names). */
export const COMMUNITY_ICONS = [
  'users',
  'code-2',
  'pen-tool',
  'line-chart',
  'music',
  'dumbbell',
  'leaf',
  'camera',
  'gamepad-2',
  'book-open',
  'rocket',
  'heart',
  'globe',
  'mic',
  'palette',
  'utensils',
] as const;
export type CommunityIcon = (typeof COMMUNITY_ICONS)[number];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  idea: 'Idea',
  project: 'Project',
  discussion: 'Discussion',
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  open: 'Open',
  forming_team: 'Forming team',
  building: 'Building',
  launched: 'Launched',
};

export const SIGNAL_LABELS: Record<SignalKind, string> = {
  use: "I'd use this",
  build: "I'd help build",
};

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  requested: 'Requested',
  accepted: 'Accepted',
  declined: 'Declined',
};

export const PITCH_TYPE_LABELS: Record<PitchType, string> = {
  collab: 'Collab',
  investment: 'Investment',
  idea: 'Idea',
  press: 'Press',
  fan_note: 'Fan note',
  other: 'Other',
};

export const PITCH_STATUS_LABELS: Record<PitchStatus, string> = {
  new: 'New',
  shortlisted: 'Shortlisted',
  replied: 'Replied',
  archived: 'Archived',
  withdrawn: 'Withdrawn',
};

export const INBOX_TAB_LABELS: Record<InboxTab, string> = {
  all: 'All',
  collabs: 'Collabs',
  investment: 'Investment',
  ideas: 'Ideas',
  press: 'Press',
  fan_notes: 'Fan notes',
  filtered: 'Filtered',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  other: 'Website',
};

export const PROMOTION_STATE_LABELS: Record<PromotionState, string> = {
  draft: 'Draft',
  live: 'Live',
  unpublished: 'Unpublished',
};
