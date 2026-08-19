import { test, expect } from '@playwright/test';

// Typing `note r` filters strictly to `right of` and expands snippet on accept.
test('typing `note r` filters to right of and expands snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note r');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('right of');
  expect(opts).not.toContain('rect');

  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('note right of');
  expect(text).toContain('text');
});
