import { z } from 'zod';
import { PLATFORMS, type Platform } from './enums.js';
import { type BestTimeBasis, timeZoneSchema } from './performance.js';
import { httpUrlSchema } from './schemas/space.js';
import type { ISODate } from './types.js';

// F3 Content planner (creator only, /api/spaces/:handle/planner/...): plan and remind, never
// publish. Items sit on a week/month calendar or a list; the hourly tick (`planner_reminders`)
// sends an in-app notification and an email for items due within the next hour; the reminder view
// copies the caption and opens the platform. AI suggests best times (from F1 data) and caption drafts.

export const PLAN_ITEM_STATUSES = ['planned', 'reminded', 'posted', 'skipped'] as const;
export type PlanItemStatus = (typeof PLAN_ITEM_STATUSES)[number];

export const PLAN_ITEM_STATUS_LABELS: Record<PlanItemStatus, string> = {
  planned: 'Planned',
  reminded: 'Reminded',
  posted: 'Posted',
  skipped: 'Skipped',
};

/** POST .../planner/items/:id/mark: posted or skipped, or `planned` to undo. */
export const PLAN_MARK_STATUSES = ['posted', 'skipped', 'planned'] as const;
export type PlanMarkStatus = (typeof PLAN_MARK_STATUSES)[number];

export const PLANNER_VIEWS = ['week', 'month', 'list'] as const;
export type PlannerView = (typeof PLANNER_VIEWS)[number];

export const PLANNER_LIMITS = {
  title: { min: 1, max: 120 },
  /** One caption for every platform of the item; the UI warns past a platform's own limit. */
  caption: { max: 5000 },
  mediaNote: { max: 500 },
  platforms: { min: 1, max: 6 },
  /** The longest range one calendar read covers (a month view with its leading and trailing days). */
  rangeDaysMax: 62,
  /** Items per space. */
  perSpace: 2000,
  /** The hourly tick reminds items due within this many minutes. */
  remindAheadMinutes: 60,
  /** AI caption drafts per space per UTC day (ai/run.ts TASK_CAPS.captionDraft). */
  captionDraftsPerDay: 30,
  captionDraftNotesMax: 1000,
  hashtagsMax: 10,
  /** Best-time slots one suggestion returns, and how far ahead they may be. */
  bestTimesMax: 5,
  bestTimesDaysAhead: 14,
} as const;

const L = PLANNER_LIMITS;

// ---------------------------------------------------------------- request schemas

const isoDateTime = z.iso.datetime({ offset: true, error: 'Pick a date and time' });

const titleSchema = z
  .string()
  .trim()
  .min(L.title.min, 'Add a title')
  .max(L.title.max, `Up to ${L.title.max} characters`);
const captionSchema = z.string().trim().max(L.caption.max, `Up to ${L.caption.max} characters`);
const mediaNoteSchema = z
  .string()
  .trim()
  .max(L.mediaNote.max, `Up to ${L.mediaNote.max} characters`);
const platformsSchema = z
  .array(z.enum(PLATFORMS))
  .min(L.platforms.min, 'Pick at least one platform')
  .max(L.platforms.max)
  .transform((platforms) => [...new Set(platforms)]);

/** POST /api/spaces/:handle/planner/items */
export const createPlanItemSchema = z.object({
  title: titleSchema,
  caption: captionSchema.nullable().optional(),
  platforms: platformsSchema,
  link: httpUrlSchema.nullable().optional(),
  mediaNote: mediaNoteSchema.nullable().optional(),
  scheduledAt: isoDateTime,
});
export type CreatePlanItemInput = z.input<typeof createPlanItemSchema>;

/** PATCH /api/spaces/:handle/planner/items/:id: any field; null clears an optional one. */
export const updatePlanItemSchema = createPlanItemSchema
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Nothing to update',
  });
export type UpdatePlanItemInput = z.input<typeof updatePlanItemSchema>;

/** POST /api/spaces/:handle/planner/items/:id/mark */
export const markPlanItemSchema = z.object({ status: z.enum(PLAN_MARK_STATUSES) });
export type MarkPlanItemInput = z.input<typeof markPlanItemSchema>;

/** GET /api/spaces/:handle/planner?from=&to= : items scheduled in [from, to), at most 62 days. */
export const planRangeQuerySchema = z
  .object({
    from: isoDateTime,
    to: isoDateTime,
    status: z.enum(PLAN_ITEM_STATUSES).optional(),
  })
  .refine(
    ({ from, to }) => {
      const span = Date.parse(to) - Date.parse(from);
      return span > 0 && span <= L.rangeDaysMax * 86_400_000;
    },
    { message: `Pick a range of up to ${L.rangeDaysMax} days`, path: ['to'] },
  );
export type PlanRangeQuery = z.output<typeof planRangeQuerySchema>;

/** POST /api/spaces/:handle/planner/best-times: no platforms = every linked one. */
export const bestTimesSchema = z.object({
  platforms: z.array(z.enum(PLATFORMS)).max(L.platforms.max).default([]),
  tz: timeZoneSchema.optional(),
  /** Earliest slot (default: now). */
  after: isoDateTime.optional(),
});
export type BestTimesInput = z.input<typeof bestTimesSchema>;

/** POST /api/spaces/:handle/planner/caption-draft (AI task captionDraft, capped per space per day). */
export const captionDraftSchema = z.object({
  title: titleSchema,
  platform: z.enum(PLATFORMS),
  /** What the post is about, in the creator's words. Untrusted text to the model. */
  notes: z
    .string()
    .trim()
    .max(L.captionDraftNotesMax, `Up to ${L.captionDraftNotesMax} characters`)
    .optional(),
  link: httpUrlSchema.optional(),
});
export type CaptionDraftInput = z.input<typeof captionDraftSchema>;

// ---------------------------------------------------------------- responses

export interface PlanItem {
  id: string;
  title: string;
  caption: string | null;
  platforms: Platform[];
  link: string | null;
  mediaNote: string | null;
  scheduledAt: ISODate;
  status: PlanItemStatus;
  /** When the reminder went out; null before. */
  remindedAt: ISODate | null;
  /** When it was marked posted or skipped; null otherwise. */
  completedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** GET /api/spaces/:handle/planner: items scheduled in [from, to), soonest first. */
export interface PlanRange {
  from: ISODate;
  to: ISODate;
  items: PlanItem[];
}

export interface BestTimeSlot {
  /** A concrete upcoming time; the web shows it in the viewer's zone. */
  at: ISODate;
  /** The platform it suits best; null when it fits all of them. */
  platform: Platform | null;
  /** One plain sentence, e.g. "Your Tuesday 9am posts get the most views". */
  reason: string;
}

/** POST /api/spaces/:handle/planner/best-times */
export interface BestTimes {
  basedOn: BestTimeBasis;
  slots: BestTimeSlot[];
}

/** POST /api/spaces/:handle/planner/caption-draft: a draft the creator edits; nothing is posted. */
export interface CaptionDraft {
  caption: string;
  /** Without '#', at most PLANNER_LIMITS.hashtagsMax. */
  hashtags: string[];
  draftsLeftToday: number;
}
