import { HOURLY_CAPS, LIMITS } from '@fellow-owners/shared';
import { describe, expect, it } from 'vitest';
import { type AiAccounting, preflight, TASK_CAPS } from '../../src/ai/run.js';
import { AiUnavailableError } from '../../src/ai/types.js';

const SPACE = '00000000-0000-4000-8000-000000000001';

/** Accounting with a paused budget and fixed per-user / per-space counts. */
function accounting(counts: { user: number; space: number }): AiAccounting {
  const self: AiAccounting = {
    insert: async () => 1,
    budgetState: async () => ({ budget: 100, used: 100, paused: true }),
    countByUserTaskSince: async () => counts.user,
    countBySpaceTaskSince: async () => counts.space,
    locked: (_keys, fn) => fn(self),
    complete: async () => undefined,
  };
  return self;
}

/** Returns preflight's outcome as a refusal reason (null when it let the call through). */
async function reason(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof AiUnavailableError ? error.reason : 'other';
  }
}

const rt = (counts: { user: number; space: number }) => ({
  enabled: true,
  accounting: accounting(counts),
});

describe('C5: coach is budget-exempt and capped per user and per space', () => {
  const ctx = { spaceId: SPACE, userId: 'fan-1' };

  it('runs while the space budget is paused', async () => {
    expect(await reason(preflight(rt({ user: 0, space: 0 }), 'coach', ctx))).toBeNull();
  });

  it('still pauses non-exempt tasks on the budget', async () => {
    expect(await reason(preflight(rt({ user: 0, space: 0 }), 'askAI', ctx))).toBe('budget');
  });

  it('stops at LIMITS.coach.perDay for the user', async () => {
    const cap = LIMITS.coach.perDay;
    expect(await reason(preflight(rt({ user: cap - 1, space: 0 }), 'coach', ctx))).toBeNull();
    expect(await reason(preflight(rt({ user: cap, space: 0 }), 'coach', ctx))).toBe('cap');
  });

  it('stops at the per-space ceiling even for a fresh user', async () => {
    const spaceMax = TASK_CAPS.coach?.spaceMax ?? 0;
    expect(spaceMax).toBe(300);
    expect(await reason(preflight(rt({ user: 0, space: spaceMax }), 'coach', ctx))).toBe('cap');
  });
});

describe('suggestCommunities: fans cannot drain the creator budget', () => {
  const ctx = { spaceId: SPACE, userId: 'fan-1' };

  it('runs while the space budget is paused', async () => {
    expect(
      await reason(preflight(rt({ user: 0, space: 0 }), 'suggestCommunities', ctx)),
    ).toBeNull();
  });

  it('is capped per user and per space', async () => {
    const cap = TASK_CAPS.suggestCommunities;
    expect(cap?.max).toBe(HOURLY_CAPS.suggestCommunities);
    const user = cap?.max ?? 0;
    const space = cap?.spaceMax ?? 0;
    expect(space).toBeGreaterThan(0);
    expect(await reason(preflight(rt({ user, space: 0 }), 'suggestCommunities', ctx))).toBe('cap');
    expect(await reason(preflight(rt({ user: 0, space }), 'suggestCommunities', ctx))).toBe('cap');
  });
});

describe('embedItem: capped per user, free for background work', () => {
  const max = HOURLY_CAPS.embedItem;

  it('stops a user at HOURLY_CAPS.embedItem', async () => {
    const ctx = { spaceId: SPACE, userId: 'fan-1' };
    expect(await reason(preflight(rt({ user: max - 1, space: 0 }), 'embedItem', ctx))).toBeNull();
    expect(await reason(preflight(rt({ user: max, space: 0 }), 'embedItem', ctx))).toBe('cap');
  });

  it('never caps calls without a user (workers, backfills)', async () => {
    const ctx = { spaceId: SPACE, userId: null };
    expect(
      await reason(preflight(rt({ user: 10_000, space: 10_000 }), 'embedItem', ctx)),
    ).toBeNull();
  });
});
