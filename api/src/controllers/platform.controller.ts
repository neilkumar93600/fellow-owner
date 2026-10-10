import {
  PLATFORM_LOOKUP_LIMITS,
  type PlatformLookupResult,
  type PlatformProfile,
  platformLookupSchema,
  type SetupSuggestions,
  setupSuggestionsSchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { fakeSuggestSetup } from '../ai/fake.js';
import { buildSetupSuggestions } from '../ai/tasks/suggest-setup.js';
import type { AiServices, SuggestSetupOutput } from '../ai/types.js';
import { redisRateLimitStorage } from '../auth/index.js';
import type { Env } from '../config/env.js';
import { dailyCapReached, rateLimited } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import {
  createPlatformLookup,
  fetchAvatarDataUrl,
  type PlatformLookup,
  parseProfileUrl,
} from '../lib/platform-lookup.js';
import type { Redis } from '../lib/redis.js';
import { sessionOf } from '../middlewares/require-session.js';
import { bodyOf } from '../middlewares/validate.js';

/**
 * POST /api/studio/platform-lookup and /setup-suggestions (Round 4 §6). Session only: onboarding
 * runs before a space exists. Lookups: 5 per user per minute. Suggestions: 10 per user per UTC
 * day (the AI call has no space budget yet, so this is its cap).
 */

export interface PlatformControllerDeps {
  env: Pick<Env, 'APIFY_TOKEN' | 'APIFY_ENABLED'>;
  logger: Logger;
  ai: AiServices;
  redis?: Redis | null;
  /** Tests inject a resolver; otherwise built from env. */
  lookup?: PlatformLookup;
  fetchAvatar?: (url: string) => Promise<string | null>;
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * Fixed-window counters: Redis when REDIS_URL is set (shared by replicas, fails open like the
 * auth limiter), else in process. ponytail: in process is per instance on serverless; the Apify
 * monthly spend limit and maxTotalChargeUsd stay the hard cap.
 */
function createLimiter(redis: Redis | null | undefined, logger: Logger) {
  const store = redis ? redisRateLimitStorage(redis, logger) : null;
  const memory = new Map<string, { count: number; resetAt: number }>();
  return async (key: string, max: number, windowMs: number): Promise<boolean> => {
    if (store) {
      const result = await store.consume(key, { window: windowMs / 1000, max });
      return result.allowed;
    }
    const now = Date.now();
    const entry = memory.get(key);
    if (!entry || entry.resetAt <= now) {
      if (memory.size > 10_000) memory.clear();
      memory.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}

/** Our own demo images may pass through as site paths; anything else must be fetched. */
const SITE_AVATAR = /^\/demo\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i;

export function createPlatformController(deps: PlatformControllerDeps) {
  const lookup =
    deps.lookup ??
    createPlatformLookup({
      token: deps.env.APIFY_TOKEN,
      enabled: deps.env.APIFY_ENABLED,
      logger: deps.logger,
    });
  const fetchAvatar = deps.fetchAvatar ?? ((url: string) => fetchAvatarDataUrl(url));
  const allow = createLimiter(deps.redis, deps.logger);

  async function avatarFor(profiles: readonly PlatformProfile[]): Promise<string | null> {
    for (const profile of profiles) {
      const url = profile.avatarUrl;
      if (!url) continue;
      if (profile.source === 'fixture' && SITE_AVATAR.test(url)) return url;
      const data = await fetchAvatar(url);
      if (data) return data;
    }
    return null;
  }

  return {
    async lookup(req: Request, res: Response): Promise<void> {
      const { user } = sessionOf(req);
      const ok = await allow(
        `platform-lookup:${user.id}`,
        PLATFORM_LOOKUP_LIMITS.lookupsPerMinute,
        MINUTE_MS,
      );
      if (!ok) throw rateLimited('Too many lookups. Try again in a minute.');
      const { url } = bodyOf(req, platformLookupSchema);
      const target = parseProfileUrl(url);
      const result: PlatformLookupResult = target
        ? await lookup.lookup(target)
        : { status: 'failed', reason: 'unsupported' };
      res.json(result);
    },

    async setupSuggestions(req: Request, res: Response): Promise<void> {
      const { user } = sessionOf(req);
      const ok = await allow(
        `setup-suggestions:${user.id}`,
        PLATFORM_LOOKUP_LIMITS.suggestionsPerDay,
        DAY_MS,
      );
      if (!ok) {
        throw dailyCapReached(
          `You've asked for setup suggestions ${PLATFORM_LOOKUP_LIMITS.suggestionsPerDay} times today. Try again tomorrow.`,
        );
      }
      const { profiles } = bodyOf(req, setupSuggestionsSchema);
      const input = { profiles };
      let raw: SuggestSetupOutput;
      try {
        if (!deps.ai.suggestSetup) throw new Error('suggestSetup is not wired');
        raw = await deps.ai.suggestSetup(input, { spaceId: null, userId: user.id });
      } catch (error) {
        // Never block onboarding on the model: the deterministic suggestions stand in.
        deps.logger.warn({ err: error }, 'suggestSetup failed; using the keyword fallback');
        raw = fakeSuggestSetup(input);
      }
      const [suggestions, avatarUrl] = await Promise.all([
        Promise.resolve(buildSetupSuggestions(profiles, raw)),
        avatarFor(profiles),
      ]);
      const body: SetupSuggestions = { ...suggestions, avatarUrl };
      res.json(body);
    },
  };
}

export type PlatformController = ReturnType<typeof createPlatformController>;
