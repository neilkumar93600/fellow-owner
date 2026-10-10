import { newsletterSubscribeSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { badRequest } from '../lib/errors.js';
import { PRIVATE_NO_STORE } from '../lib/http.js';
import { bodyOf } from '../middlewares/validate.js';
import type { NewsletterService } from '../services/newsletter.service.js';

/** A missing or odd token is an invalid link, not a validation error: these come from email. */
const tokenOf = (req: Request): string =>
  typeof req.query.token === 'string' ? req.query.token : '';

export function createNewsletterController(deps: { newsletter: NewsletterService }) {
  /** The button on the web page (or a mail client's one-click POST) sends the token here. */
  const act =
    (outcome: (token: string) => Promise<string>) =>
    async (req: Request, res: Response): Promise<void> => {
      res.set('Cache-Control', PRIVATE_NO_STORE);
      const status = await outcome(tokenOf(req));
      if (status === 'invalid') throw badRequest('That link did not work. It may be too old.');
      res.json({ status });
    };

  /** A GET on an emailed API link (older emails, scanners) only goes to the page with the button. */
  const page =
    (path: 'confirm' | 'unsubscribe') =>
    async (req: Request, res: Response): Promise<void> => {
      res.set('Cache-Control', PRIVATE_NO_STORE);
      res.redirect(302, deps.newsletter.pageFor(path, tokenOf(req)));
    };

  return {
    /** POST /api/newsletter -> {ok: true}, new, known or capped alike (no enumeration). */
    async subscribe(req: Request, res: Response): Promise<void> {
      res.set('Cache-Control', PRIVATE_NO_STORE);
      const { email, source } = bodyOf(req, newsletterSubscribeSchema);
      await deps.newsletter.subscribe(email, source);
      res.json({ ok: true });
    },
    /** POST /api/newsletter/confirm?token= -> {status: 'confirmed'}; 400 for a bad token. */
    confirm: act((token) => deps.newsletter.confirm(token)),
    /** POST /api/newsletter/unsubscribe?token= -> {status: 'unsubscribed'}; 400 for a bad token. */
    unsubscribe: act((token) => deps.newsletter.unsubscribe(token)),
    /** GET /api/newsletter/confirm?token= -> 302 to the web confirm page. */
    confirmPage: page('confirm'),
    /** GET /api/newsletter/unsubscribe?token= -> 302 to the web unsubscribe page. */
    unsubscribePage: page('unsubscribe'),
  };
}
