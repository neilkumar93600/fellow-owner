import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { communities, communityMembers } from '../../src/db/schema/communities.js';
import { followerCommunities, followers } from '../../src/db/schema/followers.js';
import type { MembershipRow } from '../../src/db/schema/memberships.js';
import { memberships } from '../../src/db/schema/memberships.js';
import { posts } from '../../src/db/schema/posts.js';
import { comments, signals } from '../../src/db/schema/social.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

let owner: SignedIn;
let fanSession: SignedIn;
let mira: TestSpace;
let builders: CommunityRow;
let fitness: CommunityRow;
let archived: CommunityRow;
let arjun: MembershipRow;
let bea: MembershipRow;
let other: TestSpace;

const get = (path: string, cookie = owner.cookie) =>
  request(app).get(`/api/studio${path}`).set('Cookie', cookie);
const put = (path: string, body: unknown, cookie = owner.cookie) =>
  request(app)
    .put(`/api/studio${path}`)
    .set('Cookie', cookie)
    .send(body as object);

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@insights.test', 'Mira Lane');
  fanSession = await signInWithOtp(app, 'arjun@insights.test', 'Arjun Rao');
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
  arjun = (
    await factories.member(mira.space.id, {
      user: { id: fanSession.userId, email: fanSession.email, name: 'Arjun Rao' },
      communityIds: [builders.id, fitness.id],
      headline: 'Frontend dev',
      skills: ['react'],
    })
  ).membership;
  bea = (await factories.member(mira.space.id, { communityIds: [fitness.id] })).membership;
  await repos.memberships.addCommunities(mira.space.id, bea.id, [archived.id]);
  await db
    .update(communities)
    .set({ archivedAt: new Date() })
    .where(eq(communities.id, archived.id));
  // Joined long ago: only counts as a member, not as a new one.
  await db
    .update(communityMembers)
    .set({ joinedAt: ago(40) })
    .where(eq(communityMembers.membershipId, bea.id));

  // builders: 2 posts this week by arjun (one with a formula title), 1 post 10 days ago, 1 deleted
  const hot = await factories.post(mira.space.id, builders.id, arjun.id, {
    title: '=HYPERLINK("http://evil.test","click")',
  });
  await factories.post(mira.space.id, builders.id, arjun.id, { title: 'Gym log app' });
  await factories.post(mira.space.id, builders.id, arjun.id, {
    title: 'Older idea',
    createdAt: ago(10),
  });
  const deleted = await factories.post(mira.space.id, builders.id, arjun.id, {
    title: 'Deleted idea',
  });
  await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, deleted.id));
  // fitness: 1 post this week by bea
  await factories.post(mira.space.id, fitness.id, bea.id, { title: 'Run club' });

  await db.insert(comments).values({
    postId: hot.id,
    spaceId: mira.space.id,
    authorMembershipId: bea.id,
    body: 'Love it',
  });
  await db.insert(comments).values({
    postId: hot.id,
    spaceId: mira.space.id,
    authorMembershipId: bea.id,
    body: 'Deleted comment',
    deletedAt: new Date(),
  });
  await db.insert(signals).values({ postId: hot.id, membershipId: bea.id, kind: 'use' });

  const [follower] = await db
    .insert(followers)
    .values({
      spaceId: mira.space.id,
      name: 'Priya, "P" Nair',
      handle: 'priya',
      platform: 'instagram',
      email: 'priya@example.com',
      note: 'Loves lifting',
      source: 'csv',
    })
    .returning();
  await db
    .insert(followerCommunities)
    .values({ followerId: follower!.id, communityId: fitness.id });
  await repos.pitches.insert({
    spaceId: mira.space.id,
    senderMembershipId: bea.id,
    type: 'collab',
    subject: 'Film a gym series',
    body: 'Let us film a gym series together.',
    contentHash: 'h1',
  });
  await repos.pitches.insert({
    spaceId: mira.space.id,
    senderMembershipId: bea.id,
    type: 'press',
    subject: 'Withdrawn pitch',
    body: 'Never mind this one.',
    contentHash: 'h2',
    status: 'withdrawn',
  });

  other = await factories.space({ handle: 'other' });
  await factories.member(other.space.id, { communityIds: [other.communities[0]!.id] });
});

afterAll(async () => {
  await closeDb();
});

describe('community activity', () => {
  it('requires the owner', async () => {
    await request(app).get('/api/studio/analytics/communities').expect(401);
    await get('/analytics/communities', fanSession.cookie).expect((res) => {
      expect([403, 404]).toContain(res.status);
    });
  });

  it('rejects windows other than 7 or 30', async () => {
    await get('/analytics/communities?days=14').expect(400);
    await get('/analytics/communities?days=abc').expect(400);
  });

  it('counts the last 7 days against the 7 before, ranked by score, archived excluded', async () => {
    const res = await get('/analytics/communities').expect(200);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.body.days).toBe(7);
    expect(res.body.communities.map((c: { slug: string }) => c.slug)).toEqual([
      'budget-travel',
      'solo-travelers',
    ]);
    const [b, f] = res.body.communities;
    expect(b).toMatchObject({
      members: 1,
      newMembers: 1,
      posts: 2,
      comments: 1,
      signals: 1,
      activeMembers: 2,
      followers: 0,
      score: 11,
      previousScore: 3,
      change: 267,
    });
    expect(f).toMatchObject({
      members: 2,
      newMembers: 1,
      posts: 1,
      comments: 0,
      signals: 0,
      activeMembers: 1,
      followers: 1,
      score: 5,
      previousScore: 0,
      change: null,
    });
    expect(Date.parse(res.body.to) - Date.parse(res.body.from)).toBe(7 * DAY);
  });

  it('widens to 30 days', async () => {
    const res = await get('/analytics/communities?days=30').expect(200);
    const b = res.body.communities.find((c: { slug: string }) => c.slug === 'budget-travel');
    expect(b).toMatchObject({ posts: 3, score: 14, previousScore: 0, change: null });
  });

  it('ignores other spaces and removed members', async () => {
    await db.update(memberships).set({ removedAt: new Date() }).where(eq(memberships.id, bea.id));
    const res = await get('/analytics/communities').expect(200);
    const b = res.body.communities.find((c: { slug: string }) => c.slug === 'budget-travel');
    expect(b.activeMembers).toBe(1);
    await db.update(memberships).set({ removedAt: null }).where(eq(memberships.id, bea.id));
  });
});

describe('csv export', () => {
  const exportCsv = (kind: string, cookie = owner.cookie) =>
    request(app)
      .get(`/api/studio/export/${kind}`)
      .set('Cookie', cookie)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks).toString('utf8')));
      });

  const HEADERS = {
    ideas:
      'id,created_at,type,status,title,community,author,use_count,build_count,comment_count,team_size,fit_score,ai_category,ai_summary,idea_score,featured,hidden,link',
    people:
      'membership_id,name,headline,skills,communities,joined_at,posts,comments,signals_received,teams,rising_score',
    followers: 'id,created_at,name,handle,platform,email,note,source,communities,joined',
    pitches:
      'id,created_at,type,subject,body,status,sender,filtered,fit_score,ai_category,ai_summary,replied_at,reply',
  } as const;

  it('requires the owner and a known kind', async () => {
    await request(app).get('/api/studio/export/ideas').expect(401);
    await exportCsv('ideas', fanSession.cookie).expect((res) => {
      expect([403, 404]).toContain(res.status);
    });
    await get('/export/members').expect(400);
  });

  it('sends an attachment with a BOM, the header row and no caching', async () => {
    const res = await exportCsv('followers').expect(200);
    const day = new Date().toISOString().slice(0, 10);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain(
      `attachment; filename="mira-followers-${day}.csv"`,
    );
    expect(res.headers['cache-control']).toContain('no-store');
    const text = res.body as string;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text.slice(1).split('\n')[0]).toBe(HEADERS.followers);
  });

  it('exports followers with quoting and tagged communities', async () => {
    const lines = ((await exportCsv('followers').expect(200)).body as string)
      .slice(1)
      .trimEnd()
      .split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(
      /^[0-9a-f-]{36},\d{4}-\d\d-\d\dT[^,]+,"Priya, ""P"" Nair",priya,instagram,priya@example.com,Loves lifting,csv,Solo Travelers,no$/,
    );
  });

  it('exports ideas newest first without deleted posts, guarding formulas', async () => {
    const text = (await exportCsv('ideas').expect(200)).body as string;
    expect(text.slice(1).split('\n')[0]).toBe(HEADERS.ideas);
    expect(text).not.toContain('Deleted idea');
    expect(text).toContain(`"'=HYPERLINK(""http://evil.test"",""click"")"`);
    expect(text).toContain('/mira/p/');
    const titles = ['Run club', 'Gym log app', 'Older idea'].map((t) => text.indexOf(t));
    expect(titles.every((i) => i > 0)).toBe(true);
    expect(titles[0]).toBeLessThan(titles[1] as number);
    expect(titles[1]).toBeLessThan(titles[2] as number);
  });

  it('exports people without emails', async () => {
    const text = (await exportCsv('people').expect(200)).body as string;
    expect(text.slice(1).split('\n')[0]).toBe(HEADERS.people);
    expect(text).toContain('Arjun Rao');
    expect(text).toContain('Frontend dev');
    expect(text).not.toContain('@insights.test');
    expect(text).not.toContain('Mira Lane');
  });

  it('exports pitches without withdrawn ones', async () => {
    const text = (await exportCsv('pitches').expect(200)).body as string;
    expect(text.slice(1).split('\n')[0]).toBe(HEADERS.pitches);
    expect(text).toContain('Film a gym series');
    expect(text).not.toContain('Withdrawn pitch');
  });
});

describe('PUT people communities', () => {
  it('replaces the member set, keeps counters and archived joins, returns the PersonRow', async () => {
    const res = await put(`/people/${bea.id}/communities`, { communityIds: [builders.id] }).expect(
      200,
    );
    expect(res.body.membershipId).toBe(bea.id);
    expect(res.body.communities.map((c: { slug: string }) => c.slug)).toEqual(['budget-travel']);
    expect(res.body).not.toHaveProperty('email');

    const [b, f] = await Promise.all([
      repos.communities.findBySlug(mira.space.id, 'budget-travel'),
      repos.communities.findBySlug(mira.space.id, 'solo-travelers'),
    ]);
    expect(b?.memberCount).toBe(2);
    expect(f?.memberCount).toBe(1);
    expect(await repos.memberships.communityIds(bea.id)).toContain(archived.id);
  });

  it('is idempotent', async () => {
    await put(`/people/${bea.id}/communities`, { communityIds: [builders.id] }).expect(200);
    const b = await repos.communities.findBySlug(mira.space.id, 'budget-travel');
    expect(b?.memberCount).toBe(2);
  });

  it("refuses the owner's own membership", async () => {
    await put(`/people/${mira.ownerMembership.id}/communities`, {
      communityIds: [builders.id],
    }).expect(403);
  });

  it('refuses archived or foreign communities', async () => {
    const archivedRes = await put(`/people/${bea.id}/communities`, {
      communityIds: [archived.id],
    }).expect(400);
    expect(archivedRes.body.error?.code ?? archivedRes.body.code).toBe('validation_error');
    await put(`/people/${bea.id}/communities`, {
      communityIds: [other.communities[0]!.id],
    }).expect(400);
  });

  it('404s for a foreign, unknown or removed membership', async () => {
    const otherMember = (
      await db.select().from(memberships).where(eq(memberships.spaceId, other.space.id))
    ).find((row) => row.role === 'member') as MembershipRow;
    await put(`/people/${otherMember.id}/communities`, { communityIds: [builders.id] }).expect(404);
    await put('/people/00000000-0000-4000-8000-000000000000/communities', {
      communityIds: [builders.id],
    }).expect(404);
    const gone = (await factories.member(mira.space.id, { communityIds: [builders.id] }))
      .membership;
    await repos.memberships.remove(mira.space.id, gone.id);
    await put(`/people/${gone.id}/communities`, { communityIds: [builders.id] }).expect(404);
  });

  it('validates the body and requires the owner', async () => {
    await put(`/people/${bea.id}/communities`, { communityIds: [] }).expect(400);
    await put(
      `/people/${bea.id}/communities`,
      { communityIds: [builders.id] },
      fanSession.cookie,
    ).expect((res) => {
      expect([403, 404]).toContain(res.status);
    });
  });
});
