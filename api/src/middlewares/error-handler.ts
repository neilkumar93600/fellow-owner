import { APIError } from 'better-auth/api';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AiUnavailableError } from '../ai/types.js';
import { AppError } from '../lib/errors.js';
import { logger as rootLogger } from '../lib/logger.js';

const AI_UNAVAILABLE_MESSAGES: Record<Exclude<AiUnavailableError['reason'], 'cap'>, string> = {
  disabled: 'AI is turned off',
  budget: "Today's AI budget for this space is used up",
  provider: 'AI is unavailable right now. Try again in a moment.',
};

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

/** The violated constraint name of a Postgres error, for the log only. */
function pgConstraint(error: unknown): string | undefined {
  const pg = pgError(error);
  return pg ? constraintOf(pg) : undefined;
}

/** The AppError for a 4xx status (null for anything else). */
function clientError(status: number, message: string): AppError | null {
  if (status === 401) return new AppError('unauthorized', 401, message);
  if (status === 403) return new AppError('forbidden', 403, message);
  if (status === 404) return new AppError('not_found', 404, message);
  if (status === 429) return new AppError('rate_limited', 429, message);
  if (status >= 400 && status < 500) return new AppError('bad_request', status, message);
  return null;
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

  // Fixed text per reason: error.message can carry the provider's own words (billing, model ids).
  // The detail stays in the log, which records the original error for 5xx.
  if (error instanceof AiUnavailableError) {
    return error.reason === 'cap'
      ? new AppError('rate_limited', 429, 'AI limit reached for now')
      : new AppError('ai_unavailable', 503, AI_UNAVAILABLE_MESSAGES[error.reason], {
          reason: error.reason,
        });
  }

  if (error instanceof APIError) {
    const status = error.statusCode;
    const message = error.body?.message ?? error.message;
    return clientError(status, message);
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

  // Other http-errors style failures: router's URIError for a bad %-escape in a path param
  // (status 400), body-parser `request.aborted`, and so on. Fixed text, never error.message.
  const status = (error as { status?: unknown; statusCode?: unknown } | null)?.status;
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
  const httpStatus = typeof status === 'number' ? status : statusCode;
  if (typeof httpStatus === 'number' && Number.isInteger(httpStatus)) {
    const mapped = clientError(httpStatus, 'Bad request');
    if (mapped) return mapped;
  }

  // Database safety net: services should prevent these, but never answer them with a 500.
  const pg = pgError(error);
  if (pg) {
    // The constraint name is schema detail: errorHandler logs it, the response leaves it out.
    switch (pg.code) {
      case '23505':
        return new AppError('conflict', 409, 'This already exists');
      case '23503':
        return new AppError('conflict', 409, 'A related item no longer exists');
      case '23514':
        return new AppError('validation_error', 400, 'A value is out of range');
      case '22P02':
        return new AppError('bad_request', 400, 'Malformed identifier');
      case '40001':
      case '40P01':
        return new AppError('conflict', 409, 'Busy, please retry');
      default:
        // Class 22 = data exception (integer out of range, bad date, value too long): the client
        // sent a value the column cannot hold.
        return typeof pg.code === 'string' && pg.code.startsWith('22')
          ? new AppError('validation_error', 400, 'A value is out of range')
          : null;
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
      const constraint = pgConstraint(error);
      if (appError.status >= 500) log.error({ err: error }, appError.message);
      else
        log.debug({ code: appError.code, status: appError.status, constraint }, appError.message);
      res.status(appError.status).json(appError.toBody());
      return;
    }
    log.error({ err: error }, 'unhandled error');
    res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong' } });
  };
}
