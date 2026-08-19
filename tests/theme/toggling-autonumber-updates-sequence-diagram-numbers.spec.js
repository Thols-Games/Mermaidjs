import { test, expect } from '@playwright/test';

test.describe('Autonumber Toggle', () => {
  test('toggling autonumber checkbox shows and hides line numbers in sequence diagram', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\nAlice->>Bob: Hello');
    await editor.dispatchEvent('input');
    
    await expect(page.locator('#target svg')).toBeVisible({ timeout: 10000 });
    
    // 1. Open Number Color settings panel
    await page.locator('#numberColorBtn').click();
    
    const autonumberToggle = page.locator('#diagramAutonumberToggleBtn');
    await expect(autonumberToggle).toBeAttached();
    await expect(autonumberToggle).not.toBeChecked();
    
    const slider = page.locator('.switch:has(#diagramAutonumberToggleBtn) .slider');
    await expect(slider).toBeVisible();
    
    // Check that sequence numbers are NOT shown initially
    await expect(page.locator('#target svg .sequenceNumber')).toHaveCount(0);
    
    // 2. Toggle autonumber ON
    await slider.click();
    await expect(autonumberToggle).toBeChecked();
    
    // Verify sequence numbers are rendered after a brief render delay
    await expect(page.locator('#target svg')).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page.locator('#target svg .sequenceNumber')).not.toHaveCount(0);
    
    // 3. Toggle autonumber OFF
    await slider.click();
    await expect(autonumberToggle).not.toBeChecked();
    
    // Verify sequence numbers are hidden again
    await page.waitForTimeout(1000);
    await expect(page.locator('#target svg .sequenceNumber')).toHaveCount(0);
  });
});
