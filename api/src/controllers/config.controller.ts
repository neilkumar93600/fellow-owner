import type { Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { notImplemented } from '../lib/errors.js';

export type ConfigControllerDeps = { env: Env };

/** GET /api/config (public): PublicConfig. Stub: F10 builds it. */
export function createConfigController(_deps: ConfigControllerDeps) {
  return {
    async get(_req: Request, _res: Response): Promise<void> {
      throw notImplemented('Public config');
    },
  };
}

export type ConfigController = ReturnType<typeof createConfigController>;
