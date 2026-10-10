import { and, eq, ne } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearOutbox } from '../../src/auth/email.js';
import { buildContainer } from '../../src/container.js';
import { HANDLE_AVAILABLE_PER_MINUTE } from '../../src/controllers/public.controller.js';
import { createApp } from '../../src/create-app.js';
import { user } from '../../src/db/schema/auth.js';
import { spaces } from '../../src/db/schema/spaces.js';
import { type SignedIn, signInWithOtp, TEST_ORIGIN } from '../helpers/auth.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

const PASSWORD = 'correct-horse-battery';

/** POST /api/auth/sign-up/email the way /create-account does. */
function signUp(email: string, username: string) {
  return request(app)
    .post('/api/auth/sign-up/email')
    .set('Origin', TEST_ORIGIN)
    .send({ name: 'Someone', email, username, password: PASSWORD });
}

const spaceBody = (handle: string) => ({
  handle,
  displayName: 'New Creator',
  platforms: [],
  communities: [{ name: 'Budget Travel', tint: 'lime', icon: 'globe' }],
  tasteProfile: { promote: ['budget trips'], never: [], voice: [] },
});

function createSpace(signedIn: SignedIn, handle: string) {
  return request(app)
    .post('/api/studio/space')
    .set('Cookie', signedIn.cookie)
    .send(spaceBody(handle));
}

async function usernameOf(userId: string): Promise<string | null> {
  const [row] = await db.select({ username: user.username }).from(user).where(eq(user.id, userId));
  return row?.username ?? null;
}

/** How many different people hold `handle`: as their username or as their space's handle. */
async function holdersOf(handle: string): Promise<number> {
  const byUsername = await db.select({ id: user.id }).from(user).where(eq(user.username, handle));
  const bySpace = await db
    .select({ id: spaces.ownerUserId })
    .from(spaces)
    .where(eq(spaces.handle, handle));
  return new Set([...byUsername, ...bySpace].map((row) => row.id)).size;
}

/**
 * One identity (spec §11): user.username and spaces.handle share one namespace with one rule set.
 * The space owner `mira` has a space but no username (like the seeded demo creator), and
 * `arjun.m` is a username with no space.
 */
describe('one handle namespace', () => {
  beforeAll(async () => {
    await resetDatabase();
    clearOutbox();
    const mira = await factories.user({ email: 'mira@identity.test', name: 'Mira Lane' });
    await factories.space({ owner: mira, handle: 'mira' });
    await signUp('arjun@identity.test', 'arjun.m').expect(200);
  });

  afterAll(async () => {
    await container.background.whenIdle();
    await closeDb();
  });

  describe('GET /api/handle-available', () => {
    const check = (h: string) => request(app).get('/api/handle-available').query({ h });

    it('answers free handles without suggestions and never caches', async () => {
      const res = await check('Nina.Travels').expect(200);
      expect(res.body).toEqual({
        handle: 'nina.travels',
        available: true,
        reason: null,
        suggestions: [],
      });
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('counts usernames and space handles as taken, and suggests free ones', async () => {
      const space = await check('mira').expect(200);
      expect(space.body).toMatchObject({ available: false, reason: 'taken' });
      expect(space.body.suggestions).toEqual(['mira_', 'mira.official', 'mira2']);

      // arjun.m_ is someone's username, so it is not suggested.
      await signUp('arjun2@identity.test', 'arjun.m_').expect(200);
      const username = await check('arjun.m').expect(200);
      expect(username.body).toMatchObject({ available: false, reason: 'taken' });
      expect(username.body.suggestions).toEqual(['arjun.m.official', 'arjun.m2', 'arjun.mhq']);
    });

    it('explains reserved and invalid handles', async () => {
      expect((await check('dashboard').expect(200)).body).toMatchObject({
        available: false,
        reason: 'reserved',
      });
      expect((await check('ab').expect(200)).body).toMatchObject({
        available: false,
        reason: 'invalid',
      });
      expect((await check('mira k').expect(200)).body.reason).toBe('invalid');
      await request(app).get('/api/handle-available').expect(400);
    });
  });

  describe('sign-up and username changes', () => {
    it('accepts 3-character usernames, like handles', async () => {
      const res = await signUp('kai@identity.test', 'Kai').expect(200);
      expect(res.body.user.username).toBe('kai');
    });

    it('answers 409 handle_taken when the username is a space handle', async () => {
      const res = await signUp('copy@identity.test', 'Mira').expect(409);
      expect(res.body.code).toBe('HANDLE_TAKEN');
      expect(await holdersOf('mira')).toBe(1);
    });

    it('answers 409 when a signed-in user renames themselves to a space handle', async () => {
      const someone = await signInWithOtp(app, 'rename@identity.test', 'Rena');
      const res = await request(app)
        .post('/api/auth/update-user')
        .set('Origin', TEST_ORIGIN)
        .set('Cookie', someone.cookie)
        .send({ username: 'mira' })
        .expect(409);
      expect(res.body.code).toBe('HANDLE_TAKEN');
      expect(await usernameOf(someone.userId)).toBeNull();
    });

    it('rejects reserved usernames', async () => {
      const res = await signUp('reserved@identity.test', 'Dashboard').expect(400);
      expect(res.body.code).toBe('INVALID_USERNAME');
      const check = await request(app)
        .post('/api/auth/is-username-available')
        .set('Origin', TEST_ORIGIN)
        .send({ username: 'login' })
        .expect(422);
      expect(check.body.code).toBe('INVALID_USERNAME');
    });
  });

  describe('POST /api/studio/space', () => {
    it('answers 409 handle_taken when the handle is another user’s username', async () => {
      const newcomer = await signInWithOtp(app, 'newcomer@identity.test', 'New Comer');
      const res = await createSpace(newcomer, 'arjun.m').expect(409);
      expect(res.body.error).toMatchObject({
        code: 'handle_taken',
        details: { suggestions: ['arjun.m.official', 'arjun.m2', 'arjun.mhq'] },
      });
      expect(await holdersOf('arjun.m')).toBe(1);
    });

    it('rejects reserved handles', async () => {
      const newcomer = await signInWithOtp(app, 'reserved2@identity.test', 'Res');
      const res = await createSpace(newcomer, 'admin').expect(400);
      expect(res.body.error.code).toBe('validation_error');
    });

    it('sets the username of a user who has none', async () => {
      const social = await signInWithOtp(app, 'social@identity.test', 'Sol');
      expect(await usernameOf(social.userId)).toBeNull();
      await createSpace(social, 'sol.travels').expect(201);
      expect(await usernameOf(social.userId)).toBe('sol.travels');
    });

    it('keeps the username when the handle is the user’s own username', async () => {
      await signUp('ownhandle@identity.test', 'own.handle').expect(200);
      const [owner] = await db.select().from(user).where(eq(user.username, 'own.handle'));
      const signedIn = await signInWithOtp(app, 'ownhandle@identity.test');
      expect(signedIn.userId).toBe(owner?.id);
      await createSpace(signedIn, 'own.handle').expect(201);
      expect(await usernameOf(signedIn.userId)).toBe('own.handle');
    });

    it('moves the username to a changed handle in the same step, and logs in with it', async () => {
      await signUp('changer@identity.test', 'old.name').expect(200);
      const signedIn = await signInWithOtp(app, 'changer@identity.test');
      await createSpace(signedIn, 'new.name').expect(201);
      expect(await usernameOf(signedIn.userId)).toBe('new.name');
      // The old one is free again; the new one is taken (by the space and the username).
      const old = await request(app).get('/api/handle-available').query({ h: 'old.name' });
      expect(old.body.available).toBe(true);
      expect(await holdersOf('new.name')).toBe(1);
    });

    it('never gives one handle to two people when sign-up and space creation race', async () => {
      for (let round = 0; round < 6; round += 1) {
        const handle = `race.${round}`;
        const creator = await signInWithOtp(app, `creator${round}@identity.test`, 'Racer');
        const [space, signup] = await Promise.all([
          createSpace(creator, handle),
          signUp(`racer${round}@identity.test`, handle),
        ]);
        expect(await holdersOf(handle), `${handle}: ${space.status}/${signup.status}`).toBe(1);
        // Exactly one side wins; the loser is told the handle is taken.
        expect([space.status, signup.status].filter((s) => s === 201 || s === 200)).toHaveLength(1);
        if (space.status !== 201) expect(space.status).toBe(409);
        if (signup.status !== 200) expect([400, 409, 422]).toContain(signup.status);
        const others = await db
          .select({ id: user.id })
          .from(user)
          .where(and(eq(user.username, handle), ne(user.id, creator.userId)));
        if (space.status === 201) expect(others).toHaveLength(0);
      }
    });

    it('answers 409 when a username claim commits after the handle check passed', async () => {
      const creator = await signInWithOtp(app, 'late@identity.test', 'Late');
      let pending: Promise<request.Response> | undefined;
      // The sign-up's insert is still uncommitted when the space checks the handle, so only the
      // username unique constraint can catch it.
      await db.transaction(async (tx) => {
        await tx.insert(user).values({
          id: 'late-claimer',
          name: 'Late Claimer',
          email: 'claimer@identity.test',
          username: 'late.claim',
        });
        pending = createSpace(creator, 'late.claim').then((res) => res);
        await new Promise((resolve) => setTimeout(resolve, 400));
      });
      const res = await pending!;
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('handle_taken');
      expect(await holdersOf('late.claim')).toBe(1);
      expect(await usernameOf(creator.userId)).toBeNull();
    });
  });

  describe('rate limit', () => {
    it('answers 429 after too many checks from one client', async () => {
      for (let i = 0; i < HANDLE_AVAILABLE_PER_MINUTE; i += 1) {
        await request(app)
          .get('/api/handle-available')
          .query({ h: `probe${i}` });
      }
      const res = await request(app)
        .get('/api/handle-available')
        .query({ h: 'one.more' })
        .expect(429);
      expect(res.body.error.code).toBe('rate_limited');
    });
  });
});
