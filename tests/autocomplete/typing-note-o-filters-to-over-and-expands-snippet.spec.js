import { test, expect } from '@playwright/test';

// Typing `note o` filters strictly to `over` and expands snippet on accept.
test('typing `note o` filters to over and expands snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note o');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('over');
  expect(opts).not.toContain('opt');

  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('note over');
  expect(text).toContain('text');
});
