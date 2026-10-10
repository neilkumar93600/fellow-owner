import { LIMITS } from '@fellow-owners/shared';
import { describe, expect, it } from 'vitest';
import { fakeQuestionGroup } from '../../src/ai/fakes/question-group.js';
import { askerQuote } from '../../src/services/question-groups.service.js';
import { clusterCandidates, cosineDistance } from '../../src/workers/group-questions.js';

/** A unit vector pointing mostly along `axis`, nudged by `tilt` towards axis + 1. */
function vec(axis: number, tilt = 0): number[] {
  const v = new Array<number>(8).fill(0);
  v[axis] = 1;
  v[(axis + 1) % 8] = tilt;
  return v;
}

const MAX = LIMITS.answerOnce.maxDistance;

describe('cosineDistance', () => {
  it('is 0 for the same direction and 1 for orthogonal vectors', () => {
    expect(cosineDistance(vec(0), vec(0))).toBeCloseTo(0);
    expect(cosineDistance(vec(0), [2, 0, 0, 0, 0, 0, 0, 0])).toBeCloseTo(0);
    expect(cosineDistance(vec(0), vec(3))).toBeCloseTo(1);
  });
});

describe('clusterCandidates', () => {
  it('puts three near vectors in one cluster and a far one alone', () => {
    const { joins, clusters } = clusterCandidates(
      [
        { id: 'a', vector: vec(0) },
        { id: 'far', vector: vec(4) },
        { id: 'b', vector: vec(0, 0.1) },
        { id: 'c', vector: vec(0, 0.2) },
      ],
      [],
      MAX,
    );
    expect(joins.size).toBe(0);
    const sorted = clusters
      .map((cluster) => [...cluster.ids].sort())
      .sort((x, y) => y.length - x.length);
    expect(sorted).toEqual([['a', 'b', 'c'], ['far']]);
  });

  it('joins an existing open group when its centroid is close enough', () => {
    const { joins, clusters } = clusterCandidates(
      [
        { id: 'near', vector: vec(2, 0.1) },
        { id: 'other', vector: vec(6) },
      ],
      [{ id: 'g1', centroid: vec(2), size: 3 }],
      MAX,
    );
    expect(joins.get('g1')).toEqual(['near']);
    expect(clusters.map((cluster) => cluster.ids)).toEqual([['other']]);
  });

  it('never joins anything beyond the max distance', () => {
    const { joins, clusters } = clusterCandidates(
      [{ id: 'x', vector: vec(1) }],
      [{ id: 'g1', centroid: vec(5), size: 4 }],
      MAX,
    );
    expect(joins.size).toBe(0);
    expect(clusters).toHaveLength(1);
  });
});

describe('askerQuote', () => {
  it('keeps the first sentence', () => {
    expect(askerQuote('Can you film a packing video?  I always overpack. Thanks!')).toBe(
      'Can you film a packing video?',
    );
  });

  it('cuts long text to quoteMax', () => {
    const quote = askerQuote(`${'word '.repeat(100)}end.`);
    expect(quote.length).toBeLessThanOrEqual(LIMITS.answerOnce.quoteMax);
    expect(quote.endsWith('…')).toBe(true);
  });
});

describe('fakeQuestionGroup', () => {
  const input = {
    creatorName: 'Mira Lane',
    voice: null,
    quotes: ['How do you pack for two weeks in one bag?', 'What is in your carry-on?'],
  };

  it('is deterministic and names the question in one line', () => {
    const out = fakeQuestionGroup(input);
    expect(out).toEqual(fakeQuestionGroup(input));
    expect(out.isQuestion).toBe(true);
    expect(out.question).not.toMatch(/\n/);
    expect(out.question.length).toBeGreaterThanOrEqual(LIMITS.post.title.min);
    expect(out.question.length).toBeLessThanOrEqual(LIMITS.post.title.max);
    expect(out.draft.length).toBeLessThanOrEqual(LIMITS.pitch.reply.max);
    expect(out.draft).toContain('Mira');
  });

  it('gives a different draft on redraft', () => {
    const first = fakeQuestionGroup(input);
    const second = fakeQuestionGroup({ ...input, previousDraft: first.draft });
    expect(second.draft).not.toBe(first.draft);
  });

  it('rejects an empty set of quotes', () => {
    expect(fakeQuestionGroup({ ...input, quotes: [] }).isQuestion).toBe(false);
  });
});
