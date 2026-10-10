import { EventEmitter } from 'node:events';
import type { Logger } from './logger.js';
import { connected, type Redis } from './redis.js';

/** Someone's notifications changed: one arrived, or some were read (spaceId null: several spaces). */
export interface NotificationEvent {
  userId: string;
  spaceId: string | null;
}

/** Notification changes, from the services that make them to the open bell streams. */
export interface PubSub {
  /** False while delivery is down (Redis unreachable): streams then send clients back to polling. */
  readonly ready: boolean;
  /** Reaches every subscriber in every API process. */
  publish(event: NotificationEvent): Promise<void>;
  /** Calls `listener` for every event; returns the unsubscribe function. */
  subscribe(listener: (event: NotificationEvent) => void): () => void;
}

const CHANNEL = 'notifications';

/** One process (dev, tests, Vercel): an EventEmitter. */
export function createMemoryPubSub(): PubSub {
  const local = new EventEmitter().setMaxListeners(0);
  return {
    ready: true,
    async publish(event) {
      local.emit(CHANNEL, event);
    },
    subscribe(listener) {
      local.on(CHANNEL, listener);
      return () => local.off(CHANNEL, listener);
    },
  };
}

/**
 * Every replica: PUBLISH on the command connection; one SUBSCRIBE per process, made on the first
 * subscribe() and fanned out to the open streams in process. node-redis re-subscribes after a
 * reconnect; events published while Redis was away are lost (the bell refetches on focus).
 * ponytail: the first stream of a process may miss events in the few ms before its SUBSCRIBE
 * lands; await the subscription in subscribe() if that ever matters.
 */
export function createRedisPubSub(redis: Redis, subscriber: Redis, logger: Logger): PubSub {
  const log = logger.child({ module: 'pubsub' });
  const local = new EventEmitter().setMaxListeners(0);
  let up = true;
  subscriber
    .on('error', () => {
      up = false;
    })
    .on('ready', () => {
      up = true;
    });

  // SUBSCRIBE waits in the offline queue until the subscriber is connected.
  let subscribed = false;
  const start = () => {
    if (subscribed) return;
    subscribed = true;
    connected(subscriber)
      .subscribe(CHANNEL, (message) => {
        try {
          local.emit(CHANNEL, JSON.parse(message) as NotificationEvent);
        } catch (error) {
          log.error({ err: error }, 'notification event dropped');
        }
      })
      .catch((error: unknown) => {
        subscribed = false;
        log.error({ err: error }, 'notifications subscribe failed');
      });
  };

  return {
    get ready() {
      return up;
    },
    async publish(event) {
      await connected(redis).publish(CHANNEL, JSON.stringify(event));
    },
    subscribe(listener) {
      start();
      local.on(CHANNEL, listener);
      return () => local.off(CHANNEL, listener);
    },
  };
}
