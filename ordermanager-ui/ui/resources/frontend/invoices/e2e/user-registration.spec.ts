import { expect, test } from '@playwright/test';

test('creates a new user from the registration page', async ({ page }) => {
  const username = `e2e-user-${Date.now()}`;
  const password = 'test123';
  let registrationHeaders: Record<string, string> | undefined;
  let loginHeaders: Record<string, string> | undefined;

  // Mock the backend base URL lookup so this test does not depend on the Spring Boot UI wrapper.
  await page.route('**/backendUrl', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: '/' })
    });
  });

  const registrationRequest = new Promise<void>(resolve => {
    page.route('**/registration', async route => {
      registrationHeaders = await route.request().allHeaders();

      // This mock response replaces the real registration API call.
      // Because the request is fulfilled here, no user is physically saved to the database.
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ createdId: 123 })
      });

      resolve();
    });
  });

  const loginRequest = new Promise<void>(resolve => {
    page.route('**/login', async route => {
      loginHeaders = await route.request().allHeaders();

      // This mock response replaces the real login API call.
      // It validates the frontend flow with the created credentials but does not read from the database.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logged: true, token: 'e2e-auth-token' })
      });

      resolve();
    });
  });

  await page.goto('/user-registration-page');

  await expect(page.getByRole('heading', { name: /user registration|benutzerregistrierung/i })).toBeVisible();

  await page.locator('#id_UserName').fill(username);
  await page.locator('#id_UserPassword').fill(password);
  await page.locator('#id_UserPasswordRepeat').fill(password);
  await page.getByRole('button', { name: /register user|benutzer registrieren/i }).click();

  await registrationRequest;

  expect(registrationHeaders?.['user-name']).toBe(username);
  expect(registrationHeaders?.['user-password']).toBe(password);

  await expect(page.locator('#id_UserName')).toHaveValue('');
  await expect(page.locator('#id_UserPassword')).toHaveValue('');
  await expect(page.locator('#id_UserPasswordRepeat')).toHaveValue('');
  await expect(page.getByText(/the user is saved successfully|user.*successfully/i)).toBeVisible();

  await page.getByRole('link', { name: /back to sign in|zurück zur anmeldung/i }).click();

  await page.locator('#id_UserName').fill(username);
  await page.locator('#id_UserPassword').fill(password);
  await page.getByRole('button', { name: /sign in|anmelden/i }).click();

  await loginRequest;

  expect(loginHeaders?.['login-credentials']).toBe(btoa(`${username}:${password}`));
  await expect(page.locator('app-user-login')).toBeHidden();
  await expect(page.locator('.app-main-menu')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token')))
    .toBe('e2e-auth-token');

  await page.getByText(/logout|abmelden/i).click();

  await expect(page.locator('app-user-login')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('auth_token')))
    .toBeNull();
});
