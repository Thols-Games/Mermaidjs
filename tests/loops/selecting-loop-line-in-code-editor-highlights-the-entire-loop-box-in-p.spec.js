import { test, expect } from '@playwright/test';

test.describe('\'Loop Block Selection Highlighting\', (', () => {

  test('selecting loop line in code editor highlights the entire loop box in preview', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const sourceCode = 'sequenceDiagram\nparticipant Alice\nparticipant Bob\nAlice->>Bob: Hello\nloop Everyday\nAlice->>Bob: Hello\nend';
    await editor.fill(sourceCode);
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1000);

    const loopIndex = sourceCode.indexOf('loop Everyday');
    await editor.evaluate((el, idx) => {
      el.focus();
      el.setSelectionRange(idx + 2, idx + 2);
      el.dispatchEvent(new Event('mouseup'));
    }, loopIndex);

    await page.waitForTimeout(400);

    const previewFrame = page;
    const selectionBox = previewFrame.locator('#diagram-selection-box');
    await expect(selectionBox).toBeVisible();

    const boxWidth = await selectionBox.evaluate(el => parseFloat(el.getAttribute('width')));
    const boxHeight = await selectionBox.evaluate(el => parseFloat(el.getAttribute('height')));

    expect(boxWidth).toBeGreaterThan(150);
    expect(boxHeight).toBeGreaterThan(60);
  });
});
