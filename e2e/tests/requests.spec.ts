import { expect, test } from '@playwright/test';
import {
  createRequestViaForm,
  detailValue,
  requestIdFrom,
  rowFor,
  uniqueTitle,
} from '../support/requests';

test.describe('request workflow', () => {
  test('create, list, view, update the status, and keep it after a reload', async ({
    page,
    request,
  }, testInfo) => {
    const title = uniqueTitle(testInfo, 'workflow');

    // Create through the form, starting from the list page.
    await page.goto('/requests');
    await page.getByRole('main').getByRole('link', { name: 'New request' }).click();
    await expect(page).toHaveURL(/\/requests\/new$/);
    await page.getByRole('textbox', { name: 'Title' }).fill(`  ${title}  `);
    await page
      .getByRole('textbox', { name: 'Description' })
      .fill('Badge reader rejects valid cards.');
    await page.getByRole('combobox', { name: 'Type' }).selectOption('Facilities');
    await page.getByRole('button', { name: 'Create request' }).click();

    // The new request opens with the trimmed title, status New, and a success message.
    await expect(page).toHaveURL(/\/requests\/[0-9a-f-]{36}$/);
    const id = requestIdFrom(page);
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Request created.');
    await expect(detailValue(page, 'Type')).toHaveText('Facilities');
    await expect(detailValue(page, 'Status')).toHaveText('New');
    await expect(detailValue(page, 'Description')).toHaveText('Badge reader rejects valid cards.');

    // It appears in the list.
    await page.getByRole('link', { name: '← Back to requests' }).click();
    await expect(page).toHaveURL(/\/requests$/);
    const row = rowFor(page, title);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Facilities');
    await expect(row).toContainText('New');

    // Open it from the list and change the status.
    await row.getByRole('link', { name: title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/requests/${id}$`));
    const createdAt = await detailValue(page, 'Created').locator('time').getAttribute('datetime');
    await page.getByRole('combobox', { name: 'Status' }).selectOption('In Progress');
    await page.getByRole('button', { name: 'Update status' }).click();

    await expect(page.getByRole('status')).toHaveText('Status updated to In Progress.');
    await expect(detailValue(page, 'Status')).toHaveText('In Progress');
    await expect(page.getByRole('button', { name: 'Update status' })).toBeDisabled();
    const updatedAt = await detailValue(page, 'Last updated')
      .locator('time')
      .getAttribute('datetime');
    expect(Date.parse(updatedAt ?? '')).toBeGreaterThan(Date.parse(createdAt ?? ''));

    // A reload shows the persisted status, and the one-time "created" message is gone.
    await page.reload();
    await expect(detailValue(page, 'Status')).toHaveText('In Progress');
    await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue('In Progress');
    await expect(page.getByRole('status')).toHaveText('');

    // The API agrees, so the change is stored on the server, not only in the browser.
    const stored = await request.get(`/api/requests/${id}`);
    expect(stored.status()).toBe(200);
    expect(await stored.json()).toMatchObject({ data: { id, title, status: 'In Progress' } });

    // The list shows the new status.
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Requests' })
      .click();
    await expect(rowFor(page, title)).toContainText('In Progress');
  });

  test('moves through the new statuses and keeps them after a reload', async ({
    page,
    request,
  }, testInfo) => {
    const title = uniqueTitle(testInfo, 'new statuses');
    const id = await createRequestViaForm(page, { title, description: 'x', type: 'IT' });
    const statusField = page.getByRole('combobox', { name: 'Status' });
    const updateButton = page.getByRole('button', { name: 'Update status' });

    await expect(statusField.locator('option')).toHaveText([
      'New',
      'Awaiting approval',
      'In Progress',
      'Needs your reply',
      'Completed',
    ]);

    await statusField.selectOption('Awaiting approval');
    await updateButton.click();
    await expect(page.getByRole('status')).toHaveText('Status updated to Awaiting approval.');
    await expect(detailValue(page, 'Status')).toHaveText('Awaiting approval');

    await statusField.selectOption('Needs your reply');
    await updateButton.click();
    await expect(page.getByRole('status')).toHaveText('Status updated to Needs your reply.');

    await page.reload();
    await expect(detailValue(page, 'Status')).toHaveText('Needs your reply');
    const stored = await request.get(`/api/requests/${id}`);
    expect(await stored.json()).toMatchObject({ data: { status: 'Needs your reply' } });

    await page.goto('/requests');
    await expect(rowFor(page, title)).toContainText('Needs your reply');
  });

  test('lists newer requests first', async ({ page }, testInfo) => {
    const older = uniqueTitle(testInfo, 'older');
    const newer = uniqueTitle(testInfo, 'newer');
    await createRequestViaForm(page, { title: older, description: 'First.', type: 'IT' });
    await createRequestViaForm(page, { title: newer, description: 'Second.', type: 'HR' });

    await page.goto('/requests');

    const titles = await page.getByRole('row').locator('td:first-child a').allTextContents();
    expect(titles.indexOf(newer)).toBeGreaterThanOrEqual(0);
    expect(titles.indexOf(newer)).toBeLessThan(titles.indexOf(older));
  });
});

test.describe('search', () => {
  /** A unique word (letters and digits only) that no other request contains. */
  function uniqueWord(title: string): string {
    return title.replace(/\W+/g, '');
  }

  test('finds requests by title or description, keeps the search after a reload, and clears it', async ({
    page,
  }, testInfo) => {
    const word = uniqueWord(uniqueTitle(testInfo, 'search'));
    const byTitle = `Printer ${word} jammed`;
    const byDescription = uniqueTitle(testInfo, 'search description');
    const unrelated = uniqueTitle(testInfo, 'search unrelated');
    await createRequestViaForm(page, { title: byTitle, description: 'Tray 2.', type: 'IT' });
    await createRequestViaForm(page, {
      title: byDescription,
      description: `Mentions ${word.toUpperCase()} in the text.`,
      type: 'Facilities',
    });
    await createRequestViaForm(page, { title: unrelated, description: 'x', type: 'HR' });

    await page.goto('/requests');
    const searchBox = page.getByRole('searchbox', { name: 'Search requests' });
    await searchBox.fill(word);
    await searchBox.press('Enter');

    await expect(page).toHaveURL(`/requests?q=${word}`);
    await expect(page.getByRole('status')).toHaveText(`2 requests match “${word}”`);
    await expect(rowFor(page, byTitle)).toHaveCount(1);
    await expect(rowFor(page, byDescription)).toHaveCount(1);
    await expect(rowFor(page, unrelated)).toHaveCount(0);

    await page.reload();
    await expect(searchBox).toHaveValue(word);
    await expect(page.getByRole('status')).toHaveText(`2 requests match “${word}”`);
    await expect(rowFor(page, unrelated)).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page).toHaveURL('/requests');
    await expect(searchBox).toBeFocused();
    await expect(rowFor(page, unrelated)).toHaveCount(1);
  });

  test('shows a no-results state', async ({ page }, testInfo) => {
    const word = uniqueWord(uniqueTitle(testInfo, 'no match'));

    await page.goto(`/requests?q=${word}`);

    await expect(page.getByText(`No requests match “${word}”.`)).toBeVisible();
    await expect(page.getByRole('status')).toHaveText(`0 requests match “${word}”`);
  });

  test('an old /?q= link opens the same search on /requests', async ({ page }, testInfo) => {
    const word = uniqueWord(uniqueTitle(testInfo, 'old link'));
    await page.goto('/requests/new');

    await page.goto(`/?q=${word}`);

    await expect(page).toHaveURL(`/requests?q=${word}`);
    await expect(page.getByRole('searchbox', { name: 'Search requests' })).toHaveValue(word);

    // The redirect replaces the history entry, so Back returns to the previous page
    // instead of landing on / and being redirected forward again.
    await page.goBack();
    await expect(page).toHaveURL('/requests/new');
  });
});

test.describe('validation and errors', () => {
  test('validates the form in the browser without sending a request', async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (sent) => {
      if (sent.method() === 'POST') posts.push(sent.url());
    });

    await page.goto('/requests/new');
    await page.getByRole('button', { name: 'Create request' }).click();

    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Description is required')).toBeVisible();
    await expect(page.getByText('Select a request type')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Title' })).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await page.getByRole('textbox', { name: 'Title' }).fill('a'.repeat(201));
    await page.getByRole('button', { name: 'Create request' }).click();
    await expect(page.getByText('Title must be at most 200 characters')).toBeVisible();

    await expect(page).toHaveURL(/\/requests\/new$/);
    expect(posts).toEqual([]);
  });

  test('shows "Request not found" for unknown and malformed ids', async ({ page }) => {
    await page.goto('/requests/00000000-0000-4000-8000-000000000000');
    await expect(page.getByRole('heading', { level: 1, name: 'Request not found' })).toBeVisible();

    await page.goto('/requests/not-a-uuid');
    await expect(page.getByRole('heading', { level: 1, name: 'Request not found' })).toBeVisible();

    await page.getByRole('link', { name: '← Back to requests' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Requests' })).toBeVisible();
  });

  test('shows an error when the list cannot load and recovers with "Try again"', async ({
    page,
  }) => {
    await page.route('**/api/requests', (route) => route.abort('connectionrefused'));
    await page.goto('/requests');

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Could not load requests.');
    await expect(alert).toContainText('Could not reach the server.');

    await page.unroute('**/api/requests');
    await alert.getByRole('button', { name: 'Try again' }).click();

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('table').or(page.getByText('No requests yet'))).toBeVisible();
  });

  test('shows an error when a status update fails and keeps the request unchanged', async ({
    page,
    request,
  }, testInfo) => {
    const title = uniqueTitle(testInfo, 'update failure');
    const id = await createRequestViaForm(page, { title, description: 'x', type: 'Other' });

    await page.route('**/api/requests/*/status', (route) =>
      route.fulfill({
        status: 500,
        json: { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
      }),
    );
    await page.getByRole('combobox', { name: 'Status' }).selectOption('Completed');
    await page.getByRole('button', { name: 'Update status' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Could not update the status.');
    await expect(alert).toContainText('An unexpected error occurred.');
    await expect(detailValue(page, 'Status')).toHaveText('New');

    const stored = await request.get(`/api/requests/${id}`);
    expect(await stored.json()).toMatchObject({ data: { status: 'New' } });
  });
});
