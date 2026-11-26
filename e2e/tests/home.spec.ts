import { expect, test, type APIRequestContext } from '@playwright/test';
import { uniqueTitle } from '../support/requests';

/** Creates a request through the API (faster than the form) and optionally sets its status. */
async function createViaApi(request: APIRequestContext, title: string, status?: string) {
  const created = await request.post('/api/requests', {
    data: { title, description: 'Created by the landing page tests.', type: 'IT' },
  });
  expect(created.status()).toBe(201);
  const { data } = (await created.json()) as { data: { id: string } };
  if (status) {
    const updated = await request.patch(`/api/requests/${data.id}/status`, { data: { status } });
    expect(updated.status()).toBe(200);
  }
  return data.id;
}

test.describe('landing page', () => {
  test('searches from the hero and opens the results on /requests', async ({
    page,
    request,
  }, testInfo) => {
    const title = uniqueTitle(testInfo, 'hero search');
    const word = title.replace(/\W+/g, '');
    await createViaApi(request, `Projector ${word} flickers`);

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'How can we help?' })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search requests' }).fill(word);
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    await expect(page).toHaveURL(`/requests?q=${word}`);
    await expect(page.getByRole('status')).toHaveText(`1 request matches “${word}”`);
    await expect(page.getByRole('link', { name: `Projector ${word} flickers` })).toBeVisible();
  });

  test('a common request opens the form with its type selected', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('list', { name: 'Common requests' })
      .getByRole('link', { name: 'Book a room' })
      .click();

    await expect(page).toHaveURL('/requests/new?type=Facilities');
    await expect(page.getByRole('combobox', { name: 'Type' })).toHaveValue('Facilities');
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('');
  });

  test('a service card opens the form with its type selected', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('region', { name: 'Services' }).getByRole('link', { name: 'HR' }).click();

    await expect(page).toHaveURL('/requests/new?type=HR');
    await expect(page.getByRole('combobox', { name: 'Type' })).toHaveValue('HR');
  });

  test('open requests put "Needs your reply" first and leave out completed ones', async ({
    page,
    request,
  }, testInfo) => {
    const needsReply = uniqueTitle(testInfo, 'needs reply');
    const completed = uniqueTitle(testInfo, 'completed');
    await createViaApi(request, completed, 'Completed');
    const id = await createViaApi(request, needsReply, 'Needs your reply');

    await page.goto('/');
    const panel = page.getByRole('region', { name: 'Open requests' });
    const first = panel.getByRole('listitem').first();

    // The most recently updated "Needs your reply" request comes first.
    await expect(first).toContainText(needsReply);
    await expect(first).toContainText('Needs your reply');
    await expect(panel.getByText(completed)).toHaveCount(0);

    await first.getByRole('link').click();
    await expect(page).toHaveURL(`/requests/${id}`);
    await expect(page.getByRole('heading', { level: 1, name: needsReply })).toBeVisible();
  });

  test('open requests come before the services on phones and on the left on wide screens', async ({
    page,
  }) => {
    const box = async (name: string) => {
      const region = page.getByRole('region', { name });
      await expect(region).toBeVisible();
      const rect = await region.boundingBox();
      if (!rect) throw new Error(`No box for ${name}`);
      return rect;
    };

    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    let open = await box('Open requests');
    let services = await box('Services');
    expect(open.y + open.height).toBeLessThanOrEqual(services.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    open = await box('Open requests');
    services = await box('Services');
    expect(open.x + open.width).toBeLessThanOrEqual(services.x);
    expect(Math.abs(open.y - services.y)).toBeLessThan(40);
  });

  test('common request links are at least 40 px tall', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');

    const chips = page.getByRole('list', { name: 'Common requests' }).getByRole('link');
    await expect(chips).toHaveCount(4);
    for (const chip of await chips.all()) {
      const rect = await chip.boundingBox();
      expect(rect?.height ?? 0).toBeGreaterThanOrEqual(40);
    }
  });
});
