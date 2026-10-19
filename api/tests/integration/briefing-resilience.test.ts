import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeAiServices } from '../../src/ai/fake.js';
import { type AiServices, AiUnavailableError } from '../../src/ai/types.js';
import { buildContainer } from '../../src/container.js';
import type { OwnerContext } from '../../src/services/access.service.js';
import { warmDemoBriefing } from '../../src/workers/demo-briefing.js';
import { createFactories } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const MINUTE = 60_000;

/** A container whose briefing AI is counted and, when `fail`, always unavailable. */
function setup(fail: boolean) {
  const base = buildContainer();
  const fake = createFakeAiServices({ accounting: { aiRuns: base.repos.aiRuns } });
  const calls = { briefing: 0 };
  const ai: AiServices = {
    ...fake,
    async briefing(input, ctx) {
      calls.briefing++;
      if (fail) throw new AiUnavailableError('provider');
      return fake.briefing(input, ctx);
    },
  };
  const container = buildContainer({ ai });
  return { calls, container, factories: createFactories(container) };
}

async function seedSpace(factories: ReturnType<typeof createFactories>, isDemo: boolean) {
  const space = await factories.space({ handle: isDemo ? 'demo' : 'real', isDemo });
  const room = space.communities[0];
  if (!room) throw new Error('factory made no community');
  const fan = await factories.member(space.space.id, { communityIds: [room.id] });
  await factories.post(space.space.id, room.id, fan.membership.id, { title: 'Gym log app' });
  await factories.post(space.space.id, room.id, fan.membership.id, { title: 'Packing list tool' });
  const owner: OwnerContext = {
    userId: space.space.ownerUserId,
    space: space.space,
    membership: space.ownerMembership,
  };
  return { owner, space };
}

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await closeDb();
});

describe('failed briefing build memo', () => {
  it('calls the AI once for repeated loads inside 15 minutes, again after', async () => {
    const { calls, container, factories } = setup(true);
    const { owner } = await seedSpace(factories, false);
    const { briefing } = container.services;

    const first = await briefing.get(owner);
    expect(first).toMatchObject({ status: 'unavailable', id: null });
    expect((await briefing.get(owner)).status).toBe('unavailable');
    expect(calls.briefing).toBe(1);

    const start = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(start + 14 * MINUTE);
    await briefing.get(owner);
    expect(calls.briefing).toBe(1);

    vi.spyOn(Date, 'now').mockReturnValue(start + 16 * MINUTE);
    await briefing.get(owner);
    expect(calls.briefing).toBe(2);
  });

  it('still caches a successful build for the UTC day', async () => {
    const { calls, container, factories } = setup(false);
    const { owner } = await seedSpace(factories, false);

    const first = await container.services.briefing.get(owner);
    expect(first.status).toBe('ready');
    expect(first.id).not.toBeNull();
    const second = await container.services.briefing.get(owner);
    expect(second.id).toBe(first.id);
    expect(calls.briefing).toBe(1);
  });
});

describe('warmDemoBriefing', () => {
  it('no-ops without a demo space and never throws', async () => {
    const { container } = setup(false);
    await expect(warmDemoBriefing({ ...container, ...container.services })).resolves.toEqual({
      warmed: false,
    });
  });

  it('no-ops when the demo is off, even with a demo space', async () => {
    const { calls, container, factories } = setup(false);
    await seedSpace(factories, true);
    const deps = {
      ...container,
      ...container.services,
      env: { ...container.env, DEMO_ENABLED: false },
    };
    await expect(warmDemoBriefing(deps)).resolves.toEqual({ warmed: false });
    expect(calls.briefing).toBe(0);
  });

  it('builds today’s digest for the demo space, then reads it from the database', async () => {
    const { calls, container, factories } = setup(false);
    const { owner } = await seedSpace(factories, true);
    const deps = {
      ...container,
      ...container.services,
      env: { ...container.env, DEMO_ENABLED: true },
    };

    await expect(warmDemoBriefing(deps)).resolves.toEqual({ warmed: true });
    expect(calls.briefing).toBe(1);
    const cached = await container.services.briefing.get(owner);
    expect(cached.status).toBe('ready');

    await expect(warmDemoBriefing(deps)).resolves.toEqual({ warmed: true });
    expect(calls.briefing).toBe(1);
  });

  it('reports not warmed, without throwing, when the AI is down', async () => {
    const { container, factories } = setup(true);
    await seedSpace(factories, true);
    const deps = {
      ...container,
      ...container.services,
      env: { ...container.env, DEMO_ENABLED: true },
    };
    await expect(warmDemoBriefing(deps)).resolves.toEqual({ warmed: false });
  });

  it('swallows a thrown error', async () => {
    const { container } = setup(false);
    const deps = {
      ...container,
      env: { ...container.env, DEMO_ENABLED: true },
      briefing: {
        get: async () => {
          throw new Error('db down');
        },
      },
      repos: {
        ...container.repos,
        spaces: { ...container.repos.spaces, listDemo: async () => [{ id: 'x' } as never] },
      },
    };
    await expect(warmDemoBriefing(deps)).resolves.toEqual({ warmed: false });
  });
});
