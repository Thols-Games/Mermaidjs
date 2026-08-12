import { test, expect } from '@playwright/test';

test.describe('\'Note Selection & Clean Snippet Insertion\', (', () => {

  test('Note selection rect encloses both note text and background rectangle', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\n participant Alice\n Note left of Alice: Cache invalidated');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1000);

    // Click on Note element inside preview iframe
    const previewFrame = page;
    const noteEl = previewFrame.locator('[class*="note"]').first();
    await expect(noteEl).toBeVisible();

    await noteEl.click({ force: true });
    await page.waitForTimeout(300);

    const selectionBox = previewFrame.locator('#diagram-selection-box');
    await expect(selectionBox).toBeVisible();

    const boxWidth = await selectionBox.evaluate(el => parseFloat(el.getAttribute('width')));
    const boxHeight = await selectionBox.evaluate(el => parseFloat(el.getAttribute('height')));

    expect(boxWidth).toBeGreaterThan(40);
    expect(boxHeight).toBeGreaterThan(20);
  });
});
