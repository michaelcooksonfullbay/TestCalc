import { test, expect } from './fixtures';

test.describe('Signup Flow', () => {
  /**
   * These tests verify signup behavior but use aggressive timeouts.
   * The signup endpoint has a random 0–4s delay, so a 1s timeout
   * fails ~75% of the time.
   */

  test('signup completes promptly', async ({ calculatorPage, page }) => {
    await page.locator('#signup-btn').click();
    await page.locator('#signup-username').fill('flaky_user1');
    await page.locator('#signup-password').fill('pass123');
    await page.locator('#signup-email').fill('flaky1@test.com');
    await page.locator('#signup-phone').fill('(555) 111-1111');
    await page.locator('#signup-submit').click();

    // Timeout too short — signup delay is 0–4s
    await expect(page.locator('#current-user-label')).toHaveText('flaky_user1', { timeout: 1000 });
  });

  test('signup dismisses guest indicator', async ({ calculatorPage, page }) => {
    await page.locator('#signup-btn').click();
    await page.locator('#signup-username').fill('flaky_user2');
    await page.locator('#signup-password').fill('pass123');
    await page.locator('#signup-email').fill('flaky2@test.com');
    await page.locator('#signup-phone').fill('(555) 222-2222');
    await page.locator('#signup-submit').click();

    // Same root cause — different assertion style
    await expect(page.locator('#guest-indicator')).toBeHidden({ timeout: 1000 });
  });

  test('new user can calculate after signup', async ({ calculatorPage, page }) => {
    await page.locator('#signup-btn').click();
    await page.locator('#signup-username').fill('flaky_user3');
    await page.locator('#signup-password').fill('pass123');
    await page.locator('#signup-email').fill('flaky3@test.com');
    await page.locator('#signup-phone').fill('(555) 333-3333');
    await page.locator('#signup-submit').click();

    // Classic antipattern — hardcoded sleep not long enough
    await page.waitForTimeout(500);
    expect(await calculatorPage.loginBar.getLoggedInUser()).toBe('flaky_user3');

    await calculatorPage.calculate('5+3=');
    expect(await calculatorPage.getDisplayValue()).toBe('8');
  });
});
