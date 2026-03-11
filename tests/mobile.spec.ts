import { test, expect } from './fixtures';

test.describe('Responsive layout', () => {
  test('info panel is visible alongside calculator', async ({ calculatorPage, page }) => {
    await expect(page.locator('#info-panel')).toBeVisible();
  });
});
