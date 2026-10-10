import { createClient } from 'redis';
import { env } from '../config/env.js';
import { logger as rootLogger } from './logger.js';

/**
 * Redis (REDIS_URL; Railway Redis in production) holds Better Auth's rate-limit counters
 * (auth/index.ts) and carries the notifications pub/sub (lib/pubsub.ts). It is optional: without
 * REDIS_URL (dev, tests) both stay in process. Sessions stay in Postgres.
 *
 * Nothing connects until first use. node-redis then reconnects by itself (backoff up to 2 s,
 * forever), so a Redis restart never crashes the API. Commands wait for the connection at most
 * COMMAND_TIMEOUT_MS, then fail: meanwhile rate limiting fails open and the bell falls back to
 * polling.
 */
const COMMAND_TIMEOUT_MS = 1_000;

function createRedis(url: string, connection: string) {
  const log = rootLogger.child({ module: 'redis', connection });
  const client = createClient({
    url,
    // Railway's private DNS (redis.railway.internal) may answer with IPv6 only: take either.
    socket: { family: 0 },
    commandOptions: { timeout: COMMAND_TIMEOUT_MS },
  });
  // One error per failed attempt: log the first of each outage, and the recovery.
  let down = false;
  client.on('error', (error) => {
    if (!down) log.warn({ err: error }, 'redis unreachable, reconnecting');
    down = true;
  });
  client.on('ready', () => {
    if (down) log.info('redis reconnected');
    down = false;
  });
  return client;
}

export type Redis = ReturnType<typeof createRedis>;

/** Commands: rate-limit counters and PUBLISH. null without REDIS_URL. */
export const redis: Redis | null = env.REDIS_URL ? createRedis(env.REDIS_URL, 'commands') : null;

/** SUBSCRIBE only (a subscribed connection runs nothing else). null without REDIS_URL. */
export const redisSubscriber: Redis | null = env.REDIS_URL
  ? createRedis(env.REDIS_URL, 'subscriber')
  : null;

/** `client`, connecting it in the background on first use (its commands wait for it, briefly). */
export function connected(client: Redis): Redis {
  // Connection failures reach the 'error' listener above; node-redis keeps retrying.
  if (!client.isOpen) client.connect().catch(() => {});
  return client;
}

/** Drops both connections (graceful shutdown, after the server and background work are done). */
export function closeRedis(): void {
  redis?.destroy();
  redisSubscriber?.destroy();
}
