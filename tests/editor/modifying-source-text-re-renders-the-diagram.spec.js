import { test, expect } from '@playwright/test';

test.describe('\'Editor & Rendering\', (', () => {

  test('modifying source text re-renders the diagram', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const previewFrame = page;
    await editor.fill('flowchart TD\nA[Start] --> B[End]');
    await editor.dispatchEvent('input');

    // Wait until the preview actually contains the node text (not just an SVG shell)
    await expect(previewFrame.locator('.preview')).toContainText('Start', { timeout: 10000 });
    await expect(previewFrame.locator('.preview')).toContainText('End', { timeout: 5000 });
  });
});
