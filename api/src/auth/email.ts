import { CONTACT, LIMITS, OPERATOR } from '@fellow-owners/shared';
import { Resend } from 'resend';
import type { Env } from '../config/env.js';
import { type Logger, maskEmail } from '../lib/logger.js';
import { connected, type Redis } from '../lib/redis.js';

/**
 * The purposes we email codes for: Better Auth's emailOTP plugin types, plus `delete-account`
 * (the token Better Auth's deleteUser sends, auth/index.ts).
 */
export type OtpType =
  | 'sign-in'
  | 'email-verification'
  | 'forget-password'
  | 'change-email'
  | 'delete-account';

export interface OtpMessage {
  to: string;
  code: string;
  type: OtpType;
}

export interface EmailSender {
  /** Sends a code (any OtpType). Rejects when the provider refuses the message. */
  sendOtp(message: OtpMessage): Promise<void>;
}

/** Per purpose: the subject after the code, what to do with it, and why the email arrived. */
const COPY: Record<OtpType, { subject: string; use: string; reason: string }> = {
  'sign-in': {
    subject: 'is your Fellow Owners sign-in code',
    use: 'Enter it to log in.',
    reason: 'someone asked to log in to Fellow Owners with this address',
  },
  'email-verification': {
    subject: 'is your Fellow Owners verification code',
    use: 'Enter it to confirm your email.',
    reason: 'someone created a Fellow Owners account with this address',
  },
  'forget-password': {
    subject: 'is your Fellow Owners reset code',
    use: 'Enter it to reset your password.',
    reason: 'someone asked to reset the Fellow Owners password for this address',
  },
  'change-email': {
    subject: 'confirms your new Fellow Owners email',
    use: 'Enter it to confirm your new email.',
    reason: 'someone asked to move a Fellow Owners account to this address',
  },
  'delete-account': {
    subject: 'Confirm deleting your Fellow Owners account',
    use: 'Paste it on your account page to delete your account. This can’t be undone.',
    reason: 'someone signed in to your Fellow Owners account asked to delete it',
  },
};

/** The delete code is long (Better Auth's 32-character token): shown in groups of 4. */
const groupCode = (code: string) => code.replace(/(.{4})(?=.)/g, '$1 ');

/**
 * A short plain-text and HTML email with the code, worded for what the code does. No links in the
 * body: codes work in in-app browsers, where a link would open a different browser.
 *
 * The footer carries the sender's identity and postal address, and says plainly that codes are the
 * only kind of email we send. There is no unsubscribe link because there is nothing to unsubscribe
 * from: the message exists only because someone asked for a code, and CAN-SPAM's unsubscribe duty
 * is about commercial mail. The day a digest or any other non-transactional email ships, it needs
 * its own one-click unsubscribe here, and this comment should stop being true.
 */
export function renderOtpEmail(
  code: string,
  type: OtpType,
): {
  subject: string;
  text: string;
  html: string;
} {
  const minutes = Math.round(LIMITS.otp.expiresInSeconds / 60);
  const copy = COPY[type];
  const long = type === 'delete-account';
  const shown = long ? groupCode(code) : code;
  // The delete code is too long for a subject line.
  const subject = long ? copy.subject : `${code} ${copy.subject}`;
  const text = [
    `Your code: ${shown}`,
    '',
    `${copy.use} It expires in ${minutes} minutes.`,
    "If you didn't ask for this code, you can ignore this email. Nobody can use it without your inbox.",
    '',
    `You received this because ${copy.reason}.`,
    'Codes like this one are the only email we send: no newsletter, no marketing, nothing to unsubscribe from.',
    '',
    `${OPERATOR.entity} (${OPERATOR.name})`,
    OPERATOR.address,
    `${CONTACT.support} for help, ${CONTACT.privacy} for anything about your data`,
  ].join('\n');
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
      <tr><td>
        <p style="margin:0 0 8px;font-size:15px">Your Fellow Owners code</p>
        <p style="margin:0 0 16px;font-size:${long ? '20px' : '32px'};font-weight:600;letter-spacing:${long ? '2px' : '6px'};word-break:break-word">${shown}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#52525b">${copy.use} It expires in ${minutes} minutes.</p>
        <p style="margin:0;font-size:13px;color:#52525b">If you didn't ask for this code, you can ignore this email. Nobody can use it without your inbox.</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:440px;margin:16px auto 0;padding:0 8px">
      <tr><td style="font-size:12px;line-height:18px;color:#52525b">
        <p style="margin:0 0 8px">You received this because ${copy.reason}. Codes like this one are the only email we send: no newsletter, no marketing, nothing to unsubscribe from.</p>
        <p style="margin:0">${OPERATOR.entity} (${OPERATOR.name}), ${OPERATOR.address}<br />
        <a href="mailto:${CONTACT.support}" style="color:#52525b">${CONTACT.support}</a> for help, <a href="mailto:${CONTACT.privacy}" style="color:#52525b">${CONTACT.privacy}</a> for anything about your data</p>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, text, html };
}

// ---------------------------------------------------------------- per-address throttle

export interface SendThrottle {
  /** True when a code may be emailed to this address now (and counts it). */
  allow(to: string): Promise<boolean>;
}

const GAP_SECONDS = 60;
const PER_DAY = 10;

/**
 * At most one code per address per 60 s and 10 per UTC day, whatever the purpose. Redis when
 * given (shared by replicas), process memory otherwise or when Redis errors. Above the cap the
 * caller drops the email silently: the answer to the request stays the same, so nobody learns
 * anything, and the last code sent stays valid (auth/index.ts reuses unexpired codes).
 */
export function createSendThrottle(
  redis: Redis | null,
  logger: Logger,
  now: () => number = Date.now,
): SendThrottle {
  // ponytail: per-process map, pruned by day; Redis shares the counts across replicas.
  const memory = new Map<string, { last: number; day: string; count: number }>();

  const inMemory = (address: string, at: number, day: string) => {
    const entry = memory.get(address);
    if (entry && at - entry.last < GAP_SECONDS * 1000) return false;
    if (entry?.day === day && entry.count >= PER_DAY) return false;
    if (memory.size > 50_000) {
      for (const [key, value] of memory) if (value.day !== day) memory.delete(key);
    }
    memory.set(address, {
      last: at,
      day,
      count: entry?.day === day ? entry.count + 1 : 1,
    });
    return true;
  };

  return {
    async allow(to) {
      const address = to.trim().toLowerCase();
      const at = now();
      const day = new Date(at).toISOString().slice(0, 10);
      if (redis) {
        try {
          const client = connected(redis);
          const gap = await client.set(`otp-gap:${address}`, '1', {
            condition: 'NX',
            expiration: { type: 'EX', value: GAP_SECONDS },
          });
          if (gap === null) return false;
          const key = `otp-day:${address}:${day}`;
          const count = await client.incr(key);
          if (count === 1) await client.expire(key, 60 * 60 * 24);
          return count <= PER_DAY;
        } catch (error) {
          logger.warn({ err: error }, 'otp throttle: redis failed, counting in memory');
        }
      }
      return inMemory(address, at, day);
    },
  };
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
