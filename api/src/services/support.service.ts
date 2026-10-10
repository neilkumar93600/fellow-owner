import type { SupportRequestInput } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { maskEmail } from '../lib/logger.js';
import type { MailMessage } from '../lib/mailer.js';
import { withinCap } from '../middlewares/rate-limit.js';

export type SupportServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'mailer' | 'logger'>;

const DAY_SECONDS = 86_400;

/**
 * Email caps that do not depend on the caller's IP (a direct caller can forge X-Forwarded-For):
 * one acknowledgement per address per 24 h, 50 acknowledgements and 200 admin notices a day in
 * all. Requests over a cap are still stored; only the email is skipped.
 */
export const SUPPORT_EMAIL_CAPS = { ackPerAddress: 1, ackPerDay: 50, adminPerDay: 200 } as const;

/**
 * The acknowledgement is fixed text: it never repeats the sender's name or message, so the form
 * cannot be used to mail someone else's words to any address from our domain.
 */
export const SUPPORT_ACK = {
  subject: 'We got your message',
  text: 'Hi,\n\nWe received a message sent from this address through the Fellow Owners contact form and will reply by email.\n\nIf you did not write to us, you can ignore this email.\n\nFellow Owners',
} as const;

/** Contact and privacy requests: stored, emailed to ADMIN_EMAILS, acknowledged. */
export function createSupportService(deps: SupportServiceDeps) {
  const cap = (name: string, key: string, max: number) =>
    withinCap({ name, key, windowSeconds: DAY_SECONDS, max });

  return {
    /**
     * A filled honeypot is silently dropped (the route still answers 202). Mail failures are
     * logged, never surfaced: the request is stored, and the answer must not depend on Resend.
     */
    async submit(input: SupportRequestInput, userId: string | null): Promise<void> {
      if (input.website) return;
      const email = input.email.trim().toLowerCase();
      const name = input.name?.trim() || null;
      const message = input.message.trim();
      await deps.repos.support.create({ kind: input.kind, name, email, message, userId });

      const subject = `Fellow Owners support (${input.kind})`;
      const sends: MailMessage[] = [];
      if (
        deps.env.ADMIN_EMAILS.length > 0 &&
        (await cap('support-admin-day', 'all', SUPPORT_EMAIL_CAPS.adminPerDay))
      ) {
        sends.push(
          ...deps.env.ADMIN_EMAILS.map((to) => ({
            to,
            subject: `${subject}: ${name ?? email}`,
            text: `From: ${name ? `${name} <${email}>` : email}\nKind: ${input.kind}\n\n${message}`,
            replyTo: email,
          })),
        );
      }
      // Per address first, so repeats to one address do not use up the daily total.
      if (
        (await cap('support-ack', email, SUPPORT_EMAIL_CAPS.ackPerAddress)) &&
        (await cap('support-ack-day', 'all', SUPPORT_EMAIL_CAPS.ackPerDay))
      ) {
        sends.push({ to: email, ...SUPPORT_ACK });
      }
      const results = await Promise.allSettled(sends.map((mail) => deps.mailer.send(mail)));
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          deps.logger.warn(
            { err: result.reason, to: maskEmail(sends[i]?.to ?? '') },
            'support email failed',
          );
        }
      });
    },
  };
}

export type SupportService = ReturnType<typeof createSupportService>;
