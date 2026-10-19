import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { readSeedData, seedDemoSpace } from '../../src/db/seed/seed.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
let spaceId = '';

// studioMetrics windows end at the real "today", so seed with the real clock.
describe('seed: studio metrics read as a credible young space', () => {
  beforeAll(async () => {
    await resetDatabase();
    spaceId = (await seedDemoSpace(container, await readSeedData())).spaceId;
  });

  afterAll(async () => {
    await closeDb();
  });

  it.each([30, 7] as const)('over %i days', async (days) => {
    const metrics = await container.services.metrics.studioMetrics(spaceId, { days });
    expect(metrics.joinRate).toBeGreaterThanOrEqual(0.1);
    expect(metrics.joinRate).toBeLessThanOrEqual(0.25);
    const v = metrics.bioVisitors.changePct;
    const j = metrics.joins.changePct;
    if (v !== null && j !== null) expect(Math.abs(v - j)).toBeLessThanOrEqual(40);
    if (days === 30) {
      expect(metrics.aiAgreement.rate).toBeGreaterThanOrEqual(0.7);
      expect(metrics.aiAgreement.rate).toBeLessThanOrEqual(0.9);
    }
  });
});
