import { describe, expect, it } from 'vitest';
import { dueJobs, JOB_NAMES, jobSlot } from '../../src/workers/tick.js';

const HOURLY = [
  'sweep',
  'group_questions',
  'close_challenges',
  'email_digests',
  'planner_reminders',
];

/** 2026-10-12 is a Monday. */
const at = (iso: string) => new Date(iso);

describe('dueJobs (the schedule, UTC)', () => {
  it('runs only the hourly jobs at midnight', () => {
    expect(dueJobs(at('2026-10-13T00:00:00Z'))).toEqual(HOURLY);
  });

  it('adds refresh_followers at 06:00', () => {
    expect(dueJobs(at('2026-10-13T06:00:00Z'))).toEqual([...HOURLY, 'refresh_followers']);
  });

  it('runs only the hourly jobs at 01:00', () => {
    expect(dueJobs(at('2026-10-13T01:42:10Z'))).toEqual(HOURLY);
  });

  it('adds only purge at 09:00', () => {
    expect(dueJobs(at('2026-10-13T09:42:10Z'))).toEqual([...HOURLY, 'purge']);
  });

  it('adds community_digests on Monday at 13:00 only', () => {
    expect(dueJobs(at('2026-10-12T13:00:00Z'))).toEqual([...HOURLY, 'community_digests']);
    expect(dueJobs(at('2026-10-13T13:00:00Z'))).toEqual(HOURLY);
  });

  it('adds refresh_performance at 07:00 and brand_digest at 14:00', () => {
    expect(dueJobs(at('2026-10-13T07:05:00Z'))).toEqual([...HOURLY, 'refresh_performance']);
    expect(dueJobs(at('2026-10-13T14:59:59Z'))).toEqual([...HOURLY, 'brand_digest']);
  });

  it('only names known jobs', () => {
    for (let hour = 0; hour < 24 * 7; hour++) {
      const date = new Date(Date.UTC(2026, 9, 12, hour));
      for (const job of dueJobs(date)) expect(JOB_NAMES).toContain(job);
    }
  });
});

describe('jobSlot (the slot a missed tick catches up on)', () => {
  it('uses the hour start for hourly jobs', () => {
    expect(jobSlot('sweep', at('2026-10-13T10:59:59Z')).toISOString()).toBe(
      '2026-10-13T10:00:00.000Z',
    );
  });

  it('uses the latest 09:00 for the daily purge', () => {
    expect(jobSlot('purge', at('2026-10-13T10:30:00Z')).toISOString()).toBe(
      '2026-10-13T09:00:00.000Z',
    );
    expect(jobSlot('purge', at('2026-10-13T08:59:00Z')).toISOString()).toBe(
      '2026-10-12T09:00:00.000Z',
    );
  });

  it('uses the latest Monday 13:00 for community digests', () => {
    expect(jobSlot('community_digests', at('2026-10-14T02:00:00Z')).toISOString()).toBe(
      '2026-10-12T13:00:00.000Z',
    );
    expect(jobSlot('community_digests', at('2026-10-12T12:00:00Z')).toISOString()).toBe(
      '2026-10-05T13:00:00.000Z',
    );
    expect(jobSlot('community_digests', at('2026-10-12T13:00:00Z')).toISOString()).toBe(
      '2026-10-12T13:00:00.000Z',
    );
  });
});
