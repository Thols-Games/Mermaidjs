import mermaid from '../mermaid-11.16.0/package/dist/mermaid.esm.min.mjs';
import { VALID_DIAGRAM_TYPES, ALLOWED_DIAGRAM_TYPES, isDiagramTypeAllowed } from './diagram-types.js';
import { DIAGRAMS } from './diagrams.js';
import { injectHLPaletteColors } from './dom.js';
import { showEditorError, clearEditorError, showEditorWarnings, checkSequenceDiagramWarnings } from './editor.js';
import { renderOne, applyMermaidConfig, getAutonumberConfig } from './renderer.js';
import { initUiPanels, initSnippets, initInteractiveSelection, initExportModal } from './ui.js';
import { initZoomPanControls } from './zoom-pan.js';
import { autoFixMermaidCode, formatAndAlignMermaidCode, updateParticipantAliasesInCode } from './auto-fix.js';

window.VALID_DIAGRAM_TYPES = VALID_DIAGRAM_TYPES;
window.ALLOWED_DIAGRAM_TYPES = ALLOWED_DIAGRAM_TYPES;

document.addEventListener('DOMContentLoaded', async () => {
  const elType = document.getElementById('diagramType');
  const elTheme = document.getElementById('theme');
  const elSrc = document.getElementById('source');
  const btnRender = document.getElementById('renderBtn');
  const btnReset = document.getElementById('resetBtn');
  const btnValidate = document.getElementById('validateBtn');
  const btnFix = document.getElementById('fixBtn');
  const btnAutoAlign = document.getElementById('autoAlignBtn');
  const btnClear = document.getElementById('clearBtn');
  const btnCopy = document.getElementById('copyBtn');
  const diagramTypeBadge = document.getElementById('diagramTypeBadge');
  const diagramThemeToggleBtn = document.getElementById('diagramThemeToggleBtn');
  const autoUpdateToggle = document.getElementById('autoUpdateToggle');

  const diagramHistory = {
    stack: [],
    currentIndex: -1,
    isNavigating: false
  };

  const btnPrevDiagram = document.getElementById('prevDiagramBtn');
  const btnNextDiagram = document.getElementById('nextDiagramBtn');

  function updateNavButtonsState() {
    const canGoBack = diagramHistory.currentIndex > 0;
    const canGoForward = diagramHistory.currentIndex < diagramHistory.stack.length - 1;

    if (btnPrevDiagram) {
      btnPrevDiagram.disabled = !canGoBack;
      btnPrevDiagram.style.opacity = canGoBack ? '1' : '0.4';
      btnPrevDiagram.style.cursor = canGoBack ? 'pointer' : 'not-allowed';
    }
    if (btnNextDiagram) {
      btnNextDiagram.disabled = !canGoForward;
      btnNextDiagram.style.opacity = canGoForward ? '1' : '0.4';
      btnNextDiagram.style.cursor = canGoForward ? 'pointer' : 'not-allowed';
    }
  }

  function pushDiagramHistory(type, src) {
    if (diagramHistory.isNavigating) return;
    if (diagramHistory.currentIndex < diagramHistory.stack.length - 1) {
      diagramHistory.stack = diagramHistory.stack.slice(0, diagramHistory.currentIndex + 1);
    }
    const last = diagramHistory.stack[diagramHistory.currentIndex];
    if (last && last.type === type && last.src === src) return;

    diagramHistory.stack.push({ type, src });
    diagramHistory.currentIndex = diagramHistory.stack.length - 1;
    updateNavButtonsState();
  }

  function navigateHistory(direction) {
    const targetIdx = diagramHistory.currentIndex + direction;
    if (targetIdx < 0 || targetIdx >= diagramHistory.stack.length) return;

    diagramHistory.currentIndex = targetIdx;
    diagramHistory.isNavigating = true;

    const item = diagramHistory.stack[targetIdx];
    if (elType && item.type) elType.value = item.type;
    if (elSrc) {
      elSrc.value = item.src;
      elSrc.dispatchEvent(new Event('input'));
      if (diagramTypeBadge && DIAGRAMS[item.type]) {
        diagramTypeBadge.textContent = DIAGRAMS[item.type].label || item.type;
      }
      renderOne(elSrc.value);
    }

    diagramHistory.isNavigating = false;
    updateNavButtonsState();
  }

  function loadExample(key) {
    const d = DIAGRAMS[key];
    if (!d || !elSrc) return;
    elSrc.value = d.src || '';
    // Push the external write into CodeMirror (mirrors via #source input event).
    elSrc.dispatchEvent(new Event('input'));
    if (diagramTypeBadge) diagramTypeBadge.textContent = d.label || key;
    renderOne(elSrc.value);
    pushDiagramHistory(key, elSrc.value);
  }

  if (btnPrevDiagram) {
    btnPrevDiagram.addEventListener('click', () => navigateHistory(-1));
  }

  if (btnNextDiagram) {
    btnNextDiagram.addEventListener('click', () => navigateHistory(1));
  }

  // Populate Diagram Type options in settings
  if (elType) {
    elType.innerHTML = '';
    for (const key in DIAGRAMS) {
      if (isDiagramTypeAllowed(key, DIAGRAMS[key])) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = DIAGRAMS[key].label;
        if (key === 'sequence') {
          opt.selected = true;
        }
        elType.appendChild(opt);
      }
    }
    elType.addEventListener('change', () => {
      loadExample(elType.value);
    });
  }

  // Initialize Mermaid library
  // Using securityLevel 'strict' (default) to prevent XSS attacks when hosted publicly.
  await applyMermaidConfig(
    getAutonumberConfig(),
    (elTheme && elTheme.value === 'teal') ? 'dark' : (elTheme ? elTheme.value : 'dark')
  );

  mermaid.parseError = (err, hash) => {
    showEditorError(err, hash);
  };

  // Wire controls
  initZoomPanControls();
  await initUiPanels();
  initSnippets();
  initInteractiveSelection();
  initExportModal();

  // Inject syntax highlighting palette styles
  try { injectHLPaletteColors(); } catch (e) { }

  window.addEventListener('paletteChanged', () => {
    try { injectHLPaletteColors(); } catch (e) { }
    elSrc.dispatchEvent(new Event('input'));
  });

  const elHlMode = document.getElementById('hlMode');
  if (elHlMode) {
    const savedHlMode = localStorage.getItem('editorHlMode');
    if (savedHlMode) elHlMode.value = savedHlMode;
    elHlMode.addEventListener('change', () => {
      localStorage.setItem('editorHlMode', elHlMode.value);
      if (window.__cmEditor) window.__cmEditor.setHlMode(elHlMode.value !== 'off');
    });
  }

  if (autoUpdateToggle) {
    autoUpdateToggle.addEventListener('change', () => {
      if (autoUpdateToggle.checked) {
        renderOne(elSrc.value);
      }
    });
  }

  let lastSelectionStart = 0;
  let lastSelectionEnd = 0;

  if (elSrc) {
    const handleCursorSync = () => {
      lastSelectionStart = elSrc.selectionStart;
      lastSelectionEnd = elSrc.selectionEnd;
      window.dispatchEvent(new CustomEvent('cursorSync', {
        detail: { selectionStart: lastSelectionStart, selectionEnd: lastSelectionEnd }
      }));
    };

    elSrc.addEventListener('input', handleCursorSync);
    elSrc.addEventListener('keydown', handleCursorSync);
    elSrc.addEventListener('keyup', handleCursorSync);
    elSrc.addEventListener('click', handleCursorSync);
    elSrc.addEventListener('mouseup', handleCursorSync);
    elSrc.addEventListener('focus', handleCursorSync);
    elSrc.addEventListener('select', handleCursorSync);
    elSrc.addEventListener('scroll', () => {
      const elGutter = document.getElementById('gutter');
      if (elGutter) elGutter.scrollTop = elSrc.scrollTop;
      handleCursorSync();
    });

    let inputTimer = null;
    let inputSeq = 0;
    elSrc.addEventListener('input', () => {
      clearTimeout(inputTimer);
      const mySeq = ++inputSeq;
      inputTimer = setTimeout(async () => {
        if (mySeq !== inputSeq) return;
        if (autoUpdateToggle && !autoUpdateToggle.checked) return;
        await renderOne(elSrc.value);
      }, 500);
    });

    // Keyboard shortcuts
    elSrc.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        renderOne(elSrc.value);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const start = elSrc.selectionStart;
        const end = elSrc.selectionEnd;
        const val = elSrc.value;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;

        const selectedText = val.substring(lineStart, lineEnd);
        const lines = selectedText.split('\n');
        const allCommented = lines.every(l => l.trim().startsWith('%%'));

        const newLines = lines.map(l => {
          if (allCommented) {
            return l.replace(/^(\s*)%%\s?/, '$1');
          } else {
            return l.replace(/^(\s*)/, '$1%% ');
          }
        });

        elSrc.value = val.substring(0, lineStart) + newLines.join('\n') + val.substring(lineEnd);
        elSrc.selectionStart = lineStart;
        elSrc.selectionEnd = lineStart + newLines.join('\n').length;
        renderOne(elSrc.value);
      }
    });
  }

  if (elTheme) {
    elTheme.addEventListener('change', async () => {
      document.documentElement.classList.toggle('theme-light', elTheme.value === 'default');
      document.documentElement.classList.toggle('theme-teal', elTheme.value === 'teal');
      document.documentElement.style.colorScheme = elTheme.value === 'default' ? 'light' : 'dark';

      if (diagramThemeToggleBtn) diagramThemeToggleBtn.checked = elTheme.value !== 'default';

      let mmTheme = elTheme.value;
      if (mmTheme === 'teal') mmTheme = 'dark';
      await applyMermaidConfig(getAutonumberConfig(), mmTheme);
      renderOne(elSrc.value);
    });
  }

  if (diagramThemeToggleBtn) {
    diagramThemeToggleBtn.addEventListener('change', async () => {
      const isTeal = diagramThemeToggleBtn.checked;
      if (elTheme) elTheme.value = isTeal ? 'teal' : 'default';
      document.documentElement.classList.toggle('theme-light', !isTeal);
      document.documentElement.classList.toggle('theme-teal', isTeal);
      document.documentElement.style.colorScheme = isTeal ? 'dark' : 'light';
      await applyMermaidConfig(getAutonumberConfig(), isTeal ? 'dark' : 'default');
      renderOne(elSrc.value);
    });
  }

  const diagramAutonumberToggleBtn = document.getElementById('diagramAutonumberToggleBtn');
  if (diagramAutonumberToggleBtn) {
    diagramAutonumberToggleBtn.addEventListener('change', async () => {
      const isAutonumber = diagramAutonumberToggleBtn.checked;
      let mmTheme = elTheme ? elTheme.value : 'dark';
      if (mmTheme === 'teal') mmTheme = 'dark';
      await applyMermaidConfig(isAutonumber, mmTheme);
      renderOne(elSrc.value);
    });
  }

  if (btnRender) {
    btnRender.addEventListener('click', () => renderOne(elSrc.value));
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => loadExample(elType ? elType.value : 'sequence'));
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (elSrc) {
        elSrc.value = '';
        elSrc.dispatchEvent(new Event('input'));
        clearEditorError();
        renderOne('');
        elSrc.focus();
      }
    });
  }

  if (btnCopy && elSrc) {
    btnCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(elSrc.value);
        btnCopy.style.color = 'var(--accent)';
        setTimeout(() => { btnCopy.style.color = ''; }, 1000);
      } catch (e) { }
    });
  }



  if (btnValidate) {
    btnValidate.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      Validate
    `;
    btnValidate.addEventListener('click', async () => {
      try {
        if (window.hlErrorLines) window.hlErrorLines.clear();
        const isValid = await mermaid.parse(elSrc.value);
        const warnings = checkSequenceDiagramWarnings(elSrc.value);
        if (isValid) {
          if (warnings && warnings.length > 0) {
            btnValidate.innerHTML = '<span style="color: #e2a23b; font-weight: 600;">Warnings ⚠</span>';
            showEditorWarnings(warnings);
          } else {
            clearEditorError();
            btnValidate.innerHTML = '<span style="color: var(--accent); font-weight: 600;">Valid ✓</span>';
            if (btnFix) btnFix.style.display = 'none';
          }
        }
      } catch (err) {
        showEditorError(err);
      }
    });
  }

  if (btnFix) {
    btnFix.addEventListener('click', async () => {
      const code = elSrc.value;
      const fixedCode = autoFixMermaidCode(code);
      if (fixedCode !== code) {
        const start = lastSelectionStart;
        const end = lastSelectionEnd;
        const scrollTop = elSrc.scrollTop;
        const scrollLeft = elSrc.scrollLeft;

        elSrc.value = fixedCode;

        elSrc.focus();
        elSrc.selectionStart = start;
        elSrc.selectionEnd = end;
        elSrc.scrollTop = scrollTop;
        elSrc.scrollLeft = scrollLeft;

        elSrc.dispatchEvent(new Event('input'));
        clearEditorError();
        await renderOne(fixedCode);
      }
    });
  }

  if (btnAutoAlign) {
    btnAutoAlign.addEventListener('click', () => {
      if (elSrc) {
        let code = elSrc.value;
        const cleanSrc = code.trim().replace(/^---[\s\S]*?---\s*/, '');
        if (/^sequenceDiagram\b/i.test(cleanSrc)) {
          code = updateParticipantAliasesInCode(code);
        }
        const aligned = formatAndAlignMermaidCode(code);
        elSrc.value = aligned;
        elSrc.dispatchEvent(new Event('input'));
        renderOne(elSrc.value);
      }
    });
  }



  // CodeMirror is now the default editor; it provides its own diagram-type
  // autocomplete, so the legacy autocomplete panel is retired.

  // Load initial example
  if (elType && elType.value) {
    loadExample(elType.value);
  } else {
    loadExample('sequence');
  }

  // Initialize the CodeMirror editor (lazy import; the import map is served from
  // /node_modules). It mirrors every edit into the hidden #source so the rest of
  // the render pipeline is unchanged.
  try {
    const { initCmEditor } = await import('./cm-editor.js');
    initCmEditor();
  } catch (e) {
    console.error('CodeMirror init failed:', e);
  }
});
