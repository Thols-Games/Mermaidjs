import { test, expect } from '@playwright/test';

test('loads CodeMirror editor and renders the diagram', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');

  // CodeMirror host is visible, legacy textarea hidden but still mirrored
  await expect(page.locator('.cm-editor')).toBeVisible();
  await expect(page.locator('#cmHost')).toBeVisible();
  // #source is the invisible data mirror behind CodeMirror (opacity 0, pointer-events none).
  await expect(page.locator('#source')).toHaveCSS('opacity', '0');

  // Editor content + syntax highlighting present
  await expect(page.locator('.cm-content')).toContainText('sequenceDiagram');
  await expect(page.locator('.cm-line span').first()).toBeVisible();

  // Existing render pipeline still works (CM mirrors into hidden #source)
  await expect(page.locator('#target svg')).toBeVisible({ timeout: 10000 });
  const srcVal = await page.locator('#source').inputValue();
  expect(srcVal).toContain('participant');

  // Typing in CM flows through to the diagram render
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('flowchart TD\nA-->B');
  await expect(page.locator('#source')).toHaveValue(/flowchart TD/);
  await expect(page.locator('#target svg')).toBeVisible({ timeout: 10000 });

  expect(errors, 'Unexpected console/page errors:\n' + errors.join('\n')).toHaveLength(0);
});

test('shows lint gutter markers for invalid syntax', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  // Invalid diagram type on line 1 -> heuristic error -> CM lint marker.
  await page.keyboard.type('foobarTD\nA->B');

  const marker = page.locator('.cm-lint-marker-error').first();
  await expect(marker).toBeVisible({ timeout: 5000 });

  // Fixing the type clears the marker.
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('flowchart TD\nA-->B');
  await expect(marker).toHaveCount(0, { timeout: 5000 });
});

test('renders RGB color swatches as decorations', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type('flowchart TD\nA([rgb(255, 0, 0)])-->B');

  // A color swatch appears inline before the rgb literal.
  const swatch = page.locator('.cm-color-square').first();
  await expect(swatch).toBeVisible();
  // The swatch carries the literal's actual color.
  await expect(swatch).toHaveCSS('background-color', 'rgb(255, 0, 0)');

  // The rgb text itself is colored with its value (cm-rgb mark).
  await expect(page.locator('.cm-rgb').first()).toBeVisible();

  // Editing the color via the exposed API updates the document + mirror.
  await page.evaluate(() => window.__cmEditor.setRgbColor(1, 0, '#00ff00'));
  await expect(page.locator('#source')).toHaveValue(/rgb\(0, 255, 0\)/);
  await expect(page.locator('#target svg')).toBeVisible({ timeout: 10000 });

  expect(errors, 'Unexpected console/page errors:\n' + errors.join('\n')).toHaveLength(0);
});

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
