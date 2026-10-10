import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { UnreadCount } from '@fellow-owners/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { type SignedIn, signInWithOtp, TEST_ORIGIN } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

let server: Server;
let base: string;
let owner: SignedIn;
let mira: TestSpace;

/** Opens GET /api/notifications/stream like EventSource would; read events with next(). */
async function open(who: SignedIn | null, query = '') {
  const abort = new AbortController();
  const res = await fetch(`${base}/api/notifications/stream${query}`, {
    headers: who ? { cookie: who.cookie } : {},
    signal: abort.signal,
  });
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  return {
    res,
    close: () => abort.abort(),
    /** The data of the next `unread` event; null when the stream ends first. */
    async next(): Promise<UnreadCount | null> {
      for (;;) {
        const end = buffer.indexOf('\n\n');
        if (end >= 0) {
          const block = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const data = block.match(/^event: unread\ndata: (.*)$/m);
          if (data?.[1]) return JSON.parse(data[1]) as UnreadCount;
          continue;
        }
        const chunk = await reader?.read();
        if (!chunk || chunk.done) return null;
        buffer += decoder.decode(chunk.value, { stream: true });
      }
    },
  };
}

function notifyOwner(subject: string) {
  return container.services.notifications.notify({
    userId: owner.userId,
    spaceId: mira.space.id,
    kind: 'reply_received',
    payload: { inboundId: crypto.randomUUID(), subject },
  });
}

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@stream.test', 'Mira Lane');
  mira = await factories.space({
    handle: 'mira',
    owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' },
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  container.controllers.notifications.closeStreams();
  const closed = new Promise((resolve) => server.close(resolve));
  // Sockets fetch opened but never used would hold close() until its 4 s idle timeout.
  server.closeAllConnections();
  await closed;
  await closeDb();
});

describe('GET /api/notifications/stream', () => {
  it('401 signed out', async () => {
    const stream = await open(null);
    expect(stream.res.status).toBe(401);
  });

  it('sends the unread count now and after each change, for the filtered space', async () => {
    const stream = await open(owner, '?space=mira');
    expect(stream.res.status).toBe(200);
    expect(stream.res.headers.get('content-type')).toMatch(/^text\/event-stream/);
    expect(stream.res.headers.get('cache-control')).toContain('no-transform');
    expect(stream.res.headers.get('x-accel-buffering')).toBe('no');
    expect(await stream.next()).toEqual({ unread: 0 });

    // A burst coalesces into one recount.
    await notifyOwner('First');
    await notifyOwner('Second');
    expect(await stream.next()).toEqual({ unread: 2 });

    await request(app)
      .post('/api/notifications/read')
      .set('Cookie', owner.cookie)
      .set('Origin', TEST_ORIGIN)
      .send({ space: 'mira' })
      .expect(200);
    expect(await stream.next()).toEqual({ unread: 0 });
    stream.close();
  });

  it('caps open streams per user and frees a slot when one closes', async () => {
    const streams = await Promise.all(Array.from({ length: 5 }, () => open(owner)));
    for (const stream of streams) expect(await stream.next()).toEqual({ unread: 0 });
    expect((await open(owner)).res.status).toBe(429);

    streams[0]?.close();
    // The server sees the disconnect on its next tick.
    let sixth = await open(owner);
    for (let i = 0; i < 20 && sixth.res.status === 429; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      sixth = await open(owner);
    }
    expect(sixth.res.status).toBe(200);
    for (const stream of [...streams, sixth]) stream.close();
  });

  it('closeStreams() ends open streams (graceful shutdown)', async () => {
    const stream = await open(owner);
    expect(await stream.next()).toEqual({ unread: 0 });
    container.controllers.notifications.closeStreams();
    expect(await stream.next()).toBeNull();
  });
});
