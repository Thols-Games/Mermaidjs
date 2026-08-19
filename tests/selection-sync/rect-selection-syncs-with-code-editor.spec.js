import { test, expect } from '@playwright/test';

test.describe('Rect Block Selection Sync', () => {
  test('clicking rect line in editor highlights rect block in SVG diagram', async ({ page }) => {
    await page.goto('/');

    const editor = page.locator('#source');
    const sourceCode = [
      'sequenceDiagram',
      'actor Alice',
      'actor Bob',
      'rect rgb(200, 255, 200)',
      '  Alice->>Bob: Hello',
      'end'
    ].join('\n');

    await editor.fill(sourceCode);
    await editor.dispatchEvent('input');

    // Wait for the SVG rect block to render
    await page.waitForTimeout(1000);

    // Place cursor on the rect line in the editor
    const rectIndex = sourceCode.indexOf('rect rgb(200, 255, 200)');
    await editor.evaluate((el, idx) => {
      el.focus();
      el.setSelectionRange(idx + 4, idx + 4);
      el.dispatchEvent(new Event('mouseup'));
    }, rectIndex);

    await page.waitForTimeout(400);

    // Expect a selection highlight box to appear in the SVG
    const selectionBox = page.locator('#diagram-selection-box');
    await expect(selectionBox).toBeVisible();

    // The box should have meaningful dimensions
    const boxWidth = await selectionBox.evaluate(el => parseFloat(el.getAttribute('width')));
    const boxHeight = await selectionBox.evaluate(el => parseFloat(el.getAttribute('height')));
    expect(boxWidth).toBeGreaterThan(50);
    expect(boxHeight).toBeGreaterThan(20);
  });
});
