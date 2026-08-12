import { test, expect } from '@playwright/test';

test.describe('\'Editor Layering and Drag Sync\', (', () => {

  test('editor panel has higher z-index than AI action bar (Use Voice)', async ({ page }) => {
    await page.goto('/');
    const editorZIndex = await page.locator('#sourceCol').evaluate(el => getComputedStyle(el).zIndex);
    const aiBarZIndex = await page.locator('.ai-action-bar').evaluate(el => getComputedStyle(el).zIndex);

    expect(parseInt(editorZIndex, 10)).toBeGreaterThan(parseInt(aiBarZIndex, 10));
  });
});
