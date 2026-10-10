import { isIP } from 'node:net';
import type { Request } from 'express';
import type { Env } from '../config/env.js';
import { safeEqual } from '../middlewares/cron-auth.js';

/** First comma-separated entry of a header, when it is an IP address. */
function firstIp(value: string | undefined): string | undefined {
  const first = value?.split(',')[0]?.trim();
  return first && isIP(first) ? first : undefined;
}

/**
 * The caller's IP for limits, visitor hashes and logs. Browsers reach the API through the web's
 * rewrite, so Railway's X-Real-IP (set by its edge, not forgeable) is a Vercel IP for them; the
 * web proxy (web/proxy.ts) adds `x-edge-key` = INTERNAL_API_KEY, and only then is the client
 * Vercel put in X-Forwarded-For trusted. Anyone else gets X-Real-IP, then the socket address:
 * a forged X-Forwarded-For without the key changes nothing.
 */
export function clientIp(req: Request, env: Pick<Env, 'INTERNAL_API_KEY'>): string {
  const key = env.INTERNAL_API_KEY;
  const given = req.get('x-edge-key');
  if (key && given && safeEqual(given, key)) {
    const forwarded =
      firstIp(req.get('x-forwarded-for')) ??
      firstIp(req.get('x-vercel-forwarded-for')) ??
      firstIp(req.get('x-real-ip'));
    if (forwarded) return forwarded;
  }
  return firstIp(req.get('x-real-ip')) ?? req.socket.remoteAddress ?? 'unknown';
}
