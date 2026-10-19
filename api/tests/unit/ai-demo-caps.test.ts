import { DAILY_CAPS, DEMO_CAP_SCALE, LIMITS } from '@fellow-owners/shared';
import { describe, expect, it } from 'vitest';
import { type AiAccounting, preflight, taskCapReached } from '../../src/ai/run.js';
import { AiUnavailableError } from '../../src/ai/types.js';

// CTO finding 1: the demo space (one shared creator, one shared fan) gets every TASK_CAP x
// DEMO_CAP_SCALE; real spaces keep the base caps.

const SPACE = '00000000-0000-4000-8000-000000000001';

function accounting(counts: { user: number; space: number }, isDemo?: boolean): AiAccounting {
  const self: AiAccounting = {
    insert: async () => 1,
    budgetState: async () => ({ budget: 100, used: 0, paused: false, isDemo }),
    ...(isDemo === undefined ? {} : { isDemoSpace: async () => isDemo }),
    countByUserTaskSince: async () => counts.user,
    countBySpaceTaskSince: async () => counts.space,
    locked: (_keys, fn) => fn(self),
    complete: async () => undefined,
  };
  return self;
}

async function reason(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof AiUnavailableError ? error.reason : 'other';
  }
}

const rt = (counts: { user: number; space: number }, isDemo?: boolean) => ({
  enabled: true,
  accounting: accounting(counts, isDemo),
});
const ctx = { spaceId: SPACE, userId: 'u-1' };

describe('demo-scaled AI task caps', () => {
  it('askAI: a real space stops at 30, the demo space at 150', async () => {
    const at = { user: 0, space: DAILY_CAPS.askAI };
    expect(await reason(preflight(rt(at, false), 'askAI', ctx))).toBe('cap');
    expect(await reason(preflight(rt(at), 'askAI', ctx))).toBe('cap');
    expect(await reason(preflight(rt(at, true), 'askAI', ctx))).toBeNull();
    const full = { user: 0, space: DAILY_CAPS.askAI * DEMO_CAP_SCALE };
    expect(await reason(preflight(rt(full, true), 'askAI', ctx))).toBe('cap');
  });

  it('scales only the per-user cap of budget-exempt tasks (coach, embedItem, suggestCommunities)', async () => {
    // Every judge shares the one demo creator and fan, so the per-user cap scales x5...
    const coach = { user: LIMITS.coach.perDay, space: 0 };
    expect(await reason(preflight(rt(coach, false), 'coach', ctx))).toBe('cap');
    expect(await reason(preflight(rt(coach, true), 'coach', ctx))).toBeNull();
    const embed = { user: 30, space: 0 };
    expect(await reason(preflight(rt(embed, true), 'embedItem', ctx))).toBeNull();
    // ...but the space-wide ceiling stays at base: the token budget never bounds these tasks.
    const spaceWide = { user: 0, space: 300 };
    expect(await reason(preflight(rt(spaceWide, true), 'coach', ctx))).toBe('cap');
    const suggest = { user: 0, space: 200 };
    expect(await reason(preflight(rt(suggest, true), 'suggestCommunities', ctx))).toBe('cap');
  });

  it('names the scaled limit in the refusal', async () => {
    const counts = { user: 0, space: DAILY_CAPS.suggestReply * DEMO_CAP_SCALE };
    const message = await taskCapReached(
      accounting(counts),
      'suggestReply',
      { spaceId: SPACE, isDemo: true },
      new Date(),
    );
    expect(message).toBe('Limit of 150 suggestReply calls per day reached');
  });

  it('never scales the paid media tasks', async () => {
    const at = { user: 0, space: 3 };
    expect(await reason(preflight(rt(at, true), 'generateVideo', ctx))).toBe('cap');
  });
});
