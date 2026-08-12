import { test, expect } from '@playwright/test';

test.describe('\'Diagram Theme Style Application\', (', () => {

  test('selecting sharp, rounded, and pill diagram styles marks the button as active', async ({ page }) => {
    await page.goto('/');
    // Inject a flowchart diagram
    const editor = page.locator('#source');
    await editor.fill('flowchart TD\n A[Start] --> B[Process]\n');
    await editor.dispatchEvent('input');

    const previewFrame = page;
    await previewFrame.locator('#target svg').waitFor({ state: 'visible', timeout: 10000 });

    // Open Color Wheel / Theme Popup
    await page.locator('#colorWheelBtn').click();
    await page.waitForSelector('#themePanel.show');

    // 1. Click Sharp style button - verify active class
    await page.locator('.style-btn[data-style="sharp"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.style-btn[data-style="sharp"]')).toHaveClass(/active/);
    await expect(previewFrame.locator('#target svg')).toBeVisible();

    // 2. Click Rounded style button - verify active class
    await page.locator('.style-btn[data-style="rounded"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.style-btn[data-style="rounded"]')).toHaveClass(/active/);
    await expect(page.locator('.style-btn[data-style="sharp"]')).not.toHaveClass(/active/);

    // 3. Click Pill style button - verify active class
    await page.locator('.style-btn[data-style="pill"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('.style-btn[data-style="pill"]')).toHaveClass(/active/);
    await expect(page.locator('.style-btn[data-style="rounded"]')).not.toHaveClass(/active/);
  });
});
