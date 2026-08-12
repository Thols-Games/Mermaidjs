import { test, expect } from '@playwright/test';

test.describe('\'Auto-Align & Participant Alias Functionality\', (', () => {

  test('Auto-Align button exists in editor header next to Auto-Update', async ({ page }) => {
    await page.goto('/');
    const autoAlignBtn = page.locator('#autoAlignBtn');
    await expect(autoAlignBtn).toBeAttached();

    const labelText = page.locator('.ide-header-right');
    await expect(labelText).toContainText('Auto-Align');
  });
});
