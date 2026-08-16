import { test, expect } from '@playwright/test';

test.describe('Export Modal - MMD Code Export & Preview', () => {
  test('selecting Mermaid Code updates preview to show code from top-left, line numbers, and confirms download', async ({ page }) => {
    await page.goto('/');
    
    // 1. Wait for page load and diagram render
    const editor = page.locator('#source');
    await expect(editor).toBeVisible();
    const diagramCode = 'sequenceDiagram\nAlice->>Bob: Hello';
    await editor.fill(diagramCode);
    
    // 2. Open the export modal
    const exportBtn = page.locator('#exportMenuBtn');
    await exportBtn.click();
    
    const overlay = page.locator('#exportModalOverlay');
    await expect(overlay).toBeVisible();
    
    const previewBox = page.locator('#exportPreviewBox');
    
    // 3. Initially, it should show the visual SVG element centered (padding: 3rem)
    await expect(previewBox.locator('svg')).toBeVisible();
    await expect(previewBox.locator('pre')).toBeHidden();
    await expect(previewBox).toHaveCSS('padding', '48px'); // 3rem = 48px
    
    // 4. Select MMD option
    const mmdOption = page.locator('input[value="mmd"]');
    await mmdOption.click();
    
    // 5. The preview should now show the code from top-left (padding: 0px) and gutter line numbers
    await expect(previewBox.locator('pre')).toBeVisible();
    await expect(previewBox.locator('svg')).toBeHidden();
    await expect(previewBox).toHaveCSS('padding', '0px');
    
    // 6. Verify line numbers are generated matching line count (2 lines)
    const gutterDiv = previewBox.locator('div[style*="position: sticky"]');
    await expect(gutterDiv).toBeVisible();
    const lineNumbers = await gutterDiv.locator('div').allTextContents();
    expect(lineNumbers).toEqual(['1', '2']);
    
    // 7. Verify horizontal/vertical scroll configurations
    const innerWrapper = previewBox.locator('div[style*="overflow: auto"]');
    await expect(innerWrapper).toBeVisible();
    await expect(previewBox.locator('pre')).toHaveCSS('white-space', 'pre');
    
    // 8. Select PNG option again to verify it swaps back to centered SVG
    const pngOption = page.locator('input[value="png"]');
    await pngOption.click();
    await expect(previewBox.locator('svg')).toBeVisible();
    await expect(previewBox.locator('pre')).toBeHidden();
    await expect(previewBox).toHaveCSS('padding', '48px');
    
    // 9. Select MMD option again to perform the download
    await mmdOption.click();
    
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportConfirmBtn').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('diagram.mmd');
    await expect(overlay).toBeHidden();
  });
});
