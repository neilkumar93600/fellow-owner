import type { SupportRequestInput } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { maskEmail } from '../lib/logger.js';

export type SupportServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'mailer' | 'logger'>;

/** Contact and privacy requests: stored, emailed to ADMIN_EMAILS, acknowledged. */
export function createSupportService(deps: SupportServiceDeps) {
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
      const sends = [
        ...deps.env.ADMIN_EMAILS.map((to) => ({
          to,
          subject: `${subject}: ${name ?? email}`,
          text: `From: ${name ? `${name} <${email}>` : email}\nKind: ${input.kind}\n\n${message}`,
          replyTo: email,
        })),
        {
          to: email,
          subject: 'We got your message',
          text: `Hi${name ? ` ${name}` : ''},\n\nWe received your message and will reply by email. For reference, you wrote:\n\n${message}\n\nFellow Owners`,
        },
      ];
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
