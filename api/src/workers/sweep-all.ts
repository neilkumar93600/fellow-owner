import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type SweepAllDeps = Pick<CoreDeps, 'repos' | 'analyzer' | 'logger'>;

/**
 * Sweeps every space with pending, postponed or expired-lease items, 5 spaces at a time, so
 * analyses finish even when the owner never opens the studio. Resolves with the spaces swept.
 * Stub: F09 builds it.
 */
export async function sweepAll(_deps: SweepAllDeps): Promise<number> {
  throw notImplemented('Sweep all spaces');
}
