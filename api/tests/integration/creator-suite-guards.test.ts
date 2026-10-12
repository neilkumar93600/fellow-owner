import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { signBody } from '../../src/middlewares/webhook-signature.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

// The creator-suite routes (migration 0010) and their guards. Written to stay true once Wave B
// replaces the 501 stubs: it checks who gets through, not what the features answer.

const offEnv = {
  ...env,
  INBOUND_EMAIL_ENABLED: false,
  INBOUND_EMAIL_DOMAIN: undefined,
  INBOUND_EMAIL_SECRET: undefined,
  INSTAGRAM_ENABLED: false,
  META_APP_ID: undefined,
  META_APP_SECRET: undefined,
  META_VERIFY_TOKEN: undefined,
};
const off = buildContainer({ env: offEnv });
const app = createApp(off);

const EMAIL_SECRET = 'inbound-email-secret-0123456789-abcdef';
const META_SECRET = 'meta-app-secret-0123456789';
const on = buildContainer({
  env: {
    ...offEnv,
    INBOUND_EMAIL_ENABLED: true,
    INBOUND_EMAIL_DOMAIN: 'in.example.com',
    INBOUND_EMAIL_SECRET: EMAIL_SECRET,
    INSTAGRAM_ENABLED: true,
    META_APP_ID: '123',
    META_APP_SECRET: META_SECRET,
    META_VERIFY_TOKEN: 'verify-me',
  },
});
const onApp = createApp(on);
const factories = createFactories(off);

const ID = '2f1c7a52-8f3e-4b8a-9c41-0d6a2b9e1f30';
const FROM = '2026-10-01T00:00:00Z';
const TO = '2026-11-01T00:00:00Z';

let owner: SignedIn;
let space: TestSpace;
let otherOwner: SignedIn;
let fan: SignedIn;
let postId: string;

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
interface Route {
  method: Method;
  path: (handle: string) => string;
  body?: Record<string, unknown>;
}

/** Owner routes keyed by :handle; `body` is valid, so the owner always gets past validation. */
const OWNER_ROUTES: Route[] = [
  { method: 'get', path: (h) => `/api/spaces/${h}/performance?days=30&tz=America/Los_Angeles` },
  { method: 'get', path: (h) => `/api/spaces/${h}/performance/posts?sort=views` },
  { method: 'get', path: (h) => `/api/spaces/${h}/profile-score` },
  { method: 'get', path: (h) => `/api/spaces/${h}/planner?from=${FROM}&to=${TO}` },
  {
    method: 'post',
    path: (h) => `/api/spaces/${h}/planner/items`,
    body: { title: 'Lisbon reel', platforms: ['instagram'], scheduledAt: '2026-10-20T16:00:00Z' },
  },
  {
    method: 'post',
    path: (h) => `/api/spaces/${h}/planner/best-times`,
    body: { platforms: ['instagram'], tz: 'America/Los_Angeles' },
  },
  {
    method: 'post',
    path: (h) => `/api/spaces/${h}/planner/caption-draft`,
    body: { title: 'Lisbon reel', platform: 'instagram', notes: 'Tram 28 at sunrise.' },
  },
  { method: 'get', path: (h) => `/api/spaces/${h}/brand-requests?status=new` },
  { method: 'get', path: (h) => `/api/spaces/${h}/brand-pick` },
  { method: 'get', path: (h) => `/api/spaces/${h}/brand-settings` },
  { method: 'post', path: (h) => `/api/spaces/${h}/brand-settings/alias` },
  { method: 'get', path: (h) => `/api/spaces/${h}/media-kit/preview` },
  { method: 'patch', path: (h) => `/api/spaces/${h}/media-kit`, body: { note: 'US, 25-34' } },
];

/** Owner routes on one item: only the guard is checked (a made-up id is a 404 once built). */
const OWNER_ITEM_ROUTES: Route[] = [
  { method: 'get', path: (h) => `/api/spaces/${h}/planner/items/${ID}` },
  { method: 'patch', path: (h) => `/api/spaces/${h}/planner/items/${ID}`, body: { title: 'New' } },
  { method: 'delete', path: (h) => `/api/spaces/${h}/planner/items/${ID}` },
  {
    method: 'post',
    path: (h) => `/api/spaces/${h}/planner/items/${ID}/mark`,
    body: { status: 'posted' },
  },
  { method: 'get', path: (h) => `/api/spaces/${h}/brand-requests/${ID}` },
  {
    method: 'patch',
    path: (h) => `/api/spaces/${h}/brand-requests/${ID}`,
    body: { status: 'shortlisted' },
  },
  { method: 'put', path: (h) => `/api/spaces/${h}/posts/${ID}/back`, body: { note: 'Love it' } },
  { method: 'delete', path: (h) => `/api/spaces/${h}/posts/${ID}/back` },
  { method: 'post', path: (h) => `/api/spaces/${h}/instagram/connect` },
  { method: 'delete', path: (h) => `/api/spaces/${h}/instagram` },
];

/** Member routes on /api/posts/:id: a session first, membership in the service. */
const MEMBER_ROUTES: Route[] = [
  { method: 'get', path: () => `/api/posts/${ID}/poll` },
  {
    method: 'post',
    path: () => `/api/posts/${ID}/poll`,
    body: { question: 'Where next?', options: ['Lisbon', 'Porto'] },
  },
  { method: 'put', path: () => `/api/posts/${ID}/poll/vote`, body: { optionIds: [ID] } },
  { method: 'post', path: () => `/api/posts/${ID}/poll/close` },
  { method: 'get', path: () => `/api/posts/${ID}/updates` },
  { method: 'post', path: () => `/api/posts/${ID}/updates`, body: { body: 'Filmed day one.' } },
  { method: 'delete', path: () => `/api/posts/${ID}/updates/${ID}` },
  { method: 'put', path: () => `/api/posts/${ID}/feedback-wanted` },
  { method: 'delete', path: () => `/api/posts/${ID}/feedback-wanted` },
  { method: 'put', path: () => `/api/posts/${ID}/follow` },
  { method: 'delete', path: () => `/api/posts/${ID}/follow` },
];

function call(target: typeof app, route: Route, handle: string, who: SignedIn | null) {
  const req = request(target)[route.method](route.path(handle));
  if (who) req.set('Cookie', who.cookie);
  return route.body ? req.send(route.body) : req;
}

const label = (route: Route) => `${route.method.toUpperCase()} ${route.path(':handle')}`;

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'owner@suite.test', 'Mia Owner');
  space = await factories.space({
    owner: { id: owner.userId, email: owner.email, name: 'Mia Owner' },
    handle: 'miasuite',
  });
  otherOwner = await signInWithOtp(app, 'other@suite.test', 'Other Owner');
  await factories.space({
    owner: { id: otherOwner.userId, email: otherOwner.email, name: 'Other Owner' },
    handle: 'othersuite',
  });
  fan = await signInWithOtp(app, 'fan@suite.test', 'Fan');
  const community = space.communities[0]?.id ?? '';
  const membership = await factories.member(space.space.id, {
    user: { id: fan.userId, email: fan.email, name: 'Fan' },
    communityIds: [community],
  });
  postId = (
    await factories.post(space.space.id, community, membership.membership.id, { type: 'project' })
  ).id;
});

afterAll(async () => {
  await closeDb();
});

describe('creator-suite owner routes (/api/spaces/:handle/...)', () => {
  for (const route of [...OWNER_ROUTES, ...OWNER_ITEM_ROUTES]) {
    it(`${label(route)}: 401 signed out, 404 for anyone but the owner`, async () => {
      expect((await call(app, route, space.space.handle, null)).status).toBe(401);
      expect((await call(app, route, space.space.handle, otherOwner)).status).toBe(404);
      expect((await call(app, route, space.space.handle, fan)).status).toBe(404);
      // An owner asking for someone else's handle is a 404 too.
      expect((await call(app, route, 'othersuite', owner)).status).toBe(404);
    });
  }

  for (const route of OWNER_ROUTES) {
    it(`${label(route)}: the owner gets through the guard and validation`, async () => {
      const res = await call(app, route, space.space.handle, owner);
      expect([400, 401, 403, 404]).not.toContain(res.status);
      expect(res.headers['cache-control']).toBe('private, no-store');
    });
  }

  it('backs a real post of the space past the guard', async () => {
    const res = await request(app)
      .put(`/api/spaces/${space.space.handle}/posts/${postId}/back`)
      .set('Cookie', owner.cookie)
      .send({ note: 'Backing this one' });
    expect([400, 401, 403, 404]).not.toContain(res.status);
  });

  it('Instagram routes answer 503 feature_disabled to the owner while META_* is unset', async () => {
    const res = await request(app)
      .post(`/api/spaces/${space.space.handle}/instagram/connect`)
      .set('Cookie', owner.cookie);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('feature_disabled');
  });
});

describe('creator-suite member routes (/api/posts/:id/...)', () => {
  for (const route of MEMBER_ROUTES) {
    it(`${label(route)}: 401 signed out`, async () => {
      expect((await call(app, route, '', null)).status).toBe(401);
    });
  }
});

describe('public work-with-me form', () => {
  it('validates the body (consent, budget, message) before anything else', async () => {
    const res = await request(app)
      .post(`/api/spaces/${space.space.handle}/work-with-me`)
      .send({ brandName: 'Acme', email: 'not-an-email', consent: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    const fields = res.body.error.details.map((issue: { path: string[] }) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['email', 'budgetRange', 'message', 'consent']));
  });
});

describe('webhooks', () => {
  const email = {
    to: 'mia-7k3f@in.example.com',
    from: 'partnerships@acme.example',
    fromName: 'Acme',
    subject: 'Paid collab for your Lisbon series',
    text: 'Hi Mia, we would love to sponsor two reels. Budget is $2,000.',
    messageId: '<abc123@acme.example>',
  };

  it('email forwarding is 503 until it is set up', async () => {
    const res = await request(app).post('/api/inbound/email').send(email);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('feature_disabled');
  });

  it('a forwarded email must be signed over its exact bytes', async () => {
    const raw = JSON.stringify(email);
    const post = (signature?: string, body = raw) => {
      const req = request(onApp).post('/api/inbound/email').set('Content-Type', 'application/json');
      if (signature) req.set('x-inbound-signature', signature);
      return req.send(body);
    };
    expect((await post()).status).toBe(401);
    expect((await post(signBody('wrong-secret', raw))).status).toBe(401);
    expect((await post(signBody(EMAIL_SECRET, raw), `${raw} `)).status).toBe(401);
    const bad = JSON.stringify({ ...email, messageId: '' });
    expect((await post(signBody(EMAIL_SECRET, bad), bad)).status).toBe(400);
    const signed = await post(signBody(EMAIL_SECRET, raw));
    expect([400, 401, 503]).not.toContain(signed.status);
  });

  it('Instagram webhook and callback are 503 while META_* is unset', async () => {
    expect((await request(app).get('/api/webhooks/instagram')).status).toBe(503);
    expect((await request(app).post('/api/webhooks/instagram').send({})).status).toBe(503);
    expect((await request(app).get('/api/instagram/callback?state=x')).status).toBe(503);
  });

  it('Instagram webhook POST must carry Meta’s signature; GET checks its query', async () => {
    const raw = JSON.stringify({ object: 'instagram', entry: [] });
    const post = (signature?: string) => {
      const req = request(onApp)
        .post('/api/webhooks/instagram')
        .set('Content-Type', 'application/json');
      if (signature) req.set('x-hub-signature-256', signature);
      return req.send(raw);
    };
    expect((await post()).status).toBe(401);
    expect((await post(signBody(EMAIL_SECRET, raw, 'sha256='))).status).toBe(401);
    const signed = await post(signBody(META_SECRET, raw, 'sha256='));
    expect([400, 401, 503]).not.toContain(signed.status);
    expect((await request(onApp).get('/api/webhooks/instagram?hub.mode=nope')).status).toBe(400);
  });
});
