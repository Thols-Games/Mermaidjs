import { test, expect } from '@playwright/test';

test.describe('\'Editor Persistent Invalid Status & Header Order\', (', () => {

  test('Invalid status persists while editor is invalid, followed by Auto-Fix button', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const validateBtn = page.locator('#validateBtn');
    const fixBtn = page.locator('#fixBtn');

    // 1. Enter broken syntax
    await editor.fill('sequenceDiagram\n A ->');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(800);

    // Validate button should show "Invalid ✗" persistently
    await expect(validateBtn).toContainText('Invalid ✗');

    // Auto-Fix button should be visible right next to it
    await expect(fixBtn).toBeVisible();

    // Wait 2 seconds and verify Invalid ✗ is STILL displayed (does not auto-revert while invalid)
    await page.waitForTimeout(2000);
    await expect(validateBtn).toContainText('Invalid ✗');

    // 2. Click Auto-Fix
    await fixBtn.click();
    await page.waitForTimeout(800);

    // 3. Status should return to valid/default and Auto-Fix should hide
    await expect(fixBtn).toBeHidden();
    await expect(validateBtn).not.toContainText('Invalid ✗');
  });
});
