import { test, expect } from '@playwright/test';

test.describe('\'Duplicate Message Selection Sync\', (', () => {

  test('selecting third duplicate message line in editor highlights third message in preview', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    // Using ->> for the first two, and -->> for the third, to test label-based sync
    const sourceCode = 'sequenceDiagram\nparticipant Alice\nparticipant Bob\nAlice->>Bob: Hello\nloop Everyday\nAlice->>Bob: Hello\nend\nloop Another Loop\nAlice-->>Bob: Hello\nend';
    await editor.fill(sourceCode);
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1000);

    const previewFrame = page;
    const selectionBox = previewFrame.locator('#diagram-selection-box');

    // 1. Place cursor on line 4 (first Hello message, outside loop)
    const line4Index = sourceCode.indexOf('Alice->>Bob: Hello');
    await editor.evaluate((el, idx) => {
      el.focus();
      el.setSelectionRange(idx + 2, idx + 2);
      el.dispatchEvent(new Event('mouseup'));
    }, line4Index);
    await page.waitForTimeout(400);
    await expect(selectionBox).toBeVisible();
    const boxYFirst = await selectionBox.evaluate(el => parseFloat(el.getAttribute('y')));

    // 2. Place cursor on line 9 (third Hello message, inside second loop, using -->>)
    const line9Index = sourceCode.lastIndexOf('Alice-->>Bob: Hello');
    await editor.evaluate((el, idx) => {
      el.focus();
      el.setSelectionRange(idx + 2, idx + 2);
      el.dispatchEvent(new Event('mouseup'));
    }, line9Index);
    await page.waitForTimeout(400);
    const boxYThird = await selectionBox.evaluate(el => parseFloat(el.getAttribute('y')));

    // Assert correct vertical ordering. Third message should be below the first one.
    expect(boxYThird).toBeGreaterThan(boxYFirst);

    await page.screenshot({ path: 'third_duplicate_message_snapshot.png' });
  });
});
