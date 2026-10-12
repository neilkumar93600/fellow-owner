import { describe, expect, it } from 'vitest';
import { EnvError, loadEnv } from '../../src/config/env.js';

describe('loadEnv', () => {
  it('treats the empty LOG_LEVEL= and DATABASE_POOL_MAX= shipped in .env.example as unset', () => {
    const env = loadEnv({ NODE_ENV: 'development', LOG_LEVEL: '', DATABASE_POOL_MAX: '' });
    expect(env.LOG_LEVEL).toBe('debug');
    expect(env.DATABASE_POOL_MAX).toBe(10);
  });

  it('rejects a pool of 1: the cron job lock holds a connection while the job queries on the pool', () => {
    expect(() => loadEnv({ NODE_ENV: 'development', DATABASE_POOL_MAX: '1' })).toThrow(EnvError);
    expect(loadEnv({ NODE_ENV: 'development', DATABASE_POOL_MAX: '2' }).DATABASE_POOL_MAX).toBe(2);
  });

  it('still rejects an unknown LOG_LEVEL', () => {
    expect(() => loadEnv({ NODE_ENV: 'development', LOG_LEVEL: 'loud' })).toThrow(EnvError);
  });
});
