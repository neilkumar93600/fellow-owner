import type { PublicConfig } from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';

export type ConfigControllerDeps = { env: Env };

/** GET /api/config (public): what this deployment offers, so the web hides what is off. */
export function createConfigController(deps: ConfigControllerDeps) {
  const { env } = deps;
  // ponytail: env is fixed for the process, so the answer is built once.
  const config: PublicConfig = {
    providers: {
      google: env.GOOGLE_ENABLED,
      apple: env.APPLE_ENABLED,
      facebook: env.FACEBOOK_ENABLED,
    },
    demoEnabled: env.DEMO_ENABLED,
    uploads: env.UPLOADS_ENABLED,
    youtubeImport: env.YOUTUBE_ENABLED,
  };
  return {
    async get(_req: Request, res: Response): Promise<void> {
      res.set('Cache-Control', 'public, max-age=300').json(config);
    },
  };
}

export type ConfigController = ReturnType<typeof createConfigController>;
