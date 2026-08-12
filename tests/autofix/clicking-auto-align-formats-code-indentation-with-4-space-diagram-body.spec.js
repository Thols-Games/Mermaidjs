import { test, expect } from '@playwright/test';

test.describe('\'Auto-Align & Participant Alias Functionality\', (', () => {

  test('Clicking Auto-Align formats code indentation with 4-space diagram body alignment', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\nparticipant Alice\nparticipant Bob\nloop Everyday\nAlice->>Bob: Hello\nend');
    await editor.dispatchEvent('input');

    await page.evaluate(() => {
      const btn = document.getElementById('autoAlignBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(400);

    const formattedCode = await editor.inputValue();
    expect(formattedCode).toBe('sequenceDiagram\n    participant Alice\n    participant Bob\n    loop Everyday\n        Alice->>Bob: Hello\n    end');
  });
});
