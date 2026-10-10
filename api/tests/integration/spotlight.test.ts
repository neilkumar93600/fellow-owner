import { DAILY_CAPS, type FanSpotlight } from '@fellow-owners/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SPOTLIGHT_NOTE_MAX } from '../../src/ai/tasks/spotlight-note.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import type { MembershipRow } from '../../src/db/schema/memberships.js';
import { startOfUtcDay } from '../../src/lib/dates.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
let mira: TestSpace;
let owner: SignedIn;
let fan: SignedIn;
let priya: MembershipRow;
let community: CommunityRow;

const path = (membershipId: string) => `/api/studio/people/${membershipId}/spotlight`;
const publicPage = async () =>
  (await request(app).get('/api/spaces/mira').expect(200)).body as { spotlights: FanSpotlight[] };

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@spotlight.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    displayName: 'Mira Lane',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  community = mira.communities[0] as CommunityRow;
  fan = await signInWithOtp(app, 'priya@spotlight.test', 'Priya Shah');
  ({ membership: priya } = await factories.member(mira.space.id, {
    user: { id: fan.userId, email: 'priya@spotlight.test', name: 'Priya Shah' },
    communityIds: [community.id],
    intro: 'Solo traveler from Austin, I map cheap night markets.',
  }));
  const post = await factories.post(mira.space.id, community.id, priya.id, {
    title: 'Lisbon on $60 a day',
  });
  await factories.signal(post.id, mira.ownerMembership.id, 'use');
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('fan spotlight', () => {
  it('drafts a short note', async () => {
    const res = await request(app)
      .post(`${path(priya.id)}/draft`)
      .set('Cookie', owner.cookie)
      .expect(200);
    expect(res.body).toEqual({ note: expect.any(String) });
    expect(res.body.note.length).toBeGreaterThan(0);
    expect(res.body.note.length).toBeLessThanOrEqual(SPOTLIGHT_NOTE_MAX);
    expect(res.body.note).toContain('Priya');
  });

  it('stores the note, shows it on the bio page and notifies the fan', async () => {
    const note = 'Priya mapped every cheap night market in Lisbon. Go follow her lead!';
    const res = await request(app)
      .put(path(priya.id))
      .set('Cookie', owner.cookie)
      .send({ note })
      .expect(200);
    expect(res.body).toEqual({
      membershipId: priya.id,
      name: 'Priya Shah',
      avatarUrl: null,
      note,
      spotlightAt: expect.any(String),
      communityName: community.name,
    });
    const page = await publicPage();
    expect(page.spotlights).toEqual([res.body]);
    await container.background.whenIdle();
    const notes = await request(app)
      .get('/api/notifications')
      .set('Cookie', fan.cookie)
      .expect(200);
    expect(notes.body.items.filter((n: { kind: string }) => n.kind === 'spotlighted')).toHaveLength(
      1,
    );
  });

  it('keeps the latest 6, newest first', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const { membership } = await factories.member(mira.space.id, {
        communityIds: [community.id],
      });
      await request(app)
        .put(path(membership.id))
        .set('Cookie', owner.cookie)
        .send({ note: `Thank you, fan number ${i + 1}!` })
        .expect(200);
      ids.unshift(membership.id);
    }
    const page = await publicPage();
    expect(page.spotlights.map((s) => s.membershipId)).toEqual(ids);
  });

  it('rejects a note over the limit', async () => {
    await request(app)
      .put(path(priya.id))
      .set('Cookie', owner.cookie)
      .send({ note: 'x'.repeat(SPOTLIGHT_NOTE_MAX + 1) })
      .expect(400);
  });

  it('only the owner can spotlight, and only fans of this space', async () => {
    await request(app)
      .put(path(priya.id))
      .set('Cookie', fan.cookie)
      .send({ note: 'Me!' })
      .expect(404);
    const other = await factories.space({ handle: 'other' });
    const { membership: stranger } = await factories.member(other.space.id);
    await request(app)
      .put(path(stranger.id))
      .set('Cookie', owner.cookie)
      .send({ note: 'Hi' })
      .expect(404);
    await request(app)
      .post(`${path(stranger.id)}/draft`)
      .set('Cookie', owner.cookie)
      .expect(404);
  });

  it('DELETE removes it from the bio page', async () => {
    await request(app).delete(path(priya.id)).set('Cookie', owner.cookie).expect(204);
    const page = await publicPage();
    expect(page.spotlights.some((s) => s.membershipId === priya.id)).toBe(false);
  });

  it('429 once the daily draft cap is reached', async () => {
    const used = await container.repos.aiRuns.countBySpaceTaskSince(
      mira.space.id,
      'spotlightNote',
      startOfUtcDay(new Date()),
    );
    for (let i = used; i < DAILY_CAPS.spotlightNote; i += 1) {
      await container.repos.aiRuns.insert({
        spaceId: mira.space.id,
        userId: owner.userId,
        task: 'spotlightNote',
        model: 'fake',
        status: 'ok',
      });
    }
    const res = await request(app)
      .post(`${path(priya.id)}/draft`)
      .set('Cookie', owner.cookie)
      .expect(429);
    expect(res.body.error.code).toBe('daily_cap_reached');
  });
});
