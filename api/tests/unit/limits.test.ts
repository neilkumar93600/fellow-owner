import { DAILY_CAPS, HOURLY_CAPS, LIMITS } from '@fellow-owners/shared';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/lib/errors.js';
import type { Repos } from '../../src/repositories/index.js';
import {
  createLimitsService,
  dailyCapMessage,
  nextUtcMidnight,
  remaining,
} from '../../src/services/limits.service.js';

/** Repos stub: only the counters the limits service reads. */
function stubRepos(counts: {
  posts?: number;
  pitches?: number;
  comments?: number;
  suggestions?: number;
  promoteDrafts?: number;
}) {
  const repos = {
    posts: { countByAuthorSince: vi.fn(async () => counts.posts ?? 0) },
    pitches: { countBySenderSince: vi.fn(async () => counts.pitches ?? 0) },
    comments: { countByAuthorSince: vi.fn(async () => counts.comments ?? 0) },
    aiRuns: {
      countByUserTaskSince: vi.fn(async () => counts.suggestions ?? 0),
      countBySpaceTaskSince: vi.fn(async () => counts.promoteDrafts ?? 0),
    },
    memberships: { lockUserInSpace: vi.fn(async () => undefined) },
  };
  return { repos, service: createLimitsService({ repos: repos as unknown as Repos }) };
}

const space = { id: 'space-1', displayName: 'Mira' };

async function caught(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error('expected an AppError');
}

describe('limits helpers', () => {
  it('never reports negative slots', () => {
    expect(remaining(5, 2)).toBe(3);
    expect(remaining(5, 5)).toBe(0);
    expect(remaining(5, 9)).toBe(0);
  });

  it('resets at the next 00:00 UTC', () => {
    expect(nextUtcMidnight(new Date('2026-10-01T23:59:59.000Z')).toISOString()).toBe(
      '2026-10-02T00:00:00.000Z',
    );
    expect(nextUtcMidnight(new Date('2026-10-01T00:00:00.000Z')).toISOString()).toBe(
      '2026-10-02T00:00:00.000Z',
    );
  });

  it('writes the cap messages from 03 §7', () => {
    expect(dailyCapMessage('pitches', 'Mira')).toBe(
      "You've reached today's limit of 5 pitches to Mira. Try again tomorrow.",
    );
    expect(dailyCapMessage('posts', 'Mira')).toContain(`${DAILY_CAPS.posts} posts`);
    expect(dailyCapMessage('comments', 'Mira')).toContain(`${DAILY_CAPS.comments} comments`);
  });
});

describe('limits service', () => {
  it('counts slots left today per kind', async () => {
    const { service } = stubRepos({ posts: 3, pitches: 5 });
    await expect(service.leftToday('posts', 'space-1', 'm-1')).resolves.toBe(DAILY_CAPS.posts - 3);
    await expect(service.leftToday('pitches', 'space-1', 'm-1')).resolves.toBe(0);
    await expect(service.leftToday('pitches', 'space-1', null)).resolves.toBe(DAILY_CAPS.pitches);
  });

  it('allows the last slot and blocks the one after it', async () => {
    const below = stubRepos({ posts: DAILY_CAPS.posts - 1 });
    await expect(below.service.assertDailyCap('posts', space, 'm-1')).resolves.toBeUndefined();

    const at = stubRepos({ posts: DAILY_CAPS.posts });
    const error = await caught(at.service.assertDailyCap('posts', space, 'm-1'));
    expect(error.status).toBe(429);
    expect(error.code).toBe('daily_cap_reached');
    expect(error.details).toMatchObject({ limit: DAILY_CAPS.posts, used: DAILY_CAPS.posts });
  });

  it('counts each cap kind from its own table', async () => {
    const { repos, service } = stubRepos({ comments: DAILY_CAPS.comments });
    const error = await caught(service.assertDailyCap('comments', space, 'm-1'));
    expect(error.code).toBe('daily_cap_reached');
    expect(repos.comments.countByAuthorSince).toHaveBeenCalledOnce();
    expect(repos.posts.countByAuthorSince).not.toHaveBeenCalled();
  });

  it('rate limits community suggestions per rolling hour', async () => {
    const ok = stubRepos({ suggestions: HOURLY_CAPS.suggestCommunities - 1 });
    await expect(ok.service.assertSuggestionsAllowed('user-1')).resolves.toBeUndefined();

    const over = stubRepos({ suggestions: HOURLY_CAPS.suggestCommunities });
    const error = await caught(over.service.assertSuggestionsAllowed('user-1'));
    expect(error.status).toBe(429);
    expect(error.code).toBe('rate_limited');
    expect(over.repos.aiRuns.countByUserTaskSince).toHaveBeenCalledWith(
      'user-1',
      'suggestCommunities',
      expect.any(Date),
    );
  });

  it('caps promotion drafts per space per day', async () => {
    const over = stubRepos({ promoteDrafts: DAILY_CAPS.promoteDrafts });
    const error = await caught(over.service.assertPromoteDraftsAllowed('space-1'));
    expect(error.code).toBe('daily_cap_reached');
  });

  it('allows 5 briefing regenerations a day', () => {
    const { service } = stubRepos({});
    const max = LIMITS.briefing.regenerationsPerDay;
    expect(service.regenerationsLeft(undefined)).toBe(max);
    expect(service.regenerationsLeft(2)).toBe(max - 2);
    expect(() => service.assertRegenerationAllowed(max - 1)).not.toThrow();
    expect(() => service.assertRegenerationAllowed(max)).toThrow(AppError);
  });
});
