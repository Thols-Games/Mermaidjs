import { test, expect } from '@playwright/test';

test.describe('\'UI Refinements & Controls\', (', () => {

  test('Pan tool toggles on when clicked and disables properly when clicked again', async ({ page }) => {
    await page.goto('/');
    const panBtn = page.locator('#panBtn');
    const previewFrame = page;
    const preview = previewFrame.locator('#target');

    await expect(panBtn).toBeVisible();
    await expect(panBtn).not.toHaveClass(/active/);
    await expect(preview).not.toHaveClass(/pan-mode/);

    // Click to enable Pan mode
    await panBtn.click();
    await expect(panBtn).toHaveClass(/active/);
    await expect(preview).toHaveClass(/pan-mode/);

    // Click again to disable Pan mode
    await panBtn.click();
    await expect(panBtn).not.toHaveClass(/active/);
    await expect(preview).not.toHaveClass(/pan-mode/);

    const inlineCursor = await preview.evaluate(el => el.style.cursor);
    expect(inlineCursor).toBe('');
  });
});
