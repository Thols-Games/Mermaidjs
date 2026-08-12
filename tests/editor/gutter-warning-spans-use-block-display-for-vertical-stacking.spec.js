import { test, expect } from '@playwright/test';

test.describe('\'Focus Line Alignment in Local Syntax Mode\', (', () => {

  test('gutter warning spans use block display for vertical stacking', async ({ page }) => {
    await page.goto('/');
    // Use content that produces warning-highlighted gutter lines
    await page.evaluate(() => {
      const editor = document.getElementById('source');
      editor.value = 'sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice->>Bob: Hello\n    Alice->>Charlie: Hey\n    Charlie->>Alice: Hello back\n    Bob->>Charlie: Greetings';
      editor.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(1500);

    // Check that all gutter spans (including warning ones) are display: block
    const spans = await page.evaluate(() => {
      const gutter = document.getElementById('gutter');
      return Array.from(gutter.querySelectorAll('span')).map(span => ({
        text: span.textContent,
        className: span.className,
        display: getComputedStyle(span).display,
      }));
    });

    for (const span of spans) {
      expect(span.display).toBe('block');
    }
  });
});
