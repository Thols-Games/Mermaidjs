import { test, expect } from '@playwright/test';

test.describe('\'Multi-Line Error Detection & Highlighting\', (', () => {

  test('identifies and highlights all error lines when multiple errors exist', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const errBar = page.locator('#editorErrorBar');
    const errText = page.locator('#editorErrorText');
    const gutter = page.locator('#gutter');
    const fixBtn = page.locator('#fixBtn');

    // 1. Enter code with multiple errors across lines 1, 2, and 3
    await editor.fill('flowchrt TD\n A ->\n B[Unclosed Label');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(800);

    // 2. Bottom error bar should report all error lines: "Errors in lines 1, 2, 3"
    await expect(errBar).toBeVisible();
    const message = await errText.textContent();
    expect(message).toBe('Errors in lines 1, 2, 3');

    // 3. Gutter should contain 3 bold red line spans for lines 1, 2, and 3
    const errSpans = gutter.locator('span.gutter-error-line');
    await expect(errSpans).toHaveCount(3);
    const lineTexts = await errSpans.allTextContents();
    expect(lineTexts.map(t => t.trim())).toEqual(['1', '2', '3']);

    // 4. Click Auto-Fix
    await fixBtn.click();
    await page.waitForTimeout(800);

    // Errors should be resolved
    await expect(errBar).toBeHidden();
    await expect(errSpans).toHaveCount(0);
  });
});
