import { test, expect } from '@playwright/test';

test.describe('\'Auto-Align & Participant Alias Functionality\', (', () => {

  test('Updating participant declaration to alias updates participant references across diagram when aligned', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\nparticipant Alice\nparticipant Bob\nAlice->>Bob: Hello\nBob->>Alice: Response');
    await editor.dispatchEvent('input');

    await page.evaluate(() => {
      const btn = document.getElementById('autoAlignBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);

    // Update line 2 from participant Alice to participant A as Alice
    await editor.fill('sequenceDiagram\nparticipant A as Alice\nparticipant Bob\nAlice->>Bob: Hello\nBob->>Alice: Response');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(400);
    
    await page.evaluate(() => {
      const btn = document.getElementById('autoAlignBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);

    const val = await editor.inputValue();
    expect(val).toContain('A->>Bob: Hello');
    expect(val).toContain('Bob->>A: Response');
  });
});
