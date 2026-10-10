import { LIMITS } from '@fellow-owners/shared';
import { describe, expect, it } from 'vitest';
import { type AiAccounting, preflight, TASK_CAPS } from '../../src/ai/run.js';
import { AiUnavailableError } from '../../src/ai/types.js';

const SPACE = '00000000-0000-4000-8000-000000000001';

/** Accounting with a paused budget and fixed per-user / per-space counts. */
function accounting(counts: { user: number; space: number }): AiAccounting {
  return {
    insert: async () => 1,
    budgetState: async () => ({ budget: 100, used: 100, paused: true }),
    countByUserTaskSince: async () => counts.user,
    countBySpaceTaskSince: async () => counts.space,
  };
}

const rt = (counts: { user: number; space: number }) => ({
  enabled: true,
  accounting: accounting(counts),
});

async function reason(promise: Promise<void>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof AiUnavailableError ? error.reason : 'other';
  }
}

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
