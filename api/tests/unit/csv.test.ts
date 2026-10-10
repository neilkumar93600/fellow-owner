import { describe, expect, it } from 'vitest';
import { csvField, toCsv } from '../../src/lib/csv.js';

describe('csvField', () => {
  it('leaves plain text alone and quotes commas, quotes and line breaks', () => {
    expect(csvField('hello')).toBe('hello');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('line\nbreak')).toBe('"line\nbreak"');
    expect(csvField('cr\rhere')).toBe('"cr\rhere"');
  });

  it('formats empties, booleans, dates, numbers and lists', () => {
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
    expect(csvField(true)).toBe('yes');
    expect(csvField(false)).toBe('no');
    expect(csvField(new Date('2026-10-06T12:00:00Z'))).toBe('2026-10-06T12:00:00.000Z');
    expect(csvField(-3)).toBe('-3');
    expect(csvField(['a', 'b'])).toBe('a; b');
  });

  it('neutralizes spreadsheet formulas', () => {
    expect(csvField('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvField('+1')).toBe("'+1");
    expect(csvField('-1')).toBe("'-1");
    expect(csvField('@cmd')).toBe("'@cmd");
    expect(csvField('\tx')).toBe("'\tx");
    expect(csvField('\rx')).toBe(`"'\rx"`);
    expect(csvField('=1,2')).toBe(`"'=1,2"`);
    expect(csvField('a=b')).toBe('a=b');
  });
});

describe('toCsv', () => {
  it('writes the header, rows in column order and a trailing newline, without a BOM', () => {
    const csv = toCsv(['id', 'name'], [{ name: 'Ann, B', id: 1 }, { id: 2 }]);
    expect(csv).toBe('id,name\n1,"Ann, B"\n2,\n');
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
  });

  it('writes only the header for no rows', () => {
    expect(toCsv(['a', 'b'], [])).toBe('a,b\n');
  });
});
