import { z } from 'zod';
import { LIMITS } from '../limits.js';
import { cursorQuerySchema, handleParamsSchema, idSchema } from './space.js';

const spaceFilterSchema = handleParamsSchema.shape.handle;

/** GET /api/notifications?space=<handle>: the signed-in user's notifications, newest first. */
export const notificationsQuerySchema = cursorQuerySchema.extend({
  space: spaceFilterSchema.optional(),
});
export type NotificationsQuery = z.output<typeof notificationsQuerySchema>;

/** GET /api/notifications/unread?space=<handle> */
export const unreadNotificationsQuerySchema = z.object({
  space: spaceFilterSchema.optional(),
});
export type UnreadNotificationsQuery = z.output<typeof unreadNotificationsQuerySchema>;

/** POST /api/notifications/read. No ids = mark all read (within `space` when given). */
export const markNotificationsReadSchema = z.object({
  ids: z
    .array(idSchema)
    .min(1)
    .max(LIMITS.notification.markReadMax)
    .transform((ids) => [...new Set(ids)])
    .optional(),
  space: spaceFilterSchema.optional(),
});
export type MarkNotificationsReadInput = z.input<typeof markNotificationsReadSchema>;
