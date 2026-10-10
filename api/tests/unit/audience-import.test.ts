import { LIMITS } from '@fellow-owners/shared';
import { describe, expect, it } from 'vitest';
import {
  NO_HEADER_MESSAGE,
  parseAudience,
  parseCsvRecords,
  parsePlatform,
  ROWS_LIMIT_MESSAGE,
  splitPasteLine,
} from '../../src/lib/audience-import.js';
import { AppError } from '../../src/lib/errors.js';

describe('CSV records (RFC 4180)', () => {
  it('reads quoted fields, escaped quotes, embedded commas and newlines', () => {
    const records = parseCsvRecords('a,"b, c","say ""hi"""\n"multi\nline",x,\n');
    expect(records).toEqual([
      { line: 1, fields: ['a', 'b, c', 'say "hi"'] },
      { line: 2, fields: ['multi\nline', 'x', ''] },
    ]);
  });

  it('keeps a quote inside an unquoted field as a literal', () => {
    expect(parseCsvRecords('5" tall,ok')[0]?.fields).toEqual(['5" tall', 'ok']);
  });
});

describe('parseAudience csv', () => {
  it('maps header aliases, strips the BOM, handles CRLF and numbers physical lines', () => {
    const text =
      '﻿Full Name,Username,Platform,Email,Comment,Extra\r\n' +
      'Priya Shah,@priya.s,Instagram,Priya@Example.com,"Loves gym apps, wants a log"\r\n' +
      '"Dev\r\nKumar",dev_k,twitter,,"line one\r\nline two",ignored\r\n';
    const result = parseAudience('csv', text);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        line: 2,
        name: 'Priya Shah',
        handle: 'priya.s',
        platform: 'instagram',
        email: 'priya@example.com',
        note: 'Loves gym apps, wants a log',
      },
      {
        line: 3,
        name: 'Dev Kumar',
        handle: 'dev_k',
        platform: 'x',
        email: null,
        note: 'line one line two',
      },
    ]);
  });

  it('falls back to the handle, then the email local part, for the name', () => {
    const result = parseAudience('csv', 'name,@,email\n,@sam_r,\n,,lee@example.com\n');
    expect(result.rows.map((row) => row.name)).toEqual(['sam_r', 'lee']);
  });

  it('reports bad rows with 1-based lines and skips blank lines', () => {
    const result = parseAudience(
      'csv',
      'name,handle,email\n\nAna,,not-an-email\n,,\nBo,bad handle!,\n,,\nCy,,cy@example.com\n',
    );
    expect(result.rows.map((row) => row.name)).toEqual(['Cy']);
    expect(result.errors).toEqual([
      { line: 3, reason: 'Invalid email' },
      { line: 5, reason: 'Invalid handle' },
    ]);
    expect(result.skipped).toBe(2);
  });

  it('reports a row with nothing usable', () => {
    const result = parseAudience('csv', 'name,note\n,just a note\n');
    expect(result.errors).toEqual([{ line: 2, reason: 'No name, handle or email' }]);
  });

  it('cuts name and note to their limits and strips control characters', () => {
    const long = 'x'.repeat(LIMITS.follower.note.max + 50);
    const result = parseAudience('csv', `name,note\n"${'N'.repeat(100)}\u0007","${long}"\n`);
    expect(result.rows[0]?.name).toHaveLength(LIMITS.follower.name.max);
    expect(result.rows[0]?.note).toHaveLength(LIMITS.follower.note.max);
    expect(result.rows[0]?.name).not.toContain('\u0007');
  });

  it('needs a name, handle or email column', () => {
    expect(() => parseAudience('csv', 'note,platform\nhi,x\n')).toThrow(NO_HEADER_MESSAGE);
    try {
      parseAudience('csv', 'note\nhi');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(400);
    }
  });

  it('rejects a header with no rows', () => {
    expect(() => parseAudience('csv', 'name,email\n\n')).toThrow(AppError);
  });

  it('skips rows beyond the row limit with one error', () => {
    const rows = Array.from({ length: 7 }, (_, i) => `Person ${i}`).join('\n');
    const result = parseAudience('csv', `name\n${rows}\n`, 5);
    expect(result.rows).toHaveLength(5);
    expect(result.skipped).toBe(2);
    expect(result.errors).toEqual([{ line: 7, reason: ROWS_LIMIT_MESSAGE }]);
  });
});

describe('parseAudience paste', () => {
  it('splits at the first separator by priority and reads identity tokens', () => {
    expect(splitPasteLine('Priya Shah @priya.s\twants a gym log - and more')).toEqual({
      name: 'Priya Shah',
      handle: '@priya.s',
      email: '',
      note: 'wants a gym log - and more',
    });
    expect(splitPasteLine('@dev_k - would help build: anything')).toMatchObject({
      handle: '@dev_k',
      note: 'would help build: anything',
    });
    expect(splitPasteLine('Lee lee@example.com — design feedback')).toMatchObject({
      name: 'Lee',
      email: 'lee@example.com',
      note: 'design feedback',
    });
    expect(splitPasteLine('Mo: runs, lifts')).toMatchObject({ name: 'Mo', note: 'runs, lifts' });
    expect(splitPasteLine('Kai, music producer')).toMatchObject({
      name: 'Kai',
      note: 'music producer',
    });
    expect(splitPasteLine('Just A Name')).toEqual({
      name: 'Just A Name',
      handle: '',
      email: '',
      note: '',
    });
  });

  it('parses lines into followers with line numbers, skipping blank lines', () => {
    const result = parseAudience('paste', '\r\n@sam_r: loves design\r\n\r\n@bad! - x\r\nAva\n');
    expect(result.rows).toEqual([
      {
        line: 2,
        name: 'sam_r',
        handle: 'sam_r',
        platform: null,
        email: null,
        note: 'loves design',
      },
      { line: 5, name: 'Ava', handle: null, platform: null, email: null, note: null },
    ]);
    expect(result.errors).toEqual([{ line: 4, reason: 'Invalid handle' }]);
  });
});

describe('parsePlatform', () => {
  it('matches values and labels case-insensitively; anything else is other', () => {
    expect(parsePlatform('YouTube')).toBe('youtube');
    expect(parsePlatform('Twitter')).toBe('x');
    expect(parsePlatform('Website')).toBe('other');
    expect(parsePlatform('myspace')).toBe('other');
    expect(parsePlatform(' ')).toBeNull();
  });
});
