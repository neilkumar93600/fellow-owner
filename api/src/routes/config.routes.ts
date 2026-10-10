import { Router } from 'express';
import type { Container } from '../container.js';

/** GET /api/config (public, cacheable): PublicConfig. */
export function createConfigRoutes(container: Container): Router {
  const router = Router();
  router.get('/', container.controllers.config.get);
  return router;
}
