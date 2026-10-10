import { Resend } from 'resend';
import type { Env } from '../config/env.js';
import { type Logger, maskEmail } from './logger.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** e.g. List-Unsubscribe and List-Unsubscribe-Post on every non-transactional email. */
  headers?: Record<string, string>;
  replyTo?: string;
}

export interface Mailer {
  /** Resolves once Resend accepted the message; rejects when Resend refuses it. */
  send(message: MailMessage): Promise<void>;
}

/**
 * The one way the API sends email (OTP codes stay in auth/email.ts). Sender: env.EMAIL_FROM.
 * Without RESEND_API_KEY (dev, tests) the message is logged instead of sent and never throws.
 */
export function createMailer(deps: {
  env: Pick<Env, 'RESEND_API_KEY' | 'EMAIL_FROM'>;
  logger: Logger;
}): Mailer {
  const log = deps.logger.child({ module: 'mailer' });
  const key = deps.env.RESEND_API_KEY;

  if (!key) {
    return {
      async send({ to, subject }) {
        log.info({ to: maskEmail(to), subject }, 'email not sent (no RESEND_API_KEY)');
      },
    };
  }

  const resend = new Resend(key);
  return {
    async send({ to, subject, text, html, headers, replyTo }) {
      const { data, error } = await resend.emails.send({
        from: deps.env.EMAIL_FROM,
        to: [to],
        subject,
        text,
        ...(html ? { html } : {}),
        ...(headers ? { headers } : {}),
        ...(replyTo ? { replyTo } : {}),
      });
      if (error) {
        log.error({ to: maskEmail(to), subject, err: error }, 'email failed');
        throw new Error(`Resend rejected the email: ${error.message}`);
      }
      log.info({ to: maskEmail(to), subject, id: data?.id }, 'email sent');
    },
  };
}
