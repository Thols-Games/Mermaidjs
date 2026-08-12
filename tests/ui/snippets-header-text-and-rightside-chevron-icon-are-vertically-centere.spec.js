import { test, expect } from '@playwright/test';

test.describe('\'UI Refinements & Controls\', (', () => {

  test('Snippets header text and rightside chevron icon are vertically centered', async ({ page }) => {
    await page.goto('/');
    const snippetsHeader = page.locator('#snippetsBtn');
    const snippetsText = snippetsHeader.locator('.left-side span');
    const chevron = snippetsHeader.locator('.chevron');

    await expect(snippetsHeader).toBeVisible();
    await expect(snippetsText).toBeVisible();
    await expect(chevron).toBeVisible();

    const textBox = await snippetsText.boundingBox();
    const chevronBox = await chevron.boundingBox();

    // Verify vertical center points are closely aligned (within 4px difference)
    const textCenterY = textBox.y + textBox.height / 2;
    const chevronCenterY = chevronBox.y + chevronBox.height / 2;
    expect(Math.abs(textCenterY - chevronCenterY)).toBeLessThan(5);
  });
});
