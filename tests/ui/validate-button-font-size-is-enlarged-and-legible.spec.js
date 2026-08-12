import { test, expect } from '@playwright/test';

test.describe('\'UI Refinements & Controls\', (', () => {

  test('Validate button font size is enlarged and legible', async ({ page }) => {
    await page.goto('/');
    const validateBtn = page.locator('#validateBtn');
    await expect(validateBtn).toBeVisible();
    const fontSize = await validateBtn.evaluate(el => window.getComputedStyle(el).fontSize);
    const fontSizePx = parseFloat(fontSize);
    expect(fontSizePx).toBeGreaterThanOrEqual(13.5); // 0.88rem >= 14px
  });
});
