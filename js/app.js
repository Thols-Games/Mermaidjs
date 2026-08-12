import mermaid from '../mermaid-11.16.0/package/dist/mermaid.esm.min.mjs';
import { VALID_DIAGRAM_TYPES, ALLOWED_DIAGRAM_TYPES, isDiagramTypeAllowed } from './diagram-types.js';
import { DIAGRAMS } from './diagrams.js';
import { injectHLPaletteColors } from './dom.js';
import { syncGutter, syncLocalHL, showEditorError, clearEditorError } from './editor.js';
import { renderOne } from './renderer.js';
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
      syncGutter();
      syncLocalHL();
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
    elSrc.value = d.src ? d.src + '\n' : '';
    syncGutter();
    syncLocalHL();
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
  await mermaid.initialize({
    startOnLoad: false,
    theme: elTheme && elTheme.value === 'teal' ? 'dark' : (elTheme ? elTheme.value : 'dark'),
    securityLevel: 'strict'
  });

  mermaid.parseError = (err, hash) => {
    showEditorError(err, hash);
  };

  // Wire controls
  initZoomPanControls();
  initUiPanels();
  initSnippets();
  initInteractiveSelection();
  initExportModal();

  // Inject syntax highlighting palette styles
  try { injectHLPaletteColors(); } catch (e) {}

  window.addEventListener('paletteChanged', () => {
    try { injectHLPaletteColors(); } catch (e) {}
    elSrc.dispatchEvent(new Event('input'));
  });

  const elHlMode = document.getElementById('hlMode');
  if (elHlMode) {
    elHlMode.addEventListener('change', syncLocalHL);
  }

  if (autoUpdateToggle) {
    autoUpdateToggle.addEventListener('change', () => {
      if (autoUpdateToggle.checked) {
        renderOne(elSrc.value);
      }
    });
  }

  if (elSrc) {
    const handleCursorSync = () => {
      syncGutter();
      syncLocalHL();
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
        syncGutter();
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
      await mermaid.initialize({ startOnLoad: false, theme: mmTheme, securityLevel: 'strict' });
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
      await mermaid.initialize({ startOnLoad: false, theme: isTeal ? 'dark' : 'default', securityLevel: 'strict' });
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
        syncGutter();
        syncLocalHL();
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
      } catch (e) {}
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
        if (isValid) {
          btnValidate.innerHTML = '<span style="color: var(--accent); font-weight: 600;">Valid ✓</span>';
          if (btnFix) btnFix.style.display = 'none';
          clearEditorError();
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
        elSrc.value = fixedCode;
        syncGutter();
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
        syncGutter();
        renderOne(elSrc.value);
      }
    });
  }



  // Load initial example
  if (elType && elType.value) {
    loadExample(elType.value);
  } else {
    loadExample('sequence');
  }
});
