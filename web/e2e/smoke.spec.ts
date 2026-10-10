import { expect, type Page, test } from '@playwright/test';

// Smoke: every main screen renders a heading and not the error boundary.
// The demo session cookie comes from POST /api/demo/session on the page's context.

async function signInAs(page: Page, as: 'creator' | 'fan') {
  const res = await page.request.post('/api/demo/session', { data: { as } });
  expect(res.ok()).toBeTruthy();
}

async function expectRendered(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBeLessThan(400);
  // Headings may be visually hidden (sr-only), so match on presence, not visibility.
  await expect(page.getByRole('heading', { level: 1 }).first(), path).toBeAttached();
  await expect(page.getByText(/something went wrong/i), path).toHaveCount(0);
}

const CREATOR_PAGES = [
  '/dashboard',
  '/dashboard/inbox',
  '/dashboard/inbox/questions',
  '/dashboard/ideas',
  '/dashboard/communities',
  '/dashboard/communities/reports',
  '/dashboard/challenges',
  '/dashboard/people',
  '/dashboard/promote',
  '/dashboard/settings',
];

test('demo creator: every studio page renders', async ({ page }) => {
  await signInAs(page, 'creator');
  for (const path of CREATOR_PAGES) await expectRendered(page, path);
});

test('demo fan: space, community, post, my space and account render', async ({ page }) => {
  await signInAs(page, 'fan');
  await expectRendered(page, '/mira');

  const community = page.locator('a[href^="/mira/c/"]').first();
  await community.waitFor({ state: 'attached' });
  await expectRendered(page, (await community.getAttribute('href')) as string);

  const post = page.locator('a[href^="/mira/p/"]').first();
  await post.waitFor({ state: 'attached' });
  await expectRendered(page, (await post.getAttribute('href')) as string);

  await expectRendered(page, '/mira/me');
  await expectRendered(page, '/account');
});
