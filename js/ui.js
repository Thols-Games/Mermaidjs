import { applyDiagramStyle, applyDiagramFont, applyDiagramThickness } from './renderer.js';

let elSrc, elType, elTheme, btnToggleSrc, btnOpenEditor, sourceCol, toggleEditor, btnSettingsToggle, settingsPanel, shapesPanel, colorWheelBtn, themePanel, shapesToolbarBtn, syncDiagramThemeToggleState, textSizeBtn, textSizePopup, textSizeSlider, thicknessSlider, numberColorPicker, circleColorPicker, syncNumberColor, snippetsContainer, snippetsBtn, snippetsPanel, SNIPPETS, snippetsHtml, updateSnippetsVisibility, editorResizeHandle, isResizingEditor, editorStartWidth, resizeStartX, syncPreviewContainerPosition, btnFullscreen, previewContainer, elHlMode, elHlLayer, textareaWrap;

export function initUiPanels() {
    elSrc = document.getElementById('source');
    elType = document.getElementById('diagramType');
    elTheme = document.getElementById('theme');
    btnToggleSrc = document.getElementById('toggleSrcBtn');
    btnOpenEditor = document.getElementById('openEditorBtn');
    sourceCol = document.getElementById('sourceCol');

    toggleEditor = function toggleEditor() {
      const hidden = sourceCol.style.display === 'none';
      sourceCol.style.display = hidden ? '' : 'none';
      document.body.classList.toggle('src-hidden', !hidden);
      if (typeof syncPreviewContainerPosition === 'function') {
        syncPreviewContainerPosition();
      }
    }

    btnToggleSrc.addEventListener('click', toggleEditor);
    if (btnOpenEditor) btnOpenEditor.addEventListener('click', toggleEditor);

    const btnOpenCodeMirror = document.getElementById('openCodeMirrorBtn');
    const cmFloatingWindow = document.getElementById('cmFloatingWindow');
    const cmIframe = document.getElementById('cmIframe');
    if (btnOpenCodeMirror && cmFloatingWindow && cmIframe) {
      btnOpenCodeMirror.addEventListener('click', () => {
        const currentTheme = document.documentElement.classList.contains('theme-light') ? 'theme-light' : 
                             document.documentElement.classList.contains('theme-teal') ? 'theme-teal' : '';
        cmIframe.src = `Mermaidjs/CodeMirrorEditor.html?theme=${currentTheme}`;
        cmFloatingWindow.style.display = 'flex';
        if (typeof syncPreviewContainerPosition === 'function') syncPreviewContainerPosition();
      });

      // Sync theme dynamically
      const observer = new MutationObserver(() => {
        if (cmFloatingWindow.style.display !== 'none' && cmIframe.contentWindow) {
          const currentTheme = document.documentElement.classList.contains('theme-light') ? 'theme-light' : 
                               document.documentElement.classList.contains('theme-teal') ? 'theme-teal' : '';
          cmIframe.contentWindow.postMessage({ type: 'theme-change', theme: currentTheme }, '*');
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

      const resizeObserver = new ResizeObserver(() => {
        if (cmFloatingWindow.style.display !== 'none' && typeof syncPreviewContainerPosition === 'function') {
          syncPreviewContainerPosition();
        }
      });
      resizeObserver.observe(cmFloatingWindow);

      // Window controls
      document.getElementById('cmBtnClose')?.addEventListener('click', () => {
        cmFloatingWindow.style.display = 'none';
        cmIframe.src = '';
        if (typeof syncPreviewContainerPosition === 'function') syncPreviewContainerPosition();
      });
      document.getElementById('cmBtnMax')?.addEventListener('click', () => {
        if (cmFloatingWindow.style.width === '65vw' || cmFloatingWindow.style.width === '65%') {
          cmFloatingWindow.style.width = '35vw';
          cmFloatingWindow.style.top = '1rem';
          cmFloatingWindow.style.left = '1rem';
        } else {
          cmFloatingWindow.style.width = '65vw';
          cmFloatingWindow.style.top = '1rem';
          cmFloatingWindow.style.left = '1rem';
        }
        if (typeof syncPreviewContainerPosition === 'function') syncPreviewContainerPosition();
      });

      // Dragging logic
      const header = document.getElementById('cmFloatingHeader');
      let isDragging = false, startX, startY, initialX, initialY;
      header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = cmFloatingWindow.offsetLeft;
        initialY = cmFloatingWindow.offsetTop;
        document.body.style.userSelect = 'none';
        
        let blocker = document.getElementById('iframeBlocker');
        if (!blocker) {
          blocker = document.createElement('div');
          blocker.id = 'iframeBlocker';
          blocker.style.position = 'absolute';
          blocker.style.top = '40px'; blocker.style.left = '0'; blocker.style.right = '0'; blocker.style.bottom = '0';
          blocker.style.zIndex = '9999';
          cmFloatingWindow.appendChild(blocker);
        }
      });
      window.addEventListener('mousemove', (e) => {
        if (isDragging) {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          cmFloatingWindow.style.left = (initialX + dx) + 'px';
          cmFloatingWindow.style.top = (initialY + dy) + 'px';
          if (typeof syncPreviewContainerPosition === 'function') syncPreviewContainerPosition();
        }
      });
      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          document.body.style.userSelect = '';
          const blocker = document.getElementById('iframeBlocker');
          if (blocker) blocker.remove();
        }
      });
    }

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'mermaid-code-update') {
        const elSrc = document.getElementById('src');
        if (elSrc) {
          elSrc.value = event.data.code;
          if (typeof renderOne === 'function') {
            renderOne(event.data.code);
          }
        }
      }
    });

    // ---- Toggle Settings Panel ----
    btnSettingsToggle = document.getElementById('settingsToggleBtn');
    settingsPanel = document.getElementById('settingsPanel');
    shapesPanel = document.getElementById('shapesPanel');
    colorWheelBtn = document.getElementById('colorWheelBtn');
    themePanel = document.getElementById('themePanel');
    shapesToolbarBtn = document.getElementById('shapesToolbarBtn');

    if (btnSettingsToggle && settingsPanel) {
      btnSettingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('show');
        if (themePanel) themePanel.classList.remove('show');
        if (shapesPanel) shapesPanel.classList.remove('show');
      });
    }

    if (colorWheelBtn && themePanel) {
      colorWheelBtn.addEventListener('click', () => {
        themePanel.classList.toggle('show');
        if (settingsPanel) settingsPanel.classList.remove('show');
        if (shapesPanel) shapesPanel.classList.remove('show');
      });
    }

    // ---- Shapes Panel ----
    if (shapesToolbarBtn && shapesPanel) {
      shapesToolbarBtn.addEventListener('click', () => {
        shapesPanel.classList.toggle('show');
        settingsPanel.classList.remove('show');
        themePanel.classList.remove('show');
      });
    }

    // ---- Click Outside to Close Panels ----
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#settingsToggleBtn') && !e.target.closest('#settingsPanel')) {
        settingsPanel.classList.remove('show');
      }
      if (!e.target.closest('#colorWheelBtn') && !e.target.closest('#themePanel')) {
        themePanel.classList.remove('show');
      }
      if (!e.target.closest('#shapesToolbarBtn') && !e.target.closest('#shapesPanel') && shapesPanel) {
        shapesPanel.classList.remove('show');
      }
    });

    syncDiagramThemeToggleState = function syncDiagramThemeToggleState() {
      /* removed */
      const diagramThemeToggleBtn = document.getElementById('diagramThemeToggleBtn');
      if (diagramThemeToggleBtn) {
        const isNonDefault = document.documentElement.classList.contains('theme-teal') ||
          document.documentElement.classList.contains('theme-dark') ||
          (elTheme && elTheme.value !== 'default');
        diagramThemeToggleBtn.checked = isNonDefault;
      }
    }

    const diagramThemeToggleBtn = document.getElementById('diagramThemeToggleBtn');
    /* removed */
    if (diagramThemeToggleBtn) {
      diagramThemeToggleBtn.addEventListener('change', (e) => {
        /* removed */
        const newTheme = e.target.checked ? (localStorage.getItem('mermaid-last-dark-theme') || 'teal') : 'default';
        if (elTheme && elTheme.value !== newTheme) {
          if (e.target.checked && newTheme !== 'default') {
            localStorage.setItem('mermaid-last-dark-theme', newTheme);
          }
          elTheme.value = newTheme;
          elTheme.dispatchEvent(new Event('change'));
        }
      });
    }

    if (elTheme) {
      elTheme.addEventListener('change', () => {
        if (elTheme.value !== 'default') {
          localStorage.setItem('mermaid-last-dark-theme', elTheme.value);
        }
        syncDiagramThemeToggleState();
      });
    }

    // Set initial state based on active theme
    syncDiagramThemeToggleState();



    // Editor Font Size Slider
    textSizeBtn = document.getElementById('textSizeBtn');
    textSizePopup = document.getElementById('textSizePopup');
    textSizeSlider = document.getElementById('textSizeSlider');

    if (textSizeBtn && textSizePopup) {
      textSizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        textSizePopup.style.display = textSizePopup.style.display === 'none' ? 'block' : 'none';
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#textSizePopup') && !e.target.closest('#textSizeBtn')) {
          textSizePopup.style.display = 'none';
        }
      });
    }

    if (textSizeSlider) {
      const savedFontSize = localStorage.getItem('editorFontSize');
      if (savedFontSize) {
        document.documentElement.style.setProperty('--editor-font-size', savedFontSize + 'px');
        textSizeSlider.value = savedFontSize;
      }
      textSizeSlider.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--editor-font-size', e.target.value + 'px');
        localStorage.setItem('editorFontSize', e.target.value);
        if (typeof syncGutter === 'function') syncGutter();
        if (typeof syncLocalHL === 'function') syncLocalHL();
        if (typeof updateTextareaActiveBg === 'function') updateTextareaActiveBg();
      });
    }



    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const newTheme = e.currentTarget.getAttribute('data-theme');
        if (elTheme && elTheme.value !== newTheme) {
          elTheme.value = newTheme;
          elTheme.dispatchEvent(new Event('change'));
        }
      });
    });

    document.querySelectorAll('.palette-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    window.dispatchEvent(new Event('paletteChanged'));
  });
});

const paletteReverseToggle = document.getElementById('paletteReverseToggle');
if (paletteReverseToggle) {
  paletteReverseToggle.addEventListener('change', () => {
    window.dispatchEvent(new Event('paletteChanged'));
  });
}

document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        applyDiagramStyle();
      });
    });

    document.querySelectorAll('.font-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        applyDiagramFont();
      });
    });

    document.querySelectorAll('.thickness-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.thickness-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const slider = document.getElementById('diagramThicknessSlider');
        if (slider) slider.value = e.currentTarget.getAttribute('data-thickness');
        applyDiagramThickness();
      });
    });

    thicknessSlider = document.getElementById('diagramThicknessSlider');
    if (thicknessSlider) {
      thicknessSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        document.querySelectorAll('.thickness-btn').forEach(b => {
          if (b.getAttribute('data-thickness') === val) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
        applyDiagramThickness();
      });
    }

    numberColorPicker = document.getElementById('numberColorPicker');
    circleColorPicker = document.getElementById('circleColorPicker');
    syncNumberColor = document.getElementById('syncNumberColor');
    if (numberColorPicker && circleColorPicker && syncNumberColor) {
      syncNumberColor.addEventListener('change', (e) => {
        const disabled = e.target.checked;
        numberColorPicker.disabled = disabled;
        numberColorPicker.style.opacity = disabled ? '0.5' : '1';
        circleColorPicker.disabled = disabled;
        circleColorPicker.style.opacity = disabled ? '0.5' : '1';
        if (typeof colorizeSequence === 'function') colorizeSequence();
      });
      numberColorPicker.addEventListener('input', () => {
        if (typeof colorizeSequence === 'function') colorizeSequence();
      });
      circleColorPicker.addEventListener('input', () => {
        if (typeof colorizeSequence === 'function') colorizeSequence();
      });
    }

    // ---- Editor Panel Resize ----
    editorResizeHandle = document.getElementById('editorResizeHandle');
    isResizingEditor = false;
    editorStartWidth = 500;
    resizeStartX = 0;

    syncPreviewContainerPosition = function syncPreviewContainerPosition() {
      const previewContainerEl = document.querySelector('.preview-container');
      if (previewContainerEl && sourceCol) {
        if (document.body.classList.contains('src-hidden') || sourceCol.style.display === 'none') {
          previewContainerEl.style.left = '0';
        } else {
          const actualRight = sourceCol.getBoundingClientRect().right;
          previewContainerEl.style.left = (actualRight + 16) + 'px';
        }
      }
    }

    editorResizeHandle.addEventListener('mousedown', (e) => {
      isResizingEditor = true;
      resizeStartX = e.clientX;
      editorStartWidth = sourceCol.offsetWidth;
      editorResizeHandle.classList.add('dragging');
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizingEditor) return;
      e.preventDefault();

      const minW = window.innerWidth * 0.35;
      const maxW = window.innerWidth * 0.60;

      let newWidth = editorStartWidth + (e.clientX - resizeStartX);
      newWidth = Math.max(minW, Math.min(maxW, newWidth));

      sourceCol.style.width = newWidth + 'px';
      syncPreviewContainerPosition();
    });

    window.addEventListener('mouseup', () => {
      if (isResizingEditor) {
        isResizingEditor = false;
        editorResizeHandle.classList.remove('dragging');
        document.body.style.cursor = '';
      }
    });

    window.addEventListener('resize', () => {
      syncPreviewContainerPosition();
    });

    // Initial positioning sync
    syncPreviewContainerPosition();

    // ---- Fullscreen ----
    btnFullscreen = document.getElementById('fullscreenBtn');
    previewContainer = document.querySelector('.preview-container');
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        previewContainer.requestFullscreen().catch(console.error);
      } else {
        document.exitFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      btnFullscreen.classList.toggle('active', isFs);
      // Re-fit after the layout resize settles.
      setTimeout(() => {}, 50);
    });

    // ================================================================
    // SYNTAX HIGHLIGHTING  —  Local regex  |  CDN CodeMirror 6
    // ================================================================
    elHlMode = document.getElementById('hlMode');
    elHlLayer = document.getElementById('hlLayer');
    textareaWrap = document.getElementById('textareaWrap');

}

export function initSnippets() {
    // ---- Snippets Panel ----
    snippetsContainer = document.getElementById('snippetsContainer');
    snippetsBtn = document.getElementById('snippetsBtn');
    snippetsPanel = document.getElementById('snippetsPanel');

    snippetsBtn.addEventListener('click', () => {
      snippetsContainer.classList.toggle('expanded');
    });

    SNIPPETS = [
      {
        cat: 'Flowchart shapes', type: 'flowchart', items: [
          { name: 'Rectangle', icon: '<rect x="4" y="6" width="16" height="12"/>', text: 'id1[Node]' },
          { name: 'Rounded', icon: '<rect x="4" y="6" width="16" height="12" rx="4"/>', text: 'id1(Node)' },
          { name: 'Stadium', icon: '<rect x="4" y="6" width="16" height="12" rx="6"/>', text: 'id1([Node])' },
          { name: 'Subroutine', icon: '<rect x="4" y="6" width="16" height="12"/><line x1="7" y1="6" x2="7" y2="18"/><line x1="17" y1="6" x2="17" y2="18"/>', text: 'id1[[Node]]' },
          { name: 'Database', icon: '<path d="M4 9c0-1.7 3.6-3 8-3s8 1.3 8 3v6c0 1.7-3.6 3-8 3s-8-1.3-8-3V9z"/><path d="M4 9c0 1.7 3.6 3 8 3s8-1.3 8-3"/>', text: 'id1[(Database)]' },
          { name: 'Decision', icon: '<polygon points="12 4 20 12 12 20 4 12"/>', text: 'id1{Decision}' },
          { name: 'Circle', icon: '<circle cx="12" cy="12" r="8"/>', text: 'id1((Circle))' },
          { name: 'Asymmetric', icon: '<path d="M4 6h12l4 6-4 6H4z"/>', text: 'id1>Asymmetric]' },
          { name: 'Hexagon', icon: '<polygon points="8 6 16 6 20 12 16 18 8 18 4 12"/>', text: 'id1{{Hexagon}}' },
          { name: 'Parallelogram', icon: '<polygon points="6 6 20 6 18 18 4 18"/>', text: 'id1[/Parallelogram/]' },
          { name: 'Parallelogram reversed', icon: '<polygon points="4 6 18 6 20 18 6 18"/>', text: 'id1[\\Parallelogram\\]' },
          { name: 'Trapezoid', icon: '<polygon points="6 6 18 6 20 18 4 18"/>', text: 'id1[/Trapezoid\\]' },
          { name: 'Trapezoid reversed', icon: '<polygon points="4 6 20 6 18 18 6 18"/>', text: 'id1[\\Trapezoid/]' },
          { name: 'Double Circle', icon: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/>', text: 'id1(((Double Circle)))' }
        ]
      },
      {
        cat: 'Flowchart edges', type: 'flowchart', items: [
          { name: 'Arrow', icon: '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/>', text: 'A --> B' },
          { name: 'Thick Arrow', icon: '<line x1="4" y1="10" x2="18" y2="10"/><line x1="4" y1="14" x2="18" y2="14"/><polyline points="14 6 20 12 14 18"/>', text: 'A ==> B' },
          { name: 'Dashed arrow', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-dasharray="4 4"/><polyline points="14 6 20 12 14 18"/>', text: 'A -.-> B' },
          { name: 'Arrow with Label', icon: '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/><rect x="10" y="9" width="4" height="6" fill="var(--bg-body)" stroke="none"/>', text: 'A -->|Label| B' },
          { name: 'Thick Arrow with Label', icon: '<line x1="4" y1="10" x2="18" y2="10"/><line x1="4" y1="14" x2="18" y2="14"/><polyline points="14 6 20 12 14 18"/><rect x="10" y="7" width="4" height="10" fill="var(--bg-body)" stroke="none"/>', text: 'A ==>|Label| B' },
          { name: 'Dashed arrow with Label', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-dasharray="4 4"/><polyline points="14 6 20 12 14 18"/><rect x="10" y="9" width="4" height="6" fill="var(--bg-body)" stroke="none"/>', text: 'A -.->|Label| B' }
        ]
      },
      {
        cat: 'Flowchart other', type: 'flowchart', items: [
          { name: 'Subgraph', icon: '<rect x="4" y="6" width="16" height="12" rx="2" stroke-dasharray="2 2"/><rect x="6" y="10" width="12" height="6" rx="1"/>', text: 'subgraph Title\n  direction TB\n  node1\nend' },
          { name: 'Add class to a node', icon: '<rect x="4" y="8" width="16" height="8" rx="2"/><circle cx="20" cy="8" r="3" fill="currentColor"/>', text: 'class id className' },
          { name: 'Add class definition', icon: '<rect x="4" y="8" width="16" height="8" rx="2" stroke-dasharray="2 2"/><circle cx="20" cy="8" r="3" fill="currentColor"/>', text: 'classDef className fill:#f9f,stroke:#333,stroke-width:4px;' }
        ]
      },
      {
        cat: 'Sequence diagram actors', type: 'sequence', items: [
          { name: 'Participant', icon: '<rect x="4" y="6" width="16" height="10" rx="2"/><path d="M12 16v4"/><path d="M8 20h8"/>', text: 'participant Name' },
          { name: 'Actor', icon: '<circle cx="12" cy="7" r="4"/><path d="M12 11v6"/><path d="M8 21l4-4 4 4"/><path d="M8 15h8"/>', text: 'actor Name' }
        ]
      },
      {
        cat: 'Sequence diagram notes', type: 'sequence', items: [
          { name: 'Note left of', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8l3-3m-3 3 3 3"/>', text: 'Note left of Name: text' },
          { name: 'Note over life line', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15h6"/>', text: 'Note over Name: text' },
          { name: 'Note right of', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8l-3-3m3 3-3 3"/>', text: 'Note right of Name: text' }
        ]
      },
      {
        cat: 'Sequence diagram messages', type: 'sequence', items: [
          { name: 'Solid Line', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2"/>', text: 'A->B: message' },
          { name: 'Dotted Line', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2" stroke-dasharray="4 4"/>', text: 'A-->B: message' },
          { name: 'Solid Line Arrow', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2"/><polyline points="14 6 20 12 14 18"/>', text: 'A->>B: message' },
          { name: 'Dotted Line Arrow', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2" stroke-dasharray="4 4"/><polyline points="14 6 20 12 14 18"/>', text: 'A-->>B: message' },
          { name: 'Solid Line Cross', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2"/><path d="M16 8l4 8M20 8l-4 8"/>', text: 'A-xB: message' },
          { name: 'Dotted Line Cross', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2" stroke-dasharray="4 4"/><path d="M16 8l4 8M20 8l-4 8"/>', text: 'A--xB: message' },
          { name: 'Solid Line Async', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2"/><path d="M16 6l4 6-4 6"/>', text: 'A-)B: message' },
          { name: 'Dotted Line Async', icon: '<line x1="4" y1="12" x2="20" y2="12" stroke-width="2" stroke-dasharray="4 4"/><path d="M16 6l4 6-4 6"/>', text: 'A--)B: message' }
        ]
      },
      {
        cat: 'Sequence diagram other', type: 'sequence', items: [
          { name: 'Loop', icon: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/>', text: 'loop text\n  \nend' },
          { name: 'Alt', icon: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 12h16"/>', text: 'alt text\n  \nelse text\n  \nend' },
          { name: 'Opt', icon: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/>', text: 'opt text\n  \nend' },
          { name: 'Par', icon: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 12h16"/>', text: 'par text\n  \nand text\n  \nend' },
          { name: 'Highlight', icon: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/>', text: 'rect rgb(200, 255, 200)\n  \nend' },
          { name: 'Critical Region', icon: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 12h16"/>', text: 'critical text\n  \noption text\n  \nend' },
          { name: 'Break', icon: '<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 10h16"/>', text: 'break text\n  \nend' }
        ]
      }
    ];

    snippetsHtml = '';
    for (const cat of SNIPPETS) {
      if (typeof CONFIG !== 'undefined' && CONFIG.allowedDiagramTypes && cat.type !== 'all') {
        const allowed = CONFIG.allowedDiagramTypes;
        const matchesType = allowed.includes(cat.type) ||
          (cat.type === 'sequence' && allowed.includes('sequenceDiagram')) ||
          (cat.type === 'sequenceDiagram' && allowed.includes('sequence'));
        if (!matchesType) continue;
      }
      const typeAttr = cat.type || 'all';
      snippetsHtml += `<div class="snippet-category" data-type="${typeAttr}">${cat.cat}</div><div class="snippet-grid" data-type="${typeAttr}">`;
      for (const item of cat.items) {
        const svg = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>`;
        const copySvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        const insertSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
        snippetsHtml += `<div class="snippet-btn" data-text="${encodeURIComponent(item.text)}">
          <div class="snippet-label">${svg}${item.name}</div>
          <div class="snippet-actions">
            <button class="action-btn action-copy" title="Copy to clipboard">${copySvg}</button>
            <button class="action-btn action-insert" title="Insert snippet">${insertSvg}</button>
          </div>
        </div>`;
      }
      snippetsHtml += `</div>`;
    }
    snippetsHtml += `<div class="no-snippets-msg" style="padding: 1rem; color: var(--text-muted); text-align: center; width: 100%; display: none;">No snippets available for this diagram type.</div>`;
    snippetsPanel.innerHTML = snippetsHtml;

    updateSnippetsVisibility = function updateSnippetsVisibility() {
      const src = elSrc.value.trim();
      const cleanSrc = src.replace(/^---[\s\S]*?---\s*/, '');
      let currentType = 'other';
      if (/^(flowchart|graph)\b/i.test(cleanSrc)) currentType = 'flowchart';
      else if (/^sequenceDiagram\b/i.test(cleanSrc)) currentType = 'sequence';
      else if (/^classDiagram\b/i.test(cleanSrc)) currentType = 'class';
      else if (/^stateDiagram\b/i.test(cleanSrc)) currentType = 'state';
      else if (/^erDiagram\b/i.test(cleanSrc)) currentType = 'er';
      else if (/^gantt\b/i.test(cleanSrc)) currentType = 'gantt';
      else if (/^pie\b/i.test(cleanSrc)) currentType = 'pie';
      else if (/^gitGraph\b/i.test(cleanSrc)) currentType = 'git';
      else if (/^mindmap\b/i.test(cleanSrc)) currentType = 'mindmap';
      else if (elType && elType.value) {
        currentType = elType.value;
      }

      if (diagramTypeBadge) {
        diagramTypeBadge.textContent = DIAGRAMS[elType.value]?.label || 'Diagram';
      }

      const fcTools = document.getElementById('flowchartTools');
      if (fcTools) fcTools.style.display = (currentType === 'flowchart') ? 'flex' : 'none';

      let hasVisible = false;
      const children = snippetsPanel.children;
      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        if (el.classList.contains('no-snippets-msg')) {
          el.style.display = hasVisible ? 'none' : 'block';
          continue;
        }
        const type = el.getAttribute('data-type');
        if (type === currentType || type === 'all') {
          el.style.display = '';
          if (el.classList.contains('snippet-grid')) hasVisible = true;
        } else {
          el.style.display = 'none';
        }
      }
    }

    elSrc.addEventListener('input', updateSnippetsVisibility);
    if (elType) elType.addEventListener('change', updateSnippetsVisibility);
    updateSnippetsVisibility(); // initialize on load

    snippetsPanel.addEventListener('click', async (e) => {
      const btn = e.target.closest('.snippet-btn');
      if (!btn) return;
      let text = decodeURIComponent(btn.getAttribute('data-text') || '');
      text = text.replace(/\n+$/, '');

      if (e.target.closest('.action-copy')) {
        try {
          await navigator.clipboard.writeText(text.trim());
        } catch (e) { }
        return;
      }

      // Insert text at cursor without forcing extra trailing newline
      elSrc.focus();
      const start = elSrc.selectionStart;
      const end = elSrc.selectionEnd;
      elSrc.setRangeText(text, start, end, 'end');
      elSrc.dispatchEvent(new Event('input'));
    });

}

export function clearDiagramSelection() {
  const oldBox = document.getElementById('diagram-selection-box');
  if (oldBox) oldBox.remove();
  document.querySelectorAll('.inner-loop-message').forEach(el => el.classList.remove('inner-loop-message'));
};

export function getMessagesInLoop(loopNode) {
  if (!loopNode) return [];
  const svg = loopNode.closest ? loopNode.closest('svg') : document.querySelector('#target svg');
  if (!svg) return [];

  const loopGroup = loopNode.closest ? (loopNode.closest('g') ? (loopNode.closest('g').querySelector('.loopLine, .loopText') ? loopNode.closest('g') : (loopNode.querySelector && loopNode.querySelector('.loopLine, .loopText') ? loopNode : null)) : null) : null;
  if (!loopGroup) return [];

  const allEls = loopGroup.querySelectorAll('polygon, text, line, rect, path, tspan');
  let minY = Infinity, maxY = -Infinity;

  const getSVGOffset = (el) => {
    let y = 0;
    let current = el;
    while (current && current !== svg) {
      const transform = current.getAttribute('transform');
      if (transform) {
        const translateMatch = transform.match(/translate\s*\(\s*[\d.-]+\s*(?:[,\s]+\s*([\d.-]+)\s*)?\)/);
        if (translateMatch) y += parseFloat(translateMatch[1] || 0);
      }
      current = current.parentElement;
    }
    return y;
  };

  allEls.forEach(el => {
    try {
      const b = el.getBBox();
      const offY = getSVGOffset(el);
      minY = Math.min(minY, offY + b.y);
      maxY = Math.max(maxY, offY + b.y + b.height);
    } catch (e) {}
  });

  const messages = Array.from(svg.querySelectorAll('.messageText, .noteText, .edgeLabel'));
  return messages.filter(msg => {
    try {
      const b = msg.getBBox();
      const offY = getSVGOffset(msg);
      const y = offY + b.y;
      return y >= minY && y <= maxY;
    } catch (e) {
      return false;
    }
  });
};

export function highlightDiagramNode(node) {
  clearDiagramSelection();
  const svg = document.querySelector('#target svg');
  if (!svg || !node) return;

  const targetGroup = node.closest ? (node.closest('g') || node) : node;

  const isLoop = !!(
    node.classList?.contains('loopLine') || node.classList?.contains('loopText') ||
    node.classList?.contains('labelText') || node.classList?.contains('labelBox') ||
    targetGroup.querySelector?.('.loopLine, .loopText')
  );

  const isActor = !!(
    node.classList?.contains('actor') || targetGroup.classList?.contains('actor') ||
    targetGroup.querySelector?.('rect.actor')
  );

  let elementsToBound = [targetGroup];

  if (isActor) {
    const rect = targetGroup.querySelector?.('rect.actor') || (node.tagName?.toLowerCase() === 'rect' ? node : null);
    if (rect) {
      const x = parseFloat(rect.getAttribute('x')) || 0;
      const w = parseFloat(rect.getAttribute('width')) || 0;
      const cx = x + w / 2;
      const allActors = svg.querySelectorAll('rect.actor, text.actor, line.actor-line');
      allActors.forEach(el => {
        try {
          const b = el.getBBox();
          const elCx = b.x + b.width / 2;
          if (Math.abs(elCx - cx) < 30) {
            elementsToBound.push(el);
          }
        } catch (e) {}
      });
    }
  } else if (isLoop) {
    if (typeof getMessagesInLoop === 'function') {
      const msgs = getMessagesInLoop(targetGroup);
      msgs.forEach(m => m.classList.add('inner-loop-message'));
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const getSVGOffset = (el) => {
    let y = 0, x = 0;
    let current = el;
    while (current && current !== svg) {
      const transform = current.getAttribute('transform');
      if (transform) {
        const translateMatch = transform.match(/translate\s*\(\s*([0-9.-]+)\s*(?:[,\s]+\s*([0-9.-]+)\s*)?\)/);
        if (translateMatch) {
          x += parseFloat(translateMatch[1] || 0);
          y += parseFloat(translateMatch[2] || 0);
        }
      }
      current = current.parentElement;
    }
    return { x, y };
  };

  elementsToBound.forEach(el => {
    try {
      const b = el.getBBox();
      const off = getSVGOffset(el);
      const x1 = off.x + b.x;
      const y1 = off.y + b.y;
      const x2 = x1 + b.width;
      const y2 = y1 + b.height;
      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    } catch (e) {}
  });

  if (!isFinite(minX) || !isFinite(minY)) return;

  const pad = 6;
  const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  box.setAttribute('id', 'diagram-selection-box');
  box.setAttribute('x', String(minX - pad));
  box.setAttribute('y', String(minY - pad));
  box.setAttribute('width', String(Math.max(20, maxX - minX + pad * 2)));
  box.setAttribute('height', String(Math.max(20, maxY - minY + pad * 2)));
  box.setAttribute('fill', 'rgba(79, 209, 197, 0.12)');
  box.setAttribute('stroke', 'var(--accent, #4fd1c5)');
  box.setAttribute('stroke-width', '2');
  box.setAttribute('stroke-dasharray', '4 4');
  box.setAttribute('rx', '4');
  box.setAttribute('ry', '4');
  box.setAttribute('pointer-events', 'none');

  svg.appendChild(box);
};

export function highlightDiagramNodeByText(lineText, occurrenceIndex = 0) {
  clearDiagramSelection();
  const svg = document.querySelector('#target svg');
  if (!svg || !lineText) return;

  const trimmed = lineText.trim();
  if (!trimmed || trimmed.startsWith('%%') || /^sequenceDiagram\b/i.test(trimmed)) return;

  const elSrc = document.getElementById('source');

  // 1. Participant / Actor
  const pMatch = trimmed.match(/^(?:participant|actor)\s+(?:("[^"]+"|[A-Za-z0-9_]+)\s+as\s+)?("[^"]+"|[A-Za-z0-9_]+)/i);
  if (pMatch) {
    const alias = (pMatch[1] || pMatch[2]).replace(/^"|"$/g, '');
    const displayName = (pMatch[2] || pMatch[1]).replace(/^"|"$/g, '');
    const actorEls = Array.from(svg.querySelectorAll('rect.actor, text.actor, g.actor'));
    const matched = actorEls.find(el => {
      const txt = (el.textContent || '').trim();
      return txt === alias || txt === displayName || txt.includes(alias) || txt.includes(displayName);
    });
    if (matched) highlightDiagramNode(matched);
    return;
  }

  // 2. Loop / Alt / Opt / Par block
  const loopMatch = trimmed.match(/^(?:loop|alt|else|opt|par|critical|break|rect)\b\s*(.*)/i);
  if (loopMatch) {
    const label = loopMatch[1].trim();
    const loopGroups = Array.from(svg.querySelectorAll('.loopLine, .loopText, .labelText')).reduce((acc, el) => {
      const g = el.closest ? (el.closest('g') || el) : el;
      if (!acc.includes(g)) acc.push(g);
      return acc;
    }, []);
    
    const matchedLoops = loopGroups.filter(g => {
      if (!label) return true;
      const txt = (g.textContent || '').trim();
      return txt.includes(label) || txt.replace(/^\[|\]$/g, '').trim() === label;
    });
    
    if (matchedLoops.length > 0) {
      highlightDiagramNode(matchedLoops[Math.min(occurrenceIndex, matchedLoops.length - 1)]);
      return;
    }
  }

  // 3. Note
  const noteMatch = trimmed.match(/^Note\s+(?:over|left of|right of)\s+[^:]+:\s*(.*)/i);
  if (noteMatch) {
    const noteText = noteMatch[1].trim();
    const noteEls = Array.from(svg.querySelectorAll('g.note, rect.note, text.note, .noteText'));
    const matchedNotes = noteEls.filter(el => {
      const txt = (el.textContent || '').trim();
      return txt === noteText || txt.includes(noteText);
    });
    if (matchedNotes.length > 0) {
      highlightDiagramNode(matchedNotes[Math.min(occurrenceIndex, matchedNotes.length - 1)]);
      return;
    }
  }

  // 4. Message arrow line
  const msgMatch = trimmed.match(/^("[^"]+"|[A-Za-z0-9_]+)\s*(?:->>|->|-->>|-->|-x|--x|-\)|--\))\s*("[^"]+"|[A-Za-z0-9_]+)\s*:\s*(.*)/);
  let labelText = '';
  if (msgMatch) {
    labelText = msgMatch[3].trim();
  } else {
    const arrowIdx = trimmed.search(/(?:->>|->|-->>|-->|-x|--x|-\)|--\))/);
    if (arrowIdx !== -1) {
      const colIdx = trimmed.indexOf(':', arrowIdx);
      if (colIdx !== -1) labelText = trimmed.substring(colIdx + 1).trim();
    }
  }

  const rawMsgEls = Array.from(svg.querySelectorAll('text.messageText, text[class*="messageText"], g.messageGroup text, line[class*="messageLine"], path[class*="messageLine"]'));
  const allMsgTexts = rawMsgEls.reduce((acc, el) => {
    const g = el.closest ? (el.closest('g') || el) : el;
    if (!acc.includes(g)) acc.push(g);
    return acc;
  }, []);

  if (labelText) {
    const matchedMsgs = allMsgTexts.filter(g => {
      const txt = (g.textContent || '').trim();
      return txt === labelText || txt.includes(labelText);
    });
    if (matchedMsgs.length > 0) {
      let msgOccurrenceIndex = 0;
      if (elSrc) {
        let exactLineCount = 0;
        const lines = elSrc.value.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i].trim();
          if (l === trimmed) {
            if (exactLineCount === occurrenceIndex) break;
            exactLineCount++;
          }
          const arrowIdx = l.search(/(?:->>|->|-->>|-->|-x|--x|-\)|--\))/);
          if (arrowIdx !== -1) {
            const colIdx = l.indexOf(':', arrowIdx);
            if (colIdx !== -1 && l.substring(colIdx + 1).trim() === labelText) {
              msgOccurrenceIndex++;
            }
          }
        }
      } else {
        msgOccurrenceIndex = occurrenceIndex;
      }
      const target = matchedMsgs[Math.min(msgOccurrenceIndex, matchedMsgs.length - 1)];
      highlightDiagramNode(target);
      return;
    }
  }

  // Fallback match by message index
  if (allMsgTexts.length > 0) {
    const lines = (elSrc ? elSrc.value : '').split('\n');
    let msgLineCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l === trimmed) break;
      if (/(?:->>|->|-->>|-->|-x|--x|-\)|--\))/.test(l)) msgLineCount++;
    }
    const target = allMsgTexts[Math.min(msgLineCount, allMsgTexts.length - 1)];
    if (target) highlightDiagramNode(target);
  }
};



export function initInteractiveSelection() {
  const elSrc = document.getElementById('source');
  if (!elSrc) return;

  const resolveEndToBlock = (val, endLineStart) => {
    const BLOCK_OPENER = /^\s*(?:loop|alt|else|opt|par|critical|break|rect)\b/i;
    const BLOCK_CLOSER = /^\s*end\b/i;
    const upTo = val.substring(0, endLineStart);
    const lines = upTo.split('\n');
    let depth = 1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      if (BLOCK_CLOSER.test(l)) depth++;
      else if (BLOCK_OPENER.test(l)) {
        depth--;
        if (depth === 0) {
          let lineStartPos = 0;
          for (let j = 0; j < i; j++) {
            lineStartPos += lines[j].length + 1;
          }
          return { text: l.trim(), lineStart: lineStartPos };
        }
      }
    }
    return null;
  };

  const handleTextareaSelection = () => {
    const val = elSrc.value;
    const pos = elSrc.selectionStart || 0;
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = val.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = val.length;
    let lineText = val.substring(lineStart, lineEnd).trim();
    
    let searchLimit = lineStart;

    if (/^\s*end\s*$/i.test(lineText)) {
      const resolved = resolveEndToBlock(val, lineStart);
      if (resolved) {
        lineText = resolved.text;
        searchLimit = resolved.lineStart;
      } else {
        clearDiagramSelection();
        return;
      }
    }

    let occurrenceIndex = 0;
    if (lineText) {
      let searchPos = 0;
      while (searchPos < searchLimit) {
        const found = val.indexOf(lineText, searchPos);
        if (found !== -1 && found < searchLimit) {
          occurrenceIndex++;
          searchPos = found + lineText.length;
        } else {
          break;
        }
      }
    }

    highlightDiagramNodeByText(lineText, occurrenceIndex);

    const textBefore = val.substring(0, lineStart);
    const lineNumber = textBefore.split('\n').length;
    if (typeof updateTextareaActiveBg === 'function') updateTextareaActiveBg(lineNumber);
  };

  elSrc.addEventListener('keyup', handleTextareaSelection);
  elSrc.addEventListener('mouseup', handleTextareaSelection);
  elSrc.addEventListener('click', handleTextareaSelection);

  const previewCanvas = document.getElementById('previewCanvas');
  if (previewCanvas) {
    previewCanvas.addEventListener('click', (e) => {
      const svg = document.querySelector('#target svg');
      if (!svg) return;
      let node = e.target?.closest?.('.node, .actor, .classGroup, .edgeLabel, .note, g[id], text, rect, polygon, path');
      if (!node || node === svg) return;

      highlightDiagramNode(node);

      const targetGroup = node.closest?.('g') || node;

      const isLoopElement = !!(
        node.classList?.contains('loopLine') || node.classList?.contains('loopText') ||
        node.classList?.contains('labelText') || node.classList?.contains('labelBox') ||
        targetGroup.querySelector?.('.loopLine, .loopText')
      );

      const sourceText = elSrc.value;
      let startIndex = -1;

      if (isLoopElement) {
        const loopTextEl = targetGroup.querySelector('.loopText');
        const labelEl = targetGroup.querySelector('.labelText');
        const keyword = labelEl ? labelEl.textContent.trim() : 'loop';
        const loopLabel = loopTextEl ? loopTextEl.textContent.replace(/^\[|\]$/g, '').trim() : '';
        
        const loopGroups = Array.from(svg.querySelectorAll('.loopLine, .loopText, .labelText')).reduce((acc, el) => {
          const g = el.closest ? (el.closest('g') || el) : el;
          if (!acc.includes(g)) acc.push(g);
          return acc;
        }, []);

        const matchedLoops = loopGroups.filter(g => {
          const lEl = g.querySelector('.labelText');
          const kw = lEl ? lEl.textContent.trim() : 'loop';
          const tEl = g.querySelector('.loopText');
          const lbl = tEl ? tEl.textContent.replace(/^\[|\]$/g, '').trim() : '';
          return kw === keyword && lbl === loopLabel;
        });

        let svgOccurrenceIndex = 0;
        for (let i = 0; i < matchedLoops.length; i++) {
          if (matchedLoops[i] === targetGroup || matchedLoops[i].contains(node)) {
            svgOccurrenceIndex = i;
            break;
          }
        }

        const loopLine = loopLabel
          ? new RegExp(`^\\s*${keyword}\\s+${loopLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'igm')
          : new RegExp(`^\\s*${keyword}\\b`, 'igm');
        
        let matchCount = 0;
        let m;
        while ((m = loopLine.exec(sourceText)) !== null) {
          if (matchCount === svgOccurrenceIndex) {
            startIndex = m.index;
            break;
          }
          matchCount++;
        }
        
        if (startIndex === -1) {
          loopLine.lastIndex = 0;
          m = loopLine.exec(sourceText);
          if (m) startIndex = m.index;
        }
      } else {
        let textEls = targetGroup.querySelectorAll('text, .label-container');
        if (textEls.length === 0) textEls = node.querySelectorAll('text, .label-container');

        let searchText = '';
        if (textEls.length > 0) {
          searchText = Array.from(textEls).map(el => el.textContent).join(' ').trim();
        } else {
          searchText = (targetGroup.textContent || node.textContent || '').trim();
        }

        if (searchText) {
          const escaped = searchText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const declRegex = new RegExp(`(?:participant|actor|subgraph|class)\\s+${escaped}\\b`, 'i');
          const declMatch = sourceText.match(declRegex);
          if (declMatch) {
            startIndex = declMatch.index;
          } else {
            let querySelector = '.messageText, .node, .note, .edgeLabel, text';
            if (node.classList?.contains('messageText') || targetGroup.classList?.contains('messageGroup') || targetGroup.querySelector?.('.messageText')) {
              querySelector = '.messageText, text[class*="messageText"], g.messageGroup text';
            } else if (node.classList?.contains('noteText') || targetGroup.classList?.contains('note') || targetGroup.querySelector?.('.noteText')) {
              querySelector = '.noteText, text.note';
            }

            const allSvgNodes = Array.from(svg.querySelectorAll(querySelector));
            const matchingSvgNodes = allSvgNodes.filter(n => {
              const txt = (n.textContent || '').trim();
              return txt === searchText || txt.includes(searchText);
            });

            let svgOccurrenceIndex = 0;
            for (let i = 0; i < matchingSvgNodes.length; i++) {
              if (matchingSvgNodes[i] === targetGroup || matchingSvgNodes[i] === node || matchingSvgNodes[i].contains(node)) {
                svgOccurrenceIndex = i;
                break;
              }
            }

            let currPos = 0;
            let matchCount = 0;
            while (currPos < sourceText.length) {
              const foundIdx = sourceText.indexOf(searchText, currPos);
              if (foundIdx !== -1) {
                if (matchCount === svgOccurrenceIndex) {
                  startIndex = foundIdx;
                  break;
                }
                matchCount++;
                currPos = foundIdx + searchText.length;
              } else {
                break;
              }
            }
            if (startIndex === -1) {
              startIndex = sourceText.indexOf(searchText);
            }
          }
        }
      }

      if (startIndex !== -1) {
        const lineStart = sourceText.lastIndexOf('\n', startIndex) + 1;

        elSrc.focus();
        elSrc.setSelectionRange(lineStart, lineStart);

        const textBefore = sourceText.substring(0, lineStart);
        const lineNumber = textBefore.split('\n').length;
        const computed = getComputedStyle(elSrc);
        const lineHeight = parseFloat(computed.lineHeight) || 20;
        const paddingTop = parseFloat(computed.paddingTop) || 0;
        elSrc.scrollTop = Math.max(0, (lineNumber - 1) * lineHeight + paddingTop - (elSrc.clientHeight / 2));

        if (typeof syncGutter === 'function') syncGutter();
        if (typeof syncLocalHL === 'function') syncLocalHL();
        if (typeof updateTextareaActiveBg === 'function') updateTextareaActiveBg(lineNumber);
      }
    });
  }
}

export function initExportModal() {
  const exportMenuBtn = document.getElementById('exportMenuBtn');
  const exportModalOverlay = document.getElementById('exportModalOverlay');
  const exportCloseBtn = document.getElementById('exportCloseBtn');
  const exportCancelBtn = document.getElementById('exportCancelBtn');
  const exportConfirmBtn = document.getElementById('exportConfirmBtn');
  const exportPreviewBox = document.getElementById('exportPreviewBox');

  let selectedBg = 'transparent';

  const updatePreviewBackground = () => {
    if (!exportPreviewBox) return;
    if (selectedBg === 'transparent') {
      exportPreviewBox.style.background = 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 10px 10px';
    } else {
      exportPreviewBox.style.background = selectedBg;
    }
  };

  const closeModal = () => {
    if (exportModalOverlay) exportModalOverlay.style.display = 'none';
  };

  if (exportMenuBtn && exportModalOverlay) {
    exportMenuBtn.addEventListener('click', () => {
      const activeSwatch = document.querySelector('.bg-swatch.active');
      selectedBg = activeSwatch ? (activeSwatch.getAttribute('data-bg') || 'transparent') : 'transparent';
      if (exportPreviewBox) {
        const svg = document.querySelector('#target svg');
        exportPreviewBox.innerHTML = svg ? svg.outerHTML : '';
        updatePreviewBackground();
      }
      exportModalOverlay.style.display = 'flex';
    });
  }

  const bgSwatches = document.querySelectorAll('.bg-swatch');
  bgSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      bgSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      selectedBg = swatch.getAttribute('data-bg') || 'transparent';
      updatePreviewBackground();
    });
  });

  if (exportCloseBtn) {
    exportCloseBtn.addEventListener('click', closeModal);
  }

  if (exportCancelBtn) {
    exportCancelBtn.addEventListener('click', closeModal);
  }

  if (exportModalOverlay) {
    exportModalOverlay.addEventListener('click', (e) => {
      if (e.target === exportModalOverlay) closeModal();
    });
  }

  const formatOptions = document.querySelectorAll('.format-option');
  formatOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      formatOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const radio = opt.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  if (exportConfirmBtn) {
    exportConfirmBtn.addEventListener('click', () => {
      const svg = document.querySelector('#target svg');
      if (!svg) {
        closeModal();
        return;
      }

      const selectedFormat = document.querySelector('input[name="exportFormat"]:checked')?.value || 'png';

      let svgToExport = svg.cloneNode(true);
      if (selectedBg !== 'transparent') {
        svgToExport.style.backgroundColor = selectedBg;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', selectedBg);
        svgToExport.insertBefore(rect, svgToExport.firstChild);
      } else {
        svgToExport.style.backgroundColor = 'transparent';
      }

      const svgData = new XMLSerializer().serializeToString(svgToExport);

      if (selectedFormat === 'svg') {
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.svg';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const canvas = document.createElement('canvas');
        const bbox = svg.getBoundingClientRect();
        const width = bbox.width || 800;
        const height = bbox.height || 600;
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          if (selectedBg !== 'transparent') {
            ctx.fillStyle = selectedBg;
            ctx.fillRect(0, 0, width, height);
          } else {
            ctx.clearRect(0, 0, width, height);
          }
        }

        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = 'diagram.png';
            a.click();
          }
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }

      closeModal();
    });
  }
}
