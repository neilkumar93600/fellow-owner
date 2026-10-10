import {
  emailSchema,
  followerHandleSchema,
  LIMITS,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
} from '@fellow-owners/shared';
import { stripInvisible } from '../ai/guard.js';
import { badRequest } from './errors.js';

/**
 * Audience import parser (F23, POST /api/studio/followers/import). Pure: text in, rows and row
 * errors out; the followers service dedupes against the roster and inserts.
 *
 * - csv:   RFC 4180 (quoted fields, "" escapes, commas and newlines inside quotes). The first
 *          non-empty row is the header; aliases map common column names (HEADER_ALIASES).
 * - paste: one follower per line, "identity <separator> note" (PASTE_SEPARATORS, first found
 *          wins); identity tokens are @handle, email, and the rest is the name.
 * Both: BOM stripped, CRLF/CR -> LF, line numbers are 1-based physical lines of the input.
 */

const F = LIMITS.follower;

export type ImportSource = 'csv' | 'paste';

export interface ParsedFollower {
  line: number;
  name: string;
  handle: string | null;
  platform: Platform | null;
  email: string | null;
  note: string | null;
}

export interface RowError {
  line: number;
  reason: string;
}

export interface ParsedImport {
  rows: ParsedFollower[];
  /** Every row error, in line order (the service lists the first LIMITS.follower.importErrorsMax). */
  errors: RowError[];
  /** Rows skipped (errors plus rows beyond `maxRows`). */
  skipped: number;
}

type Field = 'name' | 'handle' | 'platform' | 'email' | 'note';

const HEADER_ALIASES: Record<string, Field> = {
  name: 'name',
  'display name': 'name',
  'full name': 'name',
  handle: 'handle',
  username: 'handle',
  '@': 'handle',
  platform: 'platform',
  email: 'email',
  note: 'note',
  comment: 'note',
  bio: 'note',
  message: 'note',
};

/** Priority order: the first one the line contains splits it (identity | note). */
const PASTE_SEPARATORS = ['\t', ' - ', ' — ', ':', ','];

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NO_HEADER_MESSAGE = 'Add a header row with a name, handle or email column';
export const ROWS_LIMIT_MESSAGE = `Only the first ${F.importRows} rows are imported`;

/** Strips the BOM and normalises line ends. */
function normalise(text: string): string {
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/** One line of clean text: control and invisible characters dropped, whitespace collapsed. */
function clean(value: string | undefined): string {
  return stripInvisible(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cuts to `max` code points (Postgres char_length), never splitting a surrogate pair. */
function cut(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length <= max ? value : chars.slice(0, max).join('').trimEnd();
}

export function parsePlatform(value: string): Platform | null {
  const key = value.trim().toLowerCase();
  if (!key) return null;
  if (key === 'twitter') return 'x';
  const match = PLATFORMS.find(
    (platform) => platform === key || PLATFORM_LABELS[platform].toLowerCase() === key,
  );
  return match ?? 'other';
}

/** Normalises one row's raw fields into a follower, or the reason it cannot be imported. */
export function toFollower(
  line: number,
  raw: Partial<Record<Field, string>>,
): ParsedFollower | RowError {
  const rawHandle = clean(raw.handle);
  const rawEmail = clean(raw.email);
  let handle: string | null = null;
  let email: string | null = null;
  if (rawHandle) {
    const parsed = followerHandleSchema.safeParse(rawHandle);
    if (!parsed.success) return { line, reason: 'Invalid handle' };
    handle = parsed.data;
  }
  if (rawEmail) {
    const parsed = emailSchema.safeParse(rawEmail);
    if (!parsed.success) return { line, reason: 'Invalid email' };
    email = parsed.data;
  }
  const name = clean(raw.name) || handle || (email ? (email.split('@')[0] ?? '') : '');
  if (!name) return { line, reason: 'No name, handle or email' };
  const note = clean(raw.note);
  return {
    line,
    name: cut(name, F.name.max),
    handle,
    platform: parsePlatform(clean(raw.platform)),
    email,
    note: note ? cut(note, F.note.max) : null,
  };
}

// ---------------------------------------------------------------- csv

interface CsvRecord {
  line: number;
  fields: string[];
}

/** RFC 4180 records with the physical line each starts on. Expects LF line ends. */
export function parseCsvRecords(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let start = 1;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        if (char === '\n') line += 1;
        field += char;
      }
    } else if (char === '"' && field === '') {
      // A quote opens a quoted field only at its start; elsewhere it is a literal character.
      quoted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else if (char === '\n') {
      fields.push(field);
      records.push({ line: start, fields });
      fields = [];
      field = '';
      line += 1;
      start = line;
    } else {
      field += char;
    }
  }
  if (field !== '' || fields.length > 0) {
    fields.push(field);
    records.push({ line: start, fields });
  }
  return records;
}

const isBlank = (record: CsvRecord) => record.fields.every((value) => value.trim() === '');

function csvRows(text: string): Array<{ line: number; raw: Partial<Record<Field, string>> }> {
  const records = parseCsvRecords(text).filter((record) => !isBlank(record));
  const [header, ...data] = records;
  const columns = (header?.fields ?? []).map(
    (name) => HEADER_ALIASES[name.trim().toLowerCase()] ?? null,
  );
  if (!columns.some((column) => column === 'name' || column === 'handle' || column === 'email')) {
    throw badRequest(NO_HEADER_MESSAGE);
  }
  return data.map((record) => {
    const raw: Partial<Record<Field, string>> = {};
    for (const [index, column] of columns.entries()) {
      // The first column with a field name wins when a header repeats it.
      if (column && raw[column] === undefined) raw[column] = record.fields[index] ?? '';
    }
    return { line: record.line, raw };
  });
}

// ---------------------------------------------------------------- paste

export function splitPasteLine(text: string): Partial<Record<Field, string>> {
  const separator = PASTE_SEPARATORS.find((candidate) => text.includes(candidate));
  const at = separator ? text.indexOf(separator) : -1;
  const identity = separator ? text.slice(0, at) : text;
  const note = separator ? text.slice(at + separator.length).trim() : '';
  const names: string[] = [];
  let handle = '';
  let email = '';
  for (const token of identity.split(/\s+/).filter(Boolean)) {
    if (!handle && token.startsWith('@')) handle = token;
    else if (!email && EMAIL_LIKE.test(token)) email = token;
    else names.push(token);
  }
  return { name: names.join(' '), handle, email, note };
}

function pasteRows(text: string): Array<{ line: number; raw: Partial<Record<Field, string>> }> {
  return text
    .split('\n')
    .flatMap((value, index) =>
      value.trim() === '' ? [] : [{ line: index + 1, raw: splitPasteLine(value) }],
    );
}

// ---------------------------------------------------------------- entry point

/**
 * Parses an import. Throws 400 bad_request when a CSV has no usable header or the text has no
 * rows at all. Rows beyond `maxRows` are skipped with one error at the first of them.
 */
export function parseAudience(
  source: ImportSource,
  text: string,
  maxRows: number = F.importRows,
): ParsedImport {
  const input = normalise(text);
  const entries = source === 'csv' ? csvRows(input) : pasteRows(input);
  if (entries.length === 0) throw badRequest('Add at least one follower');
  const rows: ParsedFollower[] = [];
  const errors: RowError[] = [];
  for (const entry of entries.slice(0, maxRows)) {
    const result = toFollower(entry.line, entry.raw);
    if ('reason' in result) errors.push(result);
    else rows.push(result);
  }
  const over = entries.slice(maxRows);
  if (over[0]) errors.push({ line: over[0].line, reason: ROWS_LIMIT_MESSAGE });
  return { rows, errors, skipped: entries.length - rows.length };
}
