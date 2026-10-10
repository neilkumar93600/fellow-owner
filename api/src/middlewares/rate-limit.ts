import type { Request, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { rateLimited } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { connected, redis as defaultRedis, type Redis } from '../lib/redis.js';
import { safeEqual } from './cron-auth.js';

export interface RateLimitOptions {
  /** Counter namespace, e.g. 'public' or 'support'. Keys are `rl:<name>:<key>:<window>`. */
  name: string;
  windowSeconds: number;
  /** Requests allowed per key per window. */
  max: number;
  /** Who is counted. Defaults to the client IP (`req.clientIp`, lib/client-ip.ts). */
  key?: (req: Request) => string;
  /** Defaults to the process Redis (lib/redis.ts); null forces the in-process store. */
  redis?: Redis | null;
  /**
   * Requests whose `x-internal-key` header equals it skip the limit (`x-edge-key` never does) (the web server's own reads,
   * which all come from Vercel IPs). Defaults to env.INTERNAL_API_KEY; null turns it off.
   */
  internalKey?: string | null;
}

/**
 * ponytail: memory windows are per process (createRateLimit and withinCap share the map);
 * Redis shares them across replicas when set.
 */
const memory = new Map<string, { count: number; resetAt: number }>();

function countInMemory(id: string, windowMs: number, now: number) {
  if (memory.size > 50_000) {
    for (const [key, entry] of memory) if (entry.resetAt <= now) memory.delete(key);
  }
  let entry = memory.get(id);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    memory.set(id, entry);
  }
  entry.count += 1;
  return { count: entry.count, resetAt: entry.resetAt };
}

export interface CapOptions {
  /** Counter namespace, e.g. 'support-ack'. Keys are `cap:<name>:<key>`. */
  name: string;
  /** Who or what is counted: an address, a space id, or 'all' for a global cap. */
  key: string;
  /** The window starts at the first hit and lasts this long. */
  windowSeconds: number;
  max: number;
  /** Defaults to the process Redis; null forces the in-process store. */
  redis?: Redis | null;
}

/**
 * Counts one hit and says whether it is still within `max` for the window: the IP-independent
 * caps on email and row-creating endpoints (a caller can rotate IPs). Redis
 * (SET NX EX, then INCR, so the key always has its expiry) when available; the same in-process
 * store as createRateLimit otherwise, or when Redis errors.
 */
export async function withinCap(options: CapOptions): Promise<boolean> {
  const client = options.redis === undefined ? defaultRedis : options.redis;
  const id = `cap:${options.name}:${options.key}`;
  if (client) {
    try {
      const redisClient = connected(client);
      await redisClient.set(id, '0', {
        condition: 'NX',
        expiration: { type: 'EX', value: options.windowSeconds },
      });
      return (await redisClient.incr(id)) <= options.max;
    } catch (error) {
      logger.warn({ err: error, cap: options.name }, 'cap: redis failed, counting in memory');
    }
  }
  return countInMemory(id, options.windowSeconds * 1000, Date.now()).count <= options.max;
}

/** Middleware form of withinCap: 429 rate_limited once the cap is used up (no internal skip). */
export function createCap(
  options: Omit<CapOptions, 'key'> & { key: (req: Request) => string },
): RequestHandler {
  return async (req, _res, next) => {
    if (!(await withinCap({ ...options, key: options.key(req) }))) throw rateLimited();
    next();
  };
}

/**
 * Fixed-window rate limit: INCR + EXPIRE on Redis when available, an in-process Map otherwise
 * (or when Redis errors: the limit keeps working per process instead of failing open).
 * Sets `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (seconds); over the limit it
 * also sets `Retry-After` and throws 429 rate_limited. Internal requests (see `internalKey`) skip it.
 */
export function createRateLimit(options: RateLimitOptions): RequestHandler {
  const { name, windowSeconds, max } = options;
  const keyOf = options.key ?? ((req: Request) => req.clientIp);
  const client = options.redis === undefined ? defaultRedis : options.redis;
  const windowMs = windowSeconds * 1000;
  const internalKey =
    options.internalKey === undefined ? env.INTERNAL_API_KEY : options.internalKey;

  return async (req, res, next) => {
    const given = internalKey ? req.get('x-internal-key') : undefined;
    if (internalKey && given && safeEqual(given, internalKey)) {
      next();
      return;
    }
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const id = `rl:${name}:${keyOf(req)}`;
    let hit: { count: number; resetAt: number } | null = null;
    if (client) {
      try {
        const key = `${id}:${windowStart}`;
        const count = await connected(client).incr(key);
        if (count === 1) await client.expire(key, windowSeconds + 1);
        hit = { count, resetAt: windowStart + windowMs };
      } catch (error) {
        logger.warn({ err: error, limiter: name }, 'rate limit: redis failed, counting in memory');
      }
    }
    hit ??= countInMemory(id, windowMs, now);

    const resetSeconds = Math.max(1, Math.ceil((hit.resetAt - now) / 1000));
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - hit.count)));
    res.set('RateLimit-Reset', String(resetSeconds));
    if (hit.count > max) {
      res.set('Retry-After', String(resetSeconds));
      throw rateLimited();
    }
    next();
  };
}
