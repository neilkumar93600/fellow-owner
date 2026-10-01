import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

/** Fallback for unmatched routes: 404 `{ error: { code: 'not_found', ... } }`. */
export function notFoundHandler(): RequestHandler {
  return (req, _res, next) => {
    next(new AppError('not_found', 404, `No route for ${req.method} ${req.path}`));
  };
}
