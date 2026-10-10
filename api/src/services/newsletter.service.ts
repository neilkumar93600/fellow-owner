import type { NewsletterSource } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { maskEmail } from '../lib/logger.js';
import { signToken, verifyToken } from '../lib/signed-token.js';

export type NewsletterServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'mailer' | 'logger'>;

const CONFIRM = 'newsletter-confirm';
const UNSUBSCRIBE = 'newsletter-unsubscribe';
const CONFIRM_TTL_SECONDS = 7 * 24 * 3600;

export function createNewsletterService(deps: NewsletterServiceDeps) {
  const { env } = deps;
  const link = (path: string, token: string) =>
    `${env.BETTER_AUTH_URL}/api/newsletter/${path}?token=${token}`;
  const landing = (status: 'confirmed' | 'unsubscribed' | 'invalid') =>
    `${env.WEB_ORIGIN}/newsletter/${status}`;

  return {
    /**
     * Double opt-in: stores the sign-up and mails a confirm link when the address still has to
     * confirm. Never says whether the email was already on the list, and a mail failure is only
     * logged, so the answer is the same for known and unknown addresses.
     */
    async subscribe(email: string, source: NewsletterSource): Promise<void> {
      if (!(await deps.repos.newsletter.requestOptIn(email, source))) return;
      const confirm = signToken(CONFIRM, email, env.BETTER_AUTH_SECRET, CONFIRM_TTL_SECONDS);
      const unsubscribe = signToken(UNSUBSCRIBE, email, env.BETTER_AUTH_SECRET);
      try {
        await deps.mailer.send({
          to: email,
          subject: 'Confirm your Fellow Owners notes',
          text: `Confirm your email to get creator notes once a month:\n\n${link('confirm', confirm)}\n\nIf this was not you, ignore this email and nothing happens. To be removed for good: ${link('unsubscribe', unsubscribe)}`,
        });
      } catch (err) {
        deps.logger.warn({ err, to: maskEmail(email) }, 'newsletter confirm email failed');
      }
    },

    /** Web page to send the browser to after a confirm click. */
    async confirm(token: string): Promise<string> {
      const email = verifyToken(CONFIRM, token, env.BETTER_AUTH_SECRET);
      if (!email) return landing('invalid');
      await deps.repos.newsletter.confirm(email);
      return landing('confirmed');
    },

    /** Web page to send the browser to after an unsubscribe click. */
    async unsubscribe(token: string): Promise<string> {
      const email = verifyToken(UNSUBSCRIBE, token, env.BETTER_AUTH_SECRET);
      if (!email) return landing('invalid');
      await deps.repos.newsletter.unsubscribe(email);
      return landing('unsubscribed');
    },
  };
}

export type NewsletterService = ReturnType<typeof createNewsletterService>;
