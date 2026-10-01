import { ApiError } from '@/lib/fetcher';

/**
 * Better Auth's client resolves to { data, error } for HTTP errors but throws when the request never
 * reaches a server. runAuth folds both into one result so no form can crash or lose what was typed.
 */

export type AuthFailureKind =
  | 'network'
  | 'unavailable'
  | 'rate_limited'
  | 'invalid_email'
  | 'invalid_otp'
  | 'otp_expired'
  | 'too_many_attempts'
  | 'password_too_short'
  | 'password_too_long'
  | 'user_not_found'
  | 'rejected';

export interface AuthFailure {
  kind: AuthFailureKind;
  status: number;
  /** The server's own message, only kept for plain 4xx rejections. */
  message?: string;
  retryAfterSeconds?: number;
}

export type AuthResult<T> = { ok: true; data: T } | { ok: false; failure: AuthFailure };

interface ErrorLike {
  status?: number;
  code?: string;
  message?: string;
  error?: { code?: string; message?: string };
}

/** Passed through as Better Auth `fetchOptions` so the rate limit's retry hint can be read. */
export interface AuthFetchOptions {
  onError: (context: { response: Response }) => void;
}

const CODE_TO_KIND: Record<string, AuthFailureKind> = {
  INVALID_OTP: 'invalid_otp',
  OTP_EXPIRED: 'otp_expired',
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  INVALID_EMAIL: 'invalid_email',
  PASSWORD_TOO_SHORT: 'password_too_short',
  PASSWORD_TOO_LONG: 'password_too_long',
  USER_NOT_FOUND: 'user_not_found',
  // Express API envelope (shared ApiErrorCode).
  rate_limited: 'rate_limited',
  validation_error: 'rejected',
};

export async function runAuth<T>(
  call: (fetchOptions: AuthFetchOptions) => Promise<{ data: T | null; error: unknown }>,
): Promise<AuthResult<T>> {
  let retryAfterSeconds: number | undefined;
  const fetchOptions: AuthFetchOptions = {
    onError: ({ response }) => {
      const header = response.headers.get('X-Retry-After') ?? response.headers.get('Retry-After');
      const seconds = header ? Number.parseInt(header, 10) : Number.NaN;
      if (Number.isFinite(seconds) && seconds > 0) retryAfterSeconds = seconds;
    },
  };
  try {
    const result = await call(fetchOptions);
    if (result.error) return { ok: false, failure: toFailure(result.error, retryAfterSeconds) };
    return { ok: true, data: result.data as T };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false,
        failure: toFailure({ status: error.status, code: error.code, message: error.message }),
      };
    }
    return { ok: false, failure: { kind: 'network', status: 0 } };
  }
}

function toFailure(raw: unknown, retryAfterSeconds?: number): AuthFailure {
  const error = (raw ?? {}) as ErrorLike;
  const status = typeof error.status === 'number' ? error.status : 0;
  const code = error.code ?? error.error?.code;
  const message = error.message ?? error.error?.message;

  if (status === 429) return { kind: 'rate_limited', status, retryAfterSeconds };
  const known = code ? CODE_TO_KIND[code] : undefined;
  if (known) return { kind: known, status, retryAfterSeconds };
  if (status === 0) return { kind: 'network', status };
  // 404 and 5xx: the auth service is missing or down. Nothing the visitor typed is wrong.
  if (status === 404 || status >= 500) return { kind: 'unavailable', status };
  return { kind: 'rejected', status, message: isReadable(message) ? message : undefined };
}

/** Only pass a server message through when it reads like a sentence meant for people. */
function isReadable(message: string | undefined): message is string {
  return Boolean(message && message.length <= 160 && /\s/.test(message) && !/[{}<>]/.test(message));
}

export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/** Copy for a failed "send me a code" request (sign in, sign up, resend, password reset). */
export function sendCodeMessage(failure: AuthFailure): string {
  switch (failure.kind) {
    case 'rate_limited':
      return failure.retryAfterSeconds
        ? `Too many code requests. Try again in ${formatWait(failure.retryAfterSeconds)}.`
        : 'Too many code requests. Wait a minute, then try again.';
    case 'invalid_email':
      return 'That email address doesn’t look right. Check it and try again.';
    case 'rejected':
      return failure.message ?? 'We couldn’t send a code to that address. Check it and try again.';
    default:
      return 'We couldn’t send a code right now. Check the address or try again.';
  }
}

/** Failures worth a Retry button: the request never got a real answer. */
export function isRetryable(failure: AuthFailure): boolean {
  return failure.kind === 'network' || failure.kind === 'unavailable';
}
