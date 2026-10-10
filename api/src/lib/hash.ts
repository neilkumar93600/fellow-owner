import { createHash } from 'node:crypto';

/** Lowercase hex sha256 of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * content_hash for posts (title + body) and pitches (subject + body).
 * Triage reruns only when this changes. Whitespace at the edges does not count as a change.
 */
export function contentHash(title: string, body: string): string {
  return sha256Hex(`${title.trim()}\n\u0000\n${body.trim()}`);
}

/**
 * Unique-visitor key for click_events: sha256(ip + user agent + UTC day + secret salt).
 * The raw IP is never stored; the daily component stops cross-day tracking.
 */
export function visitorHash(ip: string, userAgent: string, day: string, salt: string): string {
  return sha256Hex(`${ip}\u0000${userAgent}\u0000${day}\u0000${salt}`);
}
