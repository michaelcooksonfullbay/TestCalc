import { type Page, type Locator } from '@playwright/test';

export class HistoryPanelComponent {
  private readonly historyList: Locator;
  private readonly clearBtn: Locator;
  private readonly refreshBtn: Locator;

  constructor(private readonly page: Page) {
    this.historyList = page.locator('#history-list');
    this.clearBtn = page.locator('#clear-history-btn');
    this.refreshBtn = page.locator('#refresh-history-btn');
  }

  async getEntryCount(): Promise<number> {
    return await this.historyList.locator('.history-entry').count();
  }

  getEntries() {
    return this.historyList.locator('.history-entry');
  }

  async clearHistory() {
    await this.clearBtn.click();
  }

  async refreshHistory() {
    await this.refreshBtn.click();
  }
}
