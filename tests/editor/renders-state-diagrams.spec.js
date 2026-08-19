import { test, expect } from '@playwright/test';

test.describe('Diagram Rendering', () => {
  test('renders state diagrams correctly', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('stateDiagram-v2\n[*] --> State1');
    await editor.dispatchEvent('input');
    
    const previewFrame = page;
    await expect(previewFrame.locator('#target svg')).toBeVisible({ timeout: 10000 });
    
    // Check for state diagram elements (e.g. state class)
    const svg = previewFrame.locator('#target svg');
    // Mermaid state diagrams output elements with specific classes (like node)
    await expect(svg.locator('.node').first()).toBeVisible();
  });
});
