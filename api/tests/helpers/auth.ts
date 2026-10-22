import type { Express } from 'express';
import request from 'supertest';
import { peekOtp } from '../../src/auth/email.js';

/** Better Auth checks Origin on state-changing auth requests. */
export const TEST_ORIGIN = 'http://localhost:3000';

export interface SignedIn {
  /** Value for the `Cookie` request header. */
  cookie: string;
  userId: string;
  email: string;
}

/** `Set-Cookie` response values -> one `Cookie` request header value. */
export function cookieHeader(setCookie: string | string[] | undefined): string {
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return values.map((value) => value.split(';')[0]).join('; ');
}

/**
 * Signs in through the real emailOTP flow: sends the code (captured by the dev/test outbox
 * because RESEND_API_KEY is empty in tests) and verifies it. Creates the user on first sign-in.
 */
export async function signInWithOtp(
  app: Express,
  email: string,
  name = 'Test User',
): Promise<SignedIn> {
  await request(app)
    .post('/api/auth/email-otp/send-verification-otp')
    .set('Origin', TEST_ORIGIN)
    .send({ email, type: 'sign-in' })
    .expect(200);
  const otp = peekOtp(email);
  if (!otp) throw new Error(`no OTP captured for ${email}`);
  const res = await request(app)
    .post('/api/auth/sign-in/email-otp')
    .set('Origin', TEST_ORIGIN)
    .send({ email, otp, name })
    .expect(200);
  return { cookie: cookieHeader(res.headers['set-cookie']), userId: res.body.user.id, email };
}
