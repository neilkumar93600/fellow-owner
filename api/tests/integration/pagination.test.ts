import { MY_SPACE_FIRST_PAGE } from '@fellow-owners/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import type { MembershipRow } from '../../src/db/schema/memberships.js';
import type { PostRow } from '../../src/db/schema/posts.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

let mira: TestSpace;
let community: CommunityRow;
let fan: SignedIn & { membership: MembershipRow };
let post: PostRow;

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

beforeAll(async () => {
  await resetDatabase();
  mira = await factories.space({ handle: 'mira' });
  community = mira.communities[0] as CommunityRow;
  const email = 'pager@pages.test';
  const signedIn = await signInWithOtp(app, email, 'Pager');
  const { membership } = await factories.member(mira.space.id, {
    user: { id: signedIn.userId, email, name: 'Pager' },
    communityIds: [community.id],
  });
  fan = { ...signedIn, membership };
  post = await factories.post(mira.space.id, community.id, membership.id);
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('comments on a post', () => {
  it('come 50 at a time: the newest in the detail, older ones with ?before=', async () => {
    const total = 55;
    for (let i = 0; i < total; i += 1) {
      await repos.comments.create({
        postId: post.id,
        spaceId: mira.space.id,
        authorMembershipId: fan.membership.id,
        body: `comment ${i}`,
      });
    }
    const detail = await request(app)
      .get(`/api/posts/${post.id}`)
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(detail.body.commentCount).toBe(total);
    const shown: Array<{ id: string; body: string }> = detail.body.comments;
    expect(shown).toHaveLength(50);
    expect(shown[0]?.body).toBe('comment 5');
    expect(shown.at(-1)?.body).toBe('comment 54');

    const older = await request(app)
      .get(`/api/posts/${post.id}/comments`)
      .query({ before: shown[0]?.id, limit: 3 })
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(older.body.items.map((c: { body: string }) => c.body)).toEqual([
      'comment 2',
      'comment 3',
      'comment 4',
    ]);
    expect(older.body.nextCursor).toBe(older.body.items[0].id);

    const rest = await request(app)
      .get(`/api/posts/${post.id}/comments`)
      .query({ before: older.body.nextCursor })
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(rest.body.items.map((c: { body: string }) => c.body)).toEqual([
      'comment 0',
      'comment 1',
    ]);
    expect(rest.body.nextCursor).toBeNull();
  });

  it('are for members only and validate `before`', async () => {
    const outsider = await signInWithOtp(app, 'outsider@pages.test', 'Outsider');
    await request(app)
      .get(`/api/posts/${post.id}/comments`)
      .set('Cookie', outsider.cookie)
      .expect(403);
    await request(app)
      .get(`/api/posts/${post.id}/comments`)
      .query({ before: 'nope' })
      .set('Cookie', fan.cookie)
      .expect(400);
  });
});

describe('My space', () => {
  it(`lists the first ${MY_SPACE_FIRST_PAGE} posts and pitches, then pages on with ?before=`, async () => {
    const extra = 3;
    const count = MY_SPACE_FIRST_PAGE + extra;
    for (let i = 0; i < count; i += 1) {
      // Oldest first; the one post from beforeAll is the newest.
      await factories.post(mira.space.id, community.id, fan.membership.id, {
        title: `Older post ${i}`,
        createdAt: minutesAgo(count + 10 - i),
      });
      await factories.pitch(mira.space.id, fan.membership.id, {
        subject: `Pitch ${i}`,
        createdAt: minutesAgo(count + 10 - i),
      });
    }
    // Hidden posts never show in My space, so they never fill a page.
    const hidden = await factories.post(mira.space.id, community.id, fan.membership.id, {
      createdAt: minutesAgo(count + 20),
    });
    await repos.posts.setHidden(mira.space.id, hidden.id, true);

    const me = await request(app).get('/api/spaces/mira/me').set('Cookie', fan.cookie).expect(200);
    expect(me.body.posts).toHaveLength(MY_SPACE_FIRST_PAGE);
    expect(me.body.pitches).toHaveLength(MY_SPACE_FIRST_PAGE);

    // Posts: 1 + count visible, first page holds MY_SPACE_FIRST_PAGE.
    const lastPost = me.body.posts.at(-1).id;
    const posts = await request(app)
      .get('/api/spaces/mira/me/posts')
      .query({ before: lastPost })
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(posts.body.items.map((p: { title: string }) => p.title)).toEqual([
      'Older post 3',
      'Older post 2',
      'Older post 1',
      'Older post 0',
    ]);
    expect(posts.body.nextCursor).toBeNull();

    const lastPitch = me.body.pitches.at(-1).id;
    const pitches = await request(app)
      .get('/api/spaces/mira/me/pitches')
      .query({ before: lastPitch, limit: 2 })
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(pitches.body.items.map((p: { subject: string }) => p.subject)).toEqual([
      'Pitch 2',
      'Pitch 1',
    ]);
    const more = await request(app)
      .get('/api/spaces/mira/me/pitches')
      .query({ before: pitches.body.nextCursor })
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(more.body.items.map((p: { subject: string }) => p.subject)).toEqual(['Pitch 0']);
    expect(more.body.nextCursor).toBeNull();
  });

  it('needs a membership', async () => {
    const outsider = await signInWithOtp(app, 'outsider2@pages.test', 'Outsider');
    await request(app).get('/api/spaces/mira/me/posts').set('Cookie', outsider.cookie).expect(403);
  });
});
