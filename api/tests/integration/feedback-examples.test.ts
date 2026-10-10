import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const factories = createFactories(container);
const { repos } = container;

let mira: TestSpace;
let liked: string;
let disliked: string;
let current: string;

beforeAll(async () => {
  await resetDatabase();
  mira = await factories.space();
  const [food] = mira.communities as [CommunityRow];
  const { membership, user: fan } = await factories.member(mira.space.id, {
    communityIds: [food.id],
  });
  const post = await factories.post(mira.space.id, food.id, membership.id, {
    title: 'Hostel finder',
  });
  const pitch = await factories.pitch(mira.space.id, membership.id, { subject: 'Buy followers' });
  const now = await factories.post(mira.space.id, food.id, membership.id, { title: 'Current' });
  liked = post.id;
  disliked = pitch.id;
  current = now.id;
  const owner = mira.owner.id;
  const key = (
    refType: 'post' | 'inbound' | 'briefing_highlight',
    refId: string,
    userId = owner,
  ) => ({
    spaceId: mira.space.id,
    refType,
    refId,
    userId,
  });
  await repos.feedback.upsert(key('post', liked), 'up');
  await repos.feedback.upsert(key('inbound', disliked), 'down');
  await repos.feedback.upsert(key('post', current), 'up');
  await repos.feedback.upsert(key('briefing_highlight', `${current}:0`), 'up');
  // Votes by anyone but the creator never count.
  await repos.feedback.upsert(key('post', liked, fan.id), 'down');
});
afterAll(closeDb);

describe('feedback examples for triage', () => {
  it("returns the creator's post and pitch votes with titles, newest first, leaving one item out", async () => {
    const examples = await repos.feedback.recentExamples(mira.space.id, {
      excludeRefId: current,
      limit: 10,
    });
    expect(examples).toEqual([
      { verdict: 'down', kind: 'inbound', title: 'Buy followers', summary: null },
      { verdict: 'up', kind: 'post', title: 'Hostel finder', summary: null },
    ]);
  });

  it('respects the limit and returns nothing for a space without votes', async () => {
    expect(await repos.feedback.recentExamples(mira.space.id, { limit: 1 })).toHaveLength(1);
    const empty = await factories.space();
    expect(await repos.feedback.recentExamples(empty.space.id, { limit: 10 })).toEqual([]);
  });
});
