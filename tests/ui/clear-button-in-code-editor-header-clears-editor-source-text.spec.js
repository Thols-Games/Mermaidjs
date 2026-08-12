import { test, expect } from '@playwright/test';

test.describe('\'Clear Button, Docs Icon & Actor Green Selection Rect\', (', () => {

  test('Clear button in code editor header clears editor source text', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const clearBtn = page.locator('#clearBtn');

    await editor.fill('flowchart TD\n A --> B');
    await expect(editor).toHaveValue('flowchart TD\n A --> B');

    await clearBtn.click();
    await expect(editor).toHaveValue('');
  });
});
