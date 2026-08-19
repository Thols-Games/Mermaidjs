import { test, expect } from '@playwright/test';

test('shows lint gutter markers for invalid syntax', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  // Invalid diagram type on line 1 -> heuristic error -> CM lint marker.
  await page.keyboard.type('foobarTD\nA->B');

  const marker = page.locator('.cm-lint-marker-error').first();
  await expect(marker).toBeVisible({ timeout: 5000 });

  // Fixing the type clears the marker.
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('flowchart TD\nA-->B');
  await expect(marker).toHaveCount(0, { timeout: 5000 });
});
