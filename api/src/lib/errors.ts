import type { ApiErrorBody, ApiErrorCode } from '@fellow-owners/shared';

/**
 * The only error type services and middlewares throw on purpose.
 * The error middleware turns it into `{ error: { code, message, details? } }` with `status`.
 * Anything else that reaches the error middleware is logged and returned as 500 internal_error.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    if (details !== undefined) this.details = details;
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Factories for the codes in ApiErrorCode, with the status each one always uses.

export const badRequest = (message = 'Bad request', details?: unknown) =>
  new AppError('bad_request', 400, message, details);

export const validationError = (details: unknown, message = 'Some fields need attention') =>
  new AppError('validation_error', 400, message, details);

export const unauthorized = (message = 'Sign in to continue') =>
  new AppError('unauthorized', 401, message);

export const forbidden = (message = 'You do not have access to this') =>
  new AppError('forbidden', 403, message);

export const notFound = (what = 'Resource') => new AppError('not_found', 404, `${what} not found`);

export const conflict = (message = 'This conflicts with the current state', details?: unknown) =>
  new AppError('conflict', 409, message, details);

export const handleTaken = (suggestions: string[]) =>
  new AppError('handle_taken', 409, 'That handle is taken', { suggestions });

export const dailyCapReached = (message: string, details?: unknown) =>
  new AppError('daily_cap_reached', 429, message, details);

export const rateLimited = (message = 'Too many requests, try again soon', details?: unknown) =>
  new AppError('rate_limited', 429, message, details);

export const editWindowClosed = (message = 'Posts can only be edited within 24 hours') =>
  new AppError('edit_window_closed', 403, message);

export const demoDisabled = (message = 'Demo mode is turned off') =>
  new AppError('demo_disabled', 403, message);

export const aiUnavailable = (message = 'AI is unavailable right now', details?: unknown) =>
  new AppError('ai_unavailable', 503, message, details);

export const internalError = (message = 'Something went wrong') =>
  new AppError('internal_error', 500, message);

/**
 * Scaffolding only: a route or method whose feature is not built yet answers 501. Nothing ships
 * calling it (T21 checks `rg notImplemented api/src` finds only this helper).
 */
export const notImplemented = (what = 'This feature') =>
  new AppError('internal_error', 501, `${what} is not available yet`);
