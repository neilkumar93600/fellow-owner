import { newsletterTokenQuerySchema, notificationPrefsSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { badRequest } from '../lib/errors.js';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, queryOf } from '../middlewares/validate.js';
import type { NotificationEmailsService } from '../services/notification-emails.service.js';

/** /api/me/notification-prefs (session) and /api/email/unsubscribe (signed token). */
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
    /** GET /api/email/unsubscribe?token= -> 302 /email-preferences?token= (the page's button POSTs). */
    async unsubscribePage(req: Request, res: Response): Promise<void> {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      res.redirect(
        302,
        `${deps.env.WEB_ORIGIN}/email-preferences?token=${encodeURIComponent(token)}`,
      );
    },
    /**
     * POST /api/email/unsubscribe?token= : the page's button or the mail client's one-click POST
     * (RFC 8058; the form body is not needed). -> {unsubscribed: true}; 400 for a bad token.
     */
    async unsubscribeOneClick(req: Request, res: Response): Promise<void> {
      const { token } = queryOf(req, newsletterTokenQuerySchema);
      if (!(await notificationEmails.unsubscribe(token))) {
        throw badRequest('That unsubscribe link did not work. It may be incomplete.');
      }
      res.json({ unsubscribed: true });
    },
  };
}

export type NotificationPrefsController = ReturnType<typeof createNotificationPrefsController>;
