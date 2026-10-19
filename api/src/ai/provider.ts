import { type AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic';
import {
  createOpenRouter,
  type OpenRouterChatSettings,
  type OpenRouterProvider,
} from '@openrouter/ai-sdk-provider';
import {
  type EmbeddingModel,
  extractJsonMiddleware,
  type LanguageModel,
  wrapLanguageModel,
} from 'ai';
import type { Env } from '../config/env.js';
import { extractJsonText } from './guard.js';
import type { AiTier } from './types.js';

/**
 * Models from env, through OpenRouter and the Vercel AI SDK (02-trd D10):
 * - fast:      AI_MODEL_FAST      (triage, community suggestions, reply drafts)
 * - smart:     AI_MODEL_SMART     (briefing, promotion drafts, P1 digests)
 * - embedding: AI_EMBEDDING_MODEL (1536 dimensions, fixed by the schema)
 * Swapping a model is an env change; ids are kept next to each model for ai_runs and logs.
 */

export const APP_TITLE = 'Fellow Owners';

export type ChatTier = Exclude<AiTier, 'embedding'>;

export type AiProviderName = 'openrouter' | 'anthropic';

/** Defaults for the direct-Anthropic chat tiers (env.ts uses the same ids). */
export const DEFAULT_ANTHROPIC_FAST = 'claude-haiku-5-5';
export const DEFAULT_ANTHROPIC_SMART = 'claude-sonnet-5-5';

export interface ChatModelRef {
  tier: ChatTier;
  /** Model id: OpenRouter's (`openai/gpt-5.6-luna`) or Anthropic's (`claude-haiku-5-5`). Written to ai_runs.model. */
  id: string;
  /** Who serves it. Absent in hand-built test refs. */
  provider?: AiProviderName;
  model: LanguageModel;
}

export interface EmbeddingModelRef {
  tier: 'embedding';
  id: string;
  provider?: AiProviderName;
  model: EmbeddingModel;
}

export interface AiModels {
  fast: ChatModelRef;
  smart: ChatModelRef;
  embedding: EmbeddingModelRef;
}

export interface AiModelIds {
  fast: string;
  smart: string;
  embedding: string;
}

export function modelIdsFrom(
  env: Pick<Env, 'AI_MODEL_FAST' | 'AI_MODEL_SMART' | 'AI_EMBEDDING_MODEL'>,
): AiModelIds {
  return { fast: env.AI_MODEL_FAST, smart: env.AI_MODEL_SMART, embedding: env.AI_EMBEDDING_MODEL };
}

export interface ProviderOptions {
  /** Injected fetch (tests replay recorded OpenRouter responses through it). */
  fetch?: typeof fetch;
  /** Override the API base URL (proxies). */
  baseURL?: string;
}

/** The OpenRouter provider with app attribution headers (shown on the OpenRouter dashboard). */
export function createOpenRouterProvider(
  env: Pick<Env, 'OPENROUTER_API_KEY' | 'WEB_ORIGIN'>,
  options: ProviderOptions = {},
): OpenRouterProvider {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is required for the live AI provider');
  }
  return createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
    compatibility: 'strict',
    appName: APP_TITLE,
    appUrl: env.WEB_ORIGIN,
    headers: { 'HTTP-Referer': env.WEB_ORIGIN, 'X-Title': APP_TITLE },
    ...(options.baseURL ? { baseURL: options.baseURL } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
}

/**
 * Settings shared by both chat tiers:
 * - usage accounting on, so ai_runs gets real token counts
 * - response-healing repairs malformed JSON server side (structured output requests only)
 */
const BASE_CHAT_SETTINGS: OpenRouterChatSettings = {
  usage: { include: true },
  plugins: [{ id: 'response-healing' }],
};

/**
 * Per tier: the fast tier keeps reasoning short for latency (ignored by non-reasoning models);
 * the smart tier keeps the model's default so briefing and drafts stay under ~20 s.
 */
const TIER_SETTINGS: Record<ChatTier, OpenRouterChatSettings> = {
  fast: { ...BASE_CHAT_SETTINGS, reasoning: { effort: 'low', exclude: true } },
  smart: { ...BASE_CHAT_SETTINGS },
};

/** Models that ignore response_format sometimes wrap JSON in prose or code fences. */
function withJsonExtraction(model: Exclude<LanguageModel, string>): LanguageModel {
  return wrapLanguageModel({
    model,
    middleware: extractJsonMiddleware({ transform: extractJsonText }),
  });
}

function chatModel(provider: OpenRouterProvider, tier: ChatTier, id: string): ChatModelRef {
  return {
    tier,
    id,
    provider: 'openrouter',
    model: withJsonExtraction(provider.chat(id, TIER_SETTINGS[tier])),
  };
}

/**
 * Direct Anthropic chat tier. None of the OpenRouter-only settings above apply (response-healing
 * plugin, usage include, reasoning effort): the Anthropic API reports usage itself.
 */
function anthropicChatModel(provider: AnthropicProvider, tier: ChatTier, id: string): ChatModelRef {
  return { tier, id, provider: 'anthropic', model: withJsonExtraction(provider(id)) };
}

/**
 * Builds the three model handles from env. Requires OPENROUTER_API_KEY (embeddings always go
 * through OpenRouter). With ANTHROPIC_API_KEY the fast and smart chat tiers call Anthropic
 * directly instead (ANTHROPIC_MODEL_FAST / ANTHROPIC_MODEL_SMART).
 */
export function createAiModels(
  env: Pick<
    Env,
    'OPENROUTER_API_KEY' | 'WEB_ORIGIN' | 'AI_MODEL_FAST' | 'AI_MODEL_SMART' | 'AI_EMBEDDING_MODEL'
  > &
    Partial<Pick<Env, 'ANTHROPIC_API_KEY' | 'ANTHROPIC_MODEL_FAST' | 'ANTHROPIC_MODEL_SMART'>>,
  options: ProviderOptions = {},
): AiModels {
  const provider = createOpenRouterProvider(env, options);
  const ids = modelIdsFrom(env);
  // ponytail: the baseURL override is OpenRouter's proxy; Anthropic uses its default endpoint.
  const anthropic = env.ANTHROPIC_API_KEY
    ? createAnthropic({
        apiKey: env.ANTHROPIC_API_KEY,
        ...(options.fetch ? { fetch: options.fetch } : {}),
      })
    : null;
  return {
    fast: anthropic
      ? anthropicChatModel(anthropic, 'fast', env.ANTHROPIC_MODEL_FAST ?? DEFAULT_ANTHROPIC_FAST)
      : chatModel(provider, 'fast', ids.fast),
    smart: anthropic
      ? anthropicChatModel(anthropic, 'smart', env.ANTHROPIC_MODEL_SMART ?? DEFAULT_ANTHROPIC_SMART)
      : chatModel(provider, 'smart', ids.smart),
    embedding: {
      tier: 'embedding',
      id: ids.embedding,
      provider: 'openrouter',
      model: provider.textEmbeddingModel(ids.embedding),
    },
  };
}
