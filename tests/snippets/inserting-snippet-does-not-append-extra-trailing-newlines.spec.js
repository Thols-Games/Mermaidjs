import { test, expect } from '@playwright/test';

test.describe('\'Note Selection & Clean Snippet Insertion\', (', () => {

  test('Inserting snippet does not append extra trailing newlines', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('flowchart TD\n ');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(400);

    // Expand snippets panel
    const snippetsBtn = page.locator('#snippetsBtn');
    await snippetsBtn.click();
    await page.waitForTimeout(300);

    // Click the first flowchart shape snippet (Rectangle)
    const firstSnippet = page.locator('.snippet-btn').first();
    await firstSnippet.click();
    await page.waitForTimeout(300);

    const val = await editor.inputValue();
    expect(val).toBe('flowchart TD\n id1[Node]');
    expect(val.endsWith('\n')).toBe(false);
  });
});
