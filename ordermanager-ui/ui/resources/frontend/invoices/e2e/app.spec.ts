import { expect, test } from '@playwright/test';

test('shows the application shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('app-root')).toBeVisible();
  await expect(page.locator('.app-title')).toBeVisible();
  await expect(page.locator('app-user-login')).toBeVisible();
});
