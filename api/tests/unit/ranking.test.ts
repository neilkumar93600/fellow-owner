import { describe, expect, it } from 'vitest';
import {
  changePct,
  fitComponent,
  ideaScore,
  inboxFitSortValue,
  rankIdeas,
  recency,
  risingScore,
  signalScore,
} from '../../src/lib/ranking.js';

const now = new Date('2026-10-01T12:00:00.000Z');
const hoursBefore = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

describe('ranking (02-trd)', () => {
  it('fit is score/100 when done, 0.5 while pending or unscored', () => {
    expect(fitComponent(88, 'done')).toBeCloseTo(0.88);
    expect(fitComponent(88, 'pending')).toBe(0.5);
    expect(fitComponent(null, 'done')).toBe(0.5);
    expect(fitComponent(140, 'done')).toBe(1);
  });

  it('signal = min(1, log1p(use + 2*build + 0.5*comments) / log1p(50))', () => {
    expect(signalScore({ useCount: 0, buildCount: 0, commentCount: 0 })).toBe(0);
    expect(signalScore({ useCount: 4, buildCount: 3, commentCount: 2 })).toBeCloseTo(
      Math.log1p(11) / Math.log1p(50),
    );
    expect(signalScore({ useCount: 500, buildCount: 0, commentCount: 0 })).toBe(1);
  });

  it('recency halves every 72 hours and clamps future dates', () => {
    expect(recency(now, now)).toBe(1);
    expect(recency(hoursBefore(72), now)).toBeCloseTo(0.5);
    expect(recency(hoursBefore(144), now)).toBeCloseTo(0.25);
    expect(recency(new Date(now.getTime() + 3_600_000), now)).toBe(1);
  });

  it('idea score = 0.5 fit + 0.3 signal + 0.2 recency', () => {
    const score = ideaScore(
      {
        aiFitScore: 80,
        analysisStatus: 'done',
        useCount: 4,
        buildCount: 3,
        commentCount: 2,
        createdAt: hoursBefore(72),
      },
      now,
    );
    expect(score).toBeCloseTo(0.5 * 0.8 + 0.3 * (Math.log1p(11) / Math.log1p(50)) + 0.2 * 0.5);
  });

  it('ranks by score, then newest, deterministically', () => {
    const base = { analysisStatus: 'done' as const, useCount: 0, buildCount: 0, commentCount: 0 };
    const ranked = rankIdeas(
      [
        { ...base, id: 'a', aiFitScore: 40, createdAt: hoursBefore(1) },
        { ...base, id: 'b', aiFitScore: 90, createdAt: hoursBefore(1) },
        { ...base, id: 'c', aiFitScore: 90, createdAt: hoursBefore(2) },
      ],
      now,
    );
    expect(ranked.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('inbox fit sort uses 50 for pending items', () => {
    expect(inboxFitSortValue(82, 'done')).toBe(82);
    expect(inboxFitSortValue(82, 'pending')).toBe(50);
    expect(inboxFitSortValue(null, 'failed')).toBe(50);
  });

  it('rising = sum fit * (1 + log1p(signals)) + 0.1 per accepted team join', () => {
    const score = risingScore(
      [
        { aiFitScore: 80, analysisStatus: 'done', signalsReceived: 3 },
        { aiFitScore: null, analysisStatus: 'pending', signalsReceived: 0 },
      ],
      2,
    );
    expect(score).toBeCloseTo(0.8 * (1 + Math.log1p(3)) + 0.5 + 0.2);
  });

  it('changePct is null when previous is 0', () => {
    expect(changePct(15, 10)).toBe(50);
    expect(changePct(5, 0)).toBeNull();
    expect(changePct(9, 12)).toBe(-25);
  });
});
