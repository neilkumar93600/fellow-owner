import { desc } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import { jobRuns } from '../../src/db/schema/index.js';
import { sweepAll } from '../../src/workers/sweep-all.js';
import { JOB_NAMES, type JobName, type Jobs } from '../../src/workers/tick.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

/** Fake jobs: count calls, take a moment (so concurrent ticks overlap), `fail` throws. */
function fakeJobs(fail: JobName[] = []) {
  const calls = Object.fromEntries(JOB_NAMES.map((job) => [job, 0])) as Record<JobName, number>;
  const jobs = Object.fromEntries(
    JOB_NAMES.map((job) => [
      job,
      async () => {
        calls[job]++;
        await new Promise((resolve) => setTimeout(resolve, 30));
        if (fail.includes(job)) throw new Error(`${job} broke`);
        return { done: true };
      },
    ]),
  ) as Jobs;
  return { calls, jobs };
}

function setup(options: { fail?: JobName[]; demo?: boolean } = {}) {
  const fakes = fakeJobs(options.fail);
  const base = buildContainer();
  const container = buildContainer({
    jobs: fakes.jobs,
    ...(options.demo === false ? { env: { ...base.env, DEMO_ENABLED: false } } : {}),
  });
  const auth = `Bearer ${container.env.CRON_SECRET}`;
  return { ...fakes, container, app: createApp(container), auth };
}

const runs = () => db.select().from(jobRuns).orderBy(desc(jobRuns.startedAt));

afterAll(async () => {
  await closeDb();
});

beforeEach(async () => {
  await resetDatabase();
});

describe('cron tick auth', () => {
  for (const path of ['/api/cron/tick', '/api/cron/status']) {
    it(`rejects ${path} with a bad secret`, async () => {
      const { app } = setup();
      await request(app).get(path).set('Authorization', 'Bearer nope').expect(401);
      await request(app).post(path).expect(401);
    });
  }
});

describe('POST|GET /api/cron/tick', () => {
  it('answers 202 at once and runs every due job in the background', async () => {
    const { app, auth, calls, container } = setup();
    const res = await request(app).post('/api/cron/tick').set('Authorization', auth).expect(202);

    // Fresh database: no slot has an ok run yet, so the daily and weekly jobs catch up too.
    expect([...res.body.jobs].sort()).toEqual([...JOB_NAMES].sort());
    await container.background.whenIdle();

    for (const job of JOB_NAMES) expect(calls[job]).toBe(1);
    const rows = await runs();
    expect(rows).toHaveLength(JOB_NAMES.length);
    expect(rows.every((row) => row.status === 'ok' && row.finishedAt)).toBe(true);
  });

  it('runs nothing twice in the same slot (a second tick finds every slot done)', async () => {
    const { app, auth, calls, container } = setup();
    await request(app).get('/api/cron/tick').set('Authorization', auth).expect(202);
    await container.background.whenIdle();

    const second = await request(app).get('/api/cron/tick').set('Authorization', auth).expect(202);
    await container.background.whenIdle();
    // Only an hour boundary between the two calls could make the hourly jobs due again.
    if (second.body.jobs.length === 0) {
      for (const job of JOB_NAMES) expect(calls[job]).toBe(1);
    }
  });

  it('two ticks at once run each job once', async () => {
    const { app, auth, calls, container } = setup();
    await Promise.all([
      request(app).post('/api/cron/tick').set('Authorization', auth).expect(202),
      request(app).post('/api/cron/tick').set('Authorization', auth).expect(202),
    ]);
    await container.background.whenIdle();

    for (const job of JOB_NAMES) expect(calls[job]).toBe(1);
    expect((await runs()).filter((row) => row.status === 'ok')).toHaveLength(JOB_NAMES.length);
  });

  it('records a failed job and keeps running the others; the slot stays due', async () => {
    const { app, auth, calls, container } = setup({ fail: ['purge'] });
    await request(app).post('/api/cron/tick').set('Authorization', auth).expect(202);
    await container.background.whenIdle();

    expect(calls.community_digests).toBe(1);
    const purge = (await runs()).find((row) => row.job === 'purge');
    expect(purge).toMatchObject({ status: 'failed', error: 'purge broke' });

    const again = await request(app).post('/api/cron/tick').set('Authorization', auth).expect(202);
    expect(again.body.jobs).toContain('purge');
    await container.background.whenIdle();
  });

  it('leaves the demo reset out when the demo is off', async () => {
    const { app, auth, calls, container } = setup({ demo: false });
    const res = await request(app).post('/api/cron/tick').set('Authorization', auth).expect(202);
    await container.background.whenIdle();
    expect(res.body.jobs).not.toContain('demo_reset');
    expect(calls.demo_reset).toBe(0);
  });

  it('?job=<name> runs that one job now, even when its slot is done', async () => {
    const { app, auth, calls, container } = setup();
    await request(app).post('/api/cron/tick').set('Authorization', auth).expect(202);
    await container.background.whenIdle();

    const res = await request(app)
      .post('/api/cron/tick?job=purge')
      .set('Authorization', auth)
      .expect(202);
    expect(res.body.jobs).toEqual(['purge']);
    await container.background.whenIdle();
    expect(calls.purge).toBe(2);
    expect(calls.sweep).toBe(1);
  });

  it('?job=unknown is a 400', async () => {
    const { app, auth } = setup();
    const res = await request(app)
      .post('/api/cron/tick?job=unknown')
      .set('Authorization', auth)
      .expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});

describe('GET /api/cron/status', () => {
  it('lists the latest runs, newest first', async () => {
    const { app, auth, container } = setup({ fail: ['sweep'] });
    await request(app).post('/api/cron/tick').set('Authorization', auth).expect(202);
    await container.background.whenIdle();

    const res = await request(app).get('/api/cron/status').set('Authorization', auth).expect(200);
    expect(res.body.runs).toHaveLength(JOB_NAMES.length);
    expect(res.body.runs.find((run: { job: string }) => run.job === 'sweep')).toMatchObject({
      status: 'failed',
      error: 'sweep broke',
      slot: expect.any(String),
      startedAt: expect.any(String),
    });
    expect(res.headers['cache-control']).toBe('private, no-store');
  });
});

describe('sweepAll', () => {
  it('sweeps every space with pending items and skips the rest', async () => {
    const container = buildContainer();
    const factories = createFactories(container);
    const busy = await factories.space({ handle: 'busy' });
    const idle = await factories.space({ handle: 'idle' });
    const room = busy.communities[0];
    if (!room) throw new Error('factory made no community');
    await factories.post(busy.space.id, room.id, busy.ownerMembership.id); // analysis pending

    const swept: string[] = [];
    const count = await sweepAll({
      ...container,
      analyzer: {
        ...container.analyzer,
        async sweep(spaceId) {
          swept.push(spaceId);
          return { claimed: 1, remaining: 0 };
        },
      },
    });
    expect(count).toBe(1);
    expect(swept).toEqual([busy.space.id]);
    expect(swept).not.toContain(idle.space.id);
  });
});
