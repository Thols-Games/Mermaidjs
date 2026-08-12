import { test, expect } from '@playwright/test';

test.describe('\'Participant Keyword Typo Auto-Fix\', (', () => {

  test('auto-fixes alias display names to alias in sequence diagrams', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const fixBtn = page.locator('#fixBtn');
    
    // Enter sequence diagram with alias, but using display name in arrow
    await editor.fill('sequenceDiagram\n participant A as Alice\n Alice->>Bob: Hello');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(800);

    // Auto-Fix button should be visible (due to 'Alice' being undeclared warning)
    await expect(fixBtn).toBeVisible();

    // Click auto-fix
    await fixBtn.click();
    await page.waitForTimeout(500);

    // Validate output replaced Alice with A
    const val = await editor.inputValue();
    expect(val).toContain('A->>Bob: Hello');
    expect(val).not.toContain('Alice->>Bob');
  });
});
