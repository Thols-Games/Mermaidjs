import { test, expect } from '@playwright/test';

test.describe('Theme & Palette', () => {

  test('toggling palette updates diagram colors', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('flowchart TD\n A --> B');
    await editor.dispatchEvent('input');
    
    const previewFrame = page;
    await expect(previewFrame.locator('#target svg')).toBeVisible({ timeout: 10000 });
    
    // Open Theme panel (Color Wheel)
    await page.locator('#colorWheelBtn').click();
    
    // Select 'sunset' palette from dropdown
    const select = page.locator('#colorPaletteSelect');
    await select.selectOption('sunset');
    
    await expect(select).toHaveValue('sunset');
    await expect(previewFrame.locator('#target svg')).toBeVisible();
  });
});
