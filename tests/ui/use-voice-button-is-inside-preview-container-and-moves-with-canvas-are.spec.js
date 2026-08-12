import { test, expect } from '@playwright/test';

test.describe('\'Editor Layering and Drag Sync\', (', () => {

  test('Use Voice button is inside preview-container and moves with canvas area', async ({ page }) => {
    await page.goto('/');
    const isInsidePreview = await page.evaluate(() => {
      const aiBar = document.querySelector('.ai-action-bar');
      const previewContainer = document.querySelector('.preview-container');
      return previewContainer.contains(aiBar);
    });

    expect(isInsidePreview).toBe(true);
  });
});
