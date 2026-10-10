import { and, count, eq, isNotNull, isNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { digests } from '../../src/db/schema/ai.js';
import { communities } from '../../src/db/schema/communities.js';
import { followers } from '../../src/db/schema/followers.js';
import { inbound } from '../../src/db/schema/inbound.js';
import { notifications } from '../../src/db/schema/later.js';
import { reports } from '../../src/db/schema/moderation.js';
import { pageVisits } from '../../src/db/schema/page-visits.js';
import { posts } from '../../src/db/schema/posts.js';
import { questionGroups } from '../../src/db/schema/question-groups.js';
import { spaces } from '../../src/db/schema/spaces.js';
import { readSeedData, seedDemoSpace } from '../../src/db/seed/seed.js';
import { utcDayString, weekStart } from '../../src/lib/dates.js';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const now = new Date('2026-10-14T10:00:00.000Z'); // a Wednesday
let spaceId = '';

describe('seed: backend-completion features', () => {
  beforeAll(async () => {
    await resetDatabase();
    const data = await readSeedData();
    // Twice: the second run must rebuild the same rows, not add to them.
    await seedDemoSpace(container, data, { now });
    spaceId = (await seedDemoSpace(container, data, { now })).spaceId;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('seeds 4 question groups, 3 open with drafts and 1 answered', async () => {
    const groups = await db
      .select()
      .from(questionGroups)
      .where(eq(questionGroups.spaceId, spaceId));
    expect(groups).toHaveLength(4);
    const open = groups.filter((g) => g.status === 'open');
    expect(open).toHaveLength(3);
    for (const g of open) expect(g.draft).toBeTruthy();
    expect(groups.filter((g) => g.status === 'answered')).toHaveLength(1);
  });

  it('links pitches of allowed types and keeps asked_count consistent', async () => {
    const groups = await db
      .select()
      .from(questionGroups)
      .where(eq(questionGroups.spaceId, spaceId));
    for (const g of groups) {
      const members = await db.select().from(inbound).where(eq(inbound.questionGroupId, g.id));
      expect(members.length).toBe(g.askedCount);
      expect(g.askedCount).toBeGreaterThanOrEqual(2);
      for (const p of members) {
        expect(['fan_note', 'idea', 'other']).toContain(p.type);
        expect(p.isFiltered).toBe(false);
      }
    }
  });

  it('pins the answer once per chosen community, post_id = the first', async () => {
    const [group] = await db
      .select()
      .from(questionGroups)
      .where(and(eq(questionGroups.spaceId, spaceId), eq(questionGroups.status, 'answered')));
    expect(group?.answer).toBeTruthy();
    expect(group?.answeredAt).not.toBeNull();
    const linked = await db
      .select()
      .from(posts)
      .where(eq(posts.questionGroupId, group?.id ?? ''));
    expect(linked.length).toBe(group?.pinnedCommunityIds.length);
    expect(linked.length).toBeGreaterThanOrEqual(2);
    expect(new Set(linked.map((p) => p.communityId))).toEqual(new Set(group?.pinnedCommunityIds));
    expect(linked.map((p) => p.id)).toContain(group?.postId);
    expect(group?.postId).toBe(linked[0]?.id);
  });

  it('stamps read_at and shortlisted_at on Priya pitches', async () => {
    const rows = await db
      .select({ readAt: inbound.readAt, shortlistedAt: inbound.shortlistedAt })
      .from(inbound)
      .where(and(eq(inbound.spaceId, spaceId), isNotNull(inbound.readAt)));
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((r) => r.shortlistedAt)).toBe(true);
  });

  it('writes one digest per community for the current ISO week', async () => {
    const monday = utcDayString(weekStart(now));
    expect(monday).toBe('2026-10-12');
    const rows = await db.select().from(digests).where(eq(digests.spaceId, spaceId));
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(communities)
      .where(eq(communities.spaceId, spaceId));
    expect(rows).toHaveLength(n);
    for (const row of rows) {
      expect(row.periodDate).toBe(monday);
      expect(row.communityId).not.toBeNull();
    }
  });

  it('seeds 2 open and 1 resolved report', async () => {
    const rows = await db.select().from(reports).where(eq(reports.spaceId, spaceId));
    expect(rows.filter((r) => r.status === 'open')).toHaveLength(2);
    const resolved = rows.filter((r) => r.status === 'resolved');
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.resolvedAt).not.toBeNull();
  });

  it('seeds 30 days of page visits', async () => {
    const rows = await db
      .selectDistinct({ day: pageVisits.day })
      .from(pageVisits)
      .where(eq(pageVisits.spaceId, spaceId));
    expect(rows).toHaveLength(30);
  });

  it('gives the creator 5 unread notifications including a report_filed', async () => {
    const [space] = await db
      .select({ owner: spaces.ownerUserId })
      .from(spaces)
      .where(eq(spaces.id, spaceId));
    const unread = await db
      .select({ kind: notifications.kind })
      .from(notifications)
      .where(
        and(
          eq(notifications.spaceId, spaceId),
          isNull(notifications.readAt),
          eq(notifications.userId, space?.owner ?? ''),
        ),
      );
    expect(unread).toHaveLength(5);
    expect(unread.map((n) => n.kind)).toContain('report_filed');
  });

  it('stamps ai_tagged_at on AI-tagged followers only', async () => {
    const tagged = await db
      .select({ id: followers.id })
      .from(followers)
      .where(and(eq(followers.spaceId, spaceId), isNotNull(followers.aiTaggedAt)));
    expect(tagged).toHaveLength(8);
  });
});
