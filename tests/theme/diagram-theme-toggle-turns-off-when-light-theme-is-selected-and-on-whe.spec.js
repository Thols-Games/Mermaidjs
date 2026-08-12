import { test, expect } from '@playwright/test';

test.describe('\'Diagram Theme Toggle Button Synchronization\', (', () => {

  test('Diagram theme toggle turns OFF when Light theme is selected and ON when Teal/Dark is selected', async ({ page }) => {
    await page.goto('/');
    const toggleBtn = page.locator('#diagramThemeToggleBtn');
    const themeSelect = page.locator('#theme');

    // Switch to Light theme (value = 'default')
    await themeSelect.evaluate(el => {
      el.value = 'default';
      el.dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(300);

    let isChecked = await toggleBtn.isChecked();
    expect(isChecked).toBe(false);

    // Switch back to Teal theme (value = 'teal')
    await themeSelect.evaluate(el => {
      el.value = 'teal';
      el.dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(300);

    isChecked = await toggleBtn.isChecked();
    expect(isChecked).toBe(true);
  });
});
