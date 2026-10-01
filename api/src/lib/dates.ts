/** UTC day helpers. Daily caps, budgets and digests all use the UTC day. */

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

/** 00:00:00.000 UTC of the day containing `date`. */
export function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** 00:00 UTC on the 1st of the month containing `date`. */
export function startOfUtcMonth(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** `YYYY-MM-DD` of the UTC day (digests.period_date, visitor hash day). */
export function utcDayString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * HOUR_MS);
}

/** The instant `days` x 24h before `from`. */
export function daysAgo(days: number, from: Date = new Date()): Date {
  return addDays(from, -days);
}

export function hoursAgo(hours: number, from: Date = new Date()): Date {
  return addHours(from, -hours);
}

/** Monday 00:00 UTC of the ISO week containing `date`. */
export function weekStart(date: Date = new Date()): Date {
  const day = startOfUtcDay(date);
  const weekday = (day.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

/** The last `count` week starts (Mondays, UTC), oldest first, ending with the current week. */
export function lastWeekStarts(count = 12, now: Date = new Date()): Date[] {
  const current = weekStart(now);
  return Array.from({ length: count }, (_, i) => addDays(current, -7 * (count - 1 - i)));
}

/** Hours between two instants (b - a). */
export function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / HOUR_MS;
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function toIsoOrNull(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
