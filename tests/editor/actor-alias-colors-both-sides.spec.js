import { test, expect } from '@playwright/test';

// Regression: the source actor (left of the arrow) must also be colored, not
// just the destination. The alias decoration previously excluded a hyphen that
// follows the source (the start of `->>`), so only the right side colored.
test('both source and destination actors are colored in the editor', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\nAlice->>Bob: Hi'));
  await page.waitForTimeout(300);
  let lines = await page.evaluate(() => [...document.querySelectorAll('.cm-line')].map(ln => ({
    text: ln.textContent,
    colored: [...ln.querySelectorAll('span.cm-alias')].map(s => s.textContent),
  })));
  let msg = lines.find(l => l.text.includes('->>'));
  expect(msg.colored).toContain('Alice');
  expect(msg.colored).toContain('Bob');

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\nparticipant A as Alice\nA->>B: Hi'));
  await page.waitForTimeout(300);
  lines = await page.evaluate(() => [...document.querySelectorAll('.cm-line')].map(ln => ({
    text: ln.textContent,
    colored: [...ln.querySelectorAll('span.cm-alias')].map(s => s.textContent),
  })));
  msg = lines.find(l => l.text.includes('->>'));
  expect(msg.colored).toContain('A');
  expect(msg.colored).toContain('B');
});
