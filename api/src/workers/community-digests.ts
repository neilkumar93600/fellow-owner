import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type DigestWriterDeps = Pick<CoreDeps, 'db' | 'repos' | 'ai' | 'logger'>;

/** Weekly community digests (tick `community_digests`, Mondays 13:00 UTC). Stub: F04. */
export function createDigestWriter(_deps: DigestWriterDeps) {
  return {
    /** One digest per active community per ISO week; resolves with the digests written. */
    async writeDue(_now: Date): Promise<number> {
      throw notImplemented('Community digests');
    },
  };
}

export type DigestWriter = ReturnType<typeof createDigestWriter>;
