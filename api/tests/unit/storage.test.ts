import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createStorage } from '../../src/lib/storage.js';

const env = {
  UPLOADS_ENABLED: true,
  BUCKET_ENDPOINT: 'https://t3.storageapi.dev',
  BUCKET_REGION: 'auto',
  BUCKET_NAME: 'media-test',
  BUCKET_ACCESS_KEY_ID: 'AKIATEST',
  BUCKET_SECRET_ACCESS_KEY: 'secret',
};

describe('createStorage', () => {
  it('signs the content type and length into the PUT, virtual-hosted style', async () => {
    const storage = createStorage(env);
    const { url, headers } = await storage.presignPut('avatar/u1/a.png', 'image/png', 1234);
    const parsed = new URL(url);
    expect(parsed.hostname).toBe('media-test.t3.storageapi.dev');
    expect(parsed.pathname).toBe('/avatar/u1/a.png');
    const signed = parsed.searchParams.get('X-Amz-SignedHeaders') ?? '';
    expect(signed).toContain('content-type');
    expect(signed).toContain('content-length');
    expect(headers).toEqual({ 'Content-Type': 'image/png' });
  });

  it('presigns a GET', async () => {
    const url = await createStorage(env).presignGet('avatar/u1/a.png');
    expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('3600');
  });

  it('is disabled without a bucket and never touches the network', async () => {
    const storage = createStorage({ ...env, UPLOADS_ENABLED: false, BUCKET_NAME: undefined });
    expect(storage.enabled).toBe(false);
    await expect(storage.presignGet('avatar/u1/a.png')).rejects.toThrow();
  });
});

describe('createStorage against a real HTTP endpoint', () => {
  let server: Server | undefined;
  afterEach(() => {
    server?.closeAllConnections();
    server?.close();
  });

  /** A local "bucket" (an IP endpoint, so the SDK uses path style); returns its endpoint. */
  async function bucket(handler: Parameters<typeof createServer>[1]): Promise<string> {
    server = createServer(handler);
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  it('gives up on a bucket that never answers instead of hanging', async () => {
    // Accepts the request and never responds.
    const endpoint = await bucket(() => {});
    const storage = createStorage(
      { ...env, BUCKET_ENDPOINT: endpoint },
      { connectionTimeout: 200, requestTimeout: 200 },
    );
    const started = Date.now();
    await expect(storage.readStart('avatar/u1/a.png', 16)).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(5_000);
  }, 10_000);

  it('listBefore keeps only objects modified before the cutoff', async () => {
    const endpoint = await bucket((_req, res) => {
      res.setHeader('Content-Type', 'application/xml');
      res.end(`<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>media-test</Name><Prefix>avatar/</Prefix><KeyCount>2</KeyCount><IsTruncated>false</IsTruncated>
  <Contents><Key>avatar/u1/old.png</Key><LastModified>2026-10-01T00:00:00.000Z</LastModified><Size>10</Size></Contents>
  <Contents><Key>avatar/u1/new.png</Key><LastModified>2026-10-11T00:00:00.000Z</LastModified><Size>10</Size></Contents>
</ListBucketResult>`);
    });
    const storage = createStorage({ ...env, BUCKET_ENDPOINT: endpoint });
    expect(await storage.listBefore('avatar/', new Date('2026-10-10T00:00:00Z'))).toEqual([
      'avatar/u1/old.png',
    ]);
  });
});
