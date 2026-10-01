import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { unauthorized } from '../lib/errors.js';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Cron endpoints: `Authorization: Bearer ${CRON_SECRET}` (what Vercel Cron sends).
 * Note: Vercel Cron calls the path with GET, so cron routes accept GET and POST.
 */
export function cronAuth(secret: string): RequestHandler {
  const expected = `Bearer ${secret}`;
  return (req, _res, next) => {
    const header = req.get('authorization') ?? '';
    if (!secret || !safeEqual(header, expected)) throw unauthorized('Invalid cron credentials');
    next();
  };
}
