import {
  markNotificationsReadSchema,
  notificationsQuerySchema,
  unreadNotificationsQuerySchema,
} from '@fellow-owners/shared';
import type { Request, Response } from 'express';
import { rateLimited } from '../lib/errors.js';
import { userIdOf } from '../middlewares/require-session.js';
import { bodyOf, queryOf } from '../middlewares/validate.js';
import type { NotificationsService } from '../services/notifications.service.js';

/** Open unread streams one user may hold in this process (tabs); more answer 429. */
const MAX_STREAMS_PER_USER = 5;
/** A comment line this often keeps proxies from closing an idle stream (Railway: 5 min idle). */
const HEARTBEAT_MS = 25_000;
/** EventSource's reconnect delay: soon while live, the bell's old polling pace while not. */
const RETRY_LIVE_MS = 5_000;
const RETRY_POLL_MS = 30_000;

/** /api/notifications/*: the signed-in user's own notifications, in any space. */
export function createNotificationsController(deps: { notifications: NotificationsService }) {
  /** userId -> open streams, for the per-user cap and for closeStreams(). */
  const streams = new Map<string, Set<Response>>();

  return {
    /** GET / -> NotificationsPage */
    async list(req: Request, res: Response): Promise<void> {
      res.json(
        await deps.notifications.list(userIdOf(req), queryOf(req, notificationsQuerySchema)),
      );
    },

    /** GET /unread -> UnreadCount */
    async unread(req: Request, res: Response): Promise<void> {
      const { space } = queryOf(req, unreadNotificationsQuerySchema);
      res.json(await deps.notifications.unreadCount(userIdOf(req), space));
    },

    /**
     * GET /stream -> Server-Sent Events: `unread` events (UnreadCount data), the count now and
     * after every change, plus a heartbeat comment. While live delivery is down (Redis
     * unreachable) it sends the count and ends with a 30 s retry, so EventSource polls instead.
     */
    async stream(req: Request, res: Response): Promise<void> {
      const userId = userIdOf(req);
      const { space } = queryOf(req, unreadNotificationsQuerySchema);
      const open = streams.get(userId) ?? new Set<Response>();
      if (open.size >= MAX_STREAMS_PER_USER) {
        throw rateLimited('Too many open notification streams');
      }
      open.add(res);
      streams.set(userId, open);

      const live = deps.notifications.isLive();
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'private, no-cache, no-transform',
        // Nginx-style proxies: pass events through unbuffered.
        'X-Accel-Buffering': 'no',
        // The socket closes with the stream, so ending streams lets shutdown finish at once.
        Connection: 'close',
      });
      res.flushHeaders();
      // Never after the end: a late write would emit an unhandled 'error' on the response.
      const write = (chunk: string) => {
        if (!res.writableEnded && !res.destroyed) res.write(chunk);
      };
      write(`retry: ${live ? RETRY_LIVE_MS : RETRY_POLL_MS}\n\n`);

      let closed = false;
      let stop = () => {};
      const heartbeat = setInterval(() => {
        if (deps.notifications.isLive()) write(': ping\n\n');
        else res.end();
      }, HEARTBEAT_MS);
      res.on('close', () => {
        closed = true;
        clearInterval(heartbeat);
        stop();
        open.delete(res);
        if (open.size === 0) streams.delete(userId);
      });

      try {
        stop = await deps.notifications.watchUnread(userId, space, (count) =>
          write(`event: unread\ndata: ${JSON.stringify(count)}\n\n`),
        );
      } catch (error) {
        // Headers are out: end the stream and let EventSource retry.
        req.log.error({ err: error }, 'notification stream failed');
        res.end();
        return;
      }
      if (closed) stop();
      else if (!live) res.end();
    },

    /** POST /read -> UnreadCount */
    async markRead(req: Request, res: Response): Promise<void> {
      res.json(
        await deps.notifications.markRead(userIdOf(req), bodyOf(req, markNotificationsReadSchema)),
      );
    },

    /** Ends every open stream (graceful shutdown): clients reconnect to the next process. */
    closeStreams(): void {
      for (const open of streams.values()) for (const res of open) res.end();
    },
  };
}

export type NotificationsController = ReturnType<typeof createNotificationsController>;
