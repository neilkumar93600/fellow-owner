// Every length limit and daily cap from 05-backend-schema, in one place.
// The browser validates with these through the zod schemas, and the API validates again.
// The database repeats the critical ones as CHECK constraints.

/** One namespace (spec §11): a space handle and a username are the same thing, under one rule set. */
const HANDLE = { min: 3, max: 30, pattern: /^[a-z0-9_.]+$/ } as const;

export const LIMITS = {
  handle: HANDLE,
  /** The handle a person signs in with; always the same rules as `handle` (one namespace). */
  username: HANDLE,
  /** Better Auth's bounds for email and password accounts. */
  password: { min: 8, max: 128 },
  /** The optional social handle on /create-account: fits Instagram, TikTok, YouTube, X and LinkedIn. */
  socialHandle: { max: 100, pattern: /^[A-Za-z0-9._-]+$/ },
  space: {
    displayName: { min: 1, max: 60 },
    bio: { max: 160 },
    platforms: { max: 6 },
  },
  tasteProfile: {
    promote: { min: 1, max: 10 },
    never: { min: 0, max: 10 },
    lineMax: 120,
    voice: { min: 0, max: 5 },
    voiceSampleMax: 600,
  },
  community: {
    slug: { min: 2, max: 40, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    name: { min: 2, max: 40 },
    description: { max: 200 },
    perSpace: { max: 20 },
  },
  membership: {
    name: { min: 1, max: 60 },
    headline: { max: 80 },
    intro: { max: 280 },
    /** Shortest intro the AI will suggest communities for. */
    introMinForSuggestions: 10,
    skills: { max: 10, itemMax: 30 },
    links: { max: 5 },
  },
  link: {
    labelMax: 40,
    urlMax: 2048,
  },
  post: {
    title: { min: 5, max: 120 },
    body: { min: 20, max: 5000 },
    rolesNeeded: { max: 5, itemMin: 2, itemMax: 30 },
    links: { max: 5 },
    /** Authors can edit for this long after creating a post. */
    editWindowHours: 24,
    excerptMax: 180,
  },
  comment: {
    body: { min: 1, max: 2000 },
  },
  pitch: {
    subject: { min: 5, max: 120 },
    body: { min: 20, max: 3000 },
    links: { max: 3 },
    reply: { min: 1, max: 2000 },
  },
  promotion: {
    headline: { max: 100 },
    hashtags: { max: 5, itemMax: 40 },
    /** Character limits per platform for draft text. */
    text: {
      x: 280,
      instagram: 2200,
      linkedin: 3000,
      youtube: 5000,
    },
    shortCodeLength: 8,
  },
  /** The creator's follower roster (F23): imported or added by hand, tagged into communities. */
  follower: {
    name: { min: 1, max: 80 },
    /** Stored without the leading @. */
    handle: { max: 60 },
    email: { max: 254 },
    /** What they said (a comment, bio or DM excerpt); the AI tags from it. */
    note: { max: 500 },
    importRows: 500,
    importChars: 200_000,
    /** Line-level errors an import reports back. */
    importErrorsMax: 50,
    perSpace: 5000,
    communitiesPerFollower: 10,
    /** Followers per tag or auto-tag call. */
    bulkMax: 500,
  },
  notification: {
    /** Ids per mark-read call. */
    markReadMax: 100,
  },
  search: {
    queryMax: 100,
  },
  ai: {
    summaryMax: 140,
    fitReasonMax: 220,
    tagsMax: 5,
    skillsMax: 5,
    /** Item text is cut to this many characters before triage. */
    inputCharsMax: 4000,
    /** An item is marked `failed` after this many attempts. */
    maxAttempts: 3,
    embeddingDimensions: 1536,
    defaultDailyTokenBudget: 200_000,
  },
  briefing: {
    highlights: { min: 3, max: 5 },
    watchoutsMax: 2,
    candidatesMax: 40,
    regenerationsPerDay: 5,
    whyMax: 220,
    headlineMax: 160,
  },
  /** F30 Idea Coach: clarity checks per member per day. */
  coach: { perDay: 10, minBodyChars: 20 },
  /** F32 Answer Once: grouping and drafting. */
  answerOnce: {
    /** A group needs at least this many pitches asking the same thing. */
    minGroupSize: 3,
    windowDays: 30,
    redraftsPerDay: 5,
  },
  sweep: {
    /** Items claimed per sweep call. */
    claimMax: 25,
    /** Items analyzed concurrently. */
    batchSize: 5,
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 50,
  },
  otp: {
    length: 6,
    expiresInSeconds: 600,
    allowedAttempts: 5,
    resendAfterSeconds: 30,
  },
} as const;

/** Write caps per user per space per UTC day, counted from created_at. */
export const DAILY_CAPS = {
  pitches: 5,
  posts: 20,
  comments: 100,
  /** Per space per day (promoteDrafts AI task). */
  promoteDrafts: 10,
  /** Per space per day (askAI AI task, P1). */
  askAI: 30,
  /** Per space per day ("Reply in my voice" drafts, suggestReply AI task). */
  suggestReply: 30,
  /** Per space per day (fan spotlight drafts, spotlightNote AI task). */
  spotlightNote: 30,
} as const;

/** Rolling-hour caps per user, counted from ai_runs. */
export const HOURLY_CAPS = {
  suggestCommunities: 10,
} as const;

/** Retention rules from 05-backend-schema section 8. */
export const RETENTION_DAYS = {
  /** Soft-deleted posts and comments are hard-deleted after this. */
  softDeleted: 30,
  clickEvents: 180,
  aiRuns: 90,
  digests: 30,
} as const;

/** Ranking weights from 02-trd ("Ranking"). */
export const RANKING = {
  idea: {
    fitWeight: 0.5,
    signalWeight: 0.3,
    recencyWeight: 0.2,
    /** fit used while analysis is pending (0..1). */
    pendingFit: 0.5,
    /** signal = min(1, log1p(use + 2*build + 0.5*comments) / log1p(signalSaturation)) */
    signalSaturation: 50,
    recencyHalfLifeHours: 72,
  },
  inbox: {
    /** Fit score used for pending items in the Fit sort. */
    pendingFitScore: 50,
  },
  rising: {
    windowDays: 14,
    teamJoinBonus: 0.1,
    top: 10,
  },
  /** Opportunities waiting = new, not filtered, fit at or above this. */
  opportunityFitMin: 70,
} as const;

/** Fit pill colour bands from 04-ui-ux-brief. */
export const FIT_BANDS = {
  low: { min: 0, max: 39 },
  mid: { min: 40, max: 69 },
  high: { min: 70, max: 100 },
} as const;

export type FitBand = keyof typeof FIT_BANDS;

export function fitBand(score: number): FitBand {
  if (score >= FIT_BANDS.high.min) return 'high';
  if (score >= FIT_BANDS.mid.min) return 'mid';
  return 'low';
}

/**
 * Community activity score (GET /api/studio/analytics/communities), counted over the window.
 * Defined once here so the API ranks with it and the UI can explain it.
 */
export const COMMUNITY_ACTIVITY_WEIGHTS = {
  posts: 3,
  comments: 2,
  signals: 1,
  newMembers: 2,
} as const;

export const COMMUNITY_ACTIVITY_FORMULA =
  'Activity = 3 per post + 2 per comment + 1 per signal + 2 per new member in the period.';

export function communityActivityScore(counts: {
  posts: number;
  comments: number;
  signals: number;
  newMembers: number;
}): number {
  const w = COMMUNITY_ACTIVITY_WEIGHTS;
  return (
    counts.posts * w.posts +
    counts.comments * w.comments +
    counts.signals * w.signals +
    counts.newMembers * w.newMembers
  );
}
