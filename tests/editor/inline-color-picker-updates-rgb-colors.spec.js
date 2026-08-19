import { test, expect } from '@playwright/test';

test.describe('Inline Color Picker', () => {
  test('should display a color swatch for rgb values and update source when color is changed', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');

    // Fill editor with a line containing an rgb color. The CM decoration renders a swatch.
    await editor.fill('sequenceDiagram\n  actor Alice\n  Note over Alice: rgb(255, 0, 0) color text');
    await editor.dispatchEvent('input');

    const swatch = page.locator('.cm-color-square').first();
    await expect(swatch).toBeAttached();
    // Swatch carries the literal's actual color.
    await expect(swatch).toHaveCSS('background-color', 'rgb(255, 0, 0)');

    // Change the color via the exposed CM RGB API (mirrors clicking the swatch).
    await page.evaluate(() => window.__cmEditor.setRgbColor(2, 0, '#00ff00'));

    const updatedValue = await editor.inputValue();
    expect(updatedValue).toContain('rgb(0, 255, 0)');
  });
});
