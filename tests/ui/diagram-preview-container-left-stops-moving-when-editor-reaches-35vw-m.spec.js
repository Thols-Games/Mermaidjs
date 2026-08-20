import { test, expect } from '@playwright/test';

test.describe('\'Editor Layering and Drag Sync\', (', () => {

  test('diagram preview container left stops moving when editor reaches 40vw min width', async ({ page }) => {
    await page.goto('/');
    const previewContainer = page.locator('.preview-container');
    const resizeHandle = page.locator('#editorResizeHandle');

    const handleBox = await resizeHandle.boundingBox();
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(0, handleBox.y + handleBox.height / 2); // Drag far left
      
      const leftAtMin = parseFloat(await previewContainer.evaluate(el => getComputedStyle(el).left));
      
      await page.mouse.move(-500, handleBox.y + handleBox.height / 2);
      const leftFurther = parseFloat(await previewContainer.evaluate(el => getComputedStyle(el).left));
      await page.mouse.up();

      expect(leftAtMin).toBe(leftFurther);
    }
  });
});
