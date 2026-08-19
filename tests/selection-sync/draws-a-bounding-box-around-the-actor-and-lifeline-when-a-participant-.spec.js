import { test, expect } from '@playwright/test';

test.describe('\'Mermaid Interactive Diagram Sync\', (', () => {

  test('draws a bounding box around the actor and lifeline when a participant is selected', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\nparticipant Alice\nparticipant John\nAlice->>John: Hello John\n');
    await editor.dispatchEvent('input');

    const previewFrame = page;
    await previewFrame.locator('#target svg').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(800);

    // Click the Alice actor box (CodeMirror selection sync highlights the declaration).
    const actorNode = previewFrame.locator('#target svg [class*="actor"]').filter({ hasText: 'Alice' }).first();
    await expect(actorNode).toBeVisible({ timeout: 5000 });
    await actorNode.click({ force: true });

    await page.waitForTimeout(300);

    const box = previewFrame.locator('#diagram-selection-box');
    await expect(box).toBeAttached();

    const boxHeight = await box.evaluate(el => parseFloat(el.getAttribute('height')));
    expect(boxHeight).toBeGreaterThan(40);
  });
});
