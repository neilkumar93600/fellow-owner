import { z } from 'zod';

export const NEWSLETTER_SOURCES = ['footer'] as const;
export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];

/** POST /api/newsletter (public): always 200 {ok: true} for a well-formed email. */
export const newsletterSubscribeSchema = z.object({
  // Trim before checking the format (auth's emailSchema checks first, so " a@b.co" fails there).
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email').max(254)),
  source: z.enum(NEWSLETTER_SOURCES).default('footer'),
});
export type NewsletterSubscribeInput = z.input<typeof newsletterSubscribeSchema>;

/**
 * The signed token (api lib/signed-token.ts) of /api/newsletter/confirm and /unsubscribe. Emailed
 * links open the web pages (/newsletter/confirm, /newsletter/unsubscribe); a GET on the API only
 * redirects there, and the POST (the page's button, or one-click unsubscribe) changes the state.
 * /api/email/unsubscribe reads its `?token=` with it too.
 */
export const newsletterTokenQuerySchema = z.object({
  token: z.string().min(10).max(500),
});
