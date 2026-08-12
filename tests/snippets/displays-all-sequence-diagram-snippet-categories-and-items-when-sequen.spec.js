import { test, expect } from '@playwright/test';

test.describe('\'Sequence Diagram Snippets\', (', () => {

  test('Displays all sequence diagram snippet categories and items when sequenceDiagram is active', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\n participant Alice\n participant Bob');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(700);

    // Expand snippets panel
    const snippetsBtn = page.locator('#snippetsBtn');
    await snippetsBtn.click();
    await page.waitForTimeout(500);

    // Verify sequence categories are visible (scoped to main snippetsPanel, not cmSnippetsPanel)
    const seqCategories = page.locator('#snippetsPanel .snippet-category[data-type="sequence"]');
    await expect(seqCategories.first()).toBeVisible({ timeout: 5000 });
    const categoryCount = await seqCategories.count();
    expect(categoryCount).toBe(4);

    // Verify items inside sequence categories are visible
    const seqItems = page.locator('#snippetsPanel .snippet-grid[data-type="sequence"] .snippet-btn');
    await expect(seqItems.first()).toBeVisible({ timeout: 5000 });
    const itemNum = await seqItems.count();
    expect(itemNum).toBe(20); // 2 actors + 3 notes + 8 messages + 7 other = 20 items
  });
});
