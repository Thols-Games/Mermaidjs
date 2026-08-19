import { test, expect } from '@playwright/test';

test.describe("Focus Line Alignment in Local Syntax Mode", () => {

  test('CM line-number gutter aligns with editor lines even with warnings', async ({ page }) => {
    await page.goto('/');
    // Undeclared participant "Bob" triggers an amber warning but still renders.
    await page.evaluate(() => {
      const editor = document.getElementById('source');
      editor.value = 'sequenceDiagram\n    participant Alice\n    Bob->>Alice: hi\n    Alice->>Charlie: yo';
      editor.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      const lines = Array.from(document.querySelectorAll('.cm-content .cm-line'));
      const nums = Array.from(document.querySelectorAll('.cm-lineNumbers .cm-gutterElement'));
      const numFor = (i) => nums.find((n) => n.textContent.trim() === String(i + 1));
      for (let i = 0; i < lines.length; i++) {
        const n = numFor(i);
        if (!n) return { ok: false, reason: `missing line number ${i + 1}` };
        const gTop = n.getBoundingClientRect().top;
        const lTop = lines[i].getBoundingClientRect().top;
        if (Math.abs(gTop - lTop) > 3) {
          return { ok: false, reason: `line ${i + 1} off by ${(gTop - lTop).toFixed(2)}px` };
        }
      }
      return { ok: true, count: lines.length };
    });

    expect(result.ok, result.reason).toBe(true);
  });
});
