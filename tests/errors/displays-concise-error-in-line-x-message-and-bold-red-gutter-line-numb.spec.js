import { test, expect } from '@playwright/test';

test.describe('\'Code Editor Error Handling\', (', () => {

  test('displays concise "Error in line X" message and bold red gutter line number', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const errBar = page.locator('#editorErrorBar');
    const errText = page.locator('#editorErrorText');
    const gutter = page.locator('#gutter');

    // Type invalid syntax
    await editor.fill('sequenceDiagram\n A ->');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(800); // Allow debounced auto-render

    // 1. Error bar should be visible at the bottom of the editor displaying "Error in line X"
    await expect(errBar).toBeVisible();
    const message = await errText.textContent();
    expect(message).toMatch(/Errors? in (?:lines? [\d, ]+|code editor)|Syntax Error:/i);

    // 2. Line 1 in the lint gutter should be marked as an error
    const errLineSpan = page.locator('.cm-lint-marker-error').first();
    await expect(errLineSpan).toBeVisible();

    // 3. Fix the syntax error
    await editor.fill('sequenceDiagram\n A->>B: Hello\n');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(800);

    // Error bar should hide and lint markers should clear
    await expect(errBar).toBeHidden();
    await expect(errLineSpan).not.toBeVisible();
  });
});
