import { test, expect } from '@playwright/test';

// Verifies that typing a diagram-body keyword (e.g. `loop`) surfaces an
// autocomplete completion that expands into a snippet (loop name / end).
test('typing `loop` expands into a loop..end snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  // Start from a clean sequence-diagram body.
  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  // Type the keyword prefix; the autocomplete popup should appear.
  await page.keyboard.type('lo');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  // Accept the top completion with Enter (natural UX).
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('loop name');
  expect(text).toContain('end');
});

// Other body keywords should also offer snippet completions.
test('typing `sub` on a flowchart body offers subgraph snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('flowchart TD\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('sub');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('subgraph');
  expect(text).toContain('end');
});

// Typing `note` should offer several note variants, and the plain `note`
// option must insert only the keyword (not a forced "left of" template).
test('typing `note` lists variants; plain note inserts just `note`', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('note left of');
  expect(opts).toContain('note right of');
  expect(opts).toContain('note over');
  // `note across` is NOT valid Mermaid syntax (use `note over A,B`), so it must
  // not be offered as a completion.
  expect(opts).not.toContain('note across');

  // First option is the plain `note` keyword.
  await page.waitForTimeout(120);
  await popup.locator('li').first().click();

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text.trim().endsWith('note')).toBeTruthy();
  expect(text).not.toContain('left of');
});

// Selecting `note left of` expands to the full note snippet.
test('selecting `note left of` inserts note left of snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  await page.waitForTimeout(120);
  await popup.locator('li').filter({ hasText: 'note left of' }).first().click();

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('note left of');
  expect(text).toContain('text');
});

// A valid label-based note (e.g. `note left of Alice` where Alice is an `as`
// alias) must validate with no false "not declared" warning.
test('label-based note validates without false undeclared warning', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  const src = 'sequenceDiagram\nparticipant A as Alice\nnote left of Alice: hello';
  await page.evaluate((s) => window.__cmEditor.setContent(s), src);
  await page.locator('#validateBtn').click();
  await page.waitForTimeout(400);

  const validateText = await page.locator('#validateBtn').innerText();
  const errText = await page.locator('#editorErrorText').innerText().catch(() => '');
  expect(validateText.trim()).toContain('Valid');
  expect(errText.trim()).toBe('');
});

// Typing `note ` (with space) offers only note positions: `left of`, `right of`, `over`.
test('typing `note ` offers only left of, right of, and over', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note ');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('left of');
  expect(opts).toContain('right of');
  expect(opts).toContain('over');
  // Must NOT contain unrelated keywords
  expect(opts).not.toContain('loop');
  expect(opts).not.toContain('alt');
  expect(opts).not.toContain('subgraph');
  expect(opts).not.toContain('participant');
});

// Typing `note l` filters strictly to `left of` and expands snippet on accept.
test('typing `note l` filters to left of and expands snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note l');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('left of');
  expect(opts).not.toContain('loop');

  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('note left of');
  expect(text).toContain('text');
});

// Typing `note r` filters strictly to `right of` and expands snippet on accept.
test('typing `note r` filters to right of and expands snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note r');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('right of');
  expect(opts).not.toContain('rect');

  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('note right of');
  expect(text).toContain('text');
});

// Typing `note o` filters strictly to `over` and expands snippet on accept.
test('typing `note o` filters to over and expands snippet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__cmEditor && window.__cmEditor.getText);

  await page.evaluate(() => window.__cmEditor.setContent('sequenceDiagram\n'));
  await page.locator('.cm-content').click();
  await page.keyboard.press('Control+End');

  await page.keyboard.type('note o');
  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();

  const opts = await popup.innerText();
  expect(opts).toContain('over');
  expect(opts).not.toContain('opt');

  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');

  const text = await page.evaluate(() => window.__cmEditor.getText());
  expect(text).toContain('note over');
  expect(text).toContain('text');
});

