import { test, expect } from '@playwright/test';

test.describe('Class Diagram Auto-Fixes', () => {

  test('auto-fixes class diagram typos and incomplete relationships', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    
    // Enter class diagram with typos (clas, namespce, interfac) and incomplete relationship
    const invalidCode = 'classDiagram\nnamespce NS {\n  clas A\n}\ninterfac I\nA <|--';
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
    
    expect(fixedCode).toContain('namespace NS');
    expect(fixedCode).toContain('class A');
    expect(fixedCode).toContain('interface I');
    expect(fixedCode).toContain('A <|-- ClassB');
    
    // Verify error goes away and diagram renders
    await expect(page.locator('#editorErrorBar')).not.toBeVisible();
    await expect(page.locator('#target svg')).toBeVisible();
  });
});
