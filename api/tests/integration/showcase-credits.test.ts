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

interface Fan extends SignedIn {
  membership: MembershipRow;
}

let mira: TestSpace;
let owner: SignedIn;
let author: Fan;
let guide: Fan;
let photographer: Fan;
let requested: Fan;
let declined: Fan;
let project: PostRow;

async function fan(email: string, name: string): Promise<Fan> {
  const signedIn = await signInWithOtp(app, email, name);
  const { membership } = await factories.member(mira.space.id, {
    user: { id: signedIn.userId, email, name },
    communityIds: [(mira.communities[0] as CommunityRow).id],
  });
  return { ...signedIn, membership };
}

async function kinds(who: SignedIn): Promise<string[]> {
  const res = await request(app).get('/api/notifications').set('Cookie', who.cookie).expect(200);
  return res.body.items.map((n: { kind: string }) => n.kind);
}

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@credits.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  author = await fan('priya@credits.test', 'Priya Shah');
  guide = await fan('joao@credits.test', 'Joao Silva');
  photographer = await fan('ana@credits.test', 'Ana Costa');
  requested = await fan('sam@credits.test', 'Sam Lee');
  declined = await fan('kim@credits.test', 'Kim Park');
  project = await factories.post(
    mira.space.id,
    (mira.communities[0] as CommunityRow).id,
    author.membership.id,
    {
      type: 'project',
      title: 'Lisbon on $60 a day',
      body: 'A fan-made guide to Lisbon on $60 a day: where to sleep, eat and walk.',
      rolesNeeded: ['Local guide', 'Photographer', 'Video editor'],
    },
  );
  const team = [
    { who: guide, role: 'Local guide', status: 'accepted' as const },
    { who: photographer, role: 'Photographer', status: 'accepted' as const },
    { who: requested, role: 'Video editor', status: 'requested' as const },
    { who: declined, role: 'Video editor', status: 'declined' as const },
  ];
  for (const { who, role, status } of team) {
    await container.repos.teams.insert({
      postId: project.id,
      membershipId: who.membership.id,
      role,
      status,
      ...(status === 'requested' ? {} : { decidedAt: new Date() }),
    });
  }
});
afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('Made it: credits and notifications on publish', () => {
  it('notifies the author and accepted members, and credits them on the showcase', async () => {
    const created = await request(app)
      .post('/api/studio/promotions')
      .set('Cookie', owner.cookie)
      .send({ postId: project.id })
      .expect(201);
    const published = await request(app)
      .patch(`/api/studio/promotions/${created.body.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'publish' })
      .expect(200);
    await container.background.whenIdle();

    for (const who of [author, guide, photographer]) {
      expect((await kinds(who)).filter((k) => k === 'project_featured')).toHaveLength(1);
    }
    for (const who of [requested, declined, owner]) {
      expect(await kinds(who)).not.toContain('project_featured');
    }

    const showcase = await request(app)
      .get(`/api/spaces/mira/showcase/${published.body.showcaseSlug}`)
      .expect(200);
    expect(showcase.body.credits).toEqual([
      { name: 'Priya Shah', role: 'Started it', avatarUrl: null },
      { name: 'Joao Silva', role: 'Local guide', avatarUrl: null },
      { name: 'Ana Costa', role: 'Photographer', avatarUrl: null },
    ]);
  });

  it('an unpublished showcase has no credits', async () => {
    const promotion = await container.repos.promotions.findByPostId(mira.space.id, project.id);
    await request(app)
      .patch(`/api/studio/promotions/${promotion?.id}`)
      .set('Cookie', owner.cookie)
      .send({ action: 'unpublish' })
      .expect(200);
    const showcase = await request(app)
      .get(`/api/spaces/mira/showcase/${promotion?.showcaseSlug}`)
      .expect(200);
    expect(showcase.body.credits).toEqual([]);
  });
});
