import { createHmac } from 'node:crypto';
import type { RequestHandler } from 'express';
import { unauthorized } from '../lib/errors.js';
import { safeEqual } from './cron-auth.js';

export interface SignatureOptions {
  /** Request header carrying the signature, e.g. x-hub-signature-256. */
  header: string;
  /** The shared secret; read per request so tests can swap env. No secret: every call is 401. */
  secret: () => string | undefined;
  /** Text before the hex digest in the header, e.g. 'sha256=' for Meta. */
  prefix?: string;
}

/** `prefix` + hex HMAC-SHA256 of `body` with `secret`: what a sender puts in the header. */
export function signBody(secret: string, body: Buffer | string, prefix = ''): string {
  return `${prefix}${createHmac('sha256', secret).update(body).digest('hex')}`;
}

/**
 * Webhooks (POST /api/inbound/email, POST /api/webhooks/instagram): the header must be the HMAC of
 * the exact body bytes (req.rawBody, kept by create-app.ts), compared in constant time. 401
 * otherwise. Run it before validate(), so an unsigned body is never parsed into anything.
 */
export function requireSignature(options: SignatureOptions): RequestHandler {
  return (req, _res, next) => {
    const secret = options.secret();
    const given = req.get(options.header) ?? '';
    if (!secret || !req.rawBody || !given) throw unauthorized('Invalid signature');
    if (!safeEqual(given.trim().toLowerCase(), signBody(secret, req.rawBody, options.prefix))) {
      throw unauthorized('Invalid signature');
    }
    next();
  };
}
