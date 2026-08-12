import { test, expect } from '@playwright/test';

test.describe('\'Clear Button, Docs Icon & Actor Green Selection Rect\', (', () => {

  test('Canvas top-right documentation button uses the open-book icon', async ({ page }) => {
    await page.goto('/');
    const docsBtn = page.locator('#canvasDocsBtn');
    await expect(docsBtn).toBeVisible();
    const svgPath = docsBtn.locator('path').first();
    const pathD = await svgPath.getAttribute('d');
    expect(pathD).toContain('M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z');
  });
});
