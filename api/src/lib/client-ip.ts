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
 * One key per client network: IPv4-mapped IPv6 becomes IPv4, any other IPv6 is masked to its /64
 * (`2001:db8:1:2::`, still a valid IP for Better Auth). A single home or phone gets a whole /64,
 * so keying on the full address would hand it unlimited rate-limit buckets.
 */
export function normalizeIp(ip: string): string {
  if (isIP(ip) !== 6) return ip;
  let address = (ip.split('%')[0] ?? ip).toLowerCase();
  const v4 = address.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number) as [number, number, number, number];
    address = `${address.slice(0, v4.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head = '', tail] = address.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups =
    tail === undefined
      ? left
      : [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right];
  const n = groups.map((g) => Number.parseInt(g, 16));
  const [g5 = 0, g6 = 0, g7 = 0] = n.slice(5);
  if (n.slice(0, 5).every((g) => g === 0) && g5 === 0xffff) {
    return `${g6 >> 8}.${g6 & 255}.${g7 >> 8}.${g7 & 255}`;
  }
  return `${n
    .slice(0, 4)
    .map((g) => g.toString(16))
    .join(':')}::`;
}

/**
 * The caller's IP (normalizeIp) for limits, visitor hashes and logs. Browsers reach the API
 * through the web's rewrite, so Railway's X-Real-IP (set by its edge, not forgeable) is a Vercel
 * IP for them; the web proxy (web/proxy.ts) adds `x-edge-key` = INTERNAL_API_KEY, and only then is the client
 * Vercel put in X-Forwarded-For trusted. Anyone else gets X-Real-IP, then the socket address:
 * a forged X-Forwarded-For without the key changes nothing.
 */
export function clientIp(req: Request, env: Pick<Env, 'INTERNAL_API_KEY'>): string {
  const key = env.INTERNAL_API_KEY;
  const given = req.get('x-edge-key');
  if (key && given && safeEqual(given, key)) {
    // x-edge-client-ip is what web/proxy.ts read from Vercel's own client headers; Railway rewrites
    // X-Forwarded-For on the way in, so that one can already be Vercel's IP.
    const forwarded =
      firstIp(req.get('x-edge-client-ip')) ??
      firstIp(req.get('x-vercel-forwarded-for')) ??
      firstIp(req.get('x-forwarded-for')) ??
      firstIp(req.get('x-real-ip'));
    if (forwarded) return normalizeIp(forwarded);
  }
  return normalizeIp(firstIp(req.get('x-real-ip')) ?? req.socket.remoteAddress ?? 'unknown');
}
