import { describe, expect, it } from 'vitest';
import { usernameCandidates } from '../../src/lib/handles.js';

// The usernames a Google, Apple or Facebook sign-up is offered, best first (src/auth/index.ts takes
// the first free one).

describe('usernameCandidates', () => {
  it('runs first and last name together, then tries similar ones', () => {
    const candidates = usernameCandidates('Neil Kumar', 'neil@example.com');
    expect(candidates.slice(0, 4)).toEqual(['neilkumar', 'neil.kumar', 'neil_kumar', 'neilkumar_']);
    expect(candidates).toContain('neilkumar2');
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it('drops accents and symbols, and keeps a one-word name once', () => {
    expect(usernameCandidates('José Álvarez', 'j@example.com')[0]).toBe('josealvarez');
    expect(usernameCandidates("Mira O'Neil", 'm@example.com')[0]).toBe('miraoneil');
    expect(usernameCandidates('Mira', 'm@example.com').slice(0, 2)).toEqual(['mira', 'mira_']);
  });

  it('falls back to the email when the name gives nothing usable', () => {
    expect(usernameCandidates('李', 'priya.shah@example.com').slice(0, 2)).toEqual([
      'priyashah',
      'priya.shah',
    ]);
    expect(usernameCandidates('', '@example.com')).toEqual([]);
  });

  it('only offers valid, unreserved handles of at most 30 characters', () => {
    const candidates = usernameCandidates('Admin', 'a@example.com');
    expect(candidates).not.toContain('admin');
    for (const candidate of usernameCandidates('A'.repeat(40), 'x@example.com')) {
      expect(candidate.length).toBeLessThanOrEqual(30);
    }
  });
});
