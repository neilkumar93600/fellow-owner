import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { closeDb } from '../helpers/test-db.js';

afterAll(async () => {
  await closeDb();
});

describe('GET /api/config', () => {
  it('reports what this deployment offers, cacheable for 5 minutes', async () => {
    const app = createApp(buildContainer());
    const res = await request(app).get('/api/config').expect(200);
    expect(res.body).toEqual({
      providers: { google: false, apple: false, facebook: false },
      demoEnabled: true,
      uploads: false,
      youtubeImport: false,
    });
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('follows the env', async () => {
    const app = createApp(
      buildContainer({
        env: {
          ...env,
          GOOGLE_ENABLED: true,
          FACEBOOK_ENABLED: true,
          DEMO_ENABLED: false,
          UPLOADS_ENABLED: true,
          YOUTUBE_ENABLED: true,
        },
      }),
    );
    const res = await request(app).get('/api/config').expect(200);
    expect(res.body).toEqual({
      providers: { google: true, apple: false, facebook: true },
      demoEnabled: false,
      uploads: true,
      youtubeImport: true,
    });
  });
});
