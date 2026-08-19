import { test, expect } from '@playwright/test';

test.describe('Inline Color Picker', () => {
  test('should display a color swatch for rgba values and preserve alpha when color is changed', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');

    await editor.fill('sequenceDiagram\n  actor Alice\n  Note over Alice: rgba(0, 0, 255, 0.5) color text');
    await editor.dispatchEvent('input');

    const swatch = page.locator('.cm-color-square').first();
    await expect(swatch).toBeAttached();
    await expect(swatch).toHaveCSS('background-color', 'rgb(0, 0, 255)');

    await page.evaluate(() => window.__cmEditor.setRgbColor(2, 0, '#ff00ff'));
    const updatedValue = await editor.inputValue();
    expect(updatedValue).toContain('rgba(255, 0, 255, 0.5)');
  });
});
