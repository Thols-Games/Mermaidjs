import { test, expect } from '@playwright/test';

test.describe('Diagram Preview Error Card', () => {

  test('shows styled error card inside diagram preview on compilation error and clears it when fixed', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const target = page.locator('#target');

    // 1. Fill invalid syntax
    await editor.fill('sequenceDiagram\n A ->');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1000); // Wait for debounce and render

    // 2. The error container should be visible inside #target
    const errorCard = target.locator('.render-error-container');
    await expect(errorCard).toBeVisible();
    
    // 3. The container should have title
    const title = errorCard.locator('h3');
    await expect(title).toHaveText('Diagram Parsing Error');

    // 4. Verify that raw editor text is not shown directly as plain text of #target
    const targetText = await target.textContent();
    expect(targetText).not.toBe('sequenceDiagram\n A ->');

    // 5. Fix the syntax error
    await editor.fill('sequenceDiagram\n A->>B: Hello');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1000);

    // 6. The error card should be removed, and the SVG diagram should be rendered
    await expect(errorCard).not.toBeVisible();
    await expect(target.locator('svg')).toBeVisible();
  });
});
