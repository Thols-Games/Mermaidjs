import { test, expect } from '@playwright/test';

test.describe('\'Editor Comment Shortcut (Ctrl+/', () => {

  test('toggles %% comments on current line using Ctrl+/', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    
    await editor.fill('flowchart TD\n A --> B\n');
    await editor.focus();

    // Position cursor on line 2 ("A --> B")
    await editor.evaluate(el => {
      const idx = el.value.indexOf('A --> B');
      el.selectionStart = idx;
      el.selectionEnd = idx;
    });

    // Press Ctrl+/ to comment line 2
    await page.keyboard.press('Control+/');
    await page.waitForTimeout(300);

    let code = await editor.inputValue();
    expect(code).toContain('%% A --> B');

    // Press Ctrl+/ again to uncomment line 2
    await page.keyboard.press('Control+/');
    await page.waitForTimeout(300);

    code = await editor.inputValue();
    expect(code).not.toContain('%% A --> B');
    expect(code).toContain('A --> B');
  });
});
