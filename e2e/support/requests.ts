import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

export type RequestType = 'IT' | 'Facilities' | 'HR' | 'Other';

/**
 * A title no other test or earlier run uses, so tests can find their own rows in a shared
 * database without clearing it.
 */
export function uniqueTitle(testInfo: TestInfo, label: string): string {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `E2E ${label} r${testInfo.retry} ${suffix}`;
}

/** The value shown next to a term on the request detail page (for example "Status"). */
export function detailValue(page: Page, term: string): Locator {
  return page
    .locator('dl > div')
    .filter({ has: page.locator('dt', { hasText: term }) })
    .locator('dd');
}

/** The list-page row whose title link is exactly `title`. */
export function rowFor(page: Page, title: string): Locator {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: title, exact: true }) });
}

/** Extracts the request id from a /requests/:id URL. */
export function requestIdFrom(page: Page): string {
  const match = /\/requests\/([0-9a-f-]{36})$/.exec(new URL(page.url()).pathname);
  if (!match?.[1]) throw new Error(`Not on a request detail page: ${page.url()}`);
  return match[1];
}

/** Fills and submits the new request form, then waits for the new request's page. */
export async function createRequestViaForm(
  page: Page,
  input: { title: string; description: string; type: RequestType },
): Promise<string> {
  await page.goto('/requests/new');
  await page.getByRole('textbox', { name: 'Title' }).fill(input.title);
  await page.getByRole('textbox', { name: 'Description' }).fill(input.description);
  await page.getByRole('combobox', { name: 'Type' }).selectOption(input.type);
  await page.getByRole('button', { name: 'Create request' }).click();

  await expect(page).toHaveURL(/\/requests\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: input.title })).toBeVisible();
  return requestIdFrom(page);
}
