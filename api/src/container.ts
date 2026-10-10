import { createAiServices as createAiServicesFor } from './ai/index.js';
import type { AiServices, Analyzer, BackgroundRunner } from './ai/types.js';
import { type Auth, auth as defaultAuth } from './auth/index.js';
import { env as defaultEnv, type Env } from './config/env.js';
import { createAccountController } from './controllers/account.controller.js';
import { createAdminController } from './controllers/admin.controller.js';
import { createAskController } from './controllers/ask.controller.js';
import { createChallengesController } from './controllers/challenges.controller.js';
import { createCoachController } from './controllers/coach.controller.js';
import { createConfigController } from './controllers/config.controller.js';
import { createCronController } from './controllers/cron.controller.js';
import { createDemoController } from './controllers/demo.controller.js';
import { createFollowersController } from './controllers/followers.controller.js';
import { createInsightsController } from './controllers/insights.controller.js';
import { createMetricsController } from './controllers/metrics.controller.js';
import { createModerationController } from './controllers/moderation.controller.js';
import { createNewsletterController } from './controllers/newsletter.controller.js';
import { createNotificationPrefsController } from './controllers/notification-prefs.controller.js';
import { createNotificationsController } from './controllers/notifications.controller.js';
import { createPitchesController } from './controllers/pitches.controller.js';
import { createPostsController } from './controllers/posts.controller.js';
import { createPublicController } from './controllers/public.controller.js';
import { createQuestionGroupsController } from './controllers/question-groups.controller.js';
import { createSimilarController } from './controllers/similar.controller.js';
import { createSnoozesController } from './controllers/snoozes.controller.js';
import { createSpacesController } from './controllers/spaces.controller.js';
import { createStudioController } from './controllers/studio.controller.js';
import { createSupportController } from './controllers/support.controller.js';
import { createUploadsController } from './controllers/uploads.controller.js';
import { type Db, db as defaultDb } from './db/client.js';
import { logger as defaultLogger, type Logger } from './lib/logger.js';
import { createMailer, type Mailer } from './lib/mailer.js';
import { createMemoryPubSub, createRedisPubSub, type PubSub } from './lib/pubsub.js';
import { redis, redisSubscriber } from './lib/redis.js';
import { createStorage, type Storage } from './lib/storage.js';
import { createRepos, type Repos } from './repositories/index.js';
import { createAccessService } from './services/access.service.js';
import { createAccountService } from './services/account.service.js';
import { createAskService } from './services/ask.service.js';
import { createBriefingService } from './services/briefing.service.js';
import { createChallengesService } from './services/challenges.service.js';
import { createClicksService } from './services/clicks.service.js';
import { createCoachService } from './services/coach.service.js';
import { createCommentsService } from './services/comments.service.js';
import { createCommunitiesService } from './services/communities.service.js';
import { createDemoService } from './services/demo.service.js';
import { createDiscoveryService } from './services/discovery.service.js';
import { createFollowersService } from './services/followers.service.js';
import { createInsightsService } from './services/insights.service.js';
import { createLimitsService } from './services/limits.service.js';
import { createMembershipsService } from './services/memberships.service.js';
import { createMetricsService } from './services/metrics.service.js';
import { createModerationService } from './services/moderation.service.js';
import { createNewsletterService } from './services/newsletter.service.js';
import { createNotificationEmailsService } from './services/notification-emails.service.js';
import { createNotificationsService } from './services/notifications.service.js';
import { createOverviewService } from './services/overview.service.js';
import { createPitchesService } from './services/pitches.service.js';
import { createPostsService } from './services/posts.service.js';
import { createPromotionsService } from './services/promotions.service.js';
import { createQuestionGroupsService } from './services/question-groups.service.js';
import { createSignalsService } from './services/signals.service.js';
import { createSimilarService } from './services/similar.service.js';
import { createSnoozesService } from './services/snoozes.service.js';
import { createSpacesService } from './services/spaces.service.js';
import { createSupportService } from './services/support.service.js';
import { createTeamsService } from './services/teams.service.js';
import { createUploadsService } from './services/uploads.service.js';
import { createAnalyzer } from './workers/analyze-item.js';
import { createChallengeCloser } from './workers/close-challenges.js';
import { createDigestWriter } from './workers/community-digests.js';
import { resetDemo } from './workers/demo-reset.js';
import { createQuestionGrouper } from './workers/group-questions.js';
import { purgeExpired } from './workers/purge.js';
import { refreshFollowers } from './workers/refresh-followers.js';
import { createBackgroundRunner } from './workers/schedule.js';
import { sweepAll } from './workers/sweep-all.js';
import type { Jobs } from './workers/tick.js';

/**
 * Composition root: env -> db -> repositories -> AI + background work + pub/sub -> services ->
 * controllers.
 * Everything is built once per process (index.ts / local.ts) or per test (buildContainer({...})).
 *
 * Extension points (one function each, below):
 * - createAiServices: which AiServices implementation runs (live OpenRouter or the fake)
 * - createServices:   one entry per services/*.service.ts
 * - createJobs:       what each scheduled job (workers/tick.ts JobName) runs
 * - createControllers: one entry per controllers/*.controller.ts
 * Routes receive the whole Container (routes/*.routes.ts factories).
 *
 * Services, workers and controllers added for the backend completion receive the whole bag
 * (core deps + every service), typed by their own Pick<...>, so their owners can take another
 * dependency without editing this file.
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
  /** Outgoing email (lib/mailer.ts): Resend, or logged without RESEND_API_KEY. */
  mailer: Mailer;
  /** Image bucket (lib/storage.ts); `enabled` is false without the bucket env. */
  storage: Storage;
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
  mailer?: Mailer;
  storage?: Storage;
  /** Replace scheduled jobs (tick tests inject fakes). */
  jobs?: Partial<Jobs>;
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
  return withBackendServices(deps, createBaseServices(deps));
}

/** The services that existed before the backend completion. */
function createBaseServices(deps: CoreDeps) {
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
  // Spread: followers (F15) may take env (YouTube) without editing this file.
  const followers = createFollowersService({ ...deps });
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
    // Spread: memberships (F06) may take background (member embeddings).
    memberships: createMembershipsService({
      ...deps,
      access,
      limits,
      posts,
      discovery,
      followers,
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
    challenges: createChallengesService({ ...deps, limits, posts, notifications }),
    clicks: createClicksService({ env, repos, logger }),
    demo: createDemoService({ env, auth, repos }),
    // Spread: newsletter (F11) may take env, mailer and logger (double opt-in).
    newsletter: createNewsletterService({ ...deps }),
  };
}

/** The services added for the backend completion; each takes the whole bag. */
function withBackendServices<B extends object>(deps: CoreDeps, base: B) {
  const bag = { ...deps, ...base };
  return {
    ...base,
    questionGroups: createQuestionGroupsService(bag),
    coach: createCoachService(bag),
    ask: createAskService(bag),
    similar: createSimilarService(bag),
    moderation: createModerationService(bag),
    account: createAccountService(bag),
    support: createSupportService(bag),
    notificationEmails: createNotificationEmailsService(bag),
    uploads: createUploadsService(bag),
    metrics: createMetricsService(bag),
    snoozes: createSnoozesService(bag),
  };
}

export type Services = ReturnType<typeof createServices>;

/**
 * What each scheduled job runs (POST /api/cron/tick, workers/tick.ts). Each job receives the
 * whole bag (core deps + services). Tests replace jobs with `overrides.jobs`.
 */
export function createJobs(services: Services, deps: CoreDeps): Jobs {
  const bag = { ...deps, ...services };
  const grouper = createQuestionGrouper(bag);
  const challengeCloser = createChallengeCloser(bag);
  const digestWriter = createDigestWriter(bag);
  return {
    sweep: () => sweepAll(bag),
    group_questions: () => grouper.groupDueSpaces(new Date()),
    close_challenges: () => challengeCloser.closeOverdue(new Date()),
    email_digests: () => services.notificationEmails.sendDue(new Date()),
    demo_reset: () => resetDemo(deps),
    purge: () => purgeExpired(bag),
    refresh_followers: () => refreshFollowers(bag),
    community_digests: () => digestWriter.writeDue(new Date()),
  };
}

/** Controllers (controllers/*.controller.ts): read req, call one service, shape the response. */
export function createControllers(services: Services, deps: CoreDeps, jobs: Jobs) {
  const bag = { ...deps, ...services, jobs };
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
    // rules, so this one takes the core dependencies (+ jobs, for the tick) instead of `services`.
    cron: createCronController(bag),
    questionGroups: createQuestionGroupsController(bag),
    coach: createCoachController(bag),
    ask: createAskController(bag),
    similar: createSimilarController(bag),
    moderation: createModerationController(bag),
    account: createAccountController(bag),
    support: createSupportController(bag),
    notificationPrefs: createNotificationPrefsController(bag),
    uploads: createUploadsController(bag),
    metrics: createMetricsController(bag),
    snoozes: createSnoozesController(bag),
    config: createConfigController(bag),
    admin: createAdminController(bag),
  };
}

export type Controllers = ReturnType<typeof createControllers>;

export interface Container extends CoreDeps {
  services: Services;
  jobs: Jobs;
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

  const mailer = overrides.mailer ?? createMailer({ env, logger });
  const storage = overrides.storage ?? createStorage(env);

  const core: CoreDeps = {
    env,
    logger,
    db,
    auth,
    repos,
    ai,
    background,
    analyzer,
    pubsub,
    mailer,
    storage,
  };
  const services = createServices(core);
  const jobs: Jobs = { ...createJobs(services, core), ...overrides.jobs };
  const controllers = createControllers(services, core, jobs);
  return { ...core, services, jobs, controllers };
}
