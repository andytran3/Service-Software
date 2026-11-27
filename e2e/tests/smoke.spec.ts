import { expect, test } from '@playwright/test';

test('serves the app and reaches the API and database through the proxy', async ({
  page,
  request,
}) => {
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: 'ok', database: 'ok' });

  await page.goto('/requests');

  await expect(page.getByRole('heading', { level: 1, name: 'Requests' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});
