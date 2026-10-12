import type { MediaKit, MediaKitSettings, updateMediaKitSchema } from '@fellow-owners/shared';
import type { z } from 'zod';
import type { CoreDeps } from '../container.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { notImplemented } from '../lib/errors.js';
import type { OwnerContext } from './access.service.js';
import type { PerformanceService } from './performance.service.js';

export type UpdateMediaKitBody = z.output<typeof updateMediaKitSchema>;

export type MediaKitServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'logger'> & {
  /** Reach, engagement and top posts come from F1 (performance.summary with { days: 30 }). */
  performance: PerformanceService;
};

/**
 * F6 Media kit: the public page for brands, built from F1/F2 data plus the creator's settings.
 * Wave A stubs: 501 until B4 lands.
 */
export function createMediaKitService(_deps: MediaKitServiceDeps) {
  const notBuilt = () => notImplemented('The media kit');
  return {
    /** GET /api/spaces/:handle/media-kit (public, cached): 404 while the creator has it off. */
    async publicKit(_handle: string): Promise<MediaKit> {
      throw notBuilt();
    },

    /** GET /api/spaces/:handle/media-kit/preview (owner): the same page, even while off. */
    async preview(_owner: OwnerContext): Promise<MediaKit> {
      throw notBuilt();
    },

    /** The creator's settings (brands.settings shows them on the Brand deals settings tab). */
    async settings(_space: SpaceRow): Promise<MediaKitSettings> {
      throw notBuilt();
    },

    /** PATCH /api/spaces/:handle/media-kit (owner): enabled, rates, note. */
    async updateSettings(
      _owner: OwnerContext,
      _input: UpdateMediaKitBody,
    ): Promise<MediaKitSettings> {
      throw notBuilt();
    },
  };
}

export type MediaKitService = ReturnType<typeof createMediaKitService>;
