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

  it('reads the Anthropic chat settings, with model defaults and an empty key as unset', () => {
    const base = { NODE_ENV: 'development' };
    const unset = loadEnv({ ...base, ANTHROPIC_API_KEY: '', ANTHROPIC_MODEL_FAST: '' });
    expect(unset.ANTHROPIC_API_KEY).toBeUndefined();
    expect(unset.ANTHROPIC_MODEL_FAST).toBe('claude-haiku-5-5');
    expect(unset.ANTHROPIC_MODEL_SMART).toBe('claude-sonnet-5-5');

    const set = loadEnv({
      ...base,
      ANTHROPIC_API_KEY: 'sk-ant-fake',
      ANTHROPIC_MODEL_FAST: 'claude-fast-x',
      ANTHROPIC_MODEL_SMART: 'claude-smart-x',
    });
    expect(set.ANTHROPIC_API_KEY).toBe('sk-ant-fake');
    expect(set.ANTHROPIC_MODEL_FAST).toBe('claude-fast-x');
    expect(set.ANTHROPIC_MODEL_SMART).toBe('claude-smart-x');
  });

  it('ignores the retired DEMO_* variables still set on old deployments', () => {
    const env = loadEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://u:p@db:5432/app',
      BETTER_AUTH_SECRET: 'x'.repeat(40),
      CRON_SECRET: 'cron',
      CLICK_SALT: 'salt',
      RESEND_API_KEY: 're_test',
      EMAIL_FROM: 'Fellow Owners <hi@example.com>',
      DEMO_ENABLED: 'yes please',
      DEMO_CREATOR_EMAIL: 'not-an-email',
      DEMO_FAN_EMAIL: '',
      DEMO_PASSWORD: 'x',
    });
    expect(Object.keys(env).some((key) => key.startsWith('DEMO_'))).toBe(false);
  });

  it('still rejects an unknown LOG_LEVEL', () => {
    expect(() => loadEnv({ NODE_ENV: 'development', LOG_LEVEL: 'loud' })).toThrow(EnvError);
  });
});
