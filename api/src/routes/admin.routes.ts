import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSession } from '../middlewares/require-session.js';

/** /api/admin/* (session; F11 adds requireAdmin on ADMIN_EMAILS). */
export function createAdminRoutes(container: Container): Router {
  const router = Router();
  router.use(noStore(), requireSession(container.auth));
  router.post('/demo-reset', container.controllers.admin.demoReset);
  return router;
}
