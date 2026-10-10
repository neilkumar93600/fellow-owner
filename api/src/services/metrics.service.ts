import type { MetricsQuery, StudioMetrics } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type MetricsServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'logger'>;

/** What a request tells us about a visitor (hashed with CLICK_SALT, never stored raw). */
export interface VisitorInfo {
  ip: string;
  userAgent: string | null;
}

/** Pilot analytics: bio-page visits and the studio metrics card. Stub: F14 builds it. */
export function createMetricsService(_deps: MetricsServiceDeps) {
  return {
    async recordVisit(_handle: string, _visitor: VisitorInfo): Promise<void> {
      throw notImplemented('Visit tracking');
    },
    async studioMetrics(_spaceId: string, _query: MetricsQuery): Promise<StudioMetrics> {
      throw notImplemented('Studio metrics');
    },
  };
}

export type MetricsService = ReturnType<typeof createMetricsService>;
