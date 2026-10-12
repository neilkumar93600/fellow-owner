import { and, count, eq, gte, lt, notInArray, sql } from 'drizzle-orm';
import { type AiAccounting, type AiRunResult, BUDGET_EXEMPT_TASKS } from '../ai/run.js';
import type { Db, DbOrTx } from '../db/client.js';
import { aiRuns, type NewAiRunRow } from '../db/schema/ai.js';
import { spaces } from '../db/schema/spaces.js';
import { startOfUtcDay } from '../lib/dates.js';

export interface AiBudgetState {
  /** spaces.ai_daily_token_budget */
  budget: number;
  /** input + output tokens of today's (UTC) ai_runs for the space. */
  used: number;
  /** used >= budget: "AI paused until tomorrow". */
  paused: boolean;
}

export function createAiRunsRepo(db: Db) {
  async function tokensUsedSince(spaceId: string, since: Date, tx: DbOrTx = db): Promise<number> {
    const [row] = await tx
      .select({
        tokens:
          sql<number>`coalesce(sum(${aiRuns.inputTokens} + ${aiRuns.outputTokens}), 0)`.mapWith(
            Number,
          ),
      })
      .from(aiRuns)
      .where(
        and(
          eq(aiRuns.spaceId, spaceId),
          gte(aiRuns.createdAt, since),
          // Fan-triggered tasks never count toward the creator's budget (ai/run.ts).
          notInArray(aiRuns.task, [...BUDGET_EXEMPT_TASKS]),
        ),
      );
    return row?.tokens ?? 0;
  }

  async function insert(values: NewAiRunRow, tx: DbOrTx = db): Promise<number> {
    const [row] = await tx.insert(aiRuns).values(values).returning({ id: aiRuns.id });
    return row?.id ?? 0;
  }

  async function budgetState(
    spaceId: string,
    now: Date = new Date(),
    tx: DbOrTx = db,
  ): Promise<AiBudgetState> {
    const [space] = await tx
      .select({ budget: spaces.aiDailyTokenBudget })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);
    const budget = space?.budget ?? 0;
    const used = await tokensUsedSince(spaceId, startOfUtcDay(now), tx);
    return { budget, used, paused: used >= budget };
  }

  async function countByUserTaskSince(
    userId: string,
    task: string,
    since: Date,
    { spaceId }: { spaceId?: string } = {},
    tx: DbOrTx = db,
  ): Promise<number> {
    const [row] = await tx
      .select({ n: count() })
      .from(aiRuns)
      .where(
        and(
          eq(aiRuns.userId, userId),
          eq(aiRuns.task, task),
          gte(aiRuns.createdAt, since),
          spaceId ? eq(aiRuns.spaceId, spaceId) : undefined,
        ),
      );
    return row?.n ?? 0;
  }

  async function countBySpaceTaskSince(
    spaceId: string,
    task: string,
    since: Date,
    { refType }: { refType?: string } = {},
    tx: DbOrTx = db,
  ): Promise<number> {
    const [row] = await tx
      .select({ n: count() })
      .from(aiRuns)
      .where(
        and(
          eq(aiRuns.spaceId, spaceId),
          eq(aiRuns.task, task),
          gte(aiRuns.createdAt, since),
          refType ? eq(aiRuns.refType, refType) : undefined,
        ),
      );
    return row?.n ?? 0;
  }

  /** The AiAccounting surface (ai/run.ts) bound to `tx`. */
  function accountingIn(tx: DbOrTx): AiAccounting {
    return {
      insert: (values) => insert(values, tx),
      budgetState: (spaceId, now) => budgetState(spaceId, now, tx),
      countByUserTaskSince: (userId, task, since) =>
        countByUserTaskSince(userId, task, since, {}, tx),
      countBySpaceTaskSince: (spaceId, task, since) =>
        countBySpaceTaskSince(spaceId, task, since, {}, tx),
      locked: (keys, fn) => locked(keys, fn),
      complete: (id, values) => complete(id, values),
    };
  }

  async function locked<T>(
    keys: readonly string[],
    fn: (accounting: AiAccounting) => Promise<T>,
  ): Promise<T> {
    return db.transaction(async (tx) => {
      for (const key of keys) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
      }
      return fn(accountingIn(tx));
    });
  }

  async function complete(id: number, values: AiRunResult): Promise<void> {
    await db.update(aiRuns).set(values).where(eq(aiRuns.id, id));
  }

  return {
    /** One row per AI call (ai/run.ts). */
    insert,

    /** Cap checks and the reserving insert under advisory locks on `keys` (ai/run.ts preflight). */
    locked,

    /** Fills in a row reserved by `locked` once the AI call finished. */
    complete,

    tokensUsedSince,

    /** Tokens used since 00:00 UTC today. */
    async tokensUsedToday(
      spaceId: string,
      now: Date = new Date(),
      tx: DbOrTx = db,
    ): Promise<number> {
      return tokensUsedSince(spaceId, startOfUtcDay(now), tx);
    },

    /** Today's usage vs the space budget (budget check, Overview.aiPaused). */
    budgetState,

    /** Per-user task cap (e.g. suggestCommunities 10/hour). Every attempt counts. */
    countByUserTaskSince,

    /** Per-space task cap (e.g. promoteDrafts 10/day), optionally one ref_type. Every attempt counts. */
    countBySpaceTaskSince,

    /** Retention (05 §8: 90 days). */
    async purgeOlderThan(before: Date, tx: DbOrTx = db): Promise<number> {
      const rows = await tx
        .delete(aiRuns)
        .where(lt(aiRuns.createdAt, before))
        .returning({ id: aiRuns.id });
      return rows.length;
    },
  };
}

export type AiRunsRepo = ReturnType<typeof createAiRunsRepo>;
