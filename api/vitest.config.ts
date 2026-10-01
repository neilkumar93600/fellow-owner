import { defineConfig } from 'vitest/config';

// Two projects:
// - unit:        pure code (tests/unit), no database
// - integration: Supertest against a real Postgres (TEST_DATABASE_URL), migrated once by
//                tests/helpers/global-setup.ts; files run one at a time because they share it.
// Both run with NODE_ENV=test and the fake AI (no OPENROUTER_API_KEY), so nothing calls a model.

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgres://fellow:fellow@localhost:5432/fellow_owners_test';

const testEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'silent',
  DATABASE_URL: testDatabaseUrl,
  TEST_DATABASE_URL: testDatabaseUrl,
  WEB_ORIGIN: 'http://localhost:3000',
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'test-secret-0123456789abcdef0123456789abcdef',
  DEMO_ENABLED: 'true',
  DEMO_CREATOR_EMAIL: 'mira@example.com',
  DEMO_FAN_EMAIL: 'arjun@example.com',
  DEMO_PASSWORD: 'demo-password-123',
  CRON_SECRET: 'test-cron-secret',
  CLICK_SALT: 'test-click-salt',
  OPENROUTER_API_KEY: '',
  AI_ENABLED: 'false',
  RESEND_API_KEY: '',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
          env: testEnv,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          env: testEnv,
          globalSetup: ['tests/helpers/global-setup.ts'],
          pool: 'forks',
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
