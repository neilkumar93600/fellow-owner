import { afterAll, describe, expect, it } from 'vitest';
import { withJobLock } from '../../src/lib/job-lock.js';
import { closeDb, db } from '../helpers/test-db.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('withJobLock', () => {
  afterAll(closeDb);

  it('runs one of two concurrent calls on the same name', async () => {
    let runs = 0;
    const job = async () => {
      runs += 1;
      await sleep(300);
      return 'done';
    };
    const results = await Promise.all([
      withJobLock(db, 'test-overlap', job),
      withJobLock(db, 'test-overlap', job),
    ]);
    expect(results.filter((r) => r.ran)).toHaveLength(1);
    expect(results.find((r) => r.ran)?.result).toBe('done');
    expect(results.find((r) => !r.ran)?.result).toBeUndefined();
    expect(runs).toBe(1);
  });

  it('runs different names side by side, and the same name again once released', async () => {
    const [a, b] = await Promise.all([
      withJobLock(db, 'test-a', async () => 1),
      withJobLock(db, 'test-b', async () => 2),
    ]);
    expect(a).toEqual({ ran: true, result: 1 });
    expect(b).toEqual({ ran: true, result: 2 });
    expect(await withJobLock(db, 'test-a', async () => 3)).toEqual({ ran: true, result: 3 });
  });

  it('releases the lock when the job throws', async () => {
    await expect(
      withJobLock(db, 'test-throw', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await withJobLock(db, 'test-throw', async () => 'ok')).toEqual({
      ran: true,
      result: 'ok',
    });
  });
});
