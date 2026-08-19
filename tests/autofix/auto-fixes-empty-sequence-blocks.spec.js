import { test, expect } from '@playwright/test';

test.describe('Auto-Fix Empty Sequence Blocks', () => {

  test('clicking Auto-Fix repairs empty alt/else blocks by inserting span notes', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const validateBtn = page.locator('#validateBtn');
    const fixBtn = page.locator('#fixBtn');
    const errorBar = page.locator('#editorErrorBar');

    const inputCode = `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello
    alt condition A
    else condition B
    end`;

    await editor.fill(inputCode);
    await editor.dispatchEvent('input');
    await page.waitForTimeout(500);

    // Validate button click shows Warnings
    await validateBtn.click();
    await page.waitForTimeout(300);
    await expect(errorBar).toBeVisible();
    await expect(errorBar).toHaveClass(/warning-mode/);
    await expect(fixBtn).toBeVisible();

    // Click Auto-Fix
    await fixBtn.click();
    await page.waitForTimeout(500);

    const updatedCode = await editor.inputValue();
    expect(updatedCode).toContain('Note over Alice, Bob: (action)');

    // Re-validate to ensure clean state
    await validateBtn.click();
    await page.waitForTimeout(300);
    await expect(validateBtn).toContainText('Valid ✓');
  });
});
