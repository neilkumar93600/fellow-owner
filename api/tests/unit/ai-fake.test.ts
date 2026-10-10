import type { TasteProfile } from '@fellow-owners/shared';
import { describe, expect, it } from 'vitest';
import { fakeTriage } from '../../src/ai/fake.js';
import type { TriageInput } from '../../src/ai/types.js';

// The deterministic fake triage: "never" lines need their phrase family, "promote" reasons quote
// the line with the most shared keywords, else a generic line.

const taste: TasteProfile = {
  promote: [
    'budget-honest travel, with real prices and the receipts',
    'local guides written by people who actually live there',
    'solo-travel safety that is practical, not scary',
    'small family-run food spots over famous restaurants',
    'collabs with a named owner and a date',
    'beginner-friendly photo and editing tips',
  ],
  never: [
    'crypto, tokens and anything with a presale',
    'bought followers and engagement pods',
    '"free cruise" giveaways and prize scams',
    'MLM and dropshipping pitches',
    'paid reviews of places she has not been',
  ],
  voice: [],
};

const pitch = (title: string, body: string): TriageInput => ({
  kind: 'inbound',
  type: 'brand_deal',
  title,
  body,
  links: [],
  tasteProfile: taste,
  communityName: null,
  creatorName: 'Mira Lane',
});

const reasonOf = (title: string, body: string) => fakeTriage(pitch(title, body)).fitReason;

describe('fakeTriage fit reasons', () => {
  it('a paid partnership is not a "paid review"', () => {
    const reason = reasonOf(
      'Paid partnership for our luggage line',
      'We would like a paid integration in your next video about packing light.',
    );
    expect(reason).not.toContain('paid reviews');
  });

  it.each([
    ['Review our resort', 'We pay $500 for a 5-star review of our resort, no need to visit.'],
    ['Sponsored review of our hotel', 'A sponsored review. You do not need to stay with us.'],
    ['Quick money', 'Paid reviews for our tours, written from home.'],
    ['Reviews', 'We offer reviews for money on any listing.'],
  ])('flags the paid-review family: %s', (title, body) => {
    const result = fakeTriage(pitch(title, body));
    expect(result.fitReason).toContain('paid reviews of places she has not been');
    expect(result.fitScore).toBeLessThan(45);
  });

  it('a camera ambassador deal is not matched to food spots or local guides', () => {
    const reason = reasonOf(
      'A year as one of six camera ambassadors',
      'Our mirrorless camera brand is looking for six creators for a year-long ambassador program. You would get a body and two lenses and $2,500 for content across the year. We need you to actually like the camera, which is why we send it ahead.',
    );
    expect(reason).not.toContain('food spots');
    expect(reason).not.toContain('local guides');
    expect(reason).not.toContain('never');
  });

  it('quotes the promote line with the most shared keywords', () => {
    const reason = reasonOf(
      'Family-run food spots in Lisbon',
      'A small family-run spot with famous custard tarts, far better than the famous restaurants downtown, and real prices.',
    );
    expect(reason).toBe(
      'Matches "small family-run food spots over famous restaurants", which you love.',
    );
  });

  it('a single shared keyword gets the generic line', () => {
    expect(reasonOf('Editing session', 'Join our evening editing meetup.')).toBe(
      'Fits your style.',
    );
  });

  it('other never lines still match their own words', () => {
    expect(reasonOf('Token drop', 'Join our crypto presale today.')).toContain('crypto');
  });

  it('is deterministic', () => {
    const input = pitch('Same', 'Budget travel with real prices and receipts.');
    expect(fakeTriage(input)).toEqual(fakeTriage(input));
  });
});
