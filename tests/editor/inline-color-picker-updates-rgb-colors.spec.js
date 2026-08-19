import { test, expect } from '@playwright/test';

test.describe('Inline Color Picker', () => {
  test('should display color picker for rgb values and update source when color is changed', async ({ page }) => {
    await page.goto('/');
    
    // Explicitly enable syntax highlighting
    await page.locator('#settingsToggleBtn').click();
    await page.locator('#hlMode').selectOption('local');
    await page.locator('#settingsToggleBtn').click();
    
    const editor = page.locator('#source');
    
    // Fill editor with a line containing rgb color
    await editor.fill('sequenceDiagram\n  actor Alice\n  Note over Alice: rgb(255, 0, 0) color text');
    await editor.dispatchEvent('input');
    
    // Wait for highlight layer to render
    const picker = page.locator('#hlLayer .inline-color-picker');
    await expect(picker).toBeAttached();
    
    // Retrieve value of color picker (should be #ff0000)
    const initialVal = await picker.getAttribute('value');
    expect(initialVal).toBe('#ff0000');
    
    // Change value of the color picker
    await picker.evaluate((el) => {
      el.value = '#00ff00';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    
    // Expect the source code in editor to have updated rgb value
    const updatedValue = await editor.inputValue();
    expect(updatedValue).toContain('rgb(0, 255, 0)');
    
    // Expect the color picker element value to be updated to #00ff00 in the highlight layer
    await expect(picker).toHaveAttribute('value', '#00ff00');
  });

  test('should display color picker for rgba values and preserve alpha when color is changed', async ({ page }) => {
    await page.goto('/');
    
    // Explicitly enable syntax highlighting
    await page.locator('#settingsToggleBtn').click();
    await page.locator('#hlMode').selectOption('local');
    await page.locator('#settingsToggleBtn').click();
    
    const editor = page.locator('#source');
    
    await editor.fill('sequenceDiagram\n  actor Alice\n  Note over Alice: rgba(0, 0, 255, 0.5) color text');
    await editor.dispatchEvent('input');
    
    const picker = page.locator('#hlLayer .inline-color-picker');
    await expect(picker).toBeAttached();
    
    const initialVal = await picker.getAttribute('value');
    expect(initialVal).toBe('#0000ff');
    
    await picker.evaluate((el) => {
      el.value = '#ff00ff';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    
    const updatedValue = await editor.inputValue();
    expect(updatedValue).toContain('rgba(255, 0, 255, 0.5)');
  });
});
