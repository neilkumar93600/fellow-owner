import { createAiServices as createAiServicesFor } from './ai/index.js';
import type { AiServices, Analyzer, BackgroundRunner } from './ai/types.js';
import { type Auth, auth as defaultAuth } from './auth/index.js';
import { env as defaultEnv, type Env } from './config/env.js';
import { createPitchesController } from './controllers/pitches.controller.js';
import { createPostsController } from './controllers/posts.controller.js';
import { createPublicController } from './controllers/public.controller.js';
import { createSpacesController } from './controllers/spaces.controller.js';
import { createStudioController } from './controllers/studio.controller.js';
import { type Db, db as defaultDb } from './db/client.js';
import { logger as defaultLogger, type Logger } from './lib/logger.js';
import { createRepos, type Repos } from './repositories/index.js';
import { createAccessService } from './services/access.service.js';
import { createBriefingService } from './services/briefing.service.js';
import { createClicksService } from './services/clicks.service.js';
import { createCommentsService } from './services/comments.service.js';
import { createCommunitiesService } from './services/communities.service.js';
import { createDiscoveryService } from './services/discovery.service.js';
import { createLimitsService } from './services/limits.service.js';
import { createMembershipsService } from './services/memberships.service.js';
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
 * Composition root: env -> db -> repositories -> AI + background work -> services -> controllers.
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
 * order: access and limits first, then posts (cards and details reused by the others).
 */
export function createServices(deps: CoreDeps) {
  const { db, env, repos, ai, analyzer, background, logger } = deps;
  const access = createAccessService({ repos });
  const limits = createLimitsService({ repos });
  const posts = createPostsService({ db, repos, access, limits, analyzer, background, logger });
  const discovery = createDiscoveryService({ repos, posts, logger });
  return {
    access,
    limits,
    posts,
    discovery,
    comments: createCommentsService({ db, repos, access, limits, logger }),
    signals: createSignalsService({ repos, access }),
    teams: createTeamsService({ db, repos, access, posts, logger }),
    memberships: createMembershipsService({ db, repos, access, limits, posts, ai, logger }),
    pitches: createPitchesService({ db, repos, access, limits, analyzer, background, logger }),
    communities: createCommunitiesService({ db, repos, limits, discovery, logger }),
    spaces: createSpacesService({ db, repos, access, logger }),
    overview: createOverviewService({ repos, analyzer }),
    briefing: createBriefingService({ repos, ai, limits, discovery, logger }),
    promotions: createPromotionsService({ db, env, repos, access, limits, posts, ai, logger }),
    clicks: createClicksService({ env, repos, logger }),
  };
}

export type Services = ReturnType<typeof createServices>;

/** Controllers (controllers/*.controller.ts): read req, call one service, shape the response. */
export function createControllers(services: Services, _deps: CoreDeps) {
  return {
    public: createPublicController(services),
    spaces: createSpacesController(services),
    posts: createPostsController(services),
    pitches: createPitchesController(services),
    studio: createStudioController(services),
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

  const core: CoreDeps = { env, logger, db, auth, repos, ai, background, analyzer };
  const services = createServices(core);
  const controllers = createControllers(services, core);
  return { ...core, services, controllers };
}
