import { test, expect } from '@playwright/test';

test.describe('Flowchart Auto-Fixes', () => {

  test('auto-fixes flowchart typos and incomplete arrows', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    
    // Enter flowchart with typos (subgrap, direciton) and incomplete arrow
    const invalidCode = 'flowchart TD\ndireciton LR\nsubgrap A\n  Node1 ->\nend';
    await editor.fill(invalidCode);
    await editor.dispatchEvent('input');
    
    // Wait for validation error to appear
    await expect(page.locator('#editorErrorBar')).toBeVisible({ timeout: 10000 });
    
    // Click the Auto-Fix button
    const autoFixBtn = page.locator('#fixBtn');
    await expect(autoFixBtn).toBeVisible();
    await autoFixBtn.click();
    
    // Verify the code in the editor was updated
    const fixedCode = await editor.inputValue();
    
    expect(fixedCode).toContain('direction LR');
    expect(fixedCode).toContain('subgraph A');
    expect(fixedCode).toContain('Node1 --> B');
    
    // Verify error goes away and diagram renders
    await expect(page.locator('#editorErrorBar')).not.toBeVisible();
    await expect(page.locator('#target svg')).toBeVisible();
  });
});
