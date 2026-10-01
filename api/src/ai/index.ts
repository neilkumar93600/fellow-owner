import type { Env } from '../config/env.js';
import type { Logger } from '../lib/logger.js';
import type { AiRunsRepo } from '../repositories/ai-runs.repo.js';
import { createFakeAiServices } from './fake.js';
import { type AiModels, createAiModels, modelIdsFrom, type ProviderOptions } from './provider.js';
import type { AiAccounting, AiRuntime } from './run.js';
import { askAI } from './tasks/ask-ai.js';
import { briefing } from './tasks/briefing.js';
import { clusterImport } from './tasks/cluster-import.js';
import { communityDigest } from './tasks/community-digest.js';
import { embedItem } from './tasks/embed-item.js';
import { promoteDrafts } from './tasks/promote-drafts.js';
import { suggestCommunities } from './tasks/suggest-communities.js';
import { suggestReply } from './tasks/suggest-reply.js';
import { triageItem } from './tasks/triage-item.js';
import type { AiServices } from './types.js';

/**
 * The AI module's entry point. `createAiServices` picks the implementation for the process:
 * - live: OpenRouter models from env, every call through ai/run.ts (budget, caps, ai_runs)
 * - fake: ai/fake.ts, deterministic and offline, with the same ai_runs accounting
 * Live needs AI_ENABLED (defaults to "OPENROUTER_API_KEY is set"); tests force the fake.
 */

export type AiEnv = Pick<
  Env,
  | 'AI_ENABLED'
  | 'OPENROUTER_API_KEY'
  | 'WEB_ORIGIN'
  | 'AI_MODEL_FAST'
  | 'AI_MODEL_SMART'
  | 'AI_EMBEDDING_MODEL'
>;

/** AiServices over a runtime: one method per task file. */
export function createLiveAiServices(rt: AiRuntime): AiServices {
  return {
    mode: 'live',
    triageItem: (input, ctx) => triageItem(rt, input, ctx),
    embedItem: (input, ctx) => embedItem(rt, input, ctx),
    suggestCommunities: (input, ctx) => suggestCommunities(rt, input, ctx),
    briefing: (input, ctx) => briefing(rt, input, ctx),
    promoteDrafts: (input, ctx) => promoteDrafts(rt, input, ctx),
    communityDigest: (input, ctx) => communityDigest(rt, input, ctx),
    suggestReply: (input, ctx) => suggestReply(rt, input, ctx),
    clusterImport: (input, ctx) => clusterImport(rt, input, ctx),
    askAI: (input, ctx) => askAI(rt, input, ctx),
  };
}

export interface CreateAiServicesDeps {
  env: AiEnv;
  logger: Logger;
  repos: { aiRuns: AiRunsRepo };
  /** Pre-built models (tests); otherwise built from env. */
  models?: AiModels;
  /** Provider options (tests replay recorded responses through `fetch`). */
  provider?: ProviderOptions;
}

/** True when this process should call real models. */
export function isLiveAiConfigured(env: AiEnv): boolean {
  return env.AI_ENABLED && Boolean(env.OPENROUTER_API_KEY);
}

export function createAiServices(deps: CreateAiServicesDeps): AiServices {
  const accounting: AiAccounting = deps.repos.aiRuns;
  if (isLiveAiConfigured(deps.env) || deps.models) {
    const models = deps.models ?? createAiModels(deps.env, deps.provider);
    const ids = modelIdsFrom(deps.env);
    deps.logger.info(
      { ai: 'live', fast: models.fast.id, smart: models.smart.id, embedding: ids.embedding },
      'AI: live models through OpenRouter',
    );
    return createLiveAiServices({
      enabled: true,
      models,
      accounting,
      logger: deps.logger.child({ module: 'ai' }),
    });
  }
  if (deps.env.AI_ENABLED) {
    deps.logger.warn('AI_ENABLED is set without OPENROUTER_API_KEY; using the fake AI');
  } else {
    deps.logger.info({ ai: 'fake' }, 'AI: deterministic fake (no OPENROUTER_API_KEY)');
  }
  return createFakeAiServices({ accounting: { aiRuns: deps.repos.aiRuns } });
}

export type { FalClient, MediaServices } from './media.js';
export { createFalClient, createMediaServices, FAL_MODELS } from './media.js';
export type { AiModels } from './provider.js';
export { createAiModels, modelIdsFrom } from './provider.js';
export type { AiRuntime } from './run.js';
export * from './types.js';
