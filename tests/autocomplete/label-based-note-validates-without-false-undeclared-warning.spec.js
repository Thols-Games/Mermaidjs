import { test, expect } from '@playwright/test';

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
