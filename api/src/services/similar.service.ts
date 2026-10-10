import type { SimilarResult } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type SimilarServiceDeps = Pick<CoreDeps, 'repos' | 'logger'>;

/** F17 similar ideas + people who could help. Stub: F06 builds it. */
export function createSimilarService(_deps: SimilarServiceDeps) {
  return {
    /** GET /api/posts/:postId/similar: only posts the member can see. */
    async forMember(_userId: string, _postId: string): Promise<SimilarResult> {
      throw notImplemented('Similar ideas');
    },
    /** GET /api/studio/posts/:postId/similar. */
    async forOwner(_spaceId: string, _postId: string): Promise<SimilarResult> {
      throw notImplemented('Similar ideas');
    },
  };
}

export type SimilarService = ReturnType<typeof createSimilarService>;
