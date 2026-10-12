import { LIMITS } from '@fellow-owners/shared';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeAiServices } from '../../src/ai/fake.js';
import { buildContainer } from '../../src/container.js';
import { inbound } from '../../src/db/schema/inbound.js';
import { questionGroups } from '../../src/db/schema/question-groups.js';
import { daysAgo } from '../../src/lib/dates.js';
import { createQuestionGrouper } from '../../src/workers/group-questions.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const factories = createFactories(container);
const grouper = createQuestionGrouper(container);
const repo = container.repos.questionGroups;

const failingNaming = createQuestionGrouper(
  buildContainer({
    ai: createFakeAiServices({
      accounting: { aiRuns: container.repos.aiRuns },
      failTasks: { questionGroup: 'provider' },
    }),
  }),
);
const failingEmbed = createQuestionGrouper(
  buildContainer({
    ai: createFakeAiServices({
      accounting: { aiRuns: container.repos.aiRuns },
      failTasks: { embedItem: 'provider' },
    }),
  }),
);

const BODY = 'How do you pack for two weeks with one carry-on bag? I always overpack.';
const NOT_A_QUESTION = { isQuestion: false, question: '', draft: '' };

/** A 1536-dim vector along `axis`, nudged towards axis + 1 by `tilt`. */
function vec(axis: number, tilt = 0): number[] {
  const v = new Array<number>(LIMITS.ai.embeddingDimensions).fill(0);
  v[axis] = 1;
  v[axis + 1] = tilt;
  return v;
}

let space: TestSpace;
let senderId: string;

async function pitch(
  vector: number[] | null,
  extra: Partial<typeof inbound.$inferInsert> = {},
  createdAt?: Date,
) {
  const row = await factories.pitch(space.space.id, senderId, {
    type: 'fan_note',
    subject: 'Packing for a long trip',
    body: BODY,
    ...(createdAt ? { createdAt } : {}),
  });
  await db
    .update(inbound)
    .set({ embedding: vector, ...extra })
    .where(eq(inbound.id, row.id));
  return row.id;
}

/** Three near pitches along `axis`. */
const cluster = (axis: number) =>
  Promise.all([pitch(vec(axis)), pitch(vec(axis, 0.1)), pitch(vec(axis, 0.2))]);

const pitchRows = (ids: string[]) => db.select().from(inbound).where(inArray(inbound.id, ids));
const groupRows = () =>
  db.select().from(questionGroups).where(eq(questionGroups.spaceId, space.space.id));

beforeEach(async () => {
  await resetDatabase();
  space = await factories.space();
  senderId = (await factories.member(space.space.id)).membership.id;
});

afterAll(async () => {
  await container.background.whenIdle();
  await closeDb();
});

describe('grouping job: embeddings', () => {
  it('embeds pitches that have no vector yet, then groups them', async () => {
    const ids = await Promise.all([pitch(null), pitch(null), pitch(null)]);
    expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 1, joined: 0 });
    const rows = await pitchRows(ids);
    expect(rows.every((row) => row.embedding !== null)).toBe(true);
    expect(new Set(rows.map((row) => row.questionGroupId)).size).toBe(1);
    expect(rows[0]?.questionGroupId).toEqual(expect.any(String));
  });

  it('stops embedding when the AI is unavailable and groups nothing', async () => {
    const ids = await Promise.all([pitch(null), pitch(null), pitch(null)]);
    expect(await failingEmbed.groupSpace(space.space.id)).toEqual({ created: 0, joined: 0 });
    const rows = await pitchRows(ids);
    expect(rows.map((row) => [row.embedding, row.questionGroupId])).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
  });
});

describe('grouping job: the AI says "not one question"', () => {
  it('creates no group and never sends the same cluster to the AI again', async () => {
    const ids = await cluster(0);
    const naming = vi.spyOn(container.ai, 'questionGroup').mockResolvedValue(NOT_A_QUESTION);
    try {
      expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 0, joined: 0 });
      expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 0, joined: 0 });
      expect(naming).toHaveBeenCalledTimes(1);
    } finally {
      naming.mockRestore();
    }
    // The real fake would group them; they stay out for good.
    expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 0, joined: 0 });
    const rows = await pitchRows(ids);
    expect(rows.map((row) => [row.questionGroupId, row.questionGroupExcluded])).toEqual([
      [null, true],
      [null, true],
      [null, true],
    ]);
    expect(await groupRows()).toEqual([]);
  });

  it('a waiting group the AI rejects is dropped and its pitches are not regrouped', async () => {
    const ids = await cluster(10);
    expect(await failingNaming.groupSpace(space.space.id)).toEqual({ created: 1, joined: 0 });
    const naming = vi.spyOn(container.ai, 'questionGroup').mockResolvedValue(NOT_A_QUESTION);
    try {
      expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 0, joined: 0 });
      expect(naming).toHaveBeenCalledTimes(1);
    } finally {
      naming.mockRestore();
    }
    expect(await groupRows()).toEqual([]);
    expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 0, joined: 0 });
    const rows = await pitchRows(ids);
    expect(rows.every((row) => row.questionGroupId === null && row.questionGroupExcluded)).toBe(
      true,
    );
  });
});

describe('grouping job: the owner acts during the naming call', () => {
  async function waitingGroup() {
    const ids = await cluster(20);
    await failingNaming.groupSpace(space.space.id);
    const [group] = await groupRows();
    if (!group) throw new Error('no waiting group');
    return { ids, group };
  }

  const answer = () => ({
    answer: 'One bag and packing cubes.',
    pinnedCommunityIds: [],
    now: new Date(),
  });

  it('an answered group the AI rejects is not deleted', async () => {
    const { ids, group } = await waitingGroup();
    const naming = vi.spyOn(container.ai, 'questionGroup').mockImplementationOnce(async () => {
      await repo.claimAnswer(space.space.id, group.id, answer());
      return NOT_A_QUESTION;
    });
    try {
      await grouper.groupSpace(space.space.id);
    } finally {
      naming.mockRestore();
    }
    const [after] = await groupRows();
    expect(after).toMatchObject({ id: group.id, status: 'answered' });
    expect((await pitchRows(ids)).every((row) => row.questionGroupId === group.id)).toBe(true);
  });

  it('an answered group the AI names keeps its question', async () => {
    const { group } = await waitingGroup();
    const naming = vi.spyOn(container.ai, 'questionGroup').mockImplementationOnce(async () => {
      await repo.claimAnswer(space.space.id, group.id, answer());
      return { isQuestion: true, question: 'A late question', draft: 'A late draft.' };
    });
    try {
      await grouper.groupSpace(space.space.id);
    } finally {
      naming.mockRestore();
    }
    const [after] = await groupRows();
    expect(after).toMatchObject({ status: 'answered', question: group.question, draft: null });
  });

  it('a dismissed group stays dismissed and its pitches are not regrouped', async () => {
    const { ids, group } = await waitingGroup();
    const naming = vi.spyOn(container.ai, 'questionGroup').mockImplementationOnce(async () => {
      await repo.dismiss(space.space.id, group.id);
      return NOT_A_QUESTION;
    });
    try {
      expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 0, joined: 0 });
    } finally {
      naming.mockRestore();
    }
    expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 0, joined: 0 });
    const groups = await groupRows();
    expect(groups.map((row) => [row.id, row.status])).toEqual([[group.id, 'dismissed']]);
    expect((await pitchRows(ids)).every((row) => row.questionGroupId === group.id)).toBe(true);
  });
});

describe('grouping job: eligibility', () => {
  it('never groups spam, filtered, replied or archived pitches', async () => {
    const clean = await cluster(30);
    const others = await Promise.all([
      pitch(vec(30, 0.05), { aiIsSpam: true }),
      pitch(vec(30, 0.05), { isFiltered: true }),
      pitch(vec(30, 0.05), { status: 'replied' }),
      pitch(vec(30, 0.05), { status: 'archived' }),
    ]);
    expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 1, joined: 0 });
    const [group] = await groupRows();
    expect(group?.askedCount).toBe(3);
    expect((await pitchRows(clean)).every((row) => row.questionGroupId === group?.id)).toBe(true);
    expect((await pitchRows(others)).every((row) => row.questionGroupId === null)).toBe(true);
  });

  it('clusters only the newest candidates, oldest first', async () => {
    const old = await pitch(vec(40), {}, daysAgo(3));
    const mid = await pitch(vec(40), {}, daysAgo(2));
    const recent = await pitch(vec(40), {}, daysAgo(1));
    const rows = await repo.candidates(space.space.id, daysAgo(30), 2);
    expect(rows.map((row) => row.id)).toEqual([mid, recent]);
    expect(rows.map((row) => row.id)).not.toContain(old);
  });

  it('a run that loses pitches mid-way rolls the new group back', async () => {
    await cluster(50);
    const assign = vi
      .spyOn(repo, 'assign')
      .mockResolvedValueOnce(LIMITS.answerOnce.minGroupSize - 1);
    try {
      expect(await grouper.groupSpace(space.space.id)).toEqual({ created: 0, joined: 0 });
    } finally {
      assign.mockRestore();
    }
    expect(await groupRows()).toEqual([]);
  });
});

describe('grouping job: due spaces', () => {
  async function oldCluster(target: TestSpace, axis: number, createdAt?: Date) {
    const sender = (await factories.member(target.space.id)).membership.id;
    for (const tilt of [0, 0.1, 0.2]) {
      const row = await factories.pitch(target.space.id, sender, {
        type: 'fan_note',
        body: BODY,
        ...(createdAt ? { createdAt } : {}),
      });
      await db
        .update(inbound)
        .set({ embedding: vec(axis, tilt) })
        .where(eq(inbound.id, row.id));
    }
  }

  it('runs only spaces with a recent groupable pitch', async () => {
    await cluster(60);
    await oldCluster(await factories.space(), 60, daysAgo(3));
    const read = vi.spyOn(repo, 'space');
    try {
      expect(await grouper.groupDueSpaces(new Date())).toBe(1);
      expect(read.mock.calls.map(([id]) => id)).toEqual([space.space.id]);
    } finally {
      read.mockRestore();
    }
  });

  it('one failing space does not stop the others', async () => {
    await cluster(70);
    const broken = await factories.space();
    await oldCluster(broken, 70);
    const realSpace = repo.space;
    const read = vi.spyOn(repo, 'space').mockImplementation(async (id, tx) => {
      if (id === broken.space.id) throw new Error('space read failed');
      return realSpace(id, tx);
    });
    try {
      expect(await grouper.groupDueSpaces(new Date())).toBe(1);
    } finally {
      read.mockRestore();
    }
    expect(await groupRows()).toHaveLength(1);
  });
});

describe('members', () => {
  it('returns at most 50 newest askers per group', async () => {
    const big = await repo.insert({
      spaceId: space.space.id,
      question: 'Big group?',
      firstAskedAt: new Date(),
      lastAskedAt: new Date(),
    });
    const small = await repo.insert({
      spaceId: space.space.id,
      question: 'Small group?',
      firstAskedAt: new Date(),
      lastAskedAt: new Date(),
    });
    const bigIds: string[] = [];
    for (let i = 0; i < 52; i += 1) {
      const id = await pitch(
        null,
        { questionGroupId: big.id },
        new Date(Date.UTC(2026, 0, 1, 0, i)),
      );
      bigIds.push(id);
    }
    await pitch(null, { questionGroupId: small.id });
    await pitch(null, { questionGroupId: small.id });
    const members = await repo.members([big.id, small.id]);
    const inBig = members.filter((member) => member.questionGroupId === big.id);
    expect(inBig).toHaveLength(50);
    expect(inBig[0]?.id).toBe(bigIds[51]);
    expect(inBig.map((member) => member.id)).not.toContain(bigIds[0]);
    expect(members.filter((member) => member.questionGroupId === small.id)).toHaveLength(2);
  });
});
