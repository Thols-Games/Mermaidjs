import { test, expect } from '@playwright/test';

test.describe('Duplicate Note Selection Sync', () => {

  test('clicking each note in SVG preview selects the matching line in the editor', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const sourceCode = `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello
    Bob-->>Alice: Hi there
    Alice->>Bob: How are you?
    Bob-->>Alice: Great!
    note left of Alice: Welcome
    note right of Alice: Welcome
    note over Alice, Bob: Welcome`;

    await editor.fill(sourceCode);
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1000);

    const noteRects = page.locator('rect.note');
    await expect(noteRects).toHaveCount(3);

    // Click 1st note in preview
    await noteRects.nth(0).click({ force: true });
    await page.waitForTimeout(300);
    let sel = await page.evaluate(() => {
      if (window.__cmEditor && window.__cmEditor.getSelection) {
        return window.__cmEditor.getSelection();
      }
      const el = document.getElementById('source');
      return { from: el.selectionStart, to: el.selectionEnd };
    });
    const note1LineStart = sourceCode.indexOf('    note left of Alice: Welcome');
    expect(sel.from).toBe(note1LineStart);

    // Click 2nd note in preview
    await noteRects.nth(1).click({ force: true });
    await page.waitForTimeout(300);
    sel = await page.evaluate(() => {
      if (window.__cmEditor && window.__cmEditor.getSelection) {
        return window.__cmEditor.getSelection();
      }
      const el = document.getElementById('source');
      return { from: el.selectionStart, to: el.selectionEnd };
    });
    const note2LineStart = sourceCode.indexOf('    note right of Alice: Welcome');
    expect(sel.from).toBe(note2LineStart);

    // Click 3rd note in preview
    await noteRects.nth(2).click({ force: true });
    await page.waitForTimeout(300);
    sel = await page.evaluate(() => {
      if (window.__cmEditor && window.__cmEditor.getSelection) {
        return window.__cmEditor.getSelection();
      }
      const el = document.getElementById('source');
      return { from: el.selectionStart, to: el.selectionEnd };
    });
    const note3LineStart = sourceCode.indexOf('    note over Alice, Bob: Welcome');
    expect(sel.from).toBe(note3LineStart);
  });
});
