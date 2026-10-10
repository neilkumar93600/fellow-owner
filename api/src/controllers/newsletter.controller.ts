import { newsletterSubscribeSchema } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { rateLimited } from '../lib/errors.js';
import { PRIVATE_NO_STORE } from '../lib/http.js';
import { bodyOf } from '../middlewares/validate.js';
import type { NewsletterService } from '../services/newsletter.service.js';

/** POST /api/newsletter sign-ups one client (IP) may make per minute. */
export const NEWSLETTER_PER_MINUTE = 5;
const MINUTE_MS = 60_000;

export function createNewsletterController(deps: { newsletter: NewsletterService }) {
  // ponytail: per-process fixed window, same as handle-available in public.controller.ts;
  // move to Redis if one IP spread over replicas matters.
  const hits = new Map<string, { count: number; resetAt: number }>();

  function allow(ip: string): boolean {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [key, window] of hits) if (window.resetAt <= now) hits.delete(key);
    }
    const window = hits.get(ip);
    if (!window || window.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + MINUTE_MS });
      return true;
    }
    window.count += 1;
    return window.count <= NEWSLETTER_PER_MINUTE;
  }

  return {
    /** POST /api/newsletter -> {ok: true}, new or already subscribed alike (no enumeration). */
    async subscribe(req: Request, res: Response): Promise<void> {
      res.set('Cache-Control', PRIVATE_NO_STORE);
      if (!allow(req.ip ?? 'unknown')) {
        throw rateLimited('Too many sign-ups. Try again in a minute.');
      }
      const { email, source } = bodyOf(req, newsletterSubscribeSchema);
      await deps.newsletter.subscribe(email, source);
      res.json({ ok: true });
    },
  };
}
