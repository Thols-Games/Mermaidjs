import { test, expect } from '@playwright/test';

// Typing `note` should offer several note variants, and the plain `note`
// option must insert only the keyword (not a forced "left of" template).
test('typing `note` lists variants; plain note inserts just `note`', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('note left of');
  expect(opts).toContain('note right of');
  expect(opts).toContain('note over');
  // `note across` is NOT valid Mermaid syntax (use `note over A,B`), so it must
  // not be offered as a completion.
  expect(opts).not.toContain('note across');

  // First option is the plain `note` keyword.
  await page.waitForTimeout(120);
  await popup.locator('li').first().click();

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text.trim().endsWith('note')).toBeTruthy();
  expect(text).not.toContain('left of');
});
