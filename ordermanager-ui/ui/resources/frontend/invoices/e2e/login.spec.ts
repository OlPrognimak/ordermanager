import { expect, test } from '@playwright/test';

const username = process.env['E2E_USERNAME'] ?? 'test';
const password = process.env['E2E_PASSWORD'] ?? 'test123';

test('logs in to ordermanager and logs out', async ({ page }) => {
  await page.goto('/');

  await page.locator('#id_UserName').fill(username);
  await page.locator('#id_UserPassword').fill(password);
  await page.getByRole('button', { name: /login|anmelden/i }).click();

  await expect(page.locator('app-user-login')).toBeHidden();
  await expect(page.locator('.app-main-menu')).toBeVisible();

  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token')))
    .toBeTruthy();

  await page.getByText(/logout|abmelden/i).click();

  await expect(page.locator('app-user-login')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token')))
    .toBeNull();
});
