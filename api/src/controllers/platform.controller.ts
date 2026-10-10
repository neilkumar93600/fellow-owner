import {
  PLATFORM_LOOKUP_LIMITS,
  type PlatformLookupResult,
  type PlatformProfile,
  platformLookupSchema,
  type SetupSuggestions,
  setupSuggestionsSchema,
} from '@fellow-owners/shared';
import type { Request, RequestHandler, Response } from 'express';
import { fakeSuggestSetup } from '../ai/fake.js';
import { buildSetupSuggestions } from '../ai/tasks/suggest-setup.js';
import type { AiServices, SuggestSetupOutput } from '../ai/types.js';
import type { Env } from '../config/env.js';
import { AppError, dailyCapReached, rateLimited } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import {
  createPlatformLookup,
  fetchAvatarDataUrl,
  type PlatformLookup,
  parseProfileUrl,
} from '../lib/platform-lookup.js';
import type { Redis } from '../lib/redis.js';
import { createRateLimit } from '../middlewares/rate-limit.js';
import { sessionOf } from '../middlewares/require-session.js';
import { bodyOf } from '../middlewares/validate.js';

/**
 * POST /api/studio/platform-lookup and /setup-suggestions (Round 4 §6). Session only: onboarding
 * runs before a space exists. Lookups: 5 per user per minute, 30 per user and 500 in all per UTC
 * day. Suggestions: 10 per user per UTC
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

/** Lookups per UTC day: per user, and for the whole API (each one may cost an Apify run). */
export const PLATFORM_LOOKUPS_PER_DAY = { user: 30, global: 500 } as const;
const DAY_SECONDS = 86_400;

/** Runs a createRateLimit middleware as a check: false once its window is used up. */
async function within(limit: RequestHandler, req: Request, res: Response): Promise<boolean> {
  try {
    await limit(req, res, () => {});
    return true;
  } catch (error) {
    if (error instanceof AppError && error.status === 429) return false;
    throw error;
  }
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
  // Fixed windows (middlewares/rate-limit.ts): Redis when REDIS_URL is set, in process otherwise.
  // ponytail: the Apify monthly spend limit and maxTotalChargeUsd stay the hard cap.
  const userKey = (req: Request) => sessionOf(req).user.id;
  const limiter = (name: string, windowSeconds: number, max: number, key = userKey) =>
    createRateLimit({ name, windowSeconds, max, key, redis: deps.redis });
  const lookupsPerMinute = limiter('platform-lookup', 60, PLATFORM_LOOKUP_LIMITS.lookupsPerMinute);
  const lookupsPerDay = limiter('platform-lookup-day', DAY_SECONDS, PLATFORM_LOOKUPS_PER_DAY.user);
  const lookupsPerDayAll = limiter(
    'platform-lookup-day-all',
    DAY_SECONDS,
    PLATFORM_LOOKUPS_PER_DAY.global,
    () => 'all',
  );
  const suggestionsPerDay = limiter(
    'setup-suggestions',
    DAY_SECONDS,
    PLATFORM_LOOKUP_LIMITS.suggestionsPerDay,
  );

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
      if (!(await within(lookupsPerMinute, req, res))) {
        throw rateLimited('Too many lookups. Try again in a minute.');
      }
      if (!(await within(lookupsPerDay, req, res)) || !(await within(lookupsPerDayAll, req, res))) {
        throw dailyCapReached('Profile lookups are used up for today. Try again tomorrow.');
      }
      const { url } = bodyOf(req, platformLookupSchema);
      const target = parseProfileUrl(url);
      const result: PlatformLookupResult = target
        ? await lookup.lookup(target)
        : { status: 'failed', reason: 'unsupported' };
      res.json(result);
    },

    async setupSuggestions(req: Request, res: Response): Promise<void> {
      const { user } = sessionOf(req);
      if (!(await within(suggestionsPerDay, req, res))) {
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
