import { test, expect } from '@playwright/test';

// Verifies that typing a diagram-body keyword (e.g. `loop`) surfaces an
// autocomplete completion that expands into a snippet (loop name / end).
test('typing `loop` expands into a loop..end snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  // Start from a clean sequence-diagram body.
  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  // Type the keyword prefix; the autocomplete popup should appear.
  await page.keyboard.type('lo');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  // Accept the top completion with Enter (natural UX).
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('loop name');
  expect(text).toContain('end');
});
