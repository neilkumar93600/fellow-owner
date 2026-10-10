import { createAiServices as createAiServicesFor } from './ai/index.js';
import type { AiServices, Analyzer, BackgroundRunner } from './ai/types.js';
import { type Auth, auth as defaultAuth } from './auth/index.js';
import { env as defaultEnv, type Env } from './config/env.js';
import { createChallengesController } from './controllers/challenges.controller.js';
import { createCronController } from './controllers/cron.controller.js';
import { createDemoController } from './controllers/demo.controller.js';
import { createFollowersController } from './controllers/followers.controller.js';
import { createInsightsController } from './controllers/insights.controller.js';
import { createNewsletterController } from './controllers/newsletter.controller.js';
import { createNotificationsController } from './controllers/notifications.controller.js';
import { createPitchesController } from './controllers/pitches.controller.js';
import { createPostsController } from './controllers/posts.controller.js';
import { createPublicController } from './controllers/public.controller.js';
import { createSpacesController } from './controllers/spaces.controller.js';
import { createStudioController } from './controllers/studio.controller.js';
import { type Db, db as defaultDb } from './db/client.js';
import { logger as defaultLogger, type Logger } from './lib/logger.js';
import { createMemoryPubSub, createRedisPubSub, type PubSub } from './lib/pubsub.js';
import { redis, redisSubscriber } from './lib/redis.js';
import { createRepos, type Repos } from './repositories/index.js';
import { createAccessService } from './services/access.service.js';
import { createBriefingService } from './services/briefing.service.js';
import { createChallengesService } from './services/challenges.service.js';
import { createClicksService } from './services/clicks.service.js';
import { createCommentsService } from './services/comments.service.js';
import { createCommunitiesService } from './services/communities.service.js';
import { createDemoService } from './services/demo.service.js';
import { createDiscoveryService } from './services/discovery.service.js';
import { createFollowersService } from './services/followers.service.js';
import { createInsightsService } from './services/insights.service.js';
import { createLimitsService } from './services/limits.service.js';
import { createMembershipsService } from './services/memberships.service.js';
import { createNewsletterService } from './services/newsletter.service.js';
import { createNotificationsService } from './services/notifications.service.js';
import { createOverviewService } from './services/overview.service.js';
import { createPitchesService } from './services/pitches.service.js';
import { createPostsService } from './services/posts.service.js';
import { createPromotionsService } from './services/promotions.service.js';
import { createSignalsService } from './services/signals.service.js';
import { createSpacesService } from './services/spaces.service.js';
import { createTeamsService } from './services/teams.service.js';
import { createAnalyzer } from './workers/analyze-item.js';
import { createBackgroundRunner } from './workers/schedule.js';

/**
 * Composition root: env -> db -> repositories -> AI + background work + pub/sub -> services ->
 * controllers.
 * Everything is built once per process (index.ts / local.ts) or per test (buildContainer({...})).
 *
 * Extension points (one function each, below):
 * - createAiServices: which AiServices implementation runs (live OpenRouter or the fake)
 * - createServices:   one entry per services/*.service.ts
 * - createControllers: one entry per controllers/*.controller.ts
 * Routes receive the whole Container (routes/*.routes.ts factories).
 */

/** What every service and controller factory may depend on. */
export interface CoreDeps {
  env: Env;
  logger: Logger;
  db: Db;
  auth: Auth;
  repos: Repos;
  ai: AiServices;
  background: BackgroundRunner;
  analyzer: Analyzer;
  /** Notification changes to the live bell streams: Redis with REDIS_URL, in process otherwise. */
  pubsub: PubSub;
}

/** Tests replace any part, most often `ai` (fake with failTasks) and `background`. */
export interface ContainerOverrides {
  env?: Env;
  logger?: Logger;
  db?: Db;
  auth?: Auth;
  repos?: Partial<Repos>;
  ai?: AiServices;
  background?: BackgroundRunner;
  analyzer?: Analyzer;
  pubsub?: PubSub;
}

/**
 * The AI implementation for this process (ai/index.ts): the live OpenRouter services
 * (ai/run.ts + ai/tasks/*) when env.AI_ENABLED and OPENROUTER_API_KEY are set, otherwise the
 * deterministic fake (ai/fake.ts), which keeps every P0 screen working without a key and does
 * the same ai_runs accounting. Tests and dev without a key always get the fake.
 */
export function createAiServices(deps: { env: Env; logger: Logger; repos: Repos }): AiServices {
  return createAiServicesFor(deps);
}

/**
 * Business services (services/*.service.ts), built from the core dependencies in dependency
 * order: access, limits and notifications first, then posts (cards and details reused by the
 * others).
 */
export function createServices(deps: CoreDeps) {
  const { auth, db, env, repos, ai, analyzer, background, logger, pubsub } = deps;
  const access = createAccessService({ repos });
  const limits = createLimitsService({ repos });
  const notifications = createNotificationsService({ db, repos, logger, pubsub });
  const posts = createPostsService({
    db,
    repos,
    access,
    limits,
    analyzer,
    background,
    notifications,
    logger,
  });
  const discovery = createDiscoveryService({ repos, posts, logger });
  const followers = createFollowersService({ db, repos, ai, logger });
  return {
    access,
    limits,
    notifications,
    posts,
    discovery,
    followers,
    comments: createCommentsService({ db, repos, access, limits, notifications, logger }),
    signals: createSignalsService({ repos, access }),
    teams: createTeamsService({ db, repos, access, posts, notifications, logger }),
    memberships: createMembershipsService({
      db,
      repos,
      access,
      limits,
      posts,
      discovery,
      followers,
      ai,
      logger,
    }),
    pitches: createPitchesService({
      db,
      repos,
      access,
      limits,
      analyzer,
      background,
      notifications,
      logger,
    }),
    communities: createCommunitiesService({ db, repos, limits, discovery, logger }),
    spaces: createSpacesService({ db, repos, access, logger }),
    overview: createOverviewService({ repos, analyzer }),
    briefing: createBriefingService({ repos, ai, limits, discovery, logger }),
    promotions: createPromotionsService({
      db,
      env,
      repos,
      access,
      limits,
      posts,
      ai,
      notifications,
      logger,
    }),
    insights: createInsightsService({ env, repos, logger }),
    challenges: createChallengesService({
      db,
      repos,
      limits,
      posts,
      analyzer,
      background,
      notifications,
      logger,
    }),
    clicks: createClicksService({ env, repos, logger }),
    demo: createDemoService({ env, auth, repos }),
    newsletter: createNewsletterService({ repos }),
  };
}

export type Services = ReturnType<typeof createServices>;

/** Controllers (controllers/*.controller.ts): read req, call one service, shape the response. */
export function createControllers(services: Services, deps: CoreDeps) {
  return {
    public: createPublicController(services),
    spaces: createSpacesController(services),
    posts: createPostsController(services),
    pitches: createPitchesController(services),
    studio: createStudioController(services),
    demo: createDemoController(services),
    followers: createFollowersController(services),
    notifications: createNotificationsController(services),
    insights: createInsightsController(services),
    challenges: createChallengesController(services),
    newsletter: createNewsletterController(services),
    // The cron jobs are whole-space work (reseed, retention purge), not one service's business
    // rules, so this one takes the core dependencies instead of `services`.
    cron: createCronController(deps),
  };
}

export type Controllers = ReturnType<typeof createControllers>;

export interface Container extends CoreDeps {
  services: Services;
  controllers: Controllers;
}

export function buildContainer(overrides: ContainerOverrides = {}): Container {
  const env = overrides.env ?? defaultEnv;
  const logger = overrides.logger ?? defaultLogger;
  const db = overrides.db ?? defaultDb;
  const auth = overrides.auth ?? defaultAuth;
  const repos: Repos = { ...createRepos(db), ...overrides.repos };
  const background = overrides.background ?? createBackgroundRunner(logger);
  const ai = overrides.ai ?? createAiServices({ env, logger, repos });
  const analyzer = overrides.analyzer ?? createAnalyzer({ repos, ai, background, logger });
  const pubsub =
    overrides.pubsub ??
    (redis && redisSubscriber
      ? createRedisPubSub(redis, redisSubscriber, logger)
      : createMemoryPubSub());

  const core: CoreDeps = { env, logger, db, auth, repos, ai, background, analyzer, pubsub };
  const services = createServices(core);
  const controllers = createControllers(services, core);
  return { ...core, services, controllers };
}
