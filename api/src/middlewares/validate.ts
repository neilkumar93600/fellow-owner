import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';
import { validationError } from '../lib/errors.js';

export type RequestPart = 'body' | 'params' | 'query';

export interface ValidationIssue {
  location: RequestPart;
  /** zod issue path inside that part, e.g. ['links', 0, 'url']. */
  path: Array<string | number>;
  message: string;
  code: string;
}

export interface ValidateSchemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

/**
 * Validates request parts with the shared zod schemas (use them as-is).
 * - body   -> parsed value replaces `req.body`
 * - params -> parsed value replaces `req.params`
 * - query  -> parsed value goes to `req.validatedQuery` (Express 5 `req.query` is a getter);
 *             read it with `queryOf(req, schema)`
 * Fails with 400 validation_error; `details` is ValidationIssue[] across all parts.
 *
 * Use it inline in the route definition (router.get(path, validate(...), handler)), not with
 * router.use: Express resets req.params between router layers.
 */
export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req, _res, next) => {
    const issues: ValidationIssue[] = [];

    const run = (location: RequestPart, schema: z.ZodType | undefined, value: unknown) => {
      if (!schema) return { ok: false as const };
      const result = schema.safeParse(value);
      if (result.success) return { ok: true as const, data: result.data };
      for (const issue of result.error.issues) {
        issues.push({
          location,
          path: issue.path.map((key) => (typeof key === 'number' ? key : String(key))),
          message: issue.message,
          code: issue.code,
        });
      }
      return { ok: false as const };
    };

    const params = run('params', schemas.params, req.params);
    const query = run('query', schemas.query, req.query);
    const body = run('body', schemas.body, req.body ?? {});

    if (issues.length > 0) {
      next(validationError(issues));
      return;
    }
    if (params.ok) req.params = params.data as Request['params'];
    if (query.ok) req.validatedQuery = query.data;
    if (body.ok) req.body = body.data;
    next();
  };
}

/** The query parsed by validate({ query: schema }), typed by that schema. */
export function queryOf<S extends z.ZodType>(req: Request, _schema: S): z.output<S> {
  return req.validatedQuery as z.output<S>;
}

/** `req.params` typed by the schema passed to validate({ params }). */
export function paramsOf<S extends z.ZodType>(req: Request, _schema: S): z.output<S> {
  return req.params as z.output<S>;
}

/** `req.body` typed by the schema passed to validate({ body }). */
export function bodyOf<S extends z.ZodType>(req: Request, _schema: S): z.output<S> {
  return req.body as z.output<S>;
}
