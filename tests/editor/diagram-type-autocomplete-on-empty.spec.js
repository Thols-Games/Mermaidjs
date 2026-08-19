import { test, expect } from '@playwright/test';

test.describe('Diagram Type Autocomplete on Empty Editor', () => {

  test('should show autocomplete when editor is empty and user types a prefix', async ({ page }) => {
    await page.goto('/');

    // Clear editor to make it empty
    const clearBtn = page.locator('#clearBtn');
    await clearBtn.click();
    await expect(page.locator('#source')).toHaveValue('');

    // Focus the CodeMirror editor and type 'f' (header prefix)
    const cm = page.locator('.cm-content');
    await cm.click();
    await page.keyboard.type('f');

    // CM autocomplete tooltip should show
    const tip = page.locator('.cm-tooltip-autocomplete').first();
    await expect(tip).toBeVisible({ timeout: 5000 });

    // Auto-Fix button should NOT be visible while typing a header prefix
    const fixBtn = page.locator('#fixBtn');
    await expect(fixBtn).not.toBeVisible();

    // There should be a flowchart option
    const flowchartItem = tip.locator('li[role="option"]').filter({ hasText: 'Flowchart' });
    await expect(flowchartItem).toBeVisible();

    // Click on it
    await flowchartItem.click();

    // Editor (mirrored #source) should be populated with flowchart sample code
    await expect(page.locator('#source')).toHaveValue(/flowchart TD/);

    // Dropdown value should update
    const diagramType = page.locator('#diagramType');
    await expect(diagramType).toHaveValue('flowchart');

    // Autocomplete tooltip should be hidden
    await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
  });
});
