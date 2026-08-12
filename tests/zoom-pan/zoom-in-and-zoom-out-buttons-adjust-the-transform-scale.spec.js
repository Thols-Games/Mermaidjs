import { test, expect } from '@playwright/test';

test.describe('\'Zoom & Pan Controls\', (', () => {

  test('zoom in and zoom out buttons adjust the transform scale', async ({ page }) => {
    await page.goto('/');
    // Zoom buttons are on the main page (index.html)
    const zoomInBtn = page.locator('#zoomInBtn');
    const zoomOutBtn = page.locator('#zoomOutBtn');

    // Render a diagram so the inline preview (#target) has an SVG to zoom.
    const editor = page.locator('#source');
    await editor.fill('sequenceDiagram\nAlice->>Bob: Hello');
    await editor.dispatchEvent('input');
    const zoomWrap = page.locator('#target svg');
    await zoomWrap.waitFor({ state: 'visible', timeout: 15000 });

    // Get initial transform
    const initialStyle = await zoomWrap.getAttribute('style') || '';
    const initialScaleMatch = initialStyle.match(/scale\(([\d.]+)\)/);
    const initialScale = initialScaleMatch ? parseFloat(initialScaleMatch[1]) : 1;

    // Zoom Out
    await zoomOutBtn.click();
    await page.waitForTimeout(100); // give it a tiny bit of time to apply
    
    let style = await zoomWrap.getAttribute('style');
    let scaleMatch = style.match(/scale\(([\d.]+)\)/);
    let zoomedOutScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    
    expect(zoomedOutScale).toBeLessThan(initialScale);

    // Zoom In twice
    await zoomInBtn.click();
    await zoomInBtn.click();
    await page.waitForTimeout(100);
    
    style = await zoomWrap.getAttribute('style');
    scaleMatch = style.match(/scale\(([\d.]+)\)/);
    let zoomedInScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    
    expect(zoomedInScale).toBeGreaterThan(zoomedOutScale);
  });
});
