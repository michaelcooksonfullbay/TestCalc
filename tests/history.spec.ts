import { test, expect } from './fixtures';

test.describe('History panel', () => {
  test('calculation appears in history', async ({ authenticatedPage }) => {
    const before = await authenticatedPage.historyPanel.getEntryCount();
    await authenticatedPage.calculate('5+3=');
    const after = await authenticatedPage.historyPanel.getEntryCount();
    expect(after).toBe(before + 1);

    const latest = authenticatedPage.historyPanel.getEntries().first();
    await expect(latest.locator('.history-expression')).toContainText('5');
    await expect(latest.locator('.history-result')).toContainText('8');
  });

  test('clear history removes entries', async ({ authenticatedPage }) => {
    await authenticatedPage.calculate('1+1=');
    expect(await authenticatedPage.historyPanel.getEntryCount()).toBeGreaterThan(0);

    await authenticatedPage.historyPanel.clearHistory();
    expect(await authenticatedPage.historyPanel.getEntryCount()).toBe(0);
  });
});
