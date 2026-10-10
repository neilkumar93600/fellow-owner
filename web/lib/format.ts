// Figures, changes and dates as DESIGN.md writes them. Pure functions, no imports: format.check.mjs runs
// this file directly with Node.

const plain = new Intl.NumberFormat('en-US');
const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const longDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const MINUS = '−'; // U+2212, not a hyphen
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 1,200 */
export function formatNumber(n: number): string {
  return plain.format(n);
}

/** In full up to 9,999, then one decimal with a lowercase k (12.5k), then millions (1.2M). */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs < 10_000) return formatNumber(n);
  // 999,950 would round to "1,000k".
  if (abs < 999_950) return `${oneDecimal.format(n / 1_000)}k`;
  return `${oneDecimal.format(n / 1_000_000)}M`;
}

/**
 * A whole-number change with its direction in the sign: "+18%", "−4%" (U+2212), "0%". A null change
 * (nothing to compare with) reads as flat; hide it in the caller when that is misleading.
 */
export function formatChange(changePct: number | null): {
  text: string;
  direction: 'up' | 'down' | 'flat';
} {
  const rounded = Math.round(changePct ?? 0);
  if (rounded > 0) return { text: `+${formatNumber(rounded)}%`, direction: 'up' };
  if (rounded < 0) return { text: `${MINUS}${formatNumber(-rounded)}%`, direction: 'down' };
  return { text: '0%', direction: 'flat' };
}

/** "Oct 2" in the current year, "Oct 2, 2025" otherwise. Local time zone. */
export function formatDate(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return (sameYear ? shortDate : longDate).format(date);
}

/**
 * "just now", "5m ago", "3h ago", "2d ago", then the date from 7 days on. Depends on the clock: pass the
 * same `now` on server and client, or render it on the client only, to avoid a hydration mismatch.
 */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();
  if (Number.isNaN(elapsed)) return '';
  // A little clock skew can put a fresh item in the future.
  if (elapsed < MINUTE) return elapsed > -MINUTE ? 'just now' : formatDate(iso, now);
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
  return formatDate(iso, now);
}

/**
 * The word only, for `count`: pluralize(1, 'pitch') is "pitch", pluralize(3, 'pitch') is "pitches".
 * Put the figure in its own tabular span: `${formatNumber(n)} ${pluralize(n, 'member')}`.
 */
export function pluralize(count: number, one: string, many?: string): string {
  if (count === 1) return one;
  if (many) return many;
  if (/(s|x|z|ch|sh)$/.test(one)) return `${one}es`;
  if (/[^aeiou]y$/.test(one)) return `${one.slice(0, -1)}ies`;
  return `${one}s`;
}
