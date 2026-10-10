import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { signInWithOtp } from '../helpers/auth.js';
import { closeDb } from '../helpers/test-db.js';

describe('POST /api/admin/demo-reset', () => {
  afterAll(async () => {
    await closeDb();
  });

  it('is 401 signed out, 403 for a non-admin and 202 for an admin who runs the reset', async () => {
    const reset = vi.fn(async () => ({}));
    const app = createApp(
      buildContainer({
        env: { ...env, ADMIN_EMAILS: ['admin-f11@example.com'] },
        jobs: { demo_reset: reset },
      }),
    );
    await request(app).post('/api/admin/demo-reset').expect(401);

    const user = await signInWithOtp(app, 'plain-f11@example.com');
    await request(app).post('/api/admin/demo-reset').set('Cookie', user.cookie).expect(403);
    expect(reset).not.toHaveBeenCalled();

    const admin = await signInWithOtp(app, 'admin-f11@example.com');
    await request(app).post('/api/admin/demo-reset').set('Cookie', admin.cookie).expect(202);
    await vi.waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
  });
});
