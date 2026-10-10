import type { NewsletterSource } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { maskEmail } from '../lib/logger.js';
import { signToken, verifyToken } from '../lib/signed-token.js';
import { withinCap } from '../middlewares/rate-limit.js';

export type NewsletterServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'mailer' | 'logger'>;

const CONFIRM = 'newsletter-confirm';
const UNSUBSCRIBE = 'newsletter-unsubscribe';
const CONFIRM_TTL_SECONDS = 7 * 24 * 3600;

/** Confirmation emails a day in all (each address also gets at most one per 24 h: the repo). */
export const NEWSLETTER_CONFIRMS_PER_DAY = 200;

export type NewsletterOutcome = 'confirmed' | 'unsubscribed' | 'invalid';

export function createNewsletterService(deps: NewsletterServiceDeps) {
  const { env } = deps;
  // Email links open web pages with a button that POSTs the token: a GET never changes state, so
  // mail link scanners cannot confirm or unsubscribe anyone.
  const page = (path: 'confirm' | 'unsubscribe', token: string) =>
    `${env.WEB_ORIGIN}/newsletter/${path}?token=${encodeURIComponent(token)}`;
  // RFC 8058 one-click: the mail client POSTs here (through the web's /api rewrite).
  const oneClick = (token: string) =>
    `${env.BETTER_AUTH_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

  return {
    /**
     * Double opt-in: stores the sign-up and mails a confirm link when the address still has to
     * confirm, at most once per address per 24 h and NEWSLETTER_CONFIRMS_PER_DAY in all. Never
     * says whether the email was already on the list or was skipped, and a mail failure is only
     * logged, so the answer is the same for every address.
     */
    async subscribe(email: string, source: NewsletterSource): Promise<void> {
      if (!(await deps.repos.newsletter.requestOptIn(email, source))) return;
      const allowed = await withinCap({
        name: 'newsletter-confirm-day',
        key: 'all',
        windowSeconds: 86_400,
        max: NEWSLETTER_CONFIRMS_PER_DAY,
      });
      if (!allowed) {
        deps.logger.warn({ to: maskEmail(email) }, 'newsletter confirm email skipped: daily cap');
        return;
      }
      const confirm = signToken(CONFIRM, email, env.BETTER_AUTH_SECRET, CONFIRM_TTL_SECONDS);
      const unsubscribe = signToken(UNSUBSCRIBE, email, env.BETTER_AUTH_SECRET);
      try {
        await deps.mailer.send({
          to: email,
          subject: 'Confirm your Fellow Owners notes',
          text: `Confirm your email to get creator notes once a month:\n\n${page('confirm', confirm)}\n\nIf this was not you, ignore this email and nothing happens. To be removed for good: ${page('unsubscribe', unsubscribe)}`,
          headers: {
            'List-Unsubscribe': `<${oneClick(unsubscribe)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
      } catch (err) {
        deps.logger.warn({ err, to: maskEmail(email) }, 'newsletter confirm email failed');
      }
    },

    /** The confirm button (POST): 'confirmed', or 'invalid' for a bad or expired token. */
    async confirm(token: string): Promise<NewsletterOutcome> {
      const email = verifyToken(CONFIRM, token, env.BETTER_AUTH_SECRET);
      if (!email) return 'invalid';
      await deps.repos.newsletter.confirm(email);
      return 'confirmed';
    },

    /** The unsubscribe button or a one-click POST: 'unsubscribed', or 'invalid'. */
    async unsubscribe(token: string): Promise<NewsletterOutcome> {
      const email = verifyToken(UNSUBSCRIBE, token, env.BETTER_AUTH_SECRET);
      if (!email) return 'invalid';
      await deps.repos.newsletter.unsubscribe(email);
      return 'unsubscribed';
    },

    /** Where a GET on an emailed API link goes: the web page that shows the button. */
    pageFor(path: 'confirm' | 'unsubscribe', token: string): string {
      return page(path, token);
    },
  };
}

export type NewsletterService = ReturnType<typeof createNewsletterService>;
