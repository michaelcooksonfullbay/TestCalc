import { test as base, expect } from '@playwright/test';
import { CalculatorPage } from './pages/calculator.page';

type TestFixtures = {
  calculatorPage: CalculatorPage;
  authenticatedPage: CalculatorPage;
};

export const test = base.extend<TestFixtures>({
  calculatorPage: async ({ page }, use) => {
    const calc = new CalculatorPage(page);
    await calc.goto();
    await use(calc);
  },

  authenticatedPage: async ({ page }, use) => {
    const calc = new CalculatorPage(page);
    await calc.goto();
    await calc.loginBar.login('alice', 'password123');
    await use(calc);
  },
});

export { expect };
