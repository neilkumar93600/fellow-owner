import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db, resetDatabase } from '../helpers/test-db.js';

beforeAll(resetDatabase);
afterAll(closeDb);

const COLUMNS: Record<string, string[]> = {
  inbound: ['read_at', 'shortlisted_at', 'question_group_id', 'question_group_excluded'],
  spaces: ['show_read_receipts', 'bio_link_shared_at', 'cover_url'],
  communities: ['cover_url'],
  followers: ['ai_tagged_at'],
  newsletter_subscribers: ['confirmed_at'],
  posts: ['question_group_id'],
};

const TABLES = [
  'question_groups',
  'reports',
  'support_requests',
  'studio_snoozes',
  'notification_prefs',
  'page_visits',
  'job_runs',
];

const INDEXES = [
  'notifications_user_created_idx',
  'notifications_read_created_idx',
  'notifications_space_idx',
  'comments_space_idx',
  'promotions_created_by_idx',
  'ai_feedback_created_by_idx',
  'followers_import_idx',
  'asks_community_idx',
  'digests_community_idx',
  'signals_created_idx',
  'inbound_embedding_hnsw_idx',
  'inbound_question_group_idx',
  'posts_missing_embedding_idx',
  'posts_question_group_idx',
  'question_groups_space_status_asked_idx',
  'reports_space_status_created_idx',
  'support_requests_created_idx',
];

describe('migration 0006 (backend complete)', () => {
  it('adds the new columns', async () => {
    const rows = await db.execute<{ table_name: string; column_name: string }>(
      sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`,
    );
    const have = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
    for (const [table, columns] of Object.entries(COLUMNS)) {
      for (const column of columns)
        expect(have, `${table}.${column}`).toContain(`${table}.${column}`);
    }
  });

  it('creates the new tables', async () => {
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const have = new Set(rows.map((r) => r.table_name));
    for (const table of TABLES) expect(have, table).toContain(table);
  });

  it('creates the new indexes (HNSW on inbound, partial ones)', async () => {
    const rows = await db.execute<{ indexname: string; indexdef: string }>(
      sql`select indexname, indexdef from pg_indexes where schemaname = 'public'`,
    );
    const defs = new Map(rows.map((r) => [r.indexname, r.indexdef]));
    for (const index of INDEXES) expect(defs.has(index), index).toBe(true);
    expect(defs.get('inbound_embedding_hnsw_idx')).toMatch(/hnsw/i);
    expect(defs.get('posts_missing_embedding_idx')).toMatch(/embedding IS NULL/i);
    expect(defs.get('notifications_read_created_idx')).toMatch(/read_at IS NOT NULL/i);
  });

  it('allows the report_filed notification kind', async () => {
    const def = await db.execute<{ d: string }>(
      sql`select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'notifications_kind_check'`,
    );
    expect(String(def[0]?.d)).toMatch(/report_filed/);
  });

  it('checks question group status and job run status', async () => {
    const [space] = await db.execute<{ id: string }>(sql`
      with u as (
        insert into "user" (id, name, email) values ('mig6-user', 'Mig', 'mig6@example.com')
        returning id
      )
      insert into spaces (owner_user_id, handle, display_name) select id, 'mig6space', 'Mig' from u
      returning id`);
    const spaceId = String(space?.id);
    const insertGroup = (status: string) =>
      db.execute(sql`insert into question_groups (space_id, question, status, first_asked_at, last_asked_at)
        values (${spaceId}, 'Which camera do you use?', ${status}, now(), now())`);

    await expect(insertGroup('open')).resolves.toBeDefined();
    await expect(insertGroup('bogus')).rejects.toThrow();

    const [row] = await db.execute<{ show_read_receipts: boolean }>(
      sql`select show_read_receipts from spaces where id = ${spaceId}`,
    );
    expect(row?.show_read_receipts).toBe(true);

    await expect(
      db.execute(
        sql`insert into job_runs (job, slot, started_at, status) values ('sweep', now(), now(), 'running')`,
      ),
    ).resolves.toBeDefined();
    await expect(
      db.execute(
        sql`insert into job_runs (job, slot, started_at, status) values ('sweep', now(), now(), 'bogus')`,
      ),
    ).rejects.toThrow();
    await db.execute(sql`delete from job_runs`);
  });
});
