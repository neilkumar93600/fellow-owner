import { describe, expect, it } from 'vitest';
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
