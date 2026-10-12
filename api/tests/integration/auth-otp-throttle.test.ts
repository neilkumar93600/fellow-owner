import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { OtpMessage } from '../../src/auth/email.js';
import { CLIENT_IP_HEADER, createAuth, OTP_EMAILS_PER_HOUR } from '../../src/auth/index.js';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { withinCap } from '../../src/middlewares/rate-limit.js';
import { signInWithOtp, TEST_ORIGIN } from '../helpers/auth.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

/**
 * The production code-email limits, through Better Auth: per address (createSendThrottle), all
 * addresses per hour (OTP_EMAILS_PER_HOUR), and no sign-in code for an address with no account.
 * Each request comes from its own IP so Better Auth's per-IP production limits stay out of the way.
 */
const sent: OtpMessage[] = [];
const prod = createAuth({
  env: { ...env, isProduction: true },
  redis: null,
  email: {
    async sendOtp(message) {
      sent.push(message);
    },
  },
});
const testApp = createApp(buildContainer());

const post = (path: string, body: Record<string, unknown>) =>
  prod.handler(
    new Request(`${env.BETTER_AUTH_URL}/api/auth${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: TEST_ORIGIN,
        [CLIENT_IP_HEADER]: `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
      },
      body: JSON.stringify(body),
    }),
  );
const sendCode = (email: string) =>
  post('/email-otp/send-verification-otp', { email, type: 'sign-in' });
/** Delivery runs after the response: give it a moment before asserting nothing was sent. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

beforeAll(async () => {
  await resetDatabase();
  // Accounts made the dev/test way (sign-up by code is off in production).
  await signInWithOtp(testApp, 'priya@throttle.test', 'Priya Shah');
  await signInWithOtp(testApp, 'raj@throttle.test', 'Raj Mehta');
});
afterAll(async () => {
  await closeDb();
});

describe('code emails in production', () => {
  it('a second code inside 60 s is dropped silently, and the first code still signs in', async () => {
    expect((await sendCode('priya@throttle.test')).status).toBe(200);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect((await sendCode('priya@throttle.test')).status).toBe(200);
    await settle();
    expect(sent).toHaveLength(1);

    const res = await post('/sign-in/email-otp', {
      email: 'priya@throttle.test',
      otp: sent[0]?.code,
    });
    expect(res.status).toBe(200);
  });

  it('no sign-in code is emailed to an address without an account', async () => {
    const res = await sendCode(`nobody-${randomUUID()}@throttle.test`);
    expect(res.status).toBe(200);
    await settle();
    expect(sent).toHaveLength(1);
  });

  it('above the hourly total for all addresses, codes are dropped', async () => {
    // Use up the rest of this hour's total (same in-process counter as deliver).
    let used = 0;
    while (
      await withinCap({
        name: 'otp-email-hour',
        key: 'all',
        windowSeconds: 3600,
        max: OTP_EMAILS_PER_HOUR,
        redis: null,
      })
    ) {
      used += 1;
    }
    expect(used).toBeLessThan(OTP_EMAILS_PER_HOUR);
    expect((await sendCode('raj@throttle.test')).status).toBe(200);
    await settle();
    expect(sent.map((message) => message.to)).not.toContain('raj@throttle.test');
  });
});
