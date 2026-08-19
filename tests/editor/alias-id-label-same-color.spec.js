import { test, expect } from '@playwright/test';

// `participant A as Alice`: the identifier `A` and display label `Alice` are the
// same participant, so (1) they must share one editor color, (2) using the label
// in a message must be flagged, and (3) Auto-Fix must normalize it to the id.
test('alias id and label share color, warn, and auto-fix to id', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor);

  const src = 'sequenceDiagram\nparticipant A as Alice\nAlice->>Bob: hi';
  await page.evaluate((s) => window.__cmEditor.setContent(s), src);
  await page.waitForTimeout(500);

  const colors = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span.cm-alias')];
    const get = (t) => spans.find(s => s.textContent === t)?.style.color;
    return { A: get('A'), Alice: get('Alice') };
  });
  expect(colors.A).toBeTruthy();
  expect(colors.A).toBe(colors.Alice);

  const errText = await page.locator('#editorErrorText').innerText().catch(() => '');
  expect(errText).toContain('Use declared identifier "A" instead of display label "Alice"');

  await page.locator('#fixBtn').click();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__cmEditor.getText());
  expect(after).toContain('A->>Bob');
  expect(after).not.toContain('Alice->>Bob');
});
