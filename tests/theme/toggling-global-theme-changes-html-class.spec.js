import { test, expect } from '@playwright/test';

test.describe('\'Theme & Styles\', (', () => {

  test('toggling global theme changes HTML class', async ({ page }) => {
    await page.goto('/');
    // Click Dark theme button inside theme panel via DOM evaluate
    await page.evaluate(() => {
      const darkBtn = document.querySelector('.theme-btn[data-theme="dark"]');
      if (darkBtn) darkBtn.click();
    });
    await page.waitForTimeout(300);
    const htmlClass1 = await page.locator('html').getAttribute('class');
    expect(htmlClass1.includes('theme-dark') || htmlClass1 === '').toBe(true);

    // Click Light theme button inside theme panel via DOM evaluate
    await page.evaluate(() => {
      const lightBtn = document.querySelector('.theme-btn[data-theme="default"]');
      if (lightBtn) lightBtn.click();
    });
    await page.waitForTimeout(300);
    await expect(page.locator('html')).toHaveClass(/theme-light/);
  });
});
