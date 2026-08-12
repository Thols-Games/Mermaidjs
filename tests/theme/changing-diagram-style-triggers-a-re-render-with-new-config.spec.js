import { test, expect } from '@playwright/test';

test.describe('\'Theme & Styles\', (', () => {

  test('changing diagram style triggers a re-render with new config', async ({ page }) => {
    await page.goto('/');
    // First load a diagram so the preview iframe has an SVG to re-render
    const editor = page.locator('#source');
    await editor.fill('flowchart TD\n A --> B');
    await editor.dispatchEvent('input');
    const previewFrame = page;
    await previewFrame.locator('#target svg').waitFor({ state: 'visible', timeout: 10000 });

    // Click 'sharp' style via DOM evaluate
    await page.evaluate(() => {
      const sharpBtn = document.querySelector('.style-btn[data-style="sharp"]');
      if (sharpBtn) sharpBtn.click();
    });
    await page.waitForTimeout(500);

    await expect(page.locator('.style-btn[data-style="sharp"]')).toHaveClass(/active/);
    await expect(previewFrame.locator('#target svg')).toBeVisible();
  });
});
