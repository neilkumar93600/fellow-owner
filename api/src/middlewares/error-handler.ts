import { APIError } from 'better-auth/api';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AiUnavailableError } from '../ai/types.js';
import { AppError } from '../lib/errors.js';
import { logger as rootLogger } from '../lib/logger.js';

interface PgLikeError {
  code?: unknown;
  constraint_name?: unknown;
  constraint?: unknown;
}

/** postgres.js errors may arrive directly or wrapped by drizzle (DrizzleQueryError.cause). */
function pgError(error: unknown): PgLikeError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth += 1) {
    const candidate = current as PgLikeError & { cause?: unknown; name?: unknown };
    if (typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      return candidate;
    }
    current = candidate.cause;
  }
  return null;
}

function constraintOf(error: PgLikeError): string | undefined {
  const name = error.constraint_name ?? error.constraint;
  return typeof name === 'string' ? name : undefined;
}

/** Maps known error types to AppError. Returns null for unexpected errors (500). */
export function toAppError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError(
      'validation_error',
      400,
      'Some fields need attention',
      error.issues.map((issue) => ({
        location: 'body',
        path: issue.path.map((key) => (typeof key === 'number' ? key : String(key))),
        message: issue.message,
        code: issue.code,
      })),
    );
  }

  if (error instanceof AiUnavailableError) {
    return error.reason === 'cap'
      ? new AppError('rate_limited', 429, error.message)
      : new AppError('ai_unavailable', 503, error.message, { reason: error.reason });
  }

  if (error instanceof APIError) {
    const status = error.statusCode;
    const message = error.body?.message ?? error.message;
    if (status === 401) return new AppError('unauthorized', 401, message);
    if (status === 403) return new AppError('forbidden', 403, message);
    if (status === 404) return new AppError('not_found', 404, message);
    if (status === 429) return new AppError('rate_limited', 429, message);
    if (status >= 400 && status < 500) return new AppError('bad_request', status, message);
    return null;
  }

  // body-parser (express.json) errors
  const bodyError = error as { type?: unknown; status?: unknown };
  if (bodyError && typeof bodyError === 'object') {
    if (bodyError.type === 'entity.parse.failed') {
      return new AppError('bad_request', 400, 'Malformed JSON body');
    }
    if (bodyError.type === 'entity.too.large') {
      return new AppError('bad_request', 413, 'Request body is too large');
    }
    if (bodyError.type === 'encoding.unsupported' || bodyError.type === 'charset.unsupported') {
      return new AppError('bad_request', 415, 'Unsupported request encoding');
    }
  }

  // Database safety net: services should prevent these, but never answer them with a 500.
  const pg = pgError(error);
  if (pg) {
    const constraint = constraintOf(pg);
    switch (pg.code) {
      case '23505':
        return new AppError('conflict', 409, 'This already exists', { constraint });
      case '23503':
        return new AppError('conflict', 409, 'A related item no longer exists', { constraint });
      case '23514':
        return new AppError('validation_error', 400, 'A value is out of range', { constraint });
      case '22P02':
        return new AppError('bad_request', 400, 'Malformed identifier');
      case '40001':
      case '40P01':
        return new AppError('conflict', 409, 'Busy, please retry');
      default:
        return null;
    }
  }
  return null;
}

/**
 * The one error middleware: `{ error: { code, message, details? } }`.
 * Expected errors (AppError and the mapped kinds above) are logged at debug/warn;
 * anything else is logged at error with the stack and returned as 500 internal_error.
 */
export function errorHandler(): ErrorRequestHandler {
  return (error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const log = req.log ?? rootLogger;
    const appError = toAppError(error);
    if (appError) {
      if (appError.status >= 500) log.error({ err: error }, appError.message);
      else log.debug({ code: appError.code, status: appError.status }, appError.message);
      res.status(appError.status).json(appError.toBody());
      return;
    }
    log.error({ err: error }, 'unhandled error');
    res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong' } });
  };
}
