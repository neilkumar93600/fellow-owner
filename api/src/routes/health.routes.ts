import { Router } from 'express';
import type { Container } from '../container.js';
import { pingDb } from '../db/client.js';

/** GET /api/health -> { ok: true, db: 'up' | 'down', version }. Always 200 while the process runs. */
export function createHealthRoutes(container: Container): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    const up = await pingDb(container.db);
    res
      .set('Cache-Control', 'no-store')
      .json({ ok: true, db: up ? 'up' : 'down', version: container.env.APP_VERSION });
  });
  return router;
}
