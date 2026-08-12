import { test, expect } from '@playwright/test';

test.describe('\'Diagram Theme Toggle Button Synchronization\', (', () => {

  test('Diagram theme toggle is ON when page opens in Teal Theme', async ({ page }) => {
    await page.goto('/');
    const toggleBtn = page.locator('#diagramThemeToggleBtn');
    
    // Check initial state (Teal theme is dark/active -> toggle is checked)
    const isChecked = await toggleBtn.isChecked();
    expect(isChecked).toBe(true);
  });
});
