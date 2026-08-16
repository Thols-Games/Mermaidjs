import { test, expect } from '@playwright/test';

test.describe('Diagram Type Autocomplete on Empty Editor', () => {

  test('should show autocomplete panel when editor is empty and user types a prefix', async ({ page }) => {
    await page.goto('/');
    
    // Clear editor to make it empty
    const editor = page.locator('#source');
    const clearBtn = page.locator('#clearBtn');
    await clearBtn.click();
    await expect(editor).toHaveValue('');

    // Focus and type 'f'
    await editor.focus();
    await editor.type('f');

    // Autocomplete panel should show
    const acPanel = page.locator('#autocompletePanel');
    await expect(acPanel).toHaveClass(/show/);

    // Auto-Fix button should NOT be visible while typing header prefix
    const fixBtn = page.locator('#fixBtn');
    await expect(fixBtn).not.toBeVisible();

    // There should be a flowchart option
    const flowchartItem = acPanel.locator('.ac-item', { hasText: 'Flowchart' });
    await expect(flowchartItem).toBeVisible();

    // Click on it
    await flowchartItem.click();

    // Editor should be populated with flowchart sample code
    await expect(editor).toHaveValue(/flowchart TD/);

    // Dropdown value should update
    const diagramType = page.locator('#diagramType');
    await expect(diagramType).toHaveValue('flowchart');

    // Autocomplete panel should be hidden
    await expect(acPanel).not.toHaveClass(/show/);
  });
});
