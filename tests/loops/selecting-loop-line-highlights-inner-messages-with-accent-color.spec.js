import { test, expect } from '@playwright/test';

test.describe('\'Loop Block Selection Highlighting\', (', () => {

  test('selecting loop line highlights inner messages with accent color', async ({ page }) => {
    await page.goto('/');
    const src = 'sequenceDiagram\nparticipant Alice\nparticipant Bob\nloop Everyday\nAlice->>Bob: Inside 1\nBob->>Alice: Inside 2\nend';
    const editor = page.locator('#source');
    await editor.fill(src);
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1000);

    const loopIndex = src.indexOf('loop Everyday');
    await editor.evaluate((el, idx) => {
      el.focus();
      el.setSelectionRange(idx + 2, idx + 2);
      el.dispatchEvent(new Event('mouseup'));
    }, loopIndex);

    await page.waitForTimeout(400);

    const innerCount = await page.evaluate(() => {
      return document.querySelectorAll('.inner-loop-message').length;
    });
    expect(innerCount).toBe(2);
  });
});
