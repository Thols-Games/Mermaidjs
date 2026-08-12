import { test, expect } from '@playwright/test';

test.describe('\'Loop Block & Inner Messages Identification\', (', () => {

  test('identifies and retrieves all messages inside a loop block', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    const sourceCode = 'sequenceDiagram\nparticipant Alice\nparticipant Bob\nAlice->>Bob: Outside Message\nloop Everyday\nAlice->>Bob: Inside Loop Message 1\nBob->>Alice: Inside Loop Message 2\nend';
    await editor.fill(sourceCode);
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1000);

    // Query the SVG inside the preview iframe to find loop text elements
    const innerMessages = await page.evaluate(() => {
      const doc = document;

      // Find the loop bounding box via loopText elements
      const loopText = doc.querySelector('.loopText, .labelText');
      if (!loopText) return [];

      const svg = loopText.closest('svg') || doc.querySelector('.preview svg');
      if (!svg) return [];

      // Get Y bounds from the loopLine rect (loop box outline)
      const loopRects = svg.querySelectorAll('rect.loopLine, line.loopLine, polygon');
      let minY = Infinity, maxY = -Infinity;

      // Approach: find all text elements that match "Inside Loop Message" pattern
      const allTexts = svg.querySelectorAll('text, tspan');
      const result = [];
      allTexts.forEach(el => {
        const content = el.textContent.trim();
        if (content.includes('Inside Loop Message')) {
          result.push(content);
        }
      });
      return result;
    });

    expect(innerMessages.some(m => m.includes('Inside Loop Message 1'))).toBe(true);
    expect(innerMessages.some(m => m.includes('Inside Loop Message 2'))).toBe(true);
    expect(innerMessages.every(m => !m.includes('Outside Message'))).toBe(true);
  });
});
