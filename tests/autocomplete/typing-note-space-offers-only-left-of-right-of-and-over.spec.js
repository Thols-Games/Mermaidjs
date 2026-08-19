import { test, expect } from '@playwright/test';

// Typing `note ` (with space) offers only note positions: `left of`, `right of`, `over`.
test('typing `note ` offers only left of, right of, and over', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note ');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('left of');
  expect(opts).toContain('right of');
  expect(opts).toContain('over');
  // Must NOT contain unrelated keywords
  expect(opts).not.toContain('loop');
  expect(opts).not.toContain('alt');
  expect(opts).not.toContain('subgraph');
  expect(opts).not.toContain('participant');
});
