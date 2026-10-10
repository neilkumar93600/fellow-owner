import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import type { PostRow } from '../../src/db/schema/posts.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
let mira: TestSpace;
let owner: SignedIn;
let fan: SignedIn;
let community: CommunityRow;
let post: PostRow;

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@love.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  community = mira.communities[0] as CommunityRow;
  fan = await signInWithOtp(app, 'priya@love.test', 'Priya Shah');
  const { membership } = await factories.member(mira.space.id, {
    user: { id: fan.userId, email: 'priya@love.test', name: 'Priya Shah' },
    communityIds: [community.id],
  });
  post = await factories.post(mira.space.id, community.id, membership.id, {
    title: 'Lisbon on $60 a day',
  });
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('POST/DELETE /api/studio/posts/:id/love', () => {
  it('owner loves a post, fan is notified, post shows lovedAt', async () => {
    const res = await request(app)
      .post(`/api/studio/posts/${post.id}/love`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body.lovedAt).toEqual(expect.any(String));
    const detail = await request(app)
      .get(`/api/posts/${post.id}`)
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(detail.body.lovedAt).toEqual(res.body.lovedAt);
    const feed = await request(app)
      .get(`/api/spaces/mira/communities/${community.slug}/posts`)
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(feed.body.items[0].lovedAt).toEqual(res.body.lovedAt);
    expect(feed.body.items[0].challenge).toBeNull();
    await container.background.whenIdle();
    const notes = await request(app)
      .get('/api/notifications')
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(notes.body.items.some((n: { kind: string }) => n.kind === 'post_loved')).toBe(true);
  });

  it('loving twice is idempotent and sends one notification', async () => {
    await request(app)
      .post(`/api/studio/posts/${post.id}/love`)
      .set('Cookie', owner.cookie)
      .expect(200);
    await container.background.whenIdle();
    const notes = await request(app)
      .get('/api/notifications')
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(notes.body.items.filter((n: { kind: string }) => n.kind === 'post_loved')).toHaveLength(
      1,
    );
  });

  it('unlove clears lovedAt', async () => {
    const res = await request(app)
      .delete(`/api/studio/posts/${post.id}/love`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body.lovedAt).toBeNull();
    const detail = await request(app)
      .get(`/api/posts/${post.id}`)
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(detail.body.lovedAt).toBeNull();
  });

  it('love, unlove, love again does not notify twice', async () => {
    for (const method of ['post', 'delete', 'post'] as const) {
      await request(app)
        [method](`/api/studio/posts/${post.id}/love`)
        .set('Cookie', owner.cookie)
        .expect(200);
    }
    await container.background.whenIdle();
    const notes = await request(app)
      .get('/api/notifications')
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(notes.body.items.filter((n: { kind: string }) => n.kind === 'post_loved')).toHaveLength(
      1,
    );
  });

  it('a fan cannot love (not owner)', async () => {
    await request(app)
      .post(`/api/studio/posts/${post.id}/love`)
      .set('Cookie', fan.cookie)
      .expect(404);
  });

  it('404 for a post in another space', async () => {
    const other = await factories.space({ handle: 'other' });
    const otherPost = await factories.post(
      other.space.id,
      (other.communities[0] as CommunityRow).id,
      null,
      { title: 'Elsewhere' },
    );
    await request(app)
      .post(`/api/studio/posts/${otherPost.id}/love`)
      .set('Cookie', owner.cookie)
      .expect(404);
  });
});
