import type {
  BestTimes,
  bestTimesSchema,
  CaptionDraft,
  captionDraftSchema,
  createPlanItemSchema,
  markPlanItemSchema,
  PlanItem,
  PlanRange,
  PlanRangeQuery,
  updatePlanItemSchema,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';
import type { OwnerContext } from './access.service.js';
import type { NotificationEmailsService } from './notification-emails.service.js';
import type { NotificationsService } from './notifications.service.js';
import type { PerformanceService } from './performance.service.js';

export type CreatePlanItemBody = z.output<typeof createPlanItemSchema>;
export type UpdatePlanItemBody = z.output<typeof updatePlanItemSchema>;
export type MarkPlanItemBody = z.output<typeof markPlanItemSchema>;
export type BestTimesBody = z.output<typeof bestTimesSchema>;
export type CaptionDraftBody = z.output<typeof captionDraftSchema>;

export type PlannerServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'ai' | 'mailer' | 'logger'> & {
  /** Best times come from F1 data (performance.bestTimes). */
  performance: PerformanceService;
  /** Reminders: the in-app notification (planner_reminder) ... */
  notifications: NotificationsService;
  /** ... and the email, honouring the same prefs (getPrefs + emailAllowed, unsubscribeLinks). */
  notificationEmails: NotificationEmailsService;
};

/** What one reminder run did (tick `planner_reminders`). */
export interface PlannerReminderResult {
  due: number;
  notified: number;
  emailed: number;
  /** Why nothing ran, when nothing did. */
  skipped?: string;
}

/**
 * F3 Content planner: plan and remind, never publish. Wave A stubs: endpoint methods answer 501
 * until B2 lands; sendDueReminders is a no-op so the hourly tick records `ok`.
 */
export function createPlannerService(_deps: PlannerServiceDeps) {
  return {
    /** GET /api/spaces/:handle/planner?from=&to= : items in [from, to), soonest first. */
    async range(_owner: OwnerContext, _query: PlanRangeQuery): Promise<PlanRange> {
      throw notImplemented('The planner');
    },

    /** GET .../planner/items/:id (404 outside the space). */
    async get(_owner: OwnerContext, _id: string): Promise<PlanItem> {
      throw notImplemented('The planner');
    },

    /** POST .../planner/items (201); PLANNER_LIMITS.perSpace. */
    async create(_owner: OwnerContext, _input: CreatePlanItemBody): Promise<PlanItem> {
      throw notImplemented('The planner');
    },

    /** PATCH .../planner/items/:id; moving scheduledAt re-arms the reminder. */
    async update(_owner: OwnerContext, _id: string, _input: UpdatePlanItemBody): Promise<PlanItem> {
      throw notImplemented('The planner');
    },

    /** DELETE .../planner/items/:id (204). */
    async remove(_owner: OwnerContext, _id: string): Promise<void> {
      throw notImplemented('The planner');
    },

    /** POST .../planner/items/:id/mark: posted / skipped (completedAt), or planned to undo. */
    async mark(_owner: OwnerContext, _id: string, _input: MarkPlanItemBody): Promise<PlanItem> {
      throw notImplemented('The planner');
    },

    /** POST .../planner/best-times: from performance.bestTimes (F1). */
    async bestTimes(_owner: OwnerContext, _input: BestTimesBody): Promise<BestTimes> {
      throw notImplemented('Best times');
    },

    /** POST .../planner/caption-draft: ai.captionDraft (TASK_CAPS.captionDraft per space per day). */
    async captionDraft(_owner: OwnerContext, _input: CaptionDraftBody): Promise<CaptionDraft> {
      throw notImplemented('Caption drafts');
    },

    /** Tick `planner_reminders` (hourly): notify + email items due within the next hour, once. */
    async sendDueReminders(_now: Date): Promise<PlannerReminderResult> {
      return { due: 0, notified: 0, emailed: 0, skipped: 'not built yet' };
    },
  };
}

export type PlannerService = ReturnType<typeof createPlannerService>;
