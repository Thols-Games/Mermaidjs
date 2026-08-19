import { test, expect } from '@playwright/test';

test('colors sequence aliases/lanes via palette decorations', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('sequenceDiagram\nparticipant Alice\nparticipant Bob\nAlice->>Bob: Hello');

  const aliases = page.locator('.cm-alias');
  await expect(aliases.first()).toBeVisible();
  // Default palette: Alice = #e2795b, Bob = #8b7ff0 (filled by buildAliasColorMap).
  await expect(aliases.first()).toHaveCSS('color', 'rgb(226, 121, 91)');
  await expect(aliases.nth(1)).toHaveCSS('color', 'rgb(139, 127, 240)');

  expect(errors, 'Unexpected console/page errors:\n' + errors.join('\n')).toHaveLength(0);
});
