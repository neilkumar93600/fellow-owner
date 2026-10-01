import { isSafeReturnTo } from '@fellow-owners/shared';

/** Signing in should never send someone back into the sign-in flow itself. */
const AUTH_PATHS = ['/login', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];

/**
 * A post-sign-in destination, or null. Only same-site relative paths pass (shared isSafeReturnTo), and
 * anything with control characters or backslashes is dropped, because browsers strip tabs and newlines
 * and would turn "/\t/evil.com" into a protocol-relative URL.
 */
export function safeReturnTo(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point.
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return null;
  if (!isSafeReturnTo(raw)) return null;
  const path = raw.split(/[?#]/)[0] ?? raw;
  if (AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return raw;
}

/** `path` with `?returnTo=` appended when there is one (keeps any query already on `path`). */
export function withReturnTo(path: string, returnTo: string | null | undefined): string {
  if (!returnTo) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

export const DEFAULT_DESTINATION = '/dashboard';
