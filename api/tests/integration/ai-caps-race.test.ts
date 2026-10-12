import { HOURLY_CAPS, LIMITS } from '@fellow-owners/shared';
import { MockEmbeddingModelV4, MockLanguageModelV4 } from 'ai/test';
import { and, eq } from 'drizzle-orm';
import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { AiModels } from '../../src/ai/provider.js';
import { type AiRuntime, runAiTask, TASK_CAPS } from '../../src/ai/run.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { aiRuns } from '../../src/db/schema/index.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

// L1: AI task caps hold under parallel calls (preflight reserves the ai_runs row under an
// advisory lock before the model call), against the real ai_runs repository.

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
let mira: TestSpace;
let fan: SignedIn;

/** A chat model that answers after `ms`, so every parallel call is in flight at once. */
function slowModel(ms: number) {
  let calls = 0;
  const model = new MockLanguageModelV4({
    provider: 'test',
    modelId: 'test/slow',
    doGenerate: async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, ms));
      return {
        content: [{ type: 'text', text: '{"ok":true}' }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 5, text: 5, reasoning: undefined },
        },
        warnings: [],
      };
    },
  });
  return { model, calls: () => calls };
}

function runtime(model: MockLanguageModelV4): AiRuntime {
  const models: AiModels = {
    fast: { tier: 'fast', id: 'test/slow', model },
    smart: { tier: 'smart', id: 'test/slow', model },
    embedding: { tier: 'embedding', id: 'test/embedding', model: new MockEmbeddingModelV4() },
  };
  return {
    enabled: true,
    models,
    accounting: container.repos.aiRuns,
    logger: pino({ level: 'silent' }),
  };
}

const task = (rt: AiRuntime, name: 'suggestCommunities' | 'coach', ctx: object) =>
  runAiTask(rt, {
    task: name,
    tier: 'fast',
    ctx: { spaceId: mira.space.id, ...ctx },
    instructions: 'Return JSON.',
    prompt: 'Go.',
    schema: z.object({ ok: z.boolean() }),
    schemaName: 'test',
  });

async function rowsOf(userId: string, name: string) {
  return db
    .select()
    .from(aiRuns)
    .where(and(eq(aiRuns.userId, userId), eq(aiRuns.task, name)));
}

beforeAll(async () => {
  await resetDatabase();
  mira = await factories.space({ handle: 'mira', displayName: 'Mira Lane' });
  fan = await signInWithOtp(app, 'priya@race.test', 'Priya Shah');
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('AI caps under parallel calls', () => {
  it('a per-user hourly cap lets exactly `max` parallel calls reach the model', async () => {
    const user = await factories.user();
    const { model, calls } = slowModel(150);
    const rt = runtime(model);
    const cap = HOURLY_CAPS.suggestCommunities;
    const results = await Promise.allSettled(
      Array.from({ length: cap * 3 }, () => task(rt, 'suggestCommunities', { userId: user.id })),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(cap);
    expect(calls()).toBe(cap);
    const rows = await rowsOf(user.id, 'suggestCommunities');
    expect(rows).toHaveLength(cap);
    // Every reserved row was filled in with the call's result.
    expect(rows.every((row) => row.status === 'ok' && row.model === 'test/slow')).toBe(true);
    expect(rows.every((row) => row.inputTokens === 10 && row.outputTokens === 5)).toBe(true);
  });

  it('a per-user daily cap (coach) holds for a parallel burst', async () => {
    const user = await factories.user();
    const { model, calls } = slowModel(100);
    const rt = runtime(model);
    const cap = TASK_CAPS.coach?.max ?? 0;
    expect(cap).toBe(LIMITS.coach.perDay);
    await Promise.allSettled(
      Array.from({ length: cap * 3 }, () => task(rt, 'coach', { userId: user.id })),
    );
    expect(calls()).toBe(cap);
    expect(await rowsOf(user.id, 'coach')).toHaveLength(cap);
  });

  it('POST suggest-communities: a burst from one account stays within the hourly cap', async () => {
    const results = await Promise.all(
      Array.from({ length: HOURLY_CAPS.suggestCommunities * 3 }, () =>
        request(app)
          .post('/api/spaces/mira/suggest-communities')
          .set('Cookie', fan.cookie)
          .send({ intro: 'I love budget travel and slow mornings with good coffee.' }),
      ),
    );
    expect(results.every((res) => res.status === 200 || res.status === 429)).toBe(true);
    const rows = await rowsOf(fan.userId, 'suggestCommunities');
    expect(rows.length).toBeLessThanOrEqual(HOURLY_CAPS.suggestCommunities);
  });
});
