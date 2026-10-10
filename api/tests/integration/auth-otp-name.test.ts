import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { peekOtp } from '../../src/auth/email.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { TEST_ORIGIN } from '../helpers/auth.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);

/** Sends a sign-in code and verifies it, passing `name` only when the caller gives one. */
async function signIn(email: string, name?: string) {
  await request(app)
    .post('/api/auth/email-otp/send-verification-otp')
    .set('Origin', TEST_ORIGIN)
    .send({ email, type: 'sign-in' })
    .expect(200);
  const otp = peekOtp(email);
  if (!otp) throw new Error(`no OTP captured for ${email}`);
  return request(app)
    .post('/api/auth/sign-in/email-otp')
    .set('Origin', TEST_ORIGIN)
    .send({ email, otp, ...(name === undefined ? {} : { name }) })
    .expect(200);
}

/**
 * POST /sign-in/email-otp: a code logs in, and creates the account for an unknown address. /login no
 * longer uses it (it takes a password, see auth-password.test.ts), but the endpoint stays for API
 * clients, the test helpers (signInWithOtp) and the planned Join step. A caller that sends no name
 * gets an account with an empty name and can add one later with /update-user. These tests pin
 * that, so it breaks loudly if Better Auth ever changes the default or `updateUser` moves.
 */
describe('emailOTP sign-in and the account name', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('creates a first-time account with an empty name when none is sent', async () => {
    const res = await signIn('nameless@example.com');

    expect(res.body.user.email).toBe('nameless@example.com');
    // Nameless: API responses say "Member" (src/lib/present.ts) until a name is added.
    expect(res.body.user.name?.trim() ?? '').toBe('');
  });

  it('saves the name the visitor types, and keeps it on the next sign-in', async () => {
    const first = await signIn('asks-once@example.com');
    expect(first.body.user.name?.trim() ?? '').toBe('');

    const cookie = (first.headers['set-cookie'] as unknown as string[])
      .map((value) => value.split(';')[0])
      .join('; ');

    // How a client adds the name afterwards.
    await request(app)
      .post('/api/auth/update-user')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie)
      .send({ name: 'Arjun Mehta' })
      .expect(200);

    // Signing in again keeps it: a later code never resets the name.
    const second = await signIn('asks-once@example.com');
    expect(second.body.user.name).toBe('Arjun Mehta');
  });

  it('keeps a name that was sent with the code', async () => {
    const res = await signIn('named@example.com', 'Mira Lane');

    expect(res.body.user.name).toBe('Mira Lane');
  });
});
