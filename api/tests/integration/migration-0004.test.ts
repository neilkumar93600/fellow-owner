import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '../helpers/test-db.js';

afterAll(closeDb);

describe('migration 0004 (creator pivot)', () => {
  it('renames the investment pitch type to brand_deal', async () => {
    const rows = await db.execute<{ v: string }>(
      sql`select unnest(enum_range(null::pitch_type))::text as v`,
    );
    const values = rows.map((r) => r.v);
    expect(values).toContain('brand_deal');
    expect(values).not.toContain('investment');
  });

  it('adds posts.ask_id, posts.loved_at, memberships.spotlight_at/spotlight_note', async () => {
    const cols = await db.execute(sql`select table_name, column_name from information_schema.columns
      where (table_name = 'posts' and column_name in ('ask_id', 'loved_at'))
         or (table_name = 'memberships' and column_name in ('spotlight_at', 'spotlight_note'))`);
    expect(cols.length).toBe(4);
  });

  it('caps the spotlight note at 280 characters', async () => {
    const def = await db.execute<{ d: string }>(
      sql`select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'memberships_spotlight_note_check'`,
    );
    expect(String(def[0]?.d)).toMatch(/280/);
  });

  it('accepts the new notification kinds', async () => {
    const def = await db.execute<{ d: string }>(
      sql`select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'notifications_kind_check'`,
    );
    expect(String(def[0]?.d)).toMatch(/post_loved/);
    expect(String(def[0]?.d)).toMatch(/spotlighted/);
    expect(String(def[0]?.d)).toMatch(/challenge_shortlisted/);
  });
});
