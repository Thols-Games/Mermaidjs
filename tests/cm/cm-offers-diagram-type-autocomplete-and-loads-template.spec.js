import { test, expect } from '@playwright/test';

test('offers diagram-type autocomplete and loads the template on select', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  // Single header line, no whitespace -> CM autocomplete offers diagram types.
  await page.keyboard.type('flow');

  const tip = page.locator('.cm-tooltip-autocomplete').first();
  await expect(tip).toBeVisible({ timeout: 5000 });
  await expect(tip).toContainText('Flowchart');

  // Accept the completion by clicking its entry -> whole doc replaced with the
  // flowchart template (mirrors legacy select). Target the option <li> directly.
  const option = tip.locator('li[role="option"]').first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.locator('#source')).toHaveValue(/flowchart TD/);
  // Diagram-type dropdown synced to the chosen type.
  await expect(page.locator('#diagramType')).toHaveValue('flowchart');
  await expect(page.locator('#target svg')).toBeVisible({ timeout: 10000 });

  // Legacy #autocompletePanel must NOT be shown in CM mode.
  await expect(page.locator('#autocompletePanel')).not.toHaveClass(/show/);

  expect(errors, 'Unexpected console/page errors:\n' + errors.join('\n')).toHaveLength(0);
});
