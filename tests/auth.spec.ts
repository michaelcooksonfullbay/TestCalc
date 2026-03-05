import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('guest mode indicator on load', async ({ calculatorPage }) => {
    await expect(calculatorPage.loginBar.getGuestIndicator()).toBeVisible();
    await expect(calculatorPage.loginBar.getLoginForm()).toBeVisible();
  });

  test('login with valid credentials', async ({ calculatorPage }) => {
    await calculatorPage.loginBar.login('alice', 'password123');
    expect(await calculatorPage.loginBar.getLoggedInUser()).toBe('alice');
    await expect(calculatorPage.loginBar.getGuestIndicator()).toBeHidden();
  });

  test('logout returns to guest mode', async ({ authenticatedPage }) => {
    await authenticatedPage.loginBar.logout();
    await expect(authenticatedPage.loginBar.getLoginForm()).toBeVisible();
    await expect(authenticatedPage.loginBar.getGuestIndicator()).toBeVisible();
  });

  test('signup new user via modal', async ({ calculatorPage, page }) => {
    await page.locator('#signup-btn').click();
    await page.locator('#signup-username').fill('newuser');
    await page.locator('#signup-password').fill('pass123');
    await page.locator('#signup-email').fill('new@example.com');
    await page.locator('#signup-phone').fill('(555) 123-4567');
    await page.locator('#signup-submit').click();
    // Wait for signup to complete (signup has a random delay)
    await expect(page.locator('#current-user-label')).toHaveText('newuser', { timeout: 5000 });
  });
});
