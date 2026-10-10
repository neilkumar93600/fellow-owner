import { z } from 'zod';
import { EMAIL_NOTIFICATION_KINDS } from '../enums.js';

/** PUT /api/me/notification-prefs. Kinds left out keep their current value (default on). */
export const notificationPrefsSchema = z.object({
  emailEnabled: z.boolean(),
  kinds: z.partialRecord(z.enum(EMAIL_NOTIFICATION_KINDS), z.boolean()),
});
export type NotificationPrefsInput = z.input<typeof notificationPrefsSchema>;
