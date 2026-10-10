import { defineConfig, devices } from '@playwright/test';

// Run against an already-running stack: E2E_BASE_URL defaults to the local web app.
export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3006',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
