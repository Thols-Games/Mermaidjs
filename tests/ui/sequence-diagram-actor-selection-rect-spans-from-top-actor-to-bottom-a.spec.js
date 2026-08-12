import { test, expect } from '@playwright/test';

test.describe('\'Clear Button, Docs Icon & Actor Green Selection Rect\', (', () => {

  test('Sequence diagram actor selection rect spans from top actor to bottom actor', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\n participant Alice\n participant Bob\n Alice->>Bob: Hello');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(800);

    const previewFrame = page;
    const actorText = previewFrame.locator('.preview text.actor').first();
    await expect(actorText).toBeVisible();

    // Click the Alice actor node in preview canvas
    await actorText.click({ force: true });
    await page.waitForTimeout(300);

    const selectionBox = previewFrame.locator('#diagram-selection-box');
    await expect(selectionBox).toBeVisible();

    const boxHeight = await selectionBox.evaluate(el => parseFloat(el.getAttribute('height')));
    expect(boxHeight).toBeGreaterThan(60); // Height should span across top and bottom actor boxes
  });
});
