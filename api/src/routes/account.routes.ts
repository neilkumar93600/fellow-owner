import { Router } from 'express';
import type { Container } from '../container.js';
import { noStore } from '../lib/http.js';
import { requireSession } from '../middlewares/require-session.js';

/** /api/me/* (session): GET /export. */
export function createAccountRoutes(container: Container): Router {
  const router = Router();
  router.use(noStore(), requireSession(container.auth));
  router.get('/export', container.controllers.account.exportAccount);
  return router;
}
