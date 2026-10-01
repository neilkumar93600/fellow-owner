import { LIMITS } from '@fellow-owners/shared';
import { Resend } from 'resend';
import type { Env } from '../config/env.js';
import { type Logger, maskEmail } from '../lib/logger.js';

/** The OTP purposes Better Auth's emailOTP plugin sends codes for. */
export type OtpType = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';

export interface OtpMessage {
  to: string;
  code: string;
  type: OtpType;
}

export interface EmailSender {
  /** Sends a sign-in code. Rejects when the provider refuses the message. */
  sendOtp(message: OtpMessage): Promise<void>;
}

const SUBJECT_SUFFIX: Record<OtpType, string> = {
  'sign-in': 'is your Fellow Owners sign-in code',
  'email-verification': 'is your Fellow Owners verification code',
  'forget-password': 'is your Fellow Owners reset code',
  'change-email': 'confirms your new Fellow Owners email',
};

/** A short plain-text and HTML email with the code. No links: codes work in in-app browsers. */
export function renderOtpEmail(
  code: string,
  type: OtpType,
): {
  subject: string;
  text: string;
  html: string;
} {
  const minutes = Math.round(LIMITS.otp.expiresInSeconds / 60);
  const subject = `${code} ${SUBJECT_SUFFIX[type]}`;
  const text = [
    `Your code: ${code}`,
    '',
    `Type it on the sign-in screen. It expires in ${minutes} minutes.`,
    "If you didn't ask for this code, you can ignore this email.",
    '',
    'Fellow Owners',
  ].join('\n');
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
      <tr><td>
        <p style="margin:0 0 8px;font-size:15px">Your Fellow Owners code</p>
        <p style="margin:0 0 16px;font-size:32px;font-weight:600;letter-spacing:6px">${code}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#52525b">Type it on the sign-in screen. It expires in ${minutes} minutes.</p>
        <p style="margin:0;font-size:13px;color:#71717a">If you didn't ask for this code, you can ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, text, html };
}

// ---------------------------------------------------------------- dev/test outbox

const outbox = new Map<string, { code: string; type: OtpType; at: Date }>();

/**
 * The last code "sent" to an email when no RESEND_API_KEY is configured (development and tests).
 * Always undefined in production.
 */
export function peekOtp(email: string): string | undefined {
  return outbox.get(email.trim().toLowerCase())?.code;
}

export function clearOutbox(): void {
  outbox.clear();
}

/**
 * Resend when RESEND_API_KEY is set. Without it (development, tests) the code is written to the
 * log with logger.info and kept in an in-memory outbox (`peekOtp`) instead of being sent.
 */
export function createEmailSender(env: Env, logger: Logger): EmailSender {
  const log = logger.child({ module: 'email' });

  if (!env.RESEND_API_KEY) {
    if (env.isProduction) throw new Error('RESEND_API_KEY is required in production');
    return {
      async sendOtp({ to, code, type }) {
        outbox.set(to.trim().toLowerCase(), { code, type, at: new Date() });
        log.info({ to: maskEmail(to), code, type }, 'OTP email not sent (no RESEND_API_KEY): code');
      },
    };
  }

  const resend = new Resend(env.RESEND_API_KEY);
  return {
    async sendOtp({ to, code, type }) {
      const { subject, text, html } = renderOtpEmail(code, type);
      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: [to],
        subject,
        text,
        html,
      });
      if (error) {
        log.error({ to: maskEmail(to), type, err: error }, 'OTP email failed');
        throw new Error(`Resend rejected the OTP email: ${error.message}`);
      }
      log.info({ to: maskEmail(to), type, id: data?.id }, 'OTP email sent');
    },
  };
}
