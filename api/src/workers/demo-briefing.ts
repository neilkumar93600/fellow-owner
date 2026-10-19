import type { CoreDeps } from '../container.js';
import type { BriefingService } from '../services/briefing.service.js';

export type DemoBriefingDeps = Pick<CoreDeps, 'env' | 'repos' | 'logger'> & {
  briefing: Pick<BriefingService, 'get'>;
};

/**
 * Hourly: keeps today's briefing digest for the demo space built, so the first visitor after the
 * 01:00 UTC reset never waits on the smart model. When the digest is already cached this is a
 * plain database read. It never throws (a failed warm must not fail the tick): no demo space
 * (DEMO_ENABLED=false, or mid-reset) or an AI failure both end as `{ warmed: false }`.
 */
export async function warmDemoBriefing(deps: DemoBriefingDeps): Promise<{ warmed: boolean }> {
  if (!deps.env.DEMO_ENABLED) return { warmed: false };
  try {
    const [space] = await deps.repos.spaces.listDemo();
    if (!space) return { warmed: false };
    const briefing = await deps.briefing.get({
      userId: space.ownerUserId,
      space,
      membership: null,
    });
    return { warmed: briefing.id !== null };
  } catch (error) {
    deps.logger.warn({ err: error }, 'demo briefing warm failed');
    return { warmed: false };
  }
}
