import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import { clickEvents } from '../../src/db/schema/promotions.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
const { repos } = container;

let promotionId: string;
let code: string;

beforeAll(async () => {
  await resetDatabase();
  const mira = await factories.space();
  const [food] = mira.communities as [CommunityRow];
  const { membership } = await factories.member(mira.space.id, { communityIds: [food.id] });
  const post = await factories.post(mira.space.id, food.id, membership.id);
  const { row } = await repos.promotions.insertDraft({
    spaceId: mira.space.id,
    postId: post.id,
    createdByUserId: mira.owner.id,
    headline: 'Promo',
    drafts: {},
  });
  const published = await repos.promotions.publish(mira.space.id, row.id, {
    showcaseSlug: 'promo',
    shortCode: 'Dd3dE9xY',
  });
  promotionId = row.id;
  code = published!.shortCode!;
});

afterAll(closeDb);

const click = (ua: string, platform = 'x') =>
  request(app).get(`/r/${code}?p=${platform}`).set('User-Agent', ua).expect(302);

async function counts() {
  const rows = await db.select().from(clickEvents).where(eq(clickEvents.promotionId, promotionId));
  const found = await repos.promotions.findByShortCode(code);
  return { rows: rows.length, clickCount: found!.promotion.clickCount };
}

describe('short-link click dedupe', () => {
  it('counts a visitor once per platform per day, however often they hit the link', async () => {
    for (let i = 0; i < 5; i++) await click('Mozilla/5.0 (Repeat)');
    expect(await counts()).toEqual({ rows: 1, clickCount: 1 });

    await click('Mozilla/5.0 (Repeat)', 'linkedin');
    await click('Mozilla/5.0 (Someone else)');
    expect(await counts()).toEqual({ rows: 3, clickCount: 3 });
  });

  it('record reports whether the click was new', async () => {
    const click = { promotionId, platform: 'x' as const, referrerHost: null, visitorHash: 'h1' };
    expect(await repos.clicks.record(click)).toBe(true);
    expect(await repos.clicks.record(click)).toBe(false);
  });
});
