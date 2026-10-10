import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireAdmin } from '../middlewares/require-admin.js';

/** /api/admin/* (session email in ADMIN_EMAILS). */
export function createAdminRoutes(container: Container): Router {
  const router = Router();
  router.use(noStore(), requireAdmin(container.auth, container.env.ADMIN_EMAILS));
  router.post('/demo-reset', container.controllers.admin.demoReset);
  return router;
}
