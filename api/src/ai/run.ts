import { DAILY_CAPS, HOURLY_CAPS, LIMITS } from '@fellow-owners/shared';
import {
  APICallError,
  embed,
  type FlexibleSchema,
  generateText,
  JSONParseError,
  type LanguageModelUsage,
  type ModelMessage,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
} from 'ai';
import type { z } from 'zod';
import type { NewAiRunRow } from '../db/schema/ai.js';
import { hoursAgo, startOfUtcDay } from '../lib/dates.js';
import type { Logger } from '../lib/logger.js';
import type { AiBudgetState } from '../repositories/ai-runs.repo.js';
import type { AiModels, ChatTier } from './provider.js';
import { type AiContext, type AiTaskName, AiUnavailableError } from './types.js';

/**
 * Every live AI call goes through here (02-trd "AI tasks"):
 * 1. AI enabled?                                  -> AiUnavailableError('disabled')
 * 2. today's tokens (ai_runs) < ai_daily_token_budget -> AiUnavailableError('budget')
 * 3. per-task cap (shared DAILY_CAPS / HOURLY_CAPS)  -> AiUnavailableError('cap')
 * 4. the model call, timed, output validated with zod (+ the task's own check);
 *    one retry with feedback when the output is malformed
 * 5. exactly one ai_runs row (task, model, tokens of all attempts, latency, ok | error)
 * Model or validation failures throw AiUnavailableError('provider'); callers degrade.
 * Refusals in steps 1-3 never reach the model and write no row (so they never count toward a cap).
 */

// ---------------------------------------------------------------- dependencies

/** The ai_runs repository surface run.ts needs (createAiRunsRepo satisfies it). */
export interface AiAccounting {
  insert(values: NewAiRunRow): Promise<number>;
  budgetState(spaceId: string, now?: Date): Promise<AiBudgetState>;
  countByUserTaskSince(userId: string, task: string, since: Date): Promise<number>;
  countBySpaceTaskSince(spaceId: string, task: string, since: Date): Promise<number>;
}

export interface AiRuntime {
  /** env.AI_ENABLED: a kill switch even when the live services are built. */
  enabled: boolean;
  models: AiModels;
  accounting: AiAccounting;
  logger: Logger;
  /** Clock for budget days and cap windows (tests). */
  now?: () => Date;
}

// ---------------------------------------------------------------- caps

export interface TaskCap {
  /** Counted per user (needs ctx.userId) or per space. */
  scope: 'user' | 'space';
  /** Rolling hour, or the UTC day. */
  window: 'hour' | 'day';
  max: number;
}

/**
 * Per-task caps counted from ai_runs (every model call counts, ok or error).
 * briefing and communityDigest are capped by their callers (1 a day + 5 regenerations, one per
 * community a day); the values here are safety nets against retry loops, not product limits.
 */
export const TASK_CAPS: Partial<Record<AiTaskName, TaskCap>> = {
  suggestCommunities: { scope: 'user', window: 'hour', max: HOURLY_CAPS.suggestCommunities },
  promoteDrafts: { scope: 'space', window: 'day', max: DAILY_CAPS.promoteDrafts },
  askAI: { scope: 'space', window: 'day', max: DAILY_CAPS.askAI },
  briefing: {
    scope: 'space',
    window: 'day',
    max: 2 * (1 + LIMITS.briefing.regenerationsPerDay),
  },
  communityDigest: { scope: 'space', window: 'day', max: 2 * LIMITS.community.perSpace.max },
  clusterImport: { scope: 'space', window: 'day', max: 5 },
  generateImage: { scope: 'space', window: 'day', max: 20 },
  generateVideo: { scope: 'space', window: 'day', max: 3 },
};

/** Checks steps 1-3. Exported for media tasks (ai/media.ts) that call other providers. */
export async function preflight(
  rt: Pick<AiRuntime, 'enabled' | 'accounting' | 'now'>,
  task: AiTaskName,
  ctx: AiContext,
): Promise<void> {
  if (!rt.enabled) throw new AiUnavailableError('disabled', undefined, { task });
  const now = rt.now?.() ?? new Date();
  const budget = await rt.accounting.budgetState(ctx.spaceId, now);
  if (budget.paused) throw new AiUnavailableError('budget', undefined, { task });
  const cap = TASK_CAPS[task];
  if (!cap) return;
  const since = cap.window === 'hour' ? hoursAgo(1, now) : startOfUtcDay(now);
  let used: number | null = null;
  if (cap.scope === 'space') {
    used = await rt.accounting.countBySpaceTaskSince(ctx.spaceId, task, since);
  } else if (ctx.userId) {
    used = await rt.accounting.countByUserTaskSince(ctx.userId, task, since);
  }
  if (used !== null && used >= cap.max) {
    throw new AiUnavailableError(
      'cap',
      `Limit of ${cap.max} ${task} calls per ${cap.window} reached`,
      { task },
    );
  }
}

// ---------------------------------------------------------------- accounting

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface RunRecord {
  task: AiTaskName;
  ctx: AiContext;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'ok' | 'error';
  error?: string | null;
}

/** Writes the ai_runs row. Accounting must never break a call, so failures are only logged. */
export async function recordRun(
  rt: Pick<AiRuntime, 'accounting' | 'logger'>,
  run: RunRecord,
): Promise<void> {
  try {
    await rt.accounting.insert({
      spaceId: run.ctx.spaceId,
      userId: run.ctx.userId ?? null,
      task: run.task,
      refType: run.ctx.refType ?? null,
      refId: run.ctx.refId && UUID.test(run.ctx.refId) ? run.ctx.refId : null,
      model: run.model.slice(0, 200),
      inputTokens: Math.max(0, Math.round(run.inputTokens)),
      outputTokens: Math.max(0, Math.round(run.outputTokens)),
      latencyMs: Math.max(0, Math.round(run.latencyMs)),
      status: run.status,
      error: run.error ? run.error.slice(0, 500) : null,
    });
  } catch (error) {
    rt.logger.error(
      { err: error, task: run.task, spaceId: run.ctx.spaceId },
      'ai_runs insert failed',
    );
  }
  const fields = {
    task: run.task,
    model: run.model,
    spaceId: run.ctx.spaceId,
    refType: run.ctx.refType,
    refId: run.ctx.refId,
    latencyMs: run.latencyMs,
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    status: run.status,
  };
  if (run.status === 'ok') rt.logger.info(fields, 'ai run');
  else rt.logger.warn({ ...fields, error: run.error }, 'ai run failed');
}

class UsageTally {
  inputTokens = 0;
  outputTokens = 0;

  /** Adds reported usage, or an estimate when the provider reported none. */
  add(usage: LanguageModelUsage | undefined, estimate: { input: number; output: number }): void {
    this.inputTokens += usage?.inputTokens ?? estimate.input;
    this.outputTokens += usage?.outputTokens ?? estimate.output;
  }
}

// ---------------------------------------------------------------- errors

/** A task's own output check failed on the last attempt. */
export class AiOutputCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiOutputCheckError';
  }
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError' || /aborted/i.test(error.message))
  );
}

/** zod / standard-schema issues found anywhere in the cause chain, as "path: message". */
function validationIssues(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const issues = (current as { issues?: unknown }).issues;
    if (Array.isArray(issues) && issues.length > 0) {
      return issues
        .slice(0, 6)
        .map(
          (issue: {
            path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
            message?: string;
          }) => {
            const path = (issue.path ?? [])
              .map((part) => String(typeof part === 'object' && part !== null ? part.key : part))
              .join('.');
            return `${path || '(root)'}: ${issue.message ?? 'invalid'}`;
          },
        )
        .join('; ');
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

/** Malformed output (worth one retry with feedback), as opposed to a failed call. */
function isOutputError(error: unknown): boolean {
  return NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error);
}

/** What went wrong with the output, phrased as feedback for the retry. No fan text included. */
function outputProblem(error: unknown): string {
  if (NoObjectGeneratedError.isInstance(error)) {
    if (error.finishReason === 'length') {
      return 'the response was cut off because it was too long; answer more concisely';
    }
    if (JSONParseError.isInstance(error.cause)) return 'the response was not valid JSON';
    const issues = validationIssues(error.cause);
    return issues
      ? `the JSON did not match the required schema (${issues})`
      : 'the response could not be parsed';
  }
  return 'there was no response';
}

/** Short error text for ai_runs.error and logs (never the prompt or fan text). */
export function describeAiError(error: unknown, timeoutMs?: number): string {
  if (error instanceof AiOutputCheckError) return `output check failed: ${error.message}`;
  if (isOutputError(error)) return `invalid output: ${outputProblem(error)}`;
  if (APICallError.isInstance(error)) {
    return `provider error${error.statusCode ? ` ${error.statusCode}` : ''}: ${error.message}`;
  }
  if (isAbort(error)) return timeoutMs ? `timed out after ${timeoutMs} ms` : 'timed out';
  if (error instanceof Error) {
    const last = (error as { lastError?: unknown }).lastError;
    if (last && APICallError.isInstance(last)) return describeAiError(last, timeoutMs);
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

// ---------------------------------------------------------------- structured tasks

export interface TierDefaults {
  /** Per attempt. */
  timeoutMs: number;
  maxOutputTokens: number;
}

export const TIER_DEFAULTS: Record<ChatTier, TierDefaults> = {
  fast: { timeoutMs: 20_000, maxOutputTokens: 1_500 },
  smart: { timeoutMs: 30_000, maxOutputTokens: 3_000 },
};

/** The retry only starts when at least this much of the deadline is left. */
const MIN_RETRY_MS = 4_000;
const MAX_ATTEMPTS = 2;

export interface RunAiTaskOptions<S extends z.ZodType> {
  task: AiTaskName;
  tier: ChatTier;
  ctx: AiContext;
  /** The system prompt (rules, rubric, output format). */
  instructions: string;
  /** The user message: the data, with fan text in untrusted blocks (guard.ts). */
  prompt: string;
  /** Model-facing output schema: types and enums only, limits are enforced by the task. */
  schema: S;
  schemaName: string;
  schemaDescription?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Per attempt (default per tier). */
  timeoutMs?: number;
  /** For all attempts together (default 1.6 x timeoutMs). */
  deadlineMs?: number;
  /**
   * The task's own check of a schema-valid output. Return a problem to retry once with that
   * feedback; on the final attempt (`final`), a returned problem fails the call.
   */
  check?: (output: z.output<S>, final: boolean) => string | null;
}

export interface AiTaskResult<T> {
  output: T;
  /** Model that answered (OpenRouter's response model id, else the configured id). */
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  attempts: number;
}

function retryMessage(problem: string): string {
  return `Your previous answer could not be used: ${problem}. Reply again with only the corrected JSON object, following every rule above.`;
}

/**
 * Runs one structured-output task (generateText + Output.object) with the checks, retry and
 * accounting described at the top of this file.
 */
export async function runAiTask<S extends z.ZodType>(
  rt: AiRuntime,
  options: RunAiTaskOptions<S>,
): Promise<AiTaskResult<z.output<S>>> {
  const { task, tier, ctx } = options;
  await preflight(rt, task, ctx);

  const ref = rt.models[tier];
  const timeoutMs = options.timeoutMs ?? TIER_DEFAULTS[tier].timeoutMs;
  const maxOutputTokens = options.maxOutputTokens ?? TIER_DEFAULTS[tier].maxOutputTokens;
  const started = Date.now();
  const deadline = started + (options.deadlineMs ?? Math.round(timeoutMs * 1.6));
  const usage = new UsageTally();
  const output = Output.object<z.output<S>>({
    // zod 4 schemas are Standard Schemas; the cast only restores the generic output type.
    schema: options.schema as unknown as FlexibleSchema<z.output<S>>,
    name: options.schemaName,
    ...(options.schemaDescription ? { description: options.schemaDescription } : {}),
  });
  let model = ref.id;
  let messages: ModelMessage[] = [{ role: 'user', content: options.prompt }];

  const fail = async (error: unknown): Promise<never> => {
    const message = describeAiError(error, timeoutMs);
    await recordRun(rt, {
      task,
      ctx,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      latencyMs: Date.now() - started,
      status: 'error',
      error: message,
    });
    throw new AiUnavailableError('provider', `AI ${task} failed: ${message}`, {
      task,
      cause: error,
    });
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const promptTokens = estimateTokens(
      options.instructions + messages.map((message) => String(message.content)).join('\n'),
    );
    const attemptTimeout = Math.max(1_000, Math.min(timeoutMs, deadline - Date.now()));
    let previousText = '';
    let problem: string;
    let failure: unknown;
    let counted = false;

    try {
      const result = await generateText({
        model: ref.model,
        instructions: options.instructions,
        messages,
        output,
        maxOutputTokens,
        maxRetries: 1,
        timeout: attemptTimeout,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      });
      usage.add(result.totalUsage, {
        input: promptTokens,
        output: estimateTokens(result.text),
      });
      counted = true;
      model = result.response?.modelId || model;
      const final = attempt >= MAX_ATTEMPTS || deadline - Date.now() < MIN_RETRY_MS;
      const issue = options.check ? options.check(result.output, final) : null;
      if (!issue) {
        const latencyMs = Date.now() - started;
        await recordRun(rt, {
          task,
          ctx,
          model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          latencyMs,
          status: 'ok',
        });
        return {
          output: result.output,
          model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          latencyMs,
          attempts: attempt,
        };
      }
      previousText = result.text;
      problem = issue;
      failure = new AiOutputCheckError(issue);
      if (final) return fail(failure);
    } catch (error) {
      if (!isOutputError(error)) {
        // Transport/provider errors were already retried by the AI SDK (maxRetries).
        return fail(error);
      }
      // `result.output` throws NoOutputGeneratedError after the usage was already counted.
      if (!counted) {
        usage.add(NoObjectGeneratedError.isInstance(error) ? error.usage : undefined, {
          input: promptTokens,
          output: 0,
        });
      }
      if (NoObjectGeneratedError.isInstance(error)) {
        previousText = error.text ?? '';
        model = error.response?.modelId || model;
      }
      problem = outputProblem(error);
      failure = error;
      if (attempt >= MAX_ATTEMPTS || deadline - Date.now() < MIN_RETRY_MS) {
        return fail(failure);
      }
    }

    rt.logger.debug({ task, attempt, problem }, 'ai output rejected; retrying once');
    messages = [
      ...messages,
      ...(previousText
        ? [{ role: 'assistant' as const, content: previousText.slice(0, 8_000) }]
        : []),
      { role: 'user' as const, content: retryMessage(problem) },
    ];
  }
  // Unreachable: the loop returns or throws on its last attempt.
  throw new AiUnavailableError('provider', `AI ${task} failed`, { task });
}

// ---------------------------------------------------------------- embeddings

export interface RunEmbeddingOptions {
  task?: AiTaskName;
  ctx: AiContext;
  value: string;
  timeoutMs?: number;
  /** Expected vector length (the schema's vector(1536)). */
  dimensions?: number;
}

/** One embedding call with the same checks and accounting as runAiTask (no retry). */
export async function runEmbeddingTask(
  rt: AiRuntime,
  options: RunEmbeddingOptions,
): Promise<AiTaskResult<number[]>> {
  const task = options.task ?? 'embedItem';
  const { ctx } = options;
  await preflight(rt, task, ctx);

  const ref = rt.models.embedding;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const dimensions = options.dimensions ?? LIMITS.ai.embeddingDimensions;
  const started = Date.now();
  let inputTokens = 0;
  try {
    const result = await embed({
      model: ref.model,
      value: options.value,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
    inputTokens = result.usage?.tokens ?? estimateTokens(options.value);
    const vector = result.embedding;
    if (vector.length !== dimensions || vector.some((value) => !Number.isFinite(value))) {
      throw new AiOutputCheckError(
        `expected ${dimensions} finite numbers, got ${vector.length} values`,
      );
    }
    const latencyMs = Date.now() - started;
    await recordRun(rt, {
      task,
      ctx,
      model: ref.id,
      inputTokens,
      outputTokens: 0,
      latencyMs,
      status: 'ok',
    });
    return {
      output: vector,
      model: ref.id,
      inputTokens,
      outputTokens: 0,
      latencyMs,
      attempts: 1,
    };
  } catch (error) {
    const message = describeAiError(error, timeoutMs);
    await recordRun(rt, {
      task,
      ctx,
      model: ref.id,
      inputTokens,
      outputTokens: 0,
      latencyMs: Date.now() - started,
      status: 'error',
      error: message,
    });
    throw new AiUnavailableError('provider', `AI ${task} failed: ${message}`, {
      task,
      cause: error,
    });
  }
}
