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
