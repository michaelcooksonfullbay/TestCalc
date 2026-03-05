import { type Page, type Locator } from '@playwright/test';
import { LoginBarComponent } from './login-bar.component';
import { HistoryPanelComponent } from './history-panel.component';

export class CalculatorPage {
  readonly loginBar: LoginBarComponent;
  readonly historyPanel: HistoryPanelComponent;

  private readonly display: Locator;
  private readonly expressionLine: Locator;

  constructor(private readonly page: Page) {
    this.loginBar = new LoginBarComponent(page);
    this.historyPanel = new HistoryPanelComponent(page);
    this.display = page.locator('#display');
    this.expressionLine = page.locator('#history');
  }

  async goto() {
    await this.page.goto(process.env.TEST_PATH || '/');
  }

  async getDisplayValue(): Promise<string> {
    return await this.display.innerText();
  }

  async getExpressionText(): Promise<string> {
    return await this.expressionLine.innerText();
  }

  async pressDigit(digit: string) {
    await this.page.locator(`button[data-action="digit"][data-value="${digit}"]`).click();
  }

  async pressOperator(op: string) {
    await this.page.locator(`button[data-action="operator"][data-value="${op}"]`).click();
  }

  async pressEquals() {
    await this.page.locator('button[data-action="equals"]').click();
  }

  async pressClear() {
    await this.page.locator('button[data-action="clear"]').click();
  }

  async pressDelete() {
    await this.page.locator('button[data-action="delete"]').click();
  }

  /**
   * Type a calculation string like "2+3=" using button clicks.
   * Supports digits 0-9, operators +−×÷, and = for equals.
   */
  async calculate(expression: string) {
    const operatorMap: Record<string, string> = {
      '+': '+',
      '-': '-',
      '*': '×',
      '/': '÷',
    };

    for (const char of expression) {
      if (char >= '0' && char <= '9') {
        await this.pressDigit(char);
      } else if (char in operatorMap) {
        await this.pressOperator(operatorMap[char]);
      } else if (char === '=') {
        await this.pressEquals();
      }
    }
  }
}
