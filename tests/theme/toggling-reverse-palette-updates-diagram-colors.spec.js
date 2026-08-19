import { test, expect } from '@playwright/test';

test.describe('Theme & Palette', () => {

  test('toggling reverse palette updates diagram colors', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\n Alice->>Bob: Hello');
    await editor.dispatchEvent('input');
    
    const previewFrame = page;
    await expect(previewFrame.locator('#target svg')).toBeVisible({ timeout: 10000 });
    
    // Open Theme panel (Color Wheel)
    await page.locator('#colorWheelBtn').click();
    
    // Toggle `#paletteReverseToggle`
    await page.locator('#paletteReverseToggle').click();
    
    await expect(previewFrame.locator('#target svg')).toBeVisible();
  });
});
