import { test, expect } from './fixtures';

test.describe('Calculator arithmetic', () => {
  test('displays 0 on initial load', async ({ calculatorPage }) => {
    expect(await calculatorPage.getDisplayValue()).toBe('0');
  });

  test('addition: 2 + 3 = 5', async ({ calculatorPage }) => {
    await calculatorPage.calculate('2+3=');
    expect(await calculatorPage.getDisplayValue()).toBe('5');
  });

  test('subtraction: 9 - 4 = 5', async ({ calculatorPage }) => {
    await calculatorPage.calculate('9-4=');
    expect(await calculatorPage.getDisplayValue()).toBe('5');
  });

  test('multiplication: 6 * 7 = 42', async ({ calculatorPage }) => {
    await calculatorPage.calculate('6*7=');
    expect(await calculatorPage.getDisplayValue()).toBe('42');
  });

  test('division: 8 / 2 = 4', async ({ calculatorPage }) => {
    await calculatorPage.calculate('8/2=');
    expect(await calculatorPage.getDisplayValue()).toBe('4');
  });
});
