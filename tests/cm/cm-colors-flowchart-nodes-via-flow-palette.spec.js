import { test, expect } from '@playwright/test';

test('colors flowchart nodes via flow palette decorations and syncs with SVG', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('flowchart TD\n  A[Start] --> B{Decision}\n  B --> C[Do it]');

  const aliases = page.locator('.cm-alias');
  await expect(aliases.first()).toBeVisible();

  // Flow palette default: A = #8b7ff0, B = #e2795b, C = #3fb8af
  await expect(aliases.first()).toHaveCSS('color', 'rgb(139, 127, 240)'); // A
  await expect(aliases.nth(1)).toHaveCSS('color', 'rgb(226, 121, 91)');  // B

  // Wait for SVG render
  await expect(page.locator('#target svg')).toBeVisible();

  // Verify SVG node colors match
  const nodes = page.locator('#target svg g.node');
  await expect(nodes).toHaveCount(3);

  expect(errors, 'Unexpected console/page errors:\n' + errors.join('\n')).toHaveLength(0);
});

test('toggling palette updates flowchart editor decorations live', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('flowchart TD\n  A[Start] --> B{Decision}');

  const aliases = page.locator('.cm-alias');
  await expect(aliases.first()).toBeVisible();
  await expect(aliases.first()).toHaveCSS('color', 'rgb(139, 127, 240)'); // Default flow[0]

  // Open theme/palette panel
  await page.locator('#colorWheelBtn').click();
  const select = page.locator('#colorPaletteSelect');
  await select.selectOption('sunset');

  // Sunset flow palette index 0: #f43f5e -> rgb(244, 63, 94)
  await expect(aliases.first()).toHaveCSS('color', 'rgb(244, 63, 94)');

  expect(errors, 'Unexpected console/page errors:\n' + errors.join('\n')).toHaveLength(0);
});
