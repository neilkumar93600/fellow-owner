import { expect, test } from '@playwright/test';

// Smoke: every public page renders a heading and not the error boundary. Signed-in screens need a real
// account, so they are not covered here.

async function expectRendered(page: import('@playwright/test').Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBeLessThan(400);
  // Headings may be visually hidden (sr-only), so match on presence, not visibility.
  await expect(page.getByRole('heading', { level: 1 }).first(), path).toBeAttached();
  await expect(page.getByText(/something went wrong/i), path).toHaveCount(0);
}

const PUBLIC_PAGES = [
  '/',
  '/about',
  '/pricing',
  '/blog',
  '/contact',
  '/login',
  '/create-account',
  '/terms',
  '/privacy-policy',
];

test('public pages render', async ({ page }) => {
  for (const path of PUBLIC_PAGES) await expectRendered(page, path);
});

test('the landing has a Get started link', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Get started' }).first()).toHaveAttribute(
    'href',
    /\/start/,
  );
});

test('an unknown page is a 404', async ({ page }) => {
  // One segment: /{handle}/c/* is a signed-in path, so proxy.ts would redirect it to /login (200).
  const response = await page.goto('/no-such-creator-page');
  expect(response?.status()).toBe(404);
});
