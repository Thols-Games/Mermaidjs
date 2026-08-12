import { test, expect } from '@playwright/test';

test.describe('\'Auto-Fix Error Functionality\', (', () => {

  test('clicking Auto-Fix automatically resolves syntax errors in the editor', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const autoFixBtn = page.locator('#fixBtn');
    const errBar = page.locator('#editorErrorBar');

    // 1. Enter broken code (incomplete sequence diagram arrow)
    await editor.fill('sequenceDiagram\n A ->');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(800);

    // Error bar and Auto-Fix button should appear
    await expect(errBar).toBeVisible();
    await expect(autoFixBtn).toBeVisible();

    // 2. Click Auto-Fix
    await autoFixBtn.click();
    await page.waitForTimeout(800);

    // 3. Verify that code is fixed and error bar is cleared
    const val = await editor.inputValue();
    expect(val).toContain('B');
    await expect(errBar).toBeHidden();
  });
});
