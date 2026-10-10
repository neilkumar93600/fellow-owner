import { LIMITS } from '@fellow-owners/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFakeAiServices } from '../../src/ai/fake.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { user } from '../../src/db/schema/auth.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { followerCommunities, followers } from '../../src/db/schema/followers.js';
import { imports } from '../../src/db/schema/later.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

// Same database, AI that always fails: import suggestions [], auto-tag aiPaused.
const failingApp = createApp(
  buildContainer({
    ai: createFakeAiServices({
      accounting: { aiRuns: repos.aiRuns },
      failTasks: { clusterImport: 'provider', tagFollowers: 'budget' },
    }),
  }),
);

let owner: SignedIn;
let rival: SignedIn;
let fan: SignedIn;
let mira: TestSpace;
let other: TestSpace;
let builders: CommunityRow;
let fitness: CommunityRow;
let archived: CommunityRow;

const as = (cookie: string) => ({
  get: (path: string) => request(app).get(`/api/studio/followers${path}`).set('Cookie', cookie),
  post: (path: string, body: object) =>
    request(app).post(`/api/studio/followers${path}`).set('Cookie', cookie).send(body),
  patch: (path: string, body: object) =>
    request(app).patch(`/api/studio/followers${path}`).set('Cookie', cookie).send(body),
  delete: (path: string) =>
    request(app).delete(`/api/studio/followers${path}`).set('Cookie', cookie),
});

async function addFollower(body: Record<string, unknown>, cookie = owner.cookie) {
  const res = await as(cookie).post('', body).expect(201);
  return res.body as { id: string };
}

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@followers.test', 'Mira Lane');
  rival = await signInWithOtp(app, 'rival@followers.test', 'Rival Creator');
  fan = await signInWithOtp(app, 'arjun@followers.test', 'Arjun Mehta');
  mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
    handle: 'mira',
    displayName: 'Mira Lane',
    communities: [
      { name: 'Budget Travel', slug: 'budget-travel' },
      { name: 'Solo Travelers', slug: 'solo-travelers' },
      { name: 'Old Club', slug: 'old-club' },
    ],
  });
  [builders, fitness, archived] = mira.communities as [CommunityRow, CommunityRow, CommunityRow];
  await repos.communities.update(mira.space.id, archived.id, { archivedAt: new Date() });
  other = await factories.space({
    owner: { id: rival.userId, email: rival.email, name: 'Rival Creator' },
    handle: 'rival',
  });
});

afterAll(closeDb);

describe('auth', () => {
  it('401 signed out, 404 without a space', async () => {
    await request(app).get('/api/studio/followers').expect(401);
    await request(app).post('/api/studio/followers/import').send({}).expect(401);
    const res = await as(fan.cookie).get('').expect(404);
    expect(res.body.error.code).toBe('not_found');
    await as(fan.cookie).post('', { name: 'X' }).expect(404);
  });

  it("never touches another creator's followers or communities", async () => {
    const theirs = await addFollower({ name: 'Their Fan', email: 'their@x.test' }, rival.cookie);
    await as(owner.cookie).patch(`/${theirs.id}`, { name: 'Mine now' }).expect(404);
    await as(owner.cookie).delete(`/${theirs.id}`).expect(404);
    const tagged = await as(owner.cookie)
      .post('/tag', { followerIds: [theirs.id], communityId: builders.id, action: 'add' })
      .expect(200);
    expect(tagged.body).toEqual({ updated: 0 });
    const auto = await as(owner.cookie)
      .post('/auto-tag', { followerIds: [theirs.id] })
      .expect(200);
    expect(auto.body).toEqual({ tagged: 0, skipped: 0, aiPaused: false });
    const theirCommunity = other.communities[0] as CommunityRow;
    const res = await as(owner.cookie)
      .post('', { name: 'Bad tag', communityIds: [theirCommunity.id] })
      .expect(400);
    expect(res.body.error.code).toBe('validation_error');
    const list = await as(owner.cookie).get('?q=their').expect(200);
    expect(list.body.total).toBe(0);
  });
});

describe('create, update, delete', () => {
  it('creates a follower with creator tags in active communities', async () => {
    const res = await as(owner.cookie)
      .post('', {
        name: 'Priya Shah',
        handle: '@Priya.S',
        platform: 'instagram',
        email: 'Priya@Example.com',
        note: 'Wants a Lisbon budget guide',
        communityIds: [fitness.id, builders.id],
      })
      .expect(201);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.body).toMatchObject({
      name: 'Priya Shah',
      handle: 'Priya.S',
      platform: 'instagram',
      email: 'priya@example.com',
      source: 'manual',
      membershipId: null,
      joinedAt: null,
    });
    expect(res.body.communities.map((c: { slug: string }) => c.slug)).toEqual([
      'budget-travel',
      'solo-travelers',
    ]);
    expect(res.body.communities[0]).toMatchObject({ taggedBy: 'creator', name: 'Budget Travel' });
  });

  it('409 on a duplicate email or platform + handle (case-insensitive)', async () => {
    const email = await as(owner.cookie)
      .post('', { name: 'Dup', email: 'priya@example.com' })
      .expect(409);
    expect(email.body.error.message).toMatch(/email/);
    const handle = await as(owner.cookie)
      .post('', { name: 'Dup', handle: 'priya.s', platform: 'instagram' })
      .expect(409);
    expect(handle.body.error.message).toMatch(/handle/);
    // Same handle on another platform is someone else.
    await as(owner.cookie)
      .post('', { name: 'Other', handle: 'priya.s', platform: 'x' })
      .expect(201);
  });

  it('400 for archived or unknown communities and bad input', async () => {
    await as(owner.cookie)
      .post('', { name: 'A', communityIds: [archived.id] })
      .expect(400);
    await as(owner.cookie).post('', { name: '' }).expect(400);
    await as(owner.cookie).post('', { name: 'A', handle: 'bad handle!' }).expect(400);
  });

  it('PATCH changes fields, clears with null and replaces the tag set', async () => {
    const created = await addFollower({ name: 'Sam', note: 'old', communityIds: [builders.id] });
    await repos.followers.addTags([{ followerId: created.id, communityId: fitness.id }], 'ai');
    const res = await as(owner.cookie)
      .patch(`/${created.id}`, {
        name: 'Sam Rivera',
        note: null,
        email: 'SAM@example.com',
        communityIds: [fitness.id],
      })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Sam Rivera', note: null, email: 'sam@example.com' });
    expect(res.body.communities).toEqual([
      expect.objectContaining({ slug: 'solo-travelers', taggedBy: 'creator' }),
    ]);
    const dup = await as(owner.cookie)
      .patch(`/${created.id}`, { email: 'priya@example.com' })
      .expect(409);
    expect(dup.body.error.code).toBe('conflict');
    await as(owner.cookie).patch(`/${created.id}`, {}).expect(400);
    await as(owner.cookie)
      .patch('/00000000-0000-4000-8000-000000000000', { name: 'Nobody' })
      .expect(404);
  });

  it('DELETE removes the follower, then 404', async () => {
    const created = await addFollower({ name: 'Temp' });
    await as(owner.cookie).delete(`/${created.id}`).expect(204);
    await as(owner.cookie).delete(`/${created.id}`).expect(404);
  });
});

describe('list', () => {
  it('filters by q, community, untagged and joined, with counts and total', async () => {
    const all = await as(owner.cookie).get('').expect(200);
    expect(all.body.total).toBe(all.body.counts.all);
    expect(all.body.items[0].name).toBe('Sam Rivera'); // newest first (Temp was deleted)

    const q = await as(owner.cookie).get('?q=Lisbon%20budget').expect(200);
    expect(q.body.items.map((f: { name: string }) => f.name)).toEqual(['Priya Shah']);
    const byEmail = await as(owner.cookie).get('?q=SAM@EXAMPLE').expect(200);
    expect(byEmail.body.total).toBe(1);

    const fit = await as(owner.cookie).get('?community=solo-travelers').expect(200);
    expect(fit.body.items.map((f: { name: string }) => f.name).sort()).toEqual([
      'Priya Shah',
      'Sam Rivera',
    ]);

    const untagged = await as(owner.cookie).get('?community=untagged').expect(200);
    expect(untagged.body.total).toBe(all.body.counts.untagged);
    expect(untagged.body.items.every((f: { communities: [] }) => f.communities.length === 0)).toBe(
      true,
    );

    const unknown = await as(owner.cookie).get('?community=nope').expect(200);
    expect(unknown.body).toMatchObject({ items: [], total: 0, counts: all.body.counts });
    const old = await as(owner.cookie).get('?community=old-club').expect(200);
    expect(old.body.total).toBe(0);

    const joined = await as(owner.cookie).get('?joined=yes').expect(200);
    expect(joined.body.total).toBe(0);
    const notJoined = await as(owner.cookie).get('?joined=no').expect(200);
    expect(notJoined.body.total).toBe(all.body.counts.all);
  });

  it('pages with a keyset cursor', async () => {
    const first = await as(owner.cookie).get('?limit=2').expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await as(owner.cookie)
      .get(`?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`)
      .expect(200);
    const ids = [...first.body.items, ...second.body.items].map((f: { id: string }) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    await as(owner.cookie).get('?cursor=garbage').expect(400);
  });
});

describe('import', () => {
  const csv = [
    'Full Name,Username,Platform,Email,Comment',
    'Ana Verma,ana.v,Instagram,ana@example.com,"Planning my first solo trip, scared of the first night alone"',
    'Dup Priya,,,PRIYA@example.com,already there',
    'Ben,ben_lifts,instagram,,"Photographer, shooting golden hour at night"',
    'Ben Again,BEN_LIFTS,Instagram,,same handle different case',
    'Cara,,,not-an-email,bad row',
    'Dee,,,dee@example.com,"Planning a solo trip, want safety tips"',
    'Eli,,,eli@example.com,Camera and lens nerd on weekends',
    'Fay,,,fay@example.com,"Solo travel and safety every year"',
  ].join('\r\n');

  it('imports CSV, counts duplicates and bad rows, writes the imports row', async () => {
    const res = await as(owner.cookie).post('/import', { source: 'csv', text: csv }).expect(201);
    expect(res.body).toMatchObject({
      source: 'csv',
      created: 5,
      duplicates: 2,
      skipped: 1,
      errors: [{ line: 6, reason: 'Invalid email' }],
    });
    // Fake clusterImport: two photography notes make a suggestion; solo travel exists already.
    expect(res.body.suggestions).toEqual([
      {
        name: 'Travel Photography',
        description: 'Followers who talk about photography.',
        sampleQuotes: [
          'Photographer, shooting golden hour at night',
          'Camera and lens nerd on weekends',
        ],
      },
    ]);
    const [row] = await db.select().from(imports).where(eq(imports.id, res.body.importId));
    expect(row).toMatchObject({ source: 'csv', status: 'done', itemCount: 5 });
    expect(row?.result).toMatchObject({ created: 5, duplicates: 2, skipped: 1 });
    const imported = await db
      .select()
      .from(followers)
      .where(eq(followers.importId, row?.id ?? ''));
    expect(imported).toHaveLength(5);
    expect(imported.every((f) => f.source === 'csv')).toBe(true);

    // Importing the same text again creates nothing; leading blank lines keep error lines physical.
    const again = await as(owner.cookie)
      .post('/import', { source: 'csv', text: `\n\n${csv}`, suggest: false })
      .expect(201);
    expect(again.body).toMatchObject({
      created: 0,
      duplicates: 7,
      skipped: 1,
      errors: [{ line: 8, reason: 'Invalid email' }],
      suggestions: [],
    });
  });

  it('imports pasted lines', async () => {
    const res = await as(owner.cookie)
      .post('/import', {
        source: 'paste',
        text: '@gia_shoots - photographer, golden hour fan\nHal hal@example.com: wants to help plan\n\n',
      })
      .expect(201);
    expect(res.body).toMatchObject({ source: 'paste', created: 2, skipped: 0, suggestions: [] });
    const list = await as(owner.cookie).get('?q=gia_shoots').expect(200);
    expect(list.body.items[0]).toMatchObject({
      name: 'gia_shoots',
      handle: 'gia_shoots',
      source: 'paste',
      note: 'photographer, golden hour fan',
    });
  });

  it('400 for a CSV with no usable header, an empty body or too much text', async () => {
    const header = await as(owner.cookie)
      .post('/import', { source: 'csv', text: 'note,platform\nhi,x' })
      .expect(400);
    expect(header.body.error).toMatchObject({
      code: 'bad_request',
      message: 'Add a header row with a name, handle or email column',
    });
    await as(owner.cookie).post('/import', { source: 'csv', text: '  ' }).expect(400);
    await as(owner.cookie)
      .post('/import', { source: 'paste', text: 'x'.repeat(LIMITS.follower.importChars + 1) })
      .expect(400);
  });

  it('imports the first 500 rows only', async () => {
    const lines = Array.from({ length: LIMITS.follower.importRows + 3 }, (_, i) => `Bulk ${i}`);
    const res = await request(app)
      .post('/api/studio/followers/import')
      .set('Cookie', rival.cookie)
      .send({ source: 'paste', text: lines.join('\n'), suggest: false })
      .expect(201);
    expect(res.body).toMatchObject({
      created: LIMITS.follower.importRows,
      skipped: 3,
      errors: [
        { line: LIMITS.follower.importRows + 1, reason: 'Only the first 500 rows are imported' },
      ],
    });
  });

  it('stops at the roster cap', async () => {
    const owner2 = await factories.space();
    const rows = Array.from({ length: LIMITS.follower.perSpace - 1 }, (_, i) => ({
      spaceId: owner2.space.id,
      name: `Fan ${i}`,
    }));
    await repos.followers.insertMany(rows);
    const signed = await signInWithOtp(app, owner2.owner.email, owner2.owner.name);
    const res = await request(app)
      .post('/api/studio/followers/import')
      .set('Cookie', signed.cookie)
      .send({ source: 'paste', text: 'One\nTwo\nThree', suggest: false })
      .expect(201);
    expect(res.body).toMatchObject({
      created: 1,
      skipped: 2,
      errors: [{ line: 2, reason: 'Your follower list is full' }],
    });
    const full = await request(app)
      .post('/api/studio/followers')
      .set('Cookie', signed.cookie)
      .send({ name: 'Too many' })
      .expect(409);
    expect(full.body.error.message).toBe('Your follower list is full');
  });

  it('never fails because of the AI', async () => {
    const res = await request(failingApp)
      .post('/api/studio/followers/import')
      .set('Cookie', owner.cookie)
      .send({
        source: 'paste',
        text: [
          'Gus: street food hunter',
          'Ivy: photographer',
          'Jo: van life at weekends',
          'Kit: slow travel fan',
          'Lu: translator and singer',
        ].join('\n'),
      })
      .expect(201);
    expect(res.body).toMatchObject({ created: 5, suggestions: [] });
  });
});

describe('tag', () => {
  it('adds and removes one community on many followers', async () => {
    const a = await addFollower({ name: 'Tag A' });
    const b = await addFollower({ name: 'Tag B', communityIds: [builders.id] });
    const add = await as(owner.cookie)
      .post('/tag', { followerIds: [a.id, b.id], communityId: builders.id, action: 'add' })
      .expect(200);
    expect(add.body).toEqual({ updated: 1 });
    const remove = await as(owner.cookie)
      .post('/tag', { followerIds: [a.id, b.id], communityId: builders.id, action: 'remove' })
      .expect(200);
    expect(remove.body).toEqual({ updated: 2 });
    await as(owner.cookie)
      .post('/tag', { followerIds: [a.id], communityId: archived.id, action: 'add' })
      .expect(400);
    await as(owner.cookie)
      .post('/tag', { followerIds: [], communityId: builders.id, action: 'add' })
      .expect(400);
  });

  it('skips followers already in the maximum number of communities', async () => {
    const extra = await repos.communities.insertMany(
      Array.from({ length: LIMITS.follower.communitiesPerFollower + 1 }, (_, i) => ({
        spaceId: mira.space.id,
        name: `Extra ${i}`,
        slug: `extra-${i}`,
        tint: 'white' as const,
        icon: 'users' as const,
        sortOrder: 10 + i,
      })),
    );
    const full = await addFollower({
      name: 'Full Tags',
      communityIds: extra.slice(0, LIMITS.follower.communitiesPerFollower).map((c) => c.id),
    });
    const res = await as(owner.cookie)
      .post('/tag', { followerIds: [full.id], communityId: extra.at(-1)?.id, action: 'add' })
      .expect(200);
    expect(res.body).toEqual({ updated: 0 });
    await db.delete(followers).where(eq(followers.id, full.id));
    for (const community of extra) {
      await repos.communities.update(mira.space.id, community.id, { archivedAt: new Date() });
    }
  });
});

describe('auto-tag', () => {
  it('tags untagged followers from their notes with tagged_by ai, never removing creator tags', async () => {
    const creatorTagged = await addFollower({
      name: 'Creator Pick',
      note: 'Solo trips only, always alone',
      communityIds: [builders.id],
    });
    const noNote = await addFollower({ name: 'Quiet One' });
    const res = await as(owner.cookie).post('/auto-tag', {}).expect(200);
    expect(res.body.aiPaused).toBe(false);
    expect(res.body.tagged).toBeGreaterThan(0);

    const tags = await db
      .select()
      .from(followerCommunities)
      .where(eq(followerCommunities.taggedBy, 'ai'));
    expect(tags.length).toBeGreaterThan(0);
    const ana = await as(owner.cookie).get('?q=ana%40example.com').expect(200);
    expect(ana.body.items[0].communities).toEqual([
      expect.objectContaining({ slug: 'solo-travelers', taggedBy: 'ai' }),
    ]);

    const pick = await as(owner.cookie).get('?q=Creator%20Pick').expect(200);
    expect(pick.body.items[0].communities).toEqual([
      expect.objectContaining({ slug: 'budget-travel', taggedBy: 'creator' }),
    ]);

    // Explicit ids: creator tags stay, the AI adds what fits; no note is skipped.
    const explicit = await as(owner.cookie)
      .post('/auto-tag', { followerIds: [creatorTagged.id, noNote.id] })
      .expect(200);
    expect(explicit.body).toEqual({ tagged: 1, skipped: 1, aiPaused: false });
    const after = await as(owner.cookie).get('?q=Creator%20Pick').expect(200);
    expect(after.body.items[0].communities).toEqual([
      expect.objectContaining({ slug: 'budget-travel', taggedBy: 'creator' }),
      expect.objectContaining({ slug: 'solo-travelers', taggedBy: 'ai' }),
    ]);
  });

  it('picks untagged followers with a note before older ones without', async () => {
    const quiet = await repos.followers.insert({ spaceId: other.space.id, name: 'Old, no note' });
    const chatty = await repos.followers.insert({
      spaceId: other.space.id,
      name: 'Newer',
      note: 'solo trips and safety',
    });
    expect(quiet.createdAt.getTime()).toBeLessThanOrEqual(chatty.createdAt.getTime());
    const [first] = await repos.followers.listUntagged(other.space.id, 1);
    expect(first?.id).toBe(chatty.id);
  });

  it('reports aiPaused instead of failing', async () => {
    const target = await addFollower({ name: 'Paused', note: 'solo trips and safety' });
    const res = await request(failingApp)
      .post('/api/studio/followers/auto-tag')
      .set('Cookie', owner.cookie)
      .send({ followerIds: [target.id] })
      .expect(200);
    expect(res.body).toEqual({ tagged: 0, skipped: 1, aiPaused: true });
  });
});

describe('link on join', () => {
  it('links the follower with the same email when a fan joins', async () => {
    const listed = await addFollower({ name: 'Arjun (IG)', email: 'ARJUN@followers.test' });
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', fan.cookie)
      .send({ communityIds: [builders.id] })
      .expect(200);
    const joined = await as(owner.cookie).get('?joined=yes').expect(200);
    expect(joined.body.items).toEqual([
      expect.objectContaining({
        id: listed.id,
        membershipId: expect.any(String),
        joinedAt: expect.any(String),
      }),
    ]);
    expect(joined.body.counts.joined).toBe(1);
    // The fan keeps the communities they chose; the follower's tags are unchanged.
    const membership = await repos.memberships.findByUser(mira.space.id, fan.userId);
    expect(await repos.memberships.communityIds(membership?.id ?? '')).toEqual([builders.id]);
    expect(joined.body.items[0].communities).toEqual([]);
  });

  it('links by social platform + handle when no email matches', async () => {
    const zoe = await signInWithOtp(app, 'zoe@followers.test', 'Zoe');
    await db
      .update(user)
      .set({ socialPlatform: 'instagram', socialHandle: 'Ana.V' })
      .where(eq(user.id, zoe.userId));
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', zoe.cookie)
      .send({ communityIds: [fitness.id] })
      .expect(200);
    const [linked] = await db.select().from(followers).where(eq(followers.handle, 'ana.v'));
    expect(linked?.membershipId).toEqual(expect.any(String));
  });

  it('joins normally when nothing matches', async () => {
    const nobody = await signInWithOtp(app, 'nobody@followers.test', 'Nobody');
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', nobody.cookie)
      .send({ communityIds: [builders.id] })
      .expect(200);
    const joined = await as(owner.cookie).get('?joined=yes').expect(200);
    expect(joined.body.total).toBe(2);
  });

  it('links a fan who sent a pitch before joining', async () => {
    const lee = await signInWithOtp(app, 'lee@followers.test', 'Lee');
    const listed = await addFollower({ name: 'Lee', email: 'lee@followers.test' });
    await request(app)
      .post('/api/spaces/mira/pitches')
      .set('Cookie', lee.cookie)
      .send({
        type: 'collab',
        subject: 'Film a street food series together',
        body: 'We would love to film a short street food series with you and your community next month.',
        links: [],
      })
      .expect(201);
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', lee.cookie)
      .send({ communityIds: [builders.id] })
      .expect(200);
    const [linked] = await db.select().from(followers).where(eq(followers.id, listed.id));
    expect(linked?.membershipId).toEqual(expect.any(String));
  });
});

describe('link fans who joined before they were listed', () => {
  async function joined(email: string, space = 'mira', communityId = builders.id) {
    const signed = await signInWithOtp(app, email, email.split('@')[0] ?? 'Fan');
    await request(app)
      .post(`/api/spaces/${space}/join`)
      .set('Cookie', signed.cookie)
      .send({ communityIds: [communityId] })
      .expect(200);
    const spaceId = space === 'mira' ? mira.space.id : other.space.id;
    const membership = await repos.memberships.findByUser(spaceId, signed.userId);
    return { ...signed, membershipId: membership?.id ?? '' };
  }
  const membershipOf = async (id: string) =>
    (await db.select().from(followers).where(eq(followers.id, id)))[0]?.membershipId ?? null;

  it('links on import', async () => {
    const kim = await joined('kim@followers.test');
    const res = await as(owner.cookie)
      .post('/import', {
        source: 'csv',
        text: 'Name,Email\nKim,KIM@followers.test',
        suggest: false,
      })
      .expect(201);
    expect(res.body.created).toBe(1);
    const [row] = await db
      .select()
      .from(followers)
      .where(eq(followers.importId, res.body.importId));
    expect(row?.membershipId).toBe(kim.membershipId);
  });

  it('links on manual add, by email or by social handle', async () => {
    const pat = await joined('pat@followers.test');
    const added = await as(owner.cookie)
      .post('', { name: 'Pat', email: 'pat@followers.test' })
      .expect(201);
    expect(added.body).toMatchObject({
      membershipId: pat.membershipId,
      joinedAt: expect.any(String),
    });

    const ivy = await joined('ivy@followers.test');
    await db
      .update(user)
      .set({ socialPlatform: 'tiktok', socialHandle: '@Ivy.Moves' })
      .where(eq(user.id, ivy.userId));
    const byHandle = await as(owner.cookie)
      .post('', { name: 'Ivy', handle: 'ivy.moves', platform: 'tiktok' })
      .expect(201);
    expect(byHandle.body.membershipId).toBe(ivy.membershipId);
  });

  it('PATCH email links, then unlinks when it stops matching', async () => {
    const quinn = await joined('quinn@followers.test');
    const listed = await addFollower({ name: 'Quinn', email: 'quinn.old@followers.test' });
    expect(await membershipOf(listed.id)).toBeNull();
    const linked = await as(owner.cookie)
      .patch(`/${listed.id}`, { email: 'QUINN@followers.test' })
      .expect(200);
    expect(linked.body.membershipId).toBe(quinn.membershipId);
    // Other fields leave the link alone.
    await as(owner.cookie).patch(`/${listed.id}`, { note: 'met at a meetup' }).expect(200);
    expect(await membershipOf(listed.id)).toBe(quinn.membershipId);
    const unlinked = await as(owner.cookie)
      .patch(`/${listed.id}`, { email: 'someone.else@followers.test' })
      .expect(200);
    expect(unlinked.body).toMatchObject({ membershipId: null, joinedAt: null });
    // Matching again relinks.
    const relinked = await as(owner.cookie)
      .patch(`/${listed.id}`, { email: 'quinn@followers.test' })
      .expect(200);
    expect(relinked.body.membershipId).toBe(quinn.membershipId);
  });

  it('links one follower per member when two rows match, never failing', async () => {
    const rae = await joined('rae@followers.test');
    await db
      .update(user)
      .set({ socialPlatform: 'instagram', socialHandle: 'rae_ig' })
      .where(eq(user.id, rae.userId));
    const [byHandle, byEmail] = await db
      .insert(followers)
      .values([
        { spaceId: mira.space.id, name: 'Rae (IG)', handle: 'rae_ig', platform: 'instagram' },
        { spaceId: mira.space.id, name: 'Rae', email: 'rae@followers.test' },
      ])
      .returning();
    expect(await repos.followers.linkJoined(mira.space.id)).toBe(1);
    expect(await membershipOf(byEmail?.id ?? '')).toBe(rae.membershipId);
    expect(await membershipOf(byHandle?.id ?? '')).toBeNull();
    expect(await repos.followers.linkJoined(mira.space.id)).toBe(0);

    // Through the API too: the member is taken, so a second match is added unlinked.
    const uma = await joined('uma@followers.test');
    await db
      .update(user)
      .set({ socialPlatform: 'youtube', socialHandle: 'uma' })
      .where(eq(user.id, uma.userId));
    const first = await addFollower({ name: 'Uma (YT)', handle: 'uma', platform: 'youtube' });
    expect(await membershipOf(first.id)).toBe(uma.membershipId);
    const second = await addFollower({ name: 'Uma', email: 'uma@followers.test' });
    expect(await membershipOf(second.id)).toBeNull();
  });

  it("never links a removed member or another space's member", async () => {
    const sam = await joined('sam@followers.test');
    expect(await repos.memberships.remove(mira.space.id, sam.membershipId)).toBe(true);
    const removed = await addFollower({ name: 'Sam', email: 'sam@followers.test' });
    expect(await membershipOf(removed.id)).toBeNull();

    const rivalCommunity = other.communities[0] as CommunityRow;
    await joined('tia@followers.test', 'rival', rivalCommunity.id);
    const elsewhere = await addFollower({ name: 'Tia', email: 'tia@followers.test' });
    expect(await membershipOf(elsewhere.id)).toBeNull();
  });
});
