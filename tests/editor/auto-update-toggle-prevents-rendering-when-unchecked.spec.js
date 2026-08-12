import { test, expect } from '@playwright/test';

test.describe('\'Editor & Rendering\', (', () => {

  test('auto-update toggle prevents rendering when unchecked', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const previewFrame = page;

    // Turn off Auto-Update via evaluate
    await page.evaluate(() => {
      const toggle = document.getElementById('autoUpdateToggle');
      if (toggle) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
      }
    });

    // Type new diagram (using permitted 'flowchart' diagram type)
    await editor.fill('flowchart TD\nC[Wait] --> D[For Click]');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(600);

    // SVG should not contain new text yet
    const svgTextBefore = await previewFrame.locator('.preview').textContent();
    expect(svgTextBefore).not.toContain('Wait');

    // Turn Auto-Update back ON via evaluate
    await page.evaluate(() => {
      const toggle = document.getElementById('autoUpdateToggle');
      if (toggle) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
      }
    });

    // Wait for auto-retry assertion on preview
    await expect(previewFrame.locator('.preview')).toContainText('Wait', { timeout: 5000 });
  });
});
