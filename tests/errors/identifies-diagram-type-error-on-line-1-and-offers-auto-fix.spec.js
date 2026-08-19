import { test, expect } from '@playwright/test';

test.describe('\'Diagram Type Error Identification & Auto-Fix\', (', () => {

  test('identifies diagram type error on line 1 and offers Auto-Fix', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const errBar = page.locator('#editorErrorBar');
    const errText = page.locator('#editorErrorText');
    const gutter = page.locator('#gutter');
    const validateBtn = page.locator('#validateBtn');
    const fixBtn = page.locator('#fixBtn');

    // 1. Enter an unknown diagram type on line 1
    await editor.fill('flowchrt TD\n A --> B');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(800);

    // 2. Error bar should report "Error in line 1"
    await expect(errBar).toBeVisible();
    const message = await errText.textContent();
    expect(message).toBe('Error in line 1');

    // 3. Line 1 in the lint gutter should be marked as an error
    const errLineSpan = page.locator('.cm-lint-marker-error');
    await expect(errLineSpan).toBeVisible();

    // 4. Header should show "Invalid ✗" and "Auto-Fix" button
    await expect(validateBtn).toContainText('Invalid ✗');
    await expect(fixBtn).toBeVisible();

    // 5. Click Auto-Fix
    await fixBtn.click();
    await page.waitForTimeout(800);

    // Code on line 1 should be corrected to flowchart
    const code = await editor.inputValue();
    expect(code).toContain('flowchart');
    await expect(errBar).toBeHidden();
  });
});
