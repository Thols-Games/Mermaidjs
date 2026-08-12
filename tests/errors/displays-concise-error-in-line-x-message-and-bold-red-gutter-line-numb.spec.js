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

    // 2. Line number span in gutter should have .gutter-error-line class (bold red)
    const errLineSpan = gutter.locator('span.gutter-error-line').first();
    await expect(errLineSpan).toBeVisible();
    const lineText = (await errLineSpan.textContent()).trim();
    expect(['1', '2']).toContain(lineText);

    // Verify computed style is bold red
    const color = await errLineSpan.evaluate(el => getComputedStyle(el).color);
    const fontWeight = await errLineSpan.evaluate(el => getComputedStyle(el).fontWeight);
    expect(color).toContain('rgb(255, 51, 51)'); // #ff3333
    expect(['bold', '700', '800', '900']).toContain(fontWeight);

    // 3. Fix the syntax error
    await editor.fill('sequenceDiagram\n A->>B: Hello\n');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(800);

    // Error bar should hide and gutter line should clear
    await expect(errBar).toBeHidden();
    await expect(errLineSpan).not.toBeVisible();
  });
});
