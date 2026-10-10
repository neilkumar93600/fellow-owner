import type { NotificationItem } from '@fellow-owners/shared';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import type { MembershipRow } from '../../src/db/schema/memberships.js';
import type { PostRow } from '../../src/db/schema/posts.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

interface Member extends SignedIn {
  membership: MembershipRow;
}

let owner: SignedIn;
let mira: TestSpace;
let builders: CommunityRow;
let arjun: Member;
let priya: Member;
let project: PostRow;

async function member(email: string, name: string, space = mira): Promise<Member> {
  const signedIn = await signInWithOtp(app, email, name);
  const { membership } = await factories.member(space.space.id, {
    user: { id: signedIn.userId, email, name },
    communityIds: [(space.communities[0] as CommunityRow).id],
  });
  return { ...signedIn, membership };
}

async function feed(
  who: SignedIn,
  query = '',
): Promise<{
  items: NotificationItem[];
  nextCursor: string | null;
  unread: number;
}> {
  const res = await request(app)
    .get(`/api/notifications${query}`)
    .set('Cookie', who.cookie)
    .expect(200);
  return res.body;
}

async function unread(who: SignedIn, query = ''): Promise<number> {
  const res = await request(app)
    .get(`/api/notifications/unread${query}`)
    .set('Cookie', who.cookie)
    .expect(200);
  return res.body.unread;
}

const pitchBody = {
  type: 'collab',
  subject: 'Film a gym series together',
  body: 'We would love to film a short gym series with you and your community next month.',
  links: [],
};

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@notifications.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    displayName: 'Mira',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  builders = mira.communities[0] as CommunityRow;
  arjun = await member('arjun@notifications.test', 'Arjun');
  priya = await member('priya@notifications.test', 'Priya');
  project = await factories.post(mira.space.id, builders.id, arjun.membership.id, {
    type: 'project',
    title: 'Gym log app',
    rolesNeeded: ['Designer'],
  });
});

beforeEach(async () => {
  await db.execute(sql`truncate table notifications`);
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('emit points', () => {
  it('idea_posted: tells the owner when a member publishes a post', async () => {
    const res = await request(app)
      .post('/api/spaces/mira/posts')
      .set('Cookie', arjun.cookie)
      .send({
        communityId: builders.id,
        type: 'discussion',
        title: 'Best split for beginners?',
        body: 'Curious what everyone runs for their first year of lifting, and why it worked.',
        rolesNeeded: [],
        links: [],
      })
      .expect(201);
    const page = await feed(owner);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      kind: 'idea_posted',
      text: 'Arjun posted a new discussion in Budget Travel: Best split for beginners?',
      href: `/dashboard/ideas?item=${res.body.id}`,
      spaceHandle: 'mira',
      readAt: null,
    });
    expect(page.unread).toBe(1);
    expect((await feed(arjun)).items).toHaveLength(0);
  });

  it('pitch_received and reply_received', async () => {
    const sent = await request(app)
      .post('/api/spaces/mira/pitches')
      .set('Cookie', priya.cookie)
      .send(pitchBody)
      .expect(201);
    const toOwner = await feed(owner);
    expect(toOwner.items.map((n) => [n.kind, n.text, n.href])).toEqual([
      [
        'pitch_received',
        'Priya sent you a collab pitch: Film a gym series together',
        `/dashboard/inbox?item=${sent.body.id}`,
      ],
    ]);

    await request(app)
      .patch(`/api/studio/inbox/${sent.body.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'reply', reply: 'Love it, let us talk next week.' })
      .expect(200);
    const toSender = await feed(priya);
    expect(toSender.items.map((n) => [n.kind, n.text, n.href])).toEqual([
      [
        'reply_received',
        'Mira replied to your idea: Film a gym series together',
        '/mira/me?tab=pitches',
      ],
    ]);
    expect((await feed(owner)).items).toHaveLength(1);
  });

  it('team_request and team_decision, once per change', async () => {
    await request(app)
      .post(`/api/posts/${project.id}/team`)
      .set('Cookie', priya.cookie)
      .send({ role: 'designer' })
      .expect(200);
    expect((await feed(arjun)).items.map((n) => [n.kind, n.text, n.href])).toEqual([
      ['team_request', 'Priya asked to join Gym log app as Designer', `/mira/p/${project.id}`],
    ]);

    const decide = (status: string) =>
      request(app)
        .patch(`/api/posts/${project.id}/team/${priya.membership.id}`)
        .set('Cookie', arjun.cookie)
        .send({ status })
        .expect(200);
    await decide('accepted');
    await decide('accepted');
    expect((await feed(priya)).items.map((n) => n.text)).toEqual([
      "You're on the crew for Gym log app as Designer",
    ]);
    await decide('declined');
    expect((await feed(priya)).items[0]?.text).toBe(
      'Your request to join the crew for Gym log app as Designer was declined',
    );
    expect((await feed(arjun)).items).toHaveLength(1);
  });

  it('comment_received: to the author, never for their own comment', async () => {
    const comment = (who: SignedIn) =>
      request(app)
        .post(`/api/posts/${project.id}/comments`)
        .set('Cookie', who.cookie)
        .send({ body: 'Count me in for testing.' })
        .expect(201);
    await comment(arjun);
    expect(await unread(arjun)).toBe(0);
    await comment(priya);
    expect((await feed(arjun)).items.map((n) => [n.kind, n.text, n.href])).toEqual([
      ['comment_received', 'Priya commented on Gym log app', `/mira/p/${project.id}`],
    ]);
  });

  it('project_featured: to the author on publish, not to the owner for their own post', async () => {
    const ownPost = await factories.post(mira.space.id, builders.id, mira.ownerMembership.id, {
      title: 'My own drop',
    });
    for (const post of [project, ownPost]) {
      const created = await request(app)
        .post('/api/studio/promotions')
        .set('Cookie', owner.cookie)
        .send({ postId: post.id });
      await request(app)
        .patch(`/api/studio/promotions/${created.body.id}`)
        .set('Cookie', owner.cookie)
        .send({ action: 'publish' })
        .expect(200);
    }
    expect((await feed(arjun)).items.map((n) => [n.kind, n.text, n.href])).toEqual([
      ['project_featured', 'Mira featured your fan project: Gym log app', `/mira/p/${project.id}`],
    ]);
    expect(await unread(owner)).toBe(0);
  });

  it('skips recipients whose membership was removed', async () => {
    const dev = await member('dev@notifications.test', 'Dev');
    const post = await factories.post(mira.space.id, builders.id, dev.membership.id, {
      title: 'Removed author post',
    });
    await request(app)
      .delete(`/api/studio/people/${dev.membership.id}`)
      .set('Cookie', owner.cookie)
      .expect(204);
    await request(app)
      .post(`/api/posts/${post.id}/comments`)
      .set('Cookie', priya.cookie)
      .send({ body: 'Still a great idea.' })
      .expect(201);
    expect(await unread(dev)).toBe(0);
  });

  it('cuts long titles without splitting characters', async () => {
    await container.services.notifications.notify({
      userId: arjun.userId,
      spaceId: mira.space.id,
      kind: 'project_featured',
      payload: { postId: project.id, title: `${'a'.repeat(78)}🏋️ gym` },
    });
    const text = (await feed(arjun)).items[0]?.text ?? '';
    expect(text).toBe(`Mira featured your fan project: ${'a'.repeat(78)}🏋…`);
  });

  it('cuts long titles and never throws from notify', async () => {
    const title = `${'Very long title '.repeat(7)}end`;
    await container.services.notifications.notify({
      userId: arjun.userId,
      spaceId: mira.space.id,
      kind: 'project_featured',
      payload: { postId: project.id, title },
    });
    const text = (await feed(arjun)).items[0]?.text ?? '';
    expect(text.startsWith('Mira featured your fan project: Very long title')).toBe(true);
    expect(text.endsWith('…')).toBe(true);
    expect(text.length).toBeLessThan('Mira featured your fan project: '.length + 81);

    await expect(
      container.services.notifications.notify({
        userId: arjun.userId,
        spaceId: '00000000-0000-0000-0000-000000000000',
        kind: 'project_featured',
        payload: { postId: project.id, title: 'x' },
      }),
    ).resolves.toBeUndefined();
  });

  it('says "fan project", never "project", for a new project post', async () => {
    await container.services.notifications.notify({
      userId: owner.userId,
      spaceId: mira.space.id,
      kind: 'idea_posted',
      payload: {
        postId: project.id,
        title: 'Lisbon on $60 a day',
        postType: 'project',
        actorName: 'Priya',
        communityName: 'Budget Travel',
      },
    });
    expect((await feed(owner)).items[0]?.text).toBe(
      'Priya posted a new fan project in Budget Travel: Lisbon on $60 a day',
    );
  });
});

describe('reading and marking', () => {
  async function seed(userId: string, count: number, spaceId = mira.space.id) {
    for (let i = 0; i < count; i += 1) {
      await container.services.notifications.notify({
        userId,
        spaceId,
        kind: 'comment_received',
        payload: { postId: project.id, title: `Post ${i}`, actorName: 'Priya', commentId: 'c' },
      });
    }
  }

  it('pages newest first with a cursor', async () => {
    await seed(arjun.userId, 5);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await feed(arjun, `?limit=2${cursor ? `&cursor=${cursor}` : ''}`);
      expect(page.items.length).toBeLessThanOrEqual(2);
      expect(page.unread).toBe(5);
      seen.push(...page.items.map((n) => n.text));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toEqual([4, 3, 2, 1, 0].map((i) => `Priya commented on Post ${i}`));
    await request(app)
      .get('/api/notifications?cursor=nope')
      .set('Cookie', arjun.cookie)
      .expect(400);
  });

  it('isolates recipients: B cannot list or mark A’s rows', async () => {
    await seed(arjun.userId, 2);
    const ids = (await feed(arjun)).items.map((n) => n.id);
    expect((await feed(priya)).items).toHaveLength(0);
    const res = await request(app)
      .post('/api/notifications/read')
      .set('Cookie', priya.cookie)
      .send({ ids })
      .expect(200);
    expect(res.body).toEqual({ unread: 0 });
    await request(app).post('/api/notifications/read').set('Cookie', priya.cookie).send({});
    expect(await unread(arjun)).toBe(2);
    await request(app).get('/api/notifications').expect(401);
  });

  it('marks given ids or all, and filters by space handle', async () => {
    const zed = await factories.space({ handle: 'zed', displayName: 'Zed' });
    await factories.member(zed.space.id, {
      user: { id: arjun.userId, email: arjun.email, name: 'Arjun' },
    });
    await seed(arjun.userId, 3);
    await seed(arjun.userId, 2, zed.space.id);

    expect(await unread(arjun)).toBe(5);
    expect(await unread(arjun, '?space=mira')).toBe(3);
    expect(await unread(arjun, '?space=zed')).toBe(2);
    expect(await unread(arjun, '?space=nobody')).toBe(0);
    const zedPage = await feed(arjun, '?space=zed');
    expect(
      zedPage.items.every((n) => n.spaceHandle === 'zed' && n.href === `/zed/p/${project.id}`),
    ).toBe(true);
    expect(zedPage.unread).toBe(2);
    expect(await feed(arjun, '?space=nobody')).toEqual({ items: [], nextCursor: null, unread: 0 });

    const [first] = (await feed(arjun, '?space=mira')).items;
    const one = await request(app)
      .post('/api/notifications/read')
      .set('Cookie', arjun.cookie)
      .send({ ids: [first?.id] })
      .expect(200);
    expect(one.body).toEqual({ unread: 4 });
    expect((await feed(arjun, '?space=mira')).items[0]?.readAt).toEqual(expect.any(String));

    const inZed = await request(app)
      .post('/api/notifications/read')
      .set('Cookie', arjun.cookie)
      .send({ space: 'zed' })
      .expect(200);
    expect(inZed.body).toEqual({ unread: 0 });
    expect(await unread(arjun)).toBe(2);

    const all = await request(app)
      .post('/api/notifications/read')
      .set('Cookie', arjun.cookie)
      .send({})
      .expect(200);
    expect(all.body).toEqual({ unread: 0 });
    expect(await unread(arjun)).toBe(0);
  });
});
