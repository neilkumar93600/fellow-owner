import type { NotificationPrefs, NotificationPrefsInput } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type NotificationEmailsServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'mailer' | 'logger'>;

/** Email channel for notifications: prefs, hourly digest, one-click unsubscribe. Stub: F12. */
export function createNotificationEmailsService(_deps: NotificationEmailsServiceDeps) {
  return {
    async getPrefs(_userId: string): Promise<NotificationPrefs> {
      throw notImplemented('Notification emails');
    },
    async updatePrefs(_userId: string, _input: NotificationPrefsInput): Promise<NotificationPrefs> {
      throw notImplemented('Notification emails');
    },
    /** A signed `email-unsubscribe` token -> unsubscribed; false for a bad token. */
    async unsubscribe(_token: string): Promise<boolean> {
      throw notImplemented('Notification emails');
    },
    /** The hourly digest job (tick `email_digests`); resolves with the emails sent. */
    async sendDue(_now: Date): Promise<number> {
      throw notImplemented('Notification emails');
    },
  };
}

export type NotificationEmailsService = ReturnType<typeof createNotificationEmailsService>;
