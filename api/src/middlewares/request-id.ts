import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from '../lib/logger.js';

const INCOMING_ID = /^[A-Za-z0-9._:-]{8,128}$/;

/**
 * First middleware: assigns `req.requestId` (incoming `x-request-id` when well-formed, else a
 * UUID), echoes it in the response, binds `req.log` and initializes the fields later guards fill.
 */
export function requestId(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const incoming = req.get('x-request-id');
    const id = incoming && INCOMING_ID.test(incoming) ? incoming : randomUUID();
    req.requestId = id;
    req.log = logger.child({ reqId: id });
    req.session = null;
    req.space = null;
    req.membership = null;
    req.validatedQuery = undefined;
    res.setHeader('x-request-id', id);
    next();
  };
}

/** One log line per request when the response finishes (method, path, status, duration). */
export function requestLogger(): RequestHandler {
  return (req, res, next) => {
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
      const entry = {
        method: req.method,
        // Path only: query strings can carry search text.
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        ms,
        userId: req.session?.user.id,
      };
      if (res.statusCode >= 500) req.log.error(entry, 'request failed');
      else req.log.info(entry, 'request');
    });
    next();
  };
}
