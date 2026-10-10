import { Router } from 'express';
import type { Container } from '../container.js';
import { createSpaceChallengesRoutes, createStudioChallengesRoutes } from './challenges.routes.js';
import { createCronRoutes } from './cron.routes.js';
import { createDemoRoutes } from './demo.routes.js';
import { createFollowersRoutes } from './followers.routes.js';
import { createHealthRoutes } from './health.routes.js';
import { createAnalyticsRoutes, createExportRoutes } from './insights.routes.js';
import { createNewsletterRoutes } from './newsletter.routes.js';
import { createNotificationsRoutes } from './notifications.routes.js';
import { createPitchesRoutes } from './pitches.routes.js';
import { createPostsRoutes } from './posts.routes.js';
import { createPublicRoutes, createShortLinkRoutes } from './public.routes.js';
import { createSpacesRoutes } from './spaces.routes.js';
import { createStudioRoutes } from './studio.routes.js';

/**
 * Everything under /api (Better Auth is mounted separately, before express.json()).
 *
 *   /api/health   health.routes      /api/spaces   spaces.routes (member side)
 *   /api/demo     demo.routes        /api/posts    posts.routes
 *   /api          public.routes      /api/pitches  pitches.routes
 *   /api/cron     cron.routes        /api/studio   studio.routes
 *   /api/notifications  notifications.routes
 *   /api/studio/followers  followers.routes, /api/studio/analytics and /api/studio/export
 *   /api/studio/challenges + /api/spaces/:handle/challenges  challenges.routes
 *   insights.routes: mounted before /api/studio so studio's routes never shadow them.
 */
export function createApiRouter(container: Container): Router {
  const router = Router();
  router.use('/health', createHealthRoutes(container));
  router.use('/demo', createDemoRoutes(container));
  router.use('/cron', createCronRoutes(container));
  router.use('/newsletter', createNewsletterRoutes(container));
  router.use('/', createPublicRoutes(container));
  router.use('/spaces', createSpaceChallengesRoutes(container));
  router.use('/spaces', createSpacesRoutes(container));
  router.use('/posts', createPostsRoutes(container));
  router.use('/pitches', createPitchesRoutes(container));
  router.use('/notifications', createNotificationsRoutes(container));
  router.use('/studio/followers', createFollowersRoutes(container));
  router.use('/studio/analytics', createAnalyticsRoutes(container));
  router.use('/studio/export', createExportRoutes(container));
  router.use('/studio/challenges', createStudioChallengesRoutes(container));
  router.use('/studio', createStudioRoutes(container));
  return router;
}

/** Routes outside /api: GET /r/:code. */
export function createRootRouter(container: Container): Router {
  const router = Router();
  router.use('/', createShortLinkRoutes(container));
  return router;
}
