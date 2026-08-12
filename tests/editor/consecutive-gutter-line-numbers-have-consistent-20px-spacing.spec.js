import { test, expect } from '@playwright/test';

test.describe('\'Focus Line Alignment in Local Syntax Mode\', (', () => {

  test('consecutive gutter line numbers have consistent 20px spacing', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const editor = document.getElementById('source');
      editor.value = 'sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice->>Bob: Hello\n    Bob->>Alice: Hi there\n    Alice->>Charlie: Hey\n    Charlie->>Alice: Hello back\n    Bob->>Charlie: Greetings\n    Note over Alice,Bob: This is a note\n    loop Every day\n        Alice->>Bob: Good morning\n    end';
      editor.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(1500);

    const positions = await page.evaluate(() => {
      const gutter = document.getElementById('gutter');
      const spans = gutter.querySelectorAll('span');
      return Array.from(spans).map(span => span.getBoundingClientRect().top);
    });

    // Each consecutive span should be exactly 20px apart
    for (let i = 1; i < positions.length; i++) {
      const gap = positions[i] - positions[i - 1];
      expect(Math.abs(gap - 20)).toBeLessThan(2);
    }
  });
});
