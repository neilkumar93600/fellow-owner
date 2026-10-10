import type { CoreDeps } from '../container.js';
import { readSeedData, type SeedData, type SeedResult, seedDemoSpace } from '../db/seed/seed.js';
import { demoDisabled } from '../lib/errors.js';

export interface DemoResetResult {
  /** Demo spaces deleted before reseeding (normally 1, or 0 on a fresh database). */
  deleted: number;
  seeded: SeedResult;
}

export interface DemoResetOptions {
  /** Pre-read data (tests); otherwise data/*.json is read from disk. */
  data?: SeedData;
}

/**
 * Demo reset (05-backend-schema section 9): deletes the demo space and reseeds it from
 * data/*.json, so the shared demo is clean again. Runs daily at 00:00 UTC through
 * GET/POST /api/cron/demo-reset (vercel.json), and on request from the same endpoint.
 *
 * seedDemoSpace() deletes the demo space itself, which is what makes a reseed idempotent; this
 * wrapper counts what went away first so the cron response says whether anything was there.
 *
 * Refuses when DEMO_ENABLED=false: on an instance with no demo, wiping and rebuilding a space is
 * not something a daily cron should do by itself.
 */
export async function resetDemo(
  deps: CoreDeps,
  options: DemoResetOptions = {},
): Promise<DemoResetResult> {
  if (!deps.env.DEMO_ENABLED) throw demoDisabled();

  const existing = await deps.repos.spaces.listDemo();
  const data = options.data ?? (await readSeedData());
  const seeded = await seedDemoSpace(deps, data);

  deps.logger.info({ deleted: existing.length, spaceId: seeded.spaceId }, 'demo reset done');
  return { deleted: existing.length, seeded };
}
