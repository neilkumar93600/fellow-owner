import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearOutbox, peekOtp } from '../../src/auth/email.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { user } from '../../src/db/schema/auth.js';
import { cookieHeader, TEST_ORIGIN } from '../helpers/auth.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);

const MIRA = 'mira@password.test';
const PASSWORD = 'correct-horse-battery';

/** POST /api/auth/sign-up/email with what /create-account sends; `body` adds or overrides fields. */
function signUp(body: Record<string, unknown>) {
  return request(app)
    .post('/api/auth/sign-up/email')
    .set('Origin', TEST_ORIGIN)
    .send({ name: 'Mira Lane', password: PASSWORD, ...body });
}

/** What /login sends: the email or the username, and the password (overridable). */
function logIn(path: '/sign-in/email' | '/sign-in/username', body: Record<string, unknown>) {
  return request(app)
    .post(`/api/auth${path}`)
    .set('Origin', TEST_ORIGIN)
    .send({ password: PASSWORD, ...body });
}

function usernameCheck(username: string) {
  return request(app)
    .post('/api/auth/is-username-available')
    .set('Origin', TEST_ORIGIN)
    .send({ username });
}

/**
 * /create-account, /verify-otp and /login against src/auth/index.ts: email + password with a
 * username, and no session until the email is confirmed with a 6-digit code. Codes come from the
 * dev/test outbox (peekOtp) because RESEND_API_KEY is empty in tests. The tests share one account
 * and run in order.
 */
describe('password accounts', () => {
  beforeAll(async () => {
    await resetDatabase();
    clearOutbox();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('creates the account without a session and emails a confirmation code', async () => {
    const res = await signUp({
      email: MIRA,
      username: ' Mira.K ',
      socialPlatform: 'instagram',
      socialHandle: '@mira.k',
    }).expect(200);

    expect(res.body.token).toBeNull();
    expect(cookieHeader(res.headers['set-cookie'])).not.toContain('session_token');
    expect(res.body.user).toMatchObject({
      email: MIRA,
      emailVerified: false,
      username: 'mira.k',
      socialPlatform: 'instagram',
      socialHandle: 'mira.k',
    });
    expect(peekOtp(MIRA)).toMatch(/^\d{6}$/);
  });

  it('refuses a password log-in until the email is confirmed, and emails a fresh code', async () => {
    clearOutbox();
    const byEmail = await logIn('/sign-in/email', { email: MIRA }).expect(403);
    expect(byEmail.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(peekOtp(MIRA)).toMatch(/^\d{6}$/);

    clearOutbox();
    const byUsername = await logIn('/sign-in/username', { username: 'mira.k' }).expect(403);
    expect(byUsername.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(peekOtp(MIRA)).toMatch(/^\d{6}$/);
  });

  it('needs the account password with the code, so a stranger who signed up first loses it', async () => {
    for (const password of [undefined, 'not-the-password']) {
      clearOutbox();
      await logIn('/sign-in/email', { email: MIRA }).expect(403);
      const res = await request(app)
        .post('/api/auth/email-otp/verify-email')
        .set('Origin', TEST_ORIGIN)
        .send({ email: MIRA, otp: peekOtp(MIRA), password })
        .expect(401);
      expect(res.body.code).toBe('INVALID_EMAIL_OR_PASSWORD');
    }
    // Still unconfirmed: the password log-in keeps answering 403 and sends a fresh code.
    clearOutbox();
    await logIn('/sign-in/email', { email: MIRA }).expect(403);
  });

  it('confirms the email with the latest code without opening a session', async () => {
    const res = await request(app)
      .post('/api/auth/email-otp/verify-email')
      .set('Origin', TEST_ORIGIN)
      .send({ email: MIRA, otp: peekOtp(MIRA), password: PASSWORD })
      .expect(200);

    expect(res.body).toMatchObject({
      status: true,
      token: null,
      user: { email: MIRA, emailVerified: true, username: 'mira.k' },
    });
    // The session must come from the password (the web logs in right after), never from the code.
    expect(cookieHeader(res.headers['set-cookie'])).not.toContain('session_token');
  });

  it('logs in with the email or the username', async () => {
    const byEmail = await logIn('/sign-in/email', { email: MIRA, rememberMe: true }).expect(200);
    expect(byEmail.body.user.username).toBe('mira.k');
    expect(cookieHeader(byEmail.headers['set-cookie'])).toContain('session_token');

    const byUsername = await logIn('/sign-in/username', {
      username: 'mira.k',
      rememberMe: true,
    }).expect(200);
    expect(byUsername.body.user.email).toBe(MIRA);
    expect(cookieHeader(byUsername.headers['set-cookie'])).toContain('session_token');
  });

  it('answers a wrong password and an unknown username the same way', async () => {
    const byEmail = await logIn('/sign-in/email', {
      email: MIRA,
      password: 'wrong-password',
    }).expect(401);
    expect(byEmail.body.code).toBe('INVALID_EMAIL_OR_PASSWORD');

    for (const body of [
      { username: 'mira.k', password: 'wrong-password' },
      { username: 'nobody.here' },
    ]) {
      const res = await logIn('/sign-in/username', body).expect(401);
      expect(res.body.code).toBe('INVALID_USERNAME_OR_PASSWORD');
    }
  });

  it('answers a second sign-up for the same email like a new one, and creates nothing', async () => {
    clearOutbox();
    const before = await db.$count(user);

    const res = await signUp({ email: MIRA, username: 'not.mira', name: 'Not Mira' }).expect(200);

    expect(res.body.token).toBeNull();
    expect(res.body.user.email).toBe(MIRA);
    expect(peekOtp(MIRA)).toBeUndefined();
    expect(await db.$count(user)).toBe(before);
    // The answer was made up: the username it echoed is still free.
    const check = await usernameCheck('not.mira').expect(200);
    expect(check.body.available).toBe(true);
  });

  it('rejects a username that is taken, in any case', async () => {
    const res = await signUp({ email: 'copycat@password.test', username: 'MIRA.K' }).expect(400);
    expect(res.body.code).toBe('USERNAME_IS_ALREADY_TAKEN');
  });

  it('rejects a reserved username', async () => {
    const res = await signUp({ email: 'reserved@password.test', username: 'login' }).expect(400);
    expect(res.body.code).toBe('INVALID_USERNAME');
  });

  it('checks the social profile with the shared schemas', async () => {
    const platform = await signUp({
      email: 'platform@password.test',
      username: 'platform.test',
      socialPlatform: 'myspace',
      socialHandle: 'tom',
    }).expect(400);
    expect(platform.body.code).toBe('VALIDATION_ERROR');

    const handle = await signUp({
      email: 'handle@password.test',
      username: 'handle.test',
      socialPlatform: 'tiktok',
      socialHandle: 'mira k',
    }).expect(400);
    // The server keeps the shared schema's message, which /create-account shows as is.
    expect(handle.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Use letters, numbers, periods, underscores and hyphens',
    });
  });

  it('reports whether a username is free', async () => {
    expect((await usernameCheck('Mira.K').expect(200)).body.available).toBe(false);
    expect((await usernameCheck('arjun.m').expect(200)).body.available).toBe(true);
    const reserved = await usernameCheck('login').expect(422);
    expect(reserved.body.code).toBe('INVALID_USERNAME');
  });
});
