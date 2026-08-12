# Bi-Directional Synchronization Implementation Guide

This guide explains how to implement the interactive synchronization feature between the Mermaid code editor and the rendered SVG diagram. The feature ensures that selecting a line of code highlights the corresponding diagram node, and clicking a diagram node highlights the corresponding code.

## 1. Add the Selection Box (CSS & HTML)
First, you need a visual highlight box that will float over the active diagram element.

**CSS:**
Add this to your stylesheet to style the highlight box:
```css
#diagram-selection-box {
  position: absolute;
  border: 2px solid #35d0c0; /* Highlight color (Teal/Accent) */
  background-color: rgba(53, 208, 192, 0.1);
  pointer-events: none; /* Crucial: lets clicks pass through to the SVG */
  display: none;
  z-index: 10;
  border-radius: 4px;
  transition: all 0.2s ease-out;
}
```

**HTML:**
Ensure this div is placed inside the same container as the Mermaid SVG (usually `.preview` or `#zoomWrap`) so it overlays the diagram correctly:
```html
<div class="preview" id="preview">
  <div id="zoomWrap">
    <pre class="mermaid" id="target"></pre>
    <div id="diagram-selection-box"></div> <!-- The Highlight Box -->
  </div>
</div>
```

---

## 2. Implement Coordinate Extraction
Mermaid nodes use a mix of relative CSS transforms and absolute SVG coordinates. You must include the safe extraction logic to prevent mathematical `NaN` errors.

**JavaScript:**
```javascript
function getTransformY(el) {
  let y = 0;
  let current = el;
  while (current && current.tagName !== 'svg') {
    if (current.getBBox) {
      try {
        const box = current.getBBox();
        if (box && !isNaN(box.y) && isFinite(box.y)) y += box.y;
      } catch (e) {}
    }
    const transform = current.getAttribute('transform');
    if (transform) {
      const translateMatch = transform.match(/translate\([^,]+,\s*([^)]+)\)/);
      if (translateMatch && translateMatch[1]) {
        if (!isNaN(parseFloat(translateMatch[1]))) y += parseFloat(translateMatch[1]);
      }
    }
    current = current.parentElement;
  }
  return y;
}
```

---

## 3. Direction A: Editor -> Diagram Sync
When the user clicks or types in the editor, we read the active line, find the matching text in the SVG, and position the highlight box.

**JavaScript:**
```javascript
const sourceEditor = document.getElementById('source');
const selectionBox = document.getElementById('diagram-selection-box');

function syncEditorToDiagram() {
  const text = sourceEditor.value;
  const cursorIndex = sourceEditor.selectionStart;
  
  // Find the start and end of the current line
  const lineStart = text.lastIndexOf('\n', cursorIndex - 1) + 1;
  let lineEnd = text.indexOf('\n', cursorIndex);
  if (lineEnd === -1) lineEnd = text.length;
  
  const currentLineText = text.substring(lineStart, lineEnd).trim();
  
  if (!currentLineText) {
    selectionBox.style.display = 'none';
    return;
  }

  // Find the SVG text node that matches the line's text
  const svgTextNodes = document.querySelectorAll('.preview svg text');
  let matchedElement = null;
  
  for (const node of svgTextNodes) {
    if (node.textContent.includes(currentLineText) || currentLineText.includes(node.textContent)) {
       // Usually, the visual box is a <rect> wrapping the <text>
       matchedElement = node.closest('.node') || node.previousElementSibling; 
       break;
    }
  }

  if (matchedElement && matchedElement.getBBox) {
    const box = matchedElement.getBBox();
    const absoluteY = getTransformY(matchedElement);
    
    if (isNaN(absoluteY) || isNaN(box.height) || box.height === 0) {
      selectionBox.style.display = 'none';
      return;
    }

    selectionBox.style.display = 'block';
    selectionBox.style.top = `${absoluteY}px`;
    
    // X can usually rely on physical BBox relative to the SVG root
    selectionBox.style.left = `${box.x}px`;
    selectionBox.style.width = `${box.width}px`;
    selectionBox.style.height = `${box.height}px`;
  } else {
    selectionBox.style.display = 'none';
  }
}

// Bind events
sourceEditor.addEventListener('keyup', syncEditorToDiagram);
sourceEditor.addEventListener('click', syncEditorToDiagram);
```

---

## 4. Direction B: Diagram -> Editor Sync
When a user clicks on a node in the rendered Mermaid diagram, we want to highlight the corresponding row of code in the editor.

**JavaScript:**
```javascript
document.getElementById('preview').addEventListener('click', (event) => {
  // Find the closest SVG node group that was clicked
  const clickedNode = event.target.closest('.node') || event.target.closest('g');
  if (!clickedNode) return;

  // Extract the text content of the clicked node
  const textElement = clickedNode.querySelector('text');
  if (!textElement) return;
  
  const nodeText = textElement.textContent.trim();
  if (!nodeText) return;

  const editorText = sourceEditor.value;
  
  // Find where this text appears in the editor
  const matchIndex = editorText.indexOf(nodeText);
  if (matchIndex !== -1) {
    const lineStart = editorText.lastIndexOf('\n', matchIndex) + 1;
    sourceEditor.focus();
    sourceEditor.setSelectionRange(lineStart, lineStart); // Cursor at lineStart avoids native blue selection bar
    
    const textBefore = editorText.substring(0, lineStart);
    const lineNumber = textBefore.split('\n').length;
    if (typeof updateTextareaActiveBg === 'function') updateTextareaActiveBg(lineNumber);
    if (typeof syncLocalHL === 'function') syncLocalHL();
    
    // Manually trigger the Editor -> Diagram sync to draw the green selection box
    syncEditorToDiagram();
  }
});
```

## Summary
By injecting the HTML overlay `#diagram-selection-box`, pure CSS `#textareaActiveBg` line highlighter, and attaching these two event listener blocks (Editor `keyup/keydown/click/mouseup/focus/select/input/scroll` and Diagram `click`), you create a complete loop. The `getTransformY` function acts as the mathematical bridge that ensures the bounding box doesn't break due to Mermaid's complex internal rendering engine.

---

## 5. Automated Testing Guidelines (Playwright)

Once implemented, you should write an automated End-to-End (E2E) test to verify the synchronization works as expected. Below is a testing guideline using **Playwright**.

### Configuring Playwright (Required for Mermaid ES Modules)
Because Mermaid uses ES modules, you must serve the files via an HTTP server (like `serve.mjs`) to avoid CORS errors during testing. Playwright can handle booting up this server automatically.

Ensure your `playwright.config.js` file includes this `webServer` block so Playwright knows how to boot your app before running tests:

```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ... other config ...

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'node serve.mjs 5505',
    url: 'http://localhost:5505',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5505',
  },
});
```

### Creating the Test File
Create a file named `diagram-sync.spec.js` in your tests directory:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Bi-Directional Diagram Sync', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to your Mermaid Editor application
    await page.goto('/');
  });

  test('verifies that selecting editor text draws a bounding box over the diagram', async ({ page }) => {
    const editor = page.locator('#source');
    
    // 1. Inject Mermaid source code
    await editor.fill('sequenceDiagram\\nparticipant Alice\\nAlice->>John: Hello John\\n');
    await editor.dispatchEvent('input');
    
    // 2. Wait for Mermaid SVG to fully render
    await page.waitForSelector('.preview svg');
    
    // 3. Simulate User Interaction (selecting the "participant Alice" row)
    await page.evaluate(() => {
      const el = document.getElementById('source');
      const text = el.value;
      const pos = text.indexOf('participant Alice');
      
      el.focus();
      // Select the text to trigger the sync logic
      el.setSelectionRange(pos + 5, pos + 5);
      el.dispatchEvent(new Event('mouseup')); // Or click/keyup depending on your listeners
    });
    
    // 4. Verify the DOM State
    const box = page.locator('#diagram-selection-box');
    
    // Assert the box is attached to the DOM and is visible
    await expect(box).toBeAttached();
    
    // Assert the box has a valid computed height (meaning NaN validation succeeded)
    const boxHeight = await box.evaluate(el => el.getBoundingClientRect().height);
    expect(boxHeight).toBeGreaterThan(10); 
  });
});
```

### Key Testing Strategies:
- **Bypass CodeMirror (If Applicable):** If your textarea `#source` is hidden behind a complex code editor like CodeMirror, you might need to use Playwright's keyboard events (`page.keyboard.type`) rather than `page.evaluate()` to trigger the selection properly.
- **Wait for SVG Rendering:** Mermaid diagrams render asynchronously. Always use `await page.waitForSelector('.preview svg')` before trying to trigger the sync logic, otherwise the test will fail because the diagram elements don't exist yet.
- **Assert Geometry, Not Just Visibility:** Don't just assert `toBeVisible()`. Actually check the bounding box dimensions (`getBoundingClientRect().height`) to ensure the `NaN` fix is working and the box hasn't collapsed to `0px`.

### Running and Debugging the Tests
To execute your `diagram-sync.spec.js` test, run the following commands in your terminal:

- **Run Headlessly:** `npx playwright test` (Runs in the background, fastest).
- **Run with UI Mode:** `npx playwright test --ui` (Highly Recommended: Opens a visual debugger where you can step through the code line-by-line and visually watch the selection box get drawn on the diagram).
- **View Reports:** `npx playwright show-report` (If a test fails in the background, this opens an HTML report showing exactly what went wrong).
