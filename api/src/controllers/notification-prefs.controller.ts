import { newsletterTokenQuerySchema, notificationPrefsSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, queryOf } from '../middlewares/validate.js';
import type { NotificationEmailsService } from '../services/notification-emails.service.js';

/** /api/me/notification-prefs (session) and GET /api/email/unsubscribe (signed token). */
export function createNotificationPrefsController(deps: {
  env: Pick<Env, 'WEB_ORIGIN'>;
  notificationEmails: NotificationEmailsService;
}) {
  const { notificationEmails } = deps;
  return {
    /** GET /api/me/notification-prefs -> NotificationPrefs */
    async get(req: Request, res: Response): Promise<void> {
      res.json(await notificationEmails.getPrefs(userIdOf(req)));
    },
    /** PUT /api/me/notification-prefs -> NotificationPrefs */
    async update(req: Request, res: Response): Promise<void> {
      const input = bodyOf(req, notificationPrefsSchema);
      res.json(await notificationEmails.updatePrefs(userIdOf(req), input));
    },
    /** GET /api/email/unsubscribe?token= -> 302 /email-preferences?status=unsubscribed|invalid */
    async unsubscribe(req: Request, res: Response): Promise<void> {
      const { token } = queryOf(req, newsletterTokenQuerySchema);
      const ok = await notificationEmails.unsubscribe(token);
      const status = ok ? 'unsubscribed' : 'invalid';
      res.redirect(302, `${deps.env.WEB_ORIGIN}/email-preferences?status=${status}`);
    },
    /** POST /api/email/unsubscribe?token= : the mail client's one-click POST (RFC 8058); no redirect. */
    async unsubscribeOneClick(req: Request, res: Response): Promise<void> {
      const { token } = queryOf(req, newsletterTokenQuerySchema);
      res.status((await notificationEmails.unsubscribe(token)) ? 200 : 400).json({});
    },
  };
}

export type NotificationPrefsController = ReturnType<typeof createNotificationPrefsController>;
