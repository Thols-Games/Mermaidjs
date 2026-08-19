import { test, expect } from '@playwright/test';

test.describe('Duplicate Note Selection Sync', () => {

  test('selecting each duplicate note line in editor highlights each respective note in preview', async ({ page }) => {
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

    const selectionBox = page.locator('#diagram-selection-box');

    // 1. Place cursor on "note left of Alice: Welcome"
    const note1Idx = sourceCode.indexOf('note left of Alice: Welcome');
    await editor.evaluate((el, idx) => {
      el.focus();
      el.setSelectionRange(idx + 5, idx + 5);
      el.dispatchEvent(new Event('mouseup'));
    }, note1Idx);
    await page.waitForTimeout(300);
    await expect(selectionBox).toBeVisible();
    const box1Y = await selectionBox.evaluate(el => parseFloat(el.getAttribute('y')));

    // 2. Place cursor on "note right of Alice: Welcome"
    const note2Idx = sourceCode.indexOf('note right of Alice: Welcome');
    await editor.evaluate((el, idx) => {
      el.focus();
      el.setSelectionRange(idx + 5, idx + 5);
      el.dispatchEvent(new Event('mouseup'));
    }, note2Idx);
    await page.waitForTimeout(300);
    await expect(selectionBox).toBeVisible();
    const box2Y = await selectionBox.evaluate(el => parseFloat(el.getAttribute('y')));

    // 3. Place cursor on "note over Alice, Bob: Welcome"
    const note3Idx = sourceCode.indexOf('note over Alice, Bob: Welcome');
    await editor.evaluate((el, idx) => {
      el.focus();
      el.setSelectionRange(idx + 5, idx + 5);
      el.dispatchEvent(new Event('mouseup'));
    }, note3Idx);
    await page.waitForTimeout(300);
    await expect(selectionBox).toBeVisible();
    const box3Y = await selectionBox.evaluate(el => parseFloat(el.getAttribute('y')));

    // Assert that each note has a distinctly increasing vertical position
    expect(box2Y).toBeGreaterThan(box1Y);
    expect(box3Y).toBeGreaterThan(box2Y);
  });
});
