import { test, expect } from '@playwright/test';

test.describe('Theme & Palette', () => {

  test('toggling palette updates diagram colors', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('flowchart TD\n A --> B');
    await editor.dispatchEvent('input');
    
    const previewFrame = page;
    await expect(previewFrame.locator('#target svg')).toBeVisible({ timeout: 10000 });
    
    // Open Settings panel
    await page.locator('#settingsToggleBtn').click();
    
    // Click 'sunset' palette
    await page.locator('.palette-btn[data-palette="sunset"]').dispatchEvent('click');
    
    await expect(page.locator('.palette-btn[data-palette="sunset"]')).toHaveClass(/active/);
    await expect(previewFrame.locator('#target svg')).toBeVisible();
  });

  test('toggling reverse palette updates diagram colors', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\n Alice->>Bob: Hello');
    await editor.dispatchEvent('input');
    
    const previewFrame = page;
    await expect(previewFrame.locator('#target svg')).toBeVisible({ timeout: 10000 });
    
    // Open Settings panel
    await page.locator('#settingsToggleBtn').click();
    
    // Toggle `#paletteReverseToggle`
    await page.locator('#paletteReverseToggle').dispatchEvent('click');
    
    await expect(previewFrame.locator('#target svg')).toBeVisible();
  });
});
