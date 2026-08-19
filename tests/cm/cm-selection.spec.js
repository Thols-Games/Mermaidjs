import { test, expect } from '@playwright/test';

const SEQ = 'sequenceDiagram\nparticipant Alice\nparticipant Bob\nAlice->>Bob: Hello';

test('(diagram → code): clicking an actor selects its declaration line in CM', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type(SEQ);
  await page.locator('#target svg').waitFor({ state: 'visible', timeout: 10000 });
  // Let the debounced diagram render settle so a later re-render doesn't wipe the
  // selection box (same as legacy: rendering rebuilds the SVG).
  await page.waitForTimeout(800);

  // Click the SVG actor box whose text is "Alice" -> CM selection should land on
  // its declaration line.
  const actor = page.locator('#target svg [class*="actor"]').filter({ hasText: 'Alice' }).first();
  await expect(actor).toBeVisible();
  await actor.click({ force: true });
  await page.waitForTimeout(200);

  const result = await page.evaluate((src) => {
    const offsets = window.__cmEditor.getSelection();
    const declIndex = src.indexOf('participant Alice');
    const lineStart = src.lastIndexOf('\n', declIndex) + 1;
    return { from: offsets.from, lineStart };
  }, SEQ);

  expect(result.from).toBe(result.lineStart);
  await expect(page.locator('#diagram-selection-box')).toBeAttached();

  expect(errors, 'Unexpected console/page errors:\n' + errors.join('\n')).toHaveLength(0);
});

test('(code → diagram): cursor on a participant line highlights the actor', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.keyboard.type(SEQ);
  await page.locator('#target svg').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(800);

  // Place the cursor on the "participant Alice" line via the exposed API.
  await page.evaluate((src) => {
    const idx = src.indexOf('participant Alice') + 10;
    window.__cmEditor.selectRange(idx);
  }, SEQ);
  await page.waitForTimeout(200);

  const box = page.locator('#diagram-selection-box');
  await expect(box).toBeAttached();
  const boxHeight = await box.evaluate((el) => parseFloat(el.getAttribute('height')));
  expect(boxHeight).toBeGreaterThan(40);

  expect(errors, 'Unexpected console/page errors:\n' + errors.join('\n')).toHaveLength(0);
});
