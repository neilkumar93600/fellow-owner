import { describe, expect, it } from 'vitest';
import { bestPromoteLine } from '../../src/db/seed/generate-content.js';

const LINES = [
  'budget-honest travel, with real prices and the receipts',
  'small family-run food spots over famous restaurants',
  'beginner-friendly photo and editing tips',
];

describe('bestPromoteLine', () => {
  it('picks the line sharing the most significant words', () => {
    expect(bestPromoteLine('Five family-run taco spots in Austin', LINES)).toBe(LINES[1]);
    expect(bestPromoteLine('Phone photo editing for beginners', LINES)).toBe(LINES[2]);
  });

  it('returns null when nothing is shared (travel alone does not count)', () => {
    expect(
      bestPromoteLine('A year as one of six camera ambassadors. Mirrorless travel kit.', LINES),
    ).toBeNull();
  });
});
