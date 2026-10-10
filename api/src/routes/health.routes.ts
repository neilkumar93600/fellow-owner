import { Router } from 'express';
import type { Container } from '../container.js';
import { pingDb } from '../db/client.js';

/** The database must answer `select 1` within this many ms for the API to count as healthy. */
const DB_TIMEOUT_MS = 2000;

/**
 * GET /api/health -> { status: 'ok' | 'error', db: 'ok' | 'down', ai: 'live' | 'fake', version }.
 * 503 when the database fails or takes over 2 s, so Railway's health check sees an API that
 * cannot serve.
 */
export function createHealthRoutes(container: Container): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    const up = await pingDb(container.db, DB_TIMEOUT_MS);
    res
      .status(up ? 200 : 503)
      .set('Cache-Control', 'no-store')
      .json({
        status: up ? 'ok' : 'error',
        db: up ? 'ok' : 'down',
        ai: container.ai.mode,
        version: container.env.APP_VERSION,
      });
  });
  return router;
}
