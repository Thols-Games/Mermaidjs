import { test, expect } from '@playwright/test';

test.describe('\'Loop Block Selection Highlighting\', (', () => {

  test('selecting end line resolves to and highlights the enclosing loop block', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const sourceCode = 'sequenceDiagram\nparticipant Alice\nparticipant Bob\nAlice->>Bob: Hello\nloop Everyday\nAlice->>Bob: Hello\nend';
    await editor.fill(sourceCode);
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1000);

    const endIndex = sourceCode.lastIndexOf('\nend') + 1;
    await editor.evaluate((el, idx) => {
      el.focus();
      el.setSelectionRange(idx + 1, idx + 1);
      el.dispatchEvent(new Event('mouseup'));
    }, endIndex);

    await page.waitForTimeout(400);

    const previewFrame = page;
    const selectionBox = previewFrame.locator('#diagram-selection-box');
    await expect(selectionBox).toBeVisible();

    const boxWidth = await selectionBox.evaluate(el => parseFloat(el.getAttribute('width')));
    expect(boxWidth).toBeGreaterThan(150);
  });
});
