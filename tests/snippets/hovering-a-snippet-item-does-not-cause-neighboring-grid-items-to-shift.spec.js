import { test, expect } from '@playwright/test';

test.describe('\'Snippet Item Hover Layout Stability\', (', () => {

  test('Hovering a snippet item does not cause neighboring grid items to shift position', async ({ page }) => {
    await page.goto('/');
    const snippetsBtn = page.locator('#snippetsBtn');
    await snippetsBtn.click();
    await page.waitForTimeout(600);

    // Get initial bounding box of second snippet button via DOM evaluate
    const initialBox2 = await page.evaluate(() => {
      const btns = document.querySelectorAll('.snippet-btn');
      if (btns.length < 2) return null;
      const rect = btns[1].getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    expect(initialBox2).not.toBeNull();

    // Trigger mouseenter / hover on first snippet button
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.snippet-btn');
      if (btns.length > 0) {
        btns[0].classList.add('hover');
        btns[0].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    });
    await page.waitForTimeout(200);

    // Get bounding box of second snippet button while first is hovered
    const hoveredBox2 = await page.evaluate(() => {
      const btns = document.querySelectorAll('.snippet-btn');
      if (btns.length < 2) return null;
      const rect = btns[1].getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    expect(hoveredBox2).not.toBeNull();

    // Assert zero positional shift on second item
    expect(hoveredBox2.x).toBeCloseTo(initialBox2.x, 0);
    expect(hoveredBox2.y).toBeCloseTo(initialBox2.y, 0);
    expect(hoveredBox2.width).toBeCloseTo(initialBox2.width, 0);
    expect(hoveredBox2.height).toBeCloseTo(initialBox2.height, 0);
  });
});
