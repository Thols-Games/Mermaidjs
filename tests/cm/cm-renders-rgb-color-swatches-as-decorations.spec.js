import { test, expect } from '@playwright/test';

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
