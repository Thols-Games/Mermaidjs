import { test, expect } from '@playwright/test';

// Selecting `note left of` expands to the full note snippet.
test('selecting `note left of` inserts note left of snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  await page.waitForTimeout(120);
  await popup.locator('li').filter({ hasText: 'note left of' }).first().click();

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('note left of');
  expect(text).toContain('text');
});
