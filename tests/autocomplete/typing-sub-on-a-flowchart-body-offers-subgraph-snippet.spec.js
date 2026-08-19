import { test, expect } from '@playwright/test';

// Other body keywords should also offer snippet completions.
test('typing `sub` on a flowchart body offers subgraph snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('flowchart TD\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('sub');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('subgraph');
  expect(text).toContain('end');
});
