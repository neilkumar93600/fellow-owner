import { describe, expect, it } from 'vitest';
import { dueJobs, JOB_NAMES, jobSlot } from '../../src/workers/tick.js';

const HOURLY = [
  'sweep',
  'group_questions',
  'close_challenges',
  'email_digests',
  'planner_reminders',
  'demo_briefing',
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

  it('runs demo_reset at 01:00 (before demo_briefing, so the warm job sees the new space)', () => {
    expect(dueJobs(at('2026-10-13T01:42:10Z'))).toEqual([
      'sweep',
      'group_questions',
      'close_challenges',
      'email_digests',
      'planner_reminders',
      'demo_reset',
      'demo_briefing',
    ]);
  });

  it('adds only purge at 09:00 (the demo reset moved to 01:00)', () => {
    const due = dueJobs(at('2026-10-13T09:42:10Z'));
    expect(due).toEqual([...HOURLY, 'purge']);
    expect(due).not.toContain('demo_reset');
  });

  it('runs demo_briefing every hour', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(dueJobs(new Date(Date.UTC(2026, 9, 13, hour)))).toContain('demo_briefing');
    }
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

  it('uses the latest 01:00 for the daily demo reset', () => {
    expect(jobSlot('demo_reset', at('2026-10-13T10:30:00Z')).toISOString()).toBe(
      '2026-10-13T01:00:00.000Z',
    );
    expect(jobSlot('demo_reset', at('2026-10-13T00:59:00Z')).toISOString()).toBe(
      '2026-10-12T01:00:00.000Z',
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
