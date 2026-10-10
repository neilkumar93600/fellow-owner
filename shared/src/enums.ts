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

export const PITCH_TYPES = ['collab', 'brand_deal', 'idea', 'press', 'fan_note', 'other'] as const;
export type PitchType = (typeof PITCH_TYPES)[number];

export const PITCH_STATUSES = ['new', 'shortlisted', 'replied', 'archived', 'withdrawn'] as const;
export type PitchStatus = (typeof PITCH_STATUSES)[number];

export const TINTS = ['peach', 'lavender', 'aqua', 'lime', 'white'] as const;
export type Tint = (typeof TINTS)[number];

/** Platforms a creator lists on their space (spaces.platforms). */
export const PLATFORMS = ['youtube', 'instagram', 'x', 'tiktok', 'linkedin', 'other'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** The optional social profile on /create-account (user.social_platform). Labels: PLATFORM_LABELS. */
export const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'x', 'linkedin'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

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
  'brand_deals',
  'ideas',
  'press',
  'fan_notes',
  'filtered',
] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

/** Pitch type shown in each inbox tab. `all` and `filtered` are not type-based. */
export const INBOX_TAB_PITCH_TYPE: Record<Exclude<InboxTab, 'all' | 'filtered'>, PitchType> = {
  collabs: 'collab',
  brand_deals: 'brand_deal',
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
  'wallet',
  'backpack',
  'car',
  'sunrise',
] as const;
export type CommunityIcon = (typeof COMMUNITY_ICONS)[number];

/** How a follower got onto the roster (followers.source, text + CHECK). */
export const FOLLOWER_SOURCES = ['manual', 'csv', 'paste'] as const;
export type FollowerSource = (typeof FOLLOWER_SOURCES)[number];

/** Who put a follower in a community (follower_communities.tagged_by, text + CHECK). */
export const FOLLOWER_TAGGERS = ['creator', 'ai'] as const;
export type FollowerTagger = (typeof FOLLOWER_TAGGERS)[number];

/** notifications.kind (text + CHECK). api/src/db/schema/later.ts uses this list. */
export const NOTIFICATION_KINDS = [
  'reply_received',
  'project_featured',
  'team_request',
  'team_decision',
  'ask_posted',
  'idea_posted',
  'pitch_received',
  'comment_received',
  'post_loved',
  'spotlighted',
  'challenge_shortlisted',
  /** To the space owner when a member reports a post or comment (F25). */
  'report_filed',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Kinds that can also go out by email (hourly digest, notification_prefs.kinds). */
export const EMAIL_NOTIFICATION_KINDS = [
  'reply_received',
  'project_featured',
  'spotlighted',
  'challenge_shortlisted',
  'team_decision',
] as const satisfies readonly NotificationKind[];
export type EmailNotificationKind = (typeof EMAIL_NOTIFICATION_KINDS)[number];

/** question_groups.status (F32 Answer Once, text + CHECK). */
export const QUESTION_GROUP_STATUSES = ['open', 'answered', 'dismissed'] as const;
export type QuestionGroupStatus = (typeof QUESTION_GROUP_STATUSES)[number];

/** What a member can report (reports.target_type, F25). */
export const REPORT_TARGETS = ['post', 'comment'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_REASONS = ['spam', 'harassment', 'off_topic', 'unsafe', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** POST /api/support/requests: the contact form and the privacy request form. */
export const SUPPORT_KINDS = [
  'contact',
  'privacy_export',
  'privacy_delete',
  'privacy_other',
] as const;
export type SupportKind = (typeof SUPPORT_KINDS)[number];

/** Today "Later": what a creator can snooze (studio_snoozes.ref_type). */
export const SNOOZE_REF_TYPES = ['pitch', 'post'] as const;
export type SnoozeRefType = (typeof SNOOZE_REF_TYPES)[number];

/** POST /api/uploads/presign: what the image is for (the first segment of its storage key). */
export const UPLOAD_KINDS = ['avatar', 'space_cover', 'community_cover', 'member_avatar'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number];

/** GET /api/studio/export/:kind */
export const EXPORT_KINDS = ['ideas', 'people', 'followers', 'pitches'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

/** GET /api/studio/analytics/communities?days= */
export const ANALYTICS_WINDOWS = [7, 30] as const;
export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  idea: 'Idea',
  project: 'Fan project',
  discussion: 'Discussion',
};

/** Feed tab names (plural of POST_TYPE_LABELS). */
export const POST_TYPE_PLURAL_LABELS: Record<PostType, string> = {
  idea: 'Ideas',
  project: 'Fan projects',
  discussion: 'Discussions',
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  open: 'Open',
  forming_team: 'Finding a crew',
  building: 'In the works',
  launched: 'Made it',
};

export const SIGNAL_LABELS: Record<SignalKind, string> = {
  use: "I'd use this",
  build: 'Count me in',
};

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  requested: 'Requested',
  accepted: 'Accepted',
  declined: 'Declined',
};

export const PITCH_TYPE_LABELS: Record<PitchType, string> = {
  collab: 'Collab',
  brand_deal: 'Brand deal',
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
  brand_deals: 'Brand deals',
  ideas: 'Ideas',
  press: 'Press',
  fan_notes: 'Fan notes',
  /** What the AI kept out of the inbox (spam). Also the label on a filtered pitch. */
  filtered: 'Kept out',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  other: 'Website',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  off_topic: 'Off topic',
  unsafe: 'Unsafe',
  other: 'Something else',
};

export const PROMOTION_STATE_LABELS: Record<PromotionState, string> = {
  draft: 'Draft',
  live: 'Live',
  unpublished: 'Unpublished',
};
