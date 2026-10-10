import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

/**
 * Wave 0 scaffolding: every router added for the backend completion is mounted and answers 501
 * until its feature lands. Each Wave 1 agent replaces its own rows here with real tests.
 * Valid inputs are sent, so these also pin the guards (session / owner) and the validators.
 */

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
interface Case {
  router: string;
  method: Method;
  path: (handle: string) => string;
  body?: Record<string, unknown>;
  auth: boolean;
}

const id = randomUUID();
const other = randomUUID();

const CASES: Case[] = [
  { router: 'config', method: 'get', path: () => '/api/config', auth: false },
  {
    router: 'support',
    method: 'post',
    path: () => '/api/support/requests',
    body: { kind: 'contact', email: 'fan@example.com', message: 'Hello, a question about data.' },
    auth: false,
  },
  { router: 'admin', method: 'post', path: () => '/api/admin/demo-reset', auth: true },
  {
    router: 'email',
    method: 'get',
    path: () => '/api/email/unsubscribe?token=0123456789abcdef',
    auth: false,
  },
  { router: 'account', method: 'get', path: () => '/api/me/export', auth: true },
  {
    router: 'notification-prefs',
    method: 'get',
    path: () => '/api/me/notification-prefs',
    auth: true,
  },
  {
    router: 'notification-prefs',
    method: 'put',
    path: () => '/api/me/notification-prefs',
    body: { emailEnabled: true, kinds: { reply_received: false } },
    auth: true,
  },
  { router: 'media', method: 'get', path: () => '/api/media/avatar/u1/a.png', auth: false },
  {
    router: 'uploads',
    method: 'post',
    path: () => '/api/uploads/presign',
    body: { kind: 'avatar', contentType: 'image/png', size: 1000 },
    auth: true,
  },
  {
    router: 'coach',
    method: 'post',
    path: (h) => `/api/spaces/${h}/coach`,
    body: { kind: 'pitch', subject: 'A collab', body: 'A short but clear pitch about a collab.' },
    auth: true,
  },
  { router: 'visit', method: 'post', path: (h) => `/api/spaces/${h}/visit`, auth: false },
  { router: 'moderation member', method: 'delete', path: (h) => `/api/spaces/${h}/me`, auth: true },
  {
    router: 'moderation target',
    method: 'post',
    path: () => `/api/posts/${id}/report`,
    body: { reason: 'spam' },
    auth: true,
  },
  {
    router: 'moderation target',
    method: 'post',
    path: () => `/api/comments/${id}/report`,
    body: { reason: 'harassment', note: 'Rude' },
    auth: true,
  },
  { router: 'similar', method: 'get', path: () => `/api/posts/${id}/similar`, auth: true },
  { router: 'similar', method: 'get', path: () => `/api/studio/posts/${id}/similar`, auth: true },
  { router: 'moderation studio', method: 'get', path: () => '/api/studio/reports', auth: true },
  {
    router: 'moderation studio',
    method: 'patch',
    path: () => `/api/studio/reports/${id}`,
    body: { action: 'resolve' },
    auth: true,
  },
  {
    router: 'moderation studio',
    method: 'patch',
    path: () => `/api/studio/posts/${id}/comments/${other}`,
    body: { action: 'hide' },
    auth: true,
  },
  {
    router: 'question-groups',
    method: 'get',
    path: () => '/api/studio/question-groups',
    auth: true,
  },
  {
    router: 'question-groups',
    method: 'post',
    path: () => `/api/studio/question-groups/${id}/answer`,
    body: { answer: 'Here is my answer.', replyAll: true },
    auth: true,
  },
  {
    router: 'question-groups',
    method: 'post',
    path: () => `/api/studio/question-groups/${id}/redraft`,
    auth: true,
  },
  {
    router: 'question-groups',
    method: 'post',
    path: () => `/api/studio/question-groups/${id}/dismiss`,
    auth: true,
  },
  {
    router: 'question-groups',
    method: 'delete',
    path: () => `/api/studio/question-groups/${id}/askers/${other}`,
    auth: true,
  },
  {
    router: 'ask',
    method: 'post',
    path: () => '/api/studio/ask',
    body: { question: 'What do my fans ask about most?' },
    auth: true,
  },
  {
    router: 'snoozes',
    method: 'post',
    path: () => '/api/studio/snoozes',
    body: { refType: 'pitch', refId: id },
    auth: true,
  },
  {
    router: 'snoozes',
    method: 'delete',
    path: () => `/api/studio/snoozes/post/${id}`,
    auth: true,
  },
  {
    router: 'checklist',
    method: 'post',
    path: () => '/api/studio/checklist',
    body: { step: 'bio_link_shared' },
    auth: true,
  },
  { router: 'metrics', method: 'get', path: () => '/api/studio/metrics?days=7', auth: true },
];

describe('backend-completion scaffolding', () => {
  let s: TestSpace;
  let owner: SignedIn;

  beforeAll(async () => {
    await resetDatabase();
    s = await factories.space();
    owner = await signInWithOtp(app, s.owner.email, s.owner.name);
  });

  afterAll(closeDb);

  it.each(CASES)('$router: $method $path answers 501', async (c) => {
    let req = request(app)[c.method](c.path(s.space.handle));
    if (c.auth) req = req.set('Cookie', owner.cookie);
    if (c.body) req = req.send(c.body);
    const res = await req;
    expect(res.status, JSON.stringify(res.body)).toBe(501);
  });

  it('keeps the guards: signed out gets 401 on session and owner routes', async () => {
    await request(app).get('/api/studio/question-groups').expect(401);
    await request(app).get('/api/me/export').expect(401);
    await request(app).post(`/api/posts/${id}/report`).send({ reason: 'spam' }).expect(401);
    await request(app).get('/api/studio/reports').expect(401);
  });

  it('validates input before the stub: a GIF upload is a 400', async () => {
    const res = await request(app)
      .post('/api/uploads/presign')
      .set('Cookie', owner.cookie)
      .send({ kind: 'avatar', contentType: 'image/gif', size: 1000 });
    expect(res.status).toBe(400);
  });

  it('does not shadow the existing routers that share a prefix', async () => {
    await request(app)
      .get(`/api/spaces/${s.space.handle}/me`)
      .set('Cookie', owner.cookie)
      .expect(200);
    await request(app).get(`/api/spaces/${s.space.handle}`).expect(200);
    await request(app).get('/api/studio/space').set('Cookie', owner.cookie).expect(200);
    await request(app).get('/api/health').expect(200);
  });

  it('wires every scheduled job', () => {
    expect(Object.keys(container.jobs).sort()).toEqual(
      [
        'close_challenges',
        'community_digests',
        'demo_reset',
        'email_digests',
        'group_questions',
        'purge',
        'refresh_followers',
        'sweep',
      ].sort(),
    );
  });
});
