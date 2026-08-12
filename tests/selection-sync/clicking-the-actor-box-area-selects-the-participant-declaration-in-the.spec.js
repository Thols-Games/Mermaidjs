import { test, expect } from '@playwright/test';

test.describe('\'Actor Box & Text Selection Sync\', (', () => {

  test('Clicking the actor <rect> box area selects the participant declaration in the code editor', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\n participant Alice\n participant Bob\n Alice->>Bob: Hello');
    await editor.dispatchEvent('input');
    await page.waitForTimeout(1200);

    // Locate the first rect actor element in preview iframe
    const previewFrame = page;
    const actorRect = previewFrame.locator('.preview rect.actor, .preview text.actor, .preview [class*="actor"]').first();
    await expect(actorRect).toBeVisible();

    // Extract text from the actor group
    const actorName = await actorRect.evaluate(el => (el.closest('g') || el).textContent.trim());

    // Click the actor rect box shape
    await actorRect.click({ force: true });
    await page.waitForTimeout(300);

    // Verify selection range in source textarea lands on participant declaration line
    const selStart = await editor.evaluate(el => el.selectionStart);
    const sourceText = await editor.inputValue();
    const declIndex = sourceText.indexOf(`participant ${actorName}`);
    const lineStart = sourceText.lastIndexOf('\n', declIndex) + 1;

    expect(selStart).toBe(lineStart);
  });
});
