import { expect, test, type Locator, type Page } from '@playwright/test';
import { detailValue, uniqueTitle } from '../support/requests';

/** Fails unless the focused element shows a visible outline (the app's focus ring). */
async function expectVisibleFocus(page: Page): Promise<void> {
  const outline = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(outline, 'an element should have keyboard focus').not.toBeNull();
  expect(outline?.style).not.toBe('none');
  expect(outline?.width).toBeGreaterThan(0);
}

/** Presses Tab until `target` is focused, checking the focus ring at every stop. */
async function tabTo(page: Page, target: Locator, maxStops = 20): Promise<void> {
  for (let stop = 0; stop < maxStops; stop++) {
    await page.keyboard.press('Tab');
    await expectVisibleFocus(page);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Could not reach the target with ${maxStops} Tab presses`);
}

test('the skip link is the first stop and moves focus to the main content', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expectVisibleFocus(page);

  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('create a request and update its status using only the keyboard', async ({
  page,
}, testInfo) => {
  const title = uniqueTitle(testInfo, 'keyboard');
  await page.goto('/');

  // Header navigation to the form.
  await tabTo(
    page,
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'New request' }),
  );
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/requests\/new$/);

  // Fill in the form field by field.
  const titleField = page.getByRole('textbox', { name: 'Title' });
  await tabTo(page, titleField);
  await page.keyboard.type(title);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Description' })).toBeFocused();
  await page.keyboard.type('Entered with the keyboard only.');
  await page.keyboard.press('Tab');
  const typeField = page.getByRole('combobox', { name: 'Type' });
  await expect(typeField).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(typeField).toHaveValue('IT');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Create request' })).toBeFocused();
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Request created.');

  // Change the status.
  const statusField = page.getByRole('combobox', { name: 'Status' });
  await tabTo(page, statusField);
  await page.keyboard.press('ArrowDown');
  await expect(statusField).toHaveValue('In Progress');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Update status' })).toBeFocused();
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');

  await expect(page.getByRole('status')).toHaveText('Status updated to In Progress.');
  await expect(detailValue(page, 'Status')).toHaveText('In Progress');
});
