import { test, expect } from '@playwright/test';

test.describe("Focus Line Alignment in Local Syntax Mode", () => {

  test('gutter line numbers align with editor lines even with warnings', async ({ page }) => {
    await page.goto('/');
    // Undeclared participant "Bob" triggers an amber warning but still renders.
    await page.evaluate(() => {
      const editor = document.getElementById('source');
      editor.value = 'sequenceDiagram\n    participant Alice\n    Bob->>Alice: hi\n    Alice->>Charlie: yo';
      editor.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      const editor = document.getElementById('source');
      const gutter = document.getElementById('gutter');
      const spans = Array.from(gutter.querySelectorAll('span'));
      if (spans.length === 0) return { ok: false, reason: 'no gutter spans' };

      const cs = getComputedStyle(editor);
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
      const edTop = editor.getBoundingClientRect().top - editor.scrollTop;

      // Gutter may carry its own top offset; measure it from line 0 and require
      // every subsequent span to stay aligned to its editor line.
      const offset0 = spans[0].getBoundingClientRect().top - edTop;
      for (let i = 0; i < spans.length; i++) {
        const expected = edTop + i * lineHeight + offset0;
        const top = spans[i].getBoundingClientRect().top;
        if (Math.abs(top - expected) > 2) {
          return { ok: false, reason: `span ${i} off by ${(top - expected).toFixed(2)}px` };
        }
      }
      return { ok: true };
    });

    expect(result.ok, result.reason).toBe(true);
  });
});
