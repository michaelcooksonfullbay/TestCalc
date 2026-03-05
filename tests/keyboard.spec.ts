import { test, expect } from './fixtures';

test.describe('Keyboard input', () => {
  test('calculate via keyboard (5+3 Enter)', async ({ calculatorPage, page }) => {
    await page.keyboard.press('5');
    await page.keyboard.press('+');
    await page.keyboard.press('3');
    await page.keyboard.press('Enter');
    expect(await calculatorPage.getDisplayValue()).toBe('8');
  });

  test('Escape clears, Backspace deletes last digit', async ({ calculatorPage, page }) => {
    // Type 42, then backspace removes the 2
    await page.keyboard.press('4');
    await page.keyboard.press('2');
    await page.keyboard.press('Backspace');
    expect(await calculatorPage.getDisplayValue()).toBe('4');

    // Escape clears everything back to 0
    await page.keyboard.press('Escape');
    expect(await calculatorPage.getDisplayValue()).toBe('0');
  });
});
