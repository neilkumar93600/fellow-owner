import { LIMITS, type ReportsPage } from '@fellow-owners/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { notifications } from '../../src/db/schema/later.js';
import type { MembershipRow } from '../../src/db/schema/memberships.js';
import { memberships } from '../../src/db/schema/memberships.js';
import { reports } from '../../src/db/schema/moderation.js';
import type { PostRow } from '../../src/db/schema/posts.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

interface Member extends SignedIn {
  membership: MembershipRow;
}

let owner: SignedIn;
let mira: TestSpace;
let builders: CommunityRow;
let author: Member;
let fan: Member;
let outsider: SignedIn;
let otherOwner: SignedIn;
let post: PostRow;
let commentId: string;

async function member(email: string, name: string): Promise<Member> {
  const signedIn = await signInWithOtp(app, email, name);
  const { membership } = await factories.member(mira.space.id, {
    user: { id: signedIn.userId, email, name },
    communityIds: [builders.id],
  });
  return { ...signedIn, membership };
}

const reportPost = (cookie: string, id = post.id, reason = 'spam') =>
  request(app).post(`/api/posts/${id}/report`).set('Cookie', cookie).send({ reason });

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@mod.test', 'Mira Lane');
  mira = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
    handle: 'mira',
  });
  builders = mira.communities[0] as CommunityRow;
  author = await member('arjun@mod.test', 'Arjun Mehta');
  fan = await member('bea@mod.test', 'Bea');
  outsider = await signInWithOtp(app, 'out@mod.test', 'Outsider');
  otherOwner = await signInWithOtp(app, 'other@mod.test', 'Other Owner');
  await factories.space({
    owner: { id: otherOwner.userId, email: otherOwner.email, name: 'Other Owner' },
    handle: 'other',
  });
  post = await factories.post(mira.space.id, builders.id, author.membership.id, {
    title: 'Buy my followers now',
  });
  const res = await request(app)
    .post(`/api/posts/${post.id}/comments`)
    .set('Cookie', author.cookie)
    .send({ body: 'A rude comment here' })
    .expect(201);
  commentId = res.body.id;
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('POST /api/posts/:id/report', () => {
  it('is idempotent and notifies the owner once', async () => {
    await reportPost(fan.cookie).expect(204);
    await reportPost(fan.cookie).expect(204);
    const rows = await db.select().from(reports).where(eq(reports.targetId, post.id));
    expect(rows).toHaveLength(1);
    const bells = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, owner.userId));
    expect(bells.filter((n) => n.kind === 'report_filed')).toHaveLength(1);
  });

  it('rejects non-members and signed-out callers', async () => {
    await reportPost(outsider.cookie).expect(403);
    await request(app).post(`/api/posts/${post.id}/report`).send({ reason: 'spam' }).expect(401);
  });

  it('caps reports per user per day', async () => {
    const reporter = await member('busy@mod.test', 'Busy');
    for (let i = 0; i < LIMITS.reports.perUserPerDay; i++) {
      const p = await factories.post(mira.space.id, builders.id, author.membership.id);
      await reportPost(reporter.cookie, p.id).expect(204);
    }
    const extra = await factories.post(mira.space.id, builders.id, author.membership.id);
    await reportPost(reporter.cookie, extra.id).expect(429);
  });
});

describe('owner queue', () => {
  it('lists open reports and hide_target hides the post and resolves', async () => {
    await request(app)
      .post(`/api/comments/${commentId}/report`)
      .set('Cookie', fan.cookie)
      .send({ reason: 'harassment', note: 'rude' })
      .expect(204);
    const list = await request(app)
      .get('/api/studio/reports?status=open&limit=50')
      .set('Cookie', owner.cookie)
      .expect(200);
    const page = list.body as ReportsPage;
    expect(page.openCount).toBeGreaterThanOrEqual(2);
    const postReport = page.items.find((i) => i.target.id === post.id);
    expect(postReport).toMatchObject({
      reporterName: 'Bea',
      target: { type: 'post', excerpt: 'Buy my followers now', authorName: 'Arjun Mehta' },
    });
    expect(postReport?.target.href).toBe(`/dashboard/ideas?item=${post.id}`);

    const acted = await request(app)
      .patch(`/api/studio/reports/${postReport?.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'hide_target' })
      .expect(200);
    expect(acted.body).toMatchObject({ status: 'resolved', target: { hidden: true } });
    expect((await repos.posts.findById(post.id))?.hiddenAt).not.toBeNull();
  });

  it('dismiss closes the report without hiding', async () => {
    const list = await request(app)
      .get('/api/studio/reports?status=open&limit=50')
      .set('Cookie', owner.cookie)
      .expect(200);
    const item = (list.body as ReportsPage).items.find((i) => i.target.type === 'comment');
    const res = await request(app)
      .patch(`/api/studio/reports/${item?.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'dismiss' })
      .expect(200);
    expect(res.body).toMatchObject({ status: 'dismissed', target: { hidden: false } });
  });

  it('gives another space owner a 404 on every route', async () => {
    const [row] = await db.select().from(reports).limit(1);
    await request(app)
      .patch(`/api/studio/reports/${row?.id}`)
      .set('Cookie', otherOwner.cookie)
      .send({ action: 'resolve' })
      .expect(404);
    await request(app)
      .patch(`/api/studio/posts/${post.id}/comments/${commentId}`)
      .set('Cookie', otherOwner.cookie)
      .send({ action: 'hide' })
      .expect(404);
    const list = await request(app)
      .get('/api/studio/reports')
      .set('Cookie', otherOwner.cookie)
      .expect(200);
    expect(list.body.items).toHaveLength(0);
  });

  it('rejects fans on the owner routes', async () => {
    await request(app).get('/api/studio/reports').set('Cookie', fan.cookie).expect(404);
  });
});

describe('comment hide', () => {
  it('hides and unhides a comment', async () => {
    const patch = (action: string) =>
      request(app)
        .patch(`/api/studio/posts/${post.id}/comments/${commentId}`)
        .set('Cookie', owner.cookie)
        .send({ action })
        .expect(204);
    await patch('hide');
    expect((await repos.comments.findById(post.id, commentId))?.hiddenAt).not.toBeNull();
    await patch('unhide');
    expect((await repos.comments.findById(post.id, commentId))?.hiddenAt).toBeNull();
  });
});

describe('DELETE /api/spaces/:handle/me', () => {
  it('lets a fan leave and keeps counters right', async () => {
    const leaver = await member('leaver@mod.test', 'Leaver');
    const before = (await repos.communities.listBySpace(mira.space.id)).find(
      (c) => c.id === builders.id,
    );
    await request(app).delete('/api/spaces/mira/me').set('Cookie', leaver.cookie).expect(204);
    const [row] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, leaver.membership.id));
    expect(row?.removedAt).not.toBeNull();
    const after = (await repos.communities.listBySpace(mira.space.id)).find(
      (c) => c.id === builders.id,
    );
    expect(after?.memberCount).toBe((before?.memberCount ?? 0) - 1);
    // Leaving twice: they are no longer a member.
    await request(app).delete('/api/spaces/mira/me').set('Cookie', leaver.cookie).expect(403);
  });

  it('lets a fan who left join again, like a fresh join', async () => {
    const leaver = await member('rejoin@mod.test', 'Rejoiner');
    const count = async () =>
      (await repos.communities.listBySpace(mira.space.id)).find((c) => c.id === builders.id)
        ?.memberCount;
    const before = await count();
    await request(app).delete('/api/spaces/mira/me').set('Cookie', leaver.cookie).expect(204);
    const [left] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, leaver.membership.id));
    expect(left?.leftAt).not.toBeNull();
    expect(left?.removedAt).not.toBeNull();

    const joined = await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', leaver.cookie)
      .send({ communityIds: [builders.id] })
      .expect(200);
    expect(joined.body.alreadyMember).toBe(false);
    const [back] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, leaver.membership.id));
    expect(back?.removedAt).toBeNull();
    expect(back?.leftAt).toBeNull();
    expect(await count()).toBe(before);
    await request(app).get('/api/spaces/mira/me').set('Cookie', leaver.cookie).expect(200);
  });

  it('keeps a member the owner removed out, even after an earlier leave and rejoin', async () => {
    const fanToRemove = await member('removed@mod.test', 'Removed');
    await request(app).delete('/api/spaces/mira/me').set('Cookie', fanToRemove.cookie).expect(204);
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', fanToRemove.cookie)
      .send({ communityIds: [builders.id] })
      .expect(200);
    await request(app)
      .delete(`/api/studio/people/${fanToRemove.membership.id}`)
      .set('Cookie', owner.cookie)
      .expect(204);
    const [row] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, fanToRemove.membership.id));
    expect(row?.removedAt).not.toBeNull();
    expect(row?.leftAt).toBeNull();
    await request(app)
      .post('/api/spaces/mira/join')
      .set('Cookie', fanToRemove.cookie)
      .send({ communityIds: [builders.id] })
      .expect(403);
  });

  it('refuses the owner', async () => {
    await request(app).delete('/api/spaces/mira/me').set('Cookie', owner.cookie).expect(400);
  });
});
