import { expect, Locator, test } from '@playwright/test';

test('creates a new invoice catalog item from the create item page', async ({ page }) => {
  let saveHeaders: Record<string, string> | undefined;
  let saveRequestBody: any;

  await page.route('**/backendUrl', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: '/' })
    });
  });

  const saveRequest = new Promise<void>(resolve => {
    page.route('**/invoice/itemcatalog', async route => {
      saveHeaders = await route.request().allHeaders();
      saveRequestBody = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ createdId: 321 })
      });

      resolve();
    });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem('auth_token', 'e2e-auth-token');
    window.localStorage.setItem('basicAuthKey', 'Basic e2e-auth-token');
  });

  await page.goto('/create-invoice-item-page');

  await expect(page.locator('.catalog-item-page')).toBeVisible();
  await expect(page.locator('form.catalog-item-form')).toBeVisible();

  await page.locator('#id_ItemDesc').fill('Development consulting');
  await page.locator('#id-shortDescription').fill('Development');
  await fillInputNumber(page.locator('app-validatable-input-number input').nth(0), '120');
  await fillInputNumber(page.locator('app-validatable-input-number input').nth(1), '19');

  await expect(page.getByText('19.00%')).toBeVisible();
  await expect(page.getByRole('button', { name: /save|speichern/i })).toBeEnabled();

  await page.getByRole('button', { name: /save|speichern/i }).click();

  await saveRequest;

  expect(saveHeaders?.authorization).toBe('Bearer e2e-auth-token');
  expect(saveRequestBody).toEqual({
    description: 'Development consulting',
    shortDescription: 'Development',
    itemPrice: 120,
    vat: 19
  });

  await expect(page.getByText(/the invoice item is saved successfully|invoice item.*successfully/i).first()).toBeVisible();
  await expect(page.locator('#id_ItemDesc')).toHaveValue('');
  await expect(page.locator('#id-shortDescription')).toHaveValue('');
});

async function fillInputNumber(locator: Locator, value: string): Promise<void> {
  await locator.click();
  await locator.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await locator.pressSequentially(value);
  await locator.blur();
}
