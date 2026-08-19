import { test, expect } from '@playwright/test';

// Typing `note l` filters strictly to `left of` and expands snippet on accept.
test('typing `note l` filters to left of and expands snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note l');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('left of');
  expect(opts).not.toContain('loop');

  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('note left of');
  expect(text).toContain('text');
});
