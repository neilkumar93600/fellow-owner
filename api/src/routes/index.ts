import { Router } from 'express';
import type { Container } from '../container.js';
import { createAccountRoutes } from './account.routes.js';
import { createAdminRoutes } from './admin.routes.js';
import { createAskRoutes } from './ask.routes.js';
import { createSpaceChallengesRoutes, createStudioChallengesRoutes } from './challenges.routes.js';
import { createCoachRoutes } from './coach.routes.js';
import { createConfigRoutes } from './config.routes.js';
import { createCronRoutes } from './cron.routes.js';
import { createDemoRoutes } from './demo.routes.js';
import { createFollowersRoutes } from './followers.routes.js';
import { createHealthRoutes } from './health.routes.js';
import { createAnalyticsRoutes, createExportRoutes } from './insights.routes.js';
import { createMetricsRoutes, createVisitRoutes } from './metrics.routes.js';
import {
  createModerationMemberRoutes,
  createModerationStudioRoutes,
  createModerationTargetRoutes,
} from './moderation.routes.js';
import { createNewsletterRoutes } from './newsletter.routes.js';
import { createEmailRoutes, createNotificationPrefsRoutes } from './notification-prefs.routes.js';
import { createNotificationsRoutes } from './notifications.routes.js';
import { createPitchesRoutes } from './pitches.routes.js';
import { createPostsRoutes } from './posts.routes.js';
import { createPublicRoutes, createShortLinkRoutes } from './public.routes.js';
import { createQuestionGroupsRoutes } from './question-groups.routes.js';
import { createSimilarRoutes } from './similar.routes.js';
import { createChecklistRoutes, createSnoozesRoutes } from './snoozes.routes.js';
import { createSpacesRoutes } from './spaces.routes.js';
import { createStudioRoutes } from './studio.routes.js';
import { createSupportRoutes } from './support.routes.js';
import { createMediaRoutes, createUploadsRoutes } from './uploads.routes.js';

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
 *
 * Backend completion routers, mounted before the existing routers they share a prefix with:
 *   /api/config  config         /api/support  support        /api/admin  admin
 *   /api/email   email (unsubscribe)          /api/me       account + notification prefs
 *   /api/media   media          /api/uploads  uploads
 *   /api/spaces  coach, visit, leave (DELETE /:handle/me)
 *   /api         reports on posts/comments, similar (member + studio)
 *   /api/studio  reports queue + comment hide; /api/studio/{question-groups, ask, snoozes,
 *                checklist, metrics}
 * Routers that share a prefix use per-route middleware only (a router.use would run for every
 * request on that prefix).
 */
export function createApiRouter(container: Container): Router {
  const router = Router();
  router.use('/health', createHealthRoutes(container));
  router.use('/demo', createDemoRoutes(container));
  router.use('/cron', createCronRoutes(container));
  router.use('/newsletter', createNewsletterRoutes(container));
  router.use('/config', createConfigRoutes(container));
  router.use('/support', createSupportRoutes(container));
  router.use('/admin', createAdminRoutes(container));
  router.use('/email', createEmailRoutes(container));
  router.use('/me', createAccountRoutes(container));
  router.use('/me', createNotificationPrefsRoutes(container));
  router.use('/media', createMediaRoutes(container));
  router.use('/uploads', createUploadsRoutes(container));
  router.use('/spaces', createCoachRoutes(container));
  router.use('/spaces', createVisitRoutes(container));
  router.use('/spaces', createModerationMemberRoutes(container));
  router.use('/', createModerationTargetRoutes(container));
  router.use('/', createSimilarRoutes(container));
  router.use('/studio', createModerationStudioRoutes(container));
  router.use('/studio/question-groups', createQuestionGroupsRoutes(container));
  router.use('/studio/ask', createAskRoutes(container));
  router.use('/studio/snoozes', createSnoozesRoutes(container));
  router.use('/studio/checklist', createChecklistRoutes(container));
  router.use('/studio/metrics', createMetricsRoutes(container));
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
