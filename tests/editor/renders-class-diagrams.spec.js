import { test, expect } from '@playwright/test';

test.describe('Diagram Rendering', () => {
  test('renders class diagrams correctly', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('classDiagram\nClass01 <|-- Class02');
    await editor.dispatchEvent('input');
    
    const previewFrame = page;
    await expect(previewFrame.locator('#target svg')).toBeVisible({ timeout: 10000 });
    
    // Check that elements were rendered inside the SVG
    const svg = previewFrame.locator('#target svg');
    await expect(svg.locator('g').first()).toBeVisible();
  });
});
