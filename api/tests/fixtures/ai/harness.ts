import { readFileSync } from 'node:fs';
import pino from 'pino';
import { fakeEmbedding } from '../../../src/ai/fake.js';
import { createAiModels } from '../../../src/ai/provider.js';
import type { AiAccounting, AiRuntime } from '../../../src/ai/run.js';
import type { AiTaskName } from '../../../src/ai/types.js';
import type { NewAiRunRow } from '../../../src/db/schema/ai.js';

/**
 * Recorded-fixture harness for the live AI path (no network, no database).
 *
 * tests/fixtures/ai/*.json hold realistic model answers per task. `createOpenRouterMock` serves
 * them through an injected fetch in OpenRouter's wire format, so a test exercises the real
 * provider (@openrouter/ai-sdk-provider), the AI SDK's structured output parsing, ai/run.ts
 * (checks, retry, accounting) and the task's own normalization, exactly as a live call would.
 *
 * Fixture file shape:
 * {
 *   "task": "triageItem",
 *   "cases": [{
 *     "name": "...",
 *     "input": { ...task input... },
 *     "responses": [{ "content": {...} | "raw text", "usage": {...}, "finish_reason": "stop" }],
 *     "expect": { ...task-specific expectations... }
 *   }]
 * }
 * `responses` are consumed in order: a second entry is the answer to the retry.
 */

export interface RecordedResponse {
  /** The assistant message: an object is JSON-encoded, a string is sent as is. */
  content?: unknown;
  usage?: { prompt_tokens: number; completion_tokens: number };
  finish_reason?: string;
  /** Model id OpenRouter reports (defaults to the requested model). */
  model?: string;
  /** HTTP status for error responses (with `error`). */
  status?: number;
  error?: { message: string; code?: number };
}

export interface FixtureCase<I = unknown, E = Record<string, unknown>> {
  name: string;
  description?: string;
  input: I;
  responses: RecordedResponse[];
  expect: E;
}

export interface FixtureFile<I = unknown, E = Record<string, unknown>> {
  task: AiTaskName;
  description?: string;
  cases: Array<FixtureCase<I, E>>;
}

export function loadAiFixture<I = unknown, E = Record<string, unknown>>(
  name: string,
): FixtureFile<I, E> {
  const url = new URL(`./${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as FixtureFile<I, E>;
}

export interface RecordedRequest {
  url: string;
  headers: Record<string, string>;
  body: {
    model?: string;
    messages?: Array<{ role: string; content: unknown }>;
    response_format?: { type: string; json_schema?: { name: string; strict: boolean; schema: unknown } };
    input?: string[];
    [key: string]: unknown;
  };
}

/** A fetch that answers OpenRouter chat and embedding calls from recorded responses. */
export function createOpenRouterMock(responses: RecordedResponse[]) {
  const queue = [...responses];
  const requests: RecordedRequest[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const body = JSON.parse(String(init?.body ?? '{}')) as RecordedRequest['body'];
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    requests.push({ url, headers, body });

    if (url.endsWith('/embeddings')) {
      const values = body.input ?? [];
      return json({
        id: `gen-emb-${requests.length}`,
        object: 'list',
        model: body.model,
        provider: 'OpenAI',
        data: values.map((value, index) => ({
          object: 'embedding',
          index,
          embedding: fakeEmbedding(value),
        })),
        usage: {
          prompt_tokens: values.reduce((sum, v) => sum + Math.ceil(v.length / 4), 0),
          total_tokens: values.reduce((sum, v) => sum + Math.ceil(v.length / 4), 0),
        },
      });
    }

    const next = queue.shift();
    if (!next) return json({ error: { message: 'No recorded response left', code: 500 } }, 500);
    if (next.status && next.status >= 400) {
      return json({ error: next.error ?? { message: 'error', code: next.status } }, next.status);
    }
    const usage = next.usage ?? { prompt_tokens: 500, completion_tokens: 100 };
    return json({
      id: `gen-${requests.length}`,
      object: 'chat.completion',
      created: 1_759_276_800,
      model: next.model ?? body.model,
      provider: 'OpenAI',
      choices: [
        {
          index: 0,
          finish_reason: next.finish_reason ?? 'stop',
          message: {
            role: 'assistant',
            content: typeof next.content === 'string' ? next.content : JSON.stringify(next.content),
          },
        },
      ],
      usage: { ...usage, total_tokens: usage.prompt_tokens + usage.completion_tokens },
    });
  }) as typeof fetch;

  return { fetch: fetchImpl, requests, remaining: () => queue.length };
}

/** In-memory ai_runs: rows, today's budget and cap counts, like ai-runs.repo. */
export function createMemoryAccounting(options: { budget?: number; usedToday?: number } = {}) {
  const rows: Array<NewAiRunRow & { createdAt: Date }> = [];
  const budget = options.budget ?? 200_000;
  const accounting: AiAccounting = {
    async insert(values) {
      rows.push({ ...values, createdAt: new Date() });
      return rows.length;
    },
    async budgetState(spaceId) {
      const used =
        (options.usedToday ?? 0) +
        rows
          .filter((row) => row.spaceId === spaceId)
          .reduce((sum, row) => sum + (row.inputTokens ?? 0) + (row.outputTokens ?? 0), 0);
      return { budget, used, paused: used >= budget };
    },
    async countByUserTaskSince(userId, task, since) {
      return rows.filter((r) => r.userId === userId && r.task === task && r.createdAt >= since)
        .length;
    },
    async countBySpaceTaskSince(spaceId, task, since) {
      return rows.filter((r) => r.spaceId === spaceId && r.task === task && r.createdAt >= since)
        .length;
    },
  };
  return { accounting, rows };
}

export const silentLogger = pino({ level: 'silent' });

export const TEST_AI_ENV = {
  OPENROUTER_API_KEY: 'sk-or-test-key',
  WEB_ORIGIN: 'http://localhost:3000',
  AI_MODEL_FAST: 'openai/gpt-5.6-luna',
  AI_MODEL_SMART: 'anthropic/claude-sonnet-5.5',
  AI_EMBEDDING_MODEL: 'openai/text-embedding-3-small',
};

/** A live AiRuntime whose OpenRouter calls are answered by `responses`. */
export function createFixtureRuntime(
  responses: RecordedResponse[],
  options: { budget?: number; usedToday?: number; enabled?: boolean } = {},
) {
  const mock = createOpenRouterMock(responses);
  const { accounting, rows } = createMemoryAccounting(options);
  const runtime: AiRuntime = {
    enabled: options.enabled ?? true,
    models: createAiModels(TEST_AI_ENV, { fetch: mock.fetch }),
    accounting,
    logger: silentLogger,
  };
  return { runtime, mock, rows };
}

export const SPACE_ID = '00000000-0000-4000-8000-000000000001';
export const USER_ID = 'user_test_1';
