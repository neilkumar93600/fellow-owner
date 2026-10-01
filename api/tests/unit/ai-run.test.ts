import { APICallError } from 'ai';
import { MockEmbeddingModelV4, MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { AiModels } from '../../src/ai/provider.js';
import { type AiRuntime, runAiTask, runEmbeddingTask, TASK_CAPS } from '../../src/ai/run.js';
import { AiUnavailableError } from '../../src/ai/types.js';
import { createMemoryAccounting, SPACE_ID, silentLogger, USER_ID } from '../fixtures/ai/harness.js';

// runAiTask / runEmbeddingTask with mock models (no network, no database): enabled, budget and
// cap checks, zod validation with one retry, the task check, error mapping and the ai_runs row.

type GenerateResult = Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>;
type CallOptions = Parameters<MockLanguageModelV4['doGenerate']>[0];

function answer(text: string, input = 100, output = 20): GenerateResult {
  return {
    content: [{ type: 'text', text }],
    finishReason: { unified: 'stop', raw: 'stop' },
    usage: {
      inputTokens: { total: input, noCache: input, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: output, text: output, reasoning: undefined },
    },
    warnings: [],
  };
}

/** A chat model that answers from a queue and records every call. */
function scriptedModel(
  script: Array<GenerateResult | Error | ((o: CallOptions) => Promise<GenerateResult>)>,
) {
  const calls: CallOptions[] = [];
  const model = new MockLanguageModelV4({
    provider: 'test',
    modelId: 'test/fast-model',
    doGenerate: async (options) => {
      calls.push(options);
      const next = script.shift();
      if (!next) throw new Error('script exhausted');
      if (next instanceof Error) throw next;
      return typeof next === 'function' ? next(options) : next;
    },
  });
  return { model, calls };
}

function runtimeWith(
  model: MockLanguageModelV4,
  options: {
    enabled?: boolean;
    budget?: number;
    usedToday?: number;
    embedding?: MockEmbeddingModelV4;
  } = {},
) {
  const { accounting, rows } = createMemoryAccounting(options);
  const models: AiModels = {
    fast: { tier: 'fast', id: 'test/fast-model', model },
    smart: { tier: 'smart', id: 'test/smart-model', model },
    embedding: {
      tier: 'embedding',
      id: 'test/embedding-model',
      model: options.embedding ?? new MockEmbeddingModelV4(),
    },
  };
  const rt: AiRuntime = {
    enabled: options.enabled ?? true,
    models,
    accounting,
    logger: silentLogger,
  };
  return { rt, rows };
}

const schema = z.object({ title: z.string(), score: z.number() });
const ctx = {
  spaceId: SPACE_ID,
  userId: USER_ID,
  refType: 'post',
  refId: '0b6f7c8d-1e2f-4a3b-9c4d-5e6f7a8b9c0d',
};
const base = {
  task: 'triageItem' as const,
  tier: 'fast' as const,
  ctx,
  instructions: 'Return JSON.',
  prompt: 'Item.',
  schema,
  schemaName: 'test',
};

async function rejection(promise: Promise<unknown>): Promise<AiUnavailableError> {
  const error = await promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AiUnavailableError);
  return error as AiUnavailableError;
}

describe('runAiTask preflight', () => {
  it('refuses when AI is disabled, without calling the model or writing a row', async () => {
    const { model, calls } = scriptedModel([answer('{"title":"a","score":1}')]);
    const { rt, rows } = runtimeWith(model, { enabled: false });
    const error = await rejection(runAiTask(rt, base));
    expect(error.reason).toBe('disabled');
    expect(calls).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });

  it("refuses when today's token budget is used up", async () => {
    const { model, calls } = scriptedModel([answer('{"title":"a","score":1}')]);
    const { rt, rows } = runtimeWith(model, { budget: 1_000, usedToday: 1_000 });
    const error = await rejection(runAiTask(rt, base));
    expect(error.reason).toBe('budget');
    expect(calls).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });

  it('applies the per-user hourly cap for suggestCommunities', async () => {
    const cap = TASK_CAPS.suggestCommunities?.max ?? 0;
    expect(cap).toBe(10);
    const script = Array.from({ length: cap + 1 }, () => answer('{"title":"a","score":1}', 5, 5));
    const { model, calls } = scriptedModel(script);
    const { rt, rows } = runtimeWith(model);
    const options = { ...base, task: 'suggestCommunities' as const };
    for (let i = 0; i < cap; i += 1) await runAiTask(rt, options);
    const error = await rejection(runAiTask(rt, options));
    expect(error.reason).toBe('cap');
    expect(calls).toHaveLength(cap);
    expect(rows).toHaveLength(cap);
    // Another user is not affected.
    await expect(
      runAiTask(rt, { ...options, ctx: { ...ctx, userId: 'someone-else' } }),
    ).resolves.toBeDefined();
  });

  it('applies the per-space daily cap for promoteDrafts', async () => {
    const cap = TASK_CAPS.promoteDrafts?.max ?? 0;
    expect(cap).toBe(10);
    const { model } = scriptedModel(
      Array.from({ length: cap }, () => answer('{"title":"a","score":1}', 5, 5)),
    );
    const { rt } = runtimeWith(model);
    const options = { ...base, task: 'promoteDrafts' as const, tier: 'smart' as const };
    for (let i = 0; i < cap; i += 1)
      await runAiTask(rt, { ...options, ctx: { ...ctx, userId: `u${i}` } });
    expect((await rejection(runAiTask(rt, options))).reason).toBe('cap');
  });
});

describe('runAiTask calls', () => {
  it('returns the validated output and writes one ok row with tokens and latency', async () => {
    const { model, calls } = scriptedModel([answer('{"title":"Gym log","score":88}', 1_042, 118)]);
    const { rt, rows } = runtimeWith(model);
    const result = await runAiTask(rt, base);
    expect(result.output).toEqual({ title: 'Gym log', score: 88 });
    expect(result.attempts).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.responseFormat).toMatchObject({ type: 'json', name: 'test' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      spaceId: SPACE_ID,
      userId: USER_ID,
      task: 'triageItem',
      refType: 'post',
      refId: ctx.refId,
      model: 'test/fast-model',
      inputTokens: 1_042,
      outputTokens: 118,
      status: 'ok',
      error: null,
    });
    expect(rows[0]?.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('retries once with feedback when the JSON does not match the schema', async () => {
    const { model, calls } = scriptedModel([
      answer('{"title":"Gym log","score":"high"}', 100, 10),
      answer('{"title":"Gym log","score":75}', 150, 12),
    ]);
    const { rt, rows } = runtimeWith(model);
    const result = await runAiTask(rt, base);
    expect(result.output.score).toBe(75);
    expect(result.attempts).toBe(2);
    expect(calls).toHaveLength(2);
    const retryPrompt = calls[1]?.prompt ?? [];
    const lastMessage = JSON.stringify(retryPrompt[retryPrompt.length - 1]);
    expect(lastMessage).toContain('did not match the required schema');
    expect(lastMessage).toContain('score');
    expect(JSON.stringify(retryPrompt)).toContain('\\"score\\":\\"high\\"');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'ok', inputTokens: 250, outputTokens: 22 });
  });

  it('retries when the output is not JSON at all', async () => {
    const { model, calls } = scriptedModel([
      answer('Sorry, I cannot do that.'),
      answer('{"title":"ok","score":1}'),
    ]);
    const { rt } = runtimeWith(model);
    await runAiTask(rt, base);
    expect(JSON.stringify(calls[1]?.prompt)).toContain('not valid JSON');
  });

  it("retries on the task's own check and fails when the final attempt still fails it", async () => {
    const { model, calls } = scriptedModel([
      answer('{"title":"","score":1}', 10, 1),
      answer('{"title":"","score":2}', 10, 1),
    ]);
    const { rt, rows } = runtimeWith(model);
    const finals: boolean[] = [];
    const error = await rejection(
      runAiTask(rt, {
        ...base,
        check: (output, final) => {
          finals.push(final);
          return output.title ? null : 'title is empty';
        },
      }),
    );
    expect(error.reason).toBe('provider');
    expect(finals).toEqual([false, true]);
    expect(calls).toHaveLength(2);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'error',
      error: 'output check failed: title is empty',
      inputTokens: 20,
      outputTokens: 2,
    });
  });

  it('fails after two malformed answers with one error row', async () => {
    const { model, calls } = scriptedModel([answer('nope', 10, 2), answer('still nope', 12, 3)]);
    const { rt, rows } = runtimeWith(model);
    const error = await rejection(runAiTask(rt, base));
    expect(error.reason).toBe('provider');
    expect(error.task).toBe('triageItem');
    expect(calls).toHaveLength(2);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'error', inputTokens: 22, outputTokens: 5 });
    expect(rows[0]?.error).toMatch(/^invalid output: /);
  });

  it('does not retry provider errors itself and records them', async () => {
    const providerError = new APICallError({
      message: 'Invalid model',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      requestBodyValues: {},
      statusCode: 400,
      isRetryable: false,
    });
    const { model, calls } = scriptedModel([providerError]);
    const { rt, rows } = runtimeWith(model);
    const error = await rejection(runAiTask(rt, base));
    expect(error.reason).toBe('provider');
    expect(error.cause).toBe(providerError);
    expect(calls).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'error', error: 'provider error 400: Invalid model' });
  });

  it('times out slow calls', async () => {
    const { model } = scriptedModel([
      (options) =>
        new Promise((_, reject) => {
          options.abortSignal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })),
          );
        }),
    ]);
    const { rt, rows } = runtimeWith(model);
    const error = await rejection(runAiTask(rt, { ...base, timeoutMs: 1_000, deadlineMs: 1_000 }));
    expect(error.reason).toBe('provider');
    expect(rows[0]?.status).toBe('error');
    expect(rows[0]?.error).toMatch(/timed out|abort/i);
  });

  it('stores a null ref_id when the ref is not a uuid', async () => {
    const { model } = scriptedModel([answer('{"title":"a","score":1}')]);
    const { rt, rows } = runtimeWith(model);
    await runAiTask(rt, { ...base, ctx: { spaceId: SPACE_ID, refType: 'digest', refId: 'x:1' } });
    expect(rows[0]).toMatchObject({ refType: 'digest', refId: null, userId: null });
  });
});

describe('runEmbeddingTask', () => {
  it('returns a 1536 vector and records the embedding tokens', async () => {
    const vector = Array.from({ length: 1536 }, (_, i) => (i % 7) / 10);
    const embedding = new MockEmbeddingModelV4({
      doEmbed: async () => ({ embeddings: [vector], usage: { tokens: 64 }, warnings: [] }),
    });
    const { model } = scriptedModel([]);
    const { rt, rows } = runtimeWith(model, { embedding });
    const result = await runEmbeddingTask(rt, { ctx, value: 'Gym log\n\nA workout logger' });
    expect(result.output).toHaveLength(1536);
    expect(rows[0]).toMatchObject({
      task: 'embedItem',
      model: 'test/embedding-model',
      inputTokens: 64,
      outputTokens: 0,
      status: 'ok',
    });
  });

  it('rejects vectors of the wrong size', async () => {
    const embedding = new MockEmbeddingModelV4({
      doEmbed: async () => ({ embeddings: [[0.1, 0.2]], usage: { tokens: 3 }, warnings: [] }),
    });
    const { model } = scriptedModel([]);
    const { rt, rows } = runtimeWith(model, { embedding });
    const error = await rejection(runEmbeddingTask(rt, { ctx, value: 'x' }));
    expect(error.reason).toBe('provider');
    expect(rows[0]).toMatchObject({ status: 'error', inputTokens: 3 });
    expect(rows[0]?.error).toContain('expected 1536 finite numbers');
  });

  it('checks the budget like chat tasks', async () => {
    const { model } = scriptedModel([]);
    const { rt, rows } = runtimeWith(model, { budget: 10, usedToday: 10 });
    expect((await rejection(runEmbeddingTask(rt, { ctx, value: 'x' }))).reason).toBe('budget');
    expect(rows).toHaveLength(0);
  });
});
