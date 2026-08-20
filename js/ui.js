import { applyDiagramStyle, applyDiagramFont, applyDiagramThickness, renderOne, reapplyMermaidConfig, getAutonumberConfig } from './renderer.js';

let elSrc, elType, elTheme, btnToggleSrc, btnOpenEditor, sourceCol, toggleEditor, btnSettingsToggle, settingsPanel, shapesPanel, colorWheelBtn, themePanel, shapesToolbarBtn, numberColorBtn, numberColorPanel, syncDiagramThemeToggleState, textSizeBtn, textSizePopup, thicknessSlider, numberColorPicker, circleColorPicker, syncNumberColor, snippetsContainer, snippetsBtn, snippetsPanel, SNIPPETS, snippetsHtml, updateSnippetsVisibility, editorResizeHandle, isResizingEditor, editorStartWidth, resizeStartX, syncPreviewContainerPosition, btnFullscreen, previewContainer, elHlMode, elHlLayer, textareaWrap;

export async function initUiPanels() {
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

  // ---- Toggle Settings Panel ----
  btnSettingsToggle = document.getElementById('settingsToggleBtn');
  settingsPanel = document.getElementById('settingsPanel');
  shapesPanel = document.getElementById('shapesPanel');
  colorWheelBtn = document.getElementById('colorWheelBtn');
  themePanel = document.getElementById('themePanel');
  shapesToolbarBtn = document.getElementById('shapesToolbarBtn');
  numberColorBtn = document.getElementById('numberColorBtn');
  numberColorPanel = document.getElementById('numberColorPanel');

  if (btnSettingsToggle && settingsPanel) {
    btnSettingsToggle.addEventListener('click', () => {
      settingsPanel.classList.toggle('show');
      if (themePanel) themePanel.classList.remove('show');
      if (shapesPanel) shapesPanel.classList.remove('show');
      if (numberColorPanel) numberColorPanel.classList.remove('show');
    });
  }

  if (colorWheelBtn && themePanel) {
    colorWheelBtn.addEventListener('click', () => {
      themePanel.classList.toggle('show');
      if (settingsPanel) settingsPanel.classList.remove('show');
      if (shapesPanel) shapesPanel.classList.remove('show');
      if (numberColorPanel) numberColorPanel.classList.remove('show');
    });
  }

  if (numberColorBtn && numberColorPanel) {
    numberColorBtn.addEventListener('click', () => {
      numberColorPanel.classList.toggle('show');
      if (settingsPanel) settingsPanel.classList.remove('show');
      if (themePanel) themePanel.classList.remove('show');
      if (shapesPanel) shapesPanel.classList.remove('show');
    });
  }

  // ---- Shapes Panel ----
  if (shapesToolbarBtn && shapesPanel) {
    shapesToolbarBtn.addEventListener('click', () => {
      shapesPanel.classList.toggle('show');
      settingsPanel.classList.remove('show');
      themePanel.classList.remove('show');
      if (numberColorPanel) numberColorPanel.classList.remove('show');
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
    if (!e.target.closest('#numberColorBtn') && !e.target.closest('#numberColorPanel')) {
      if (numberColorPanel) numberColorPanel.classList.remove('show');
    }
    if (!e.target.closest('#shapesToolbarBtn') && !e.target.closest('#shapesPanel') && shapesPanel) {
      shapesPanel.classList.remove('show');
    }
  });

  syncDiagramThemeToggleState = function syncDiagramThemeToggleState() {
    const diagramThemeToggleBtn = document.getElementById('diagramThemeToggleBtn');
    if (diagramThemeToggleBtn) {
      const isNonDefault = document.documentElement.classList.contains('theme-teal') ||
        document.documentElement.classList.contains('theme-dark') ||
        (elTheme && elTheme.value !== 'default');
      diagramThemeToggleBtn.checked = isNonDefault;
    }
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

  // Sequence layout settings only apply to sequence diagrams.
  const seqLayoutSettings = document.getElementById('sequenceLayoutSettings');
  const syncSequenceLayoutVisibility = () => {
    if (!seqLayoutSettings) return;
    const isSequence = elType ? elType.value === 'sequence' : false;
    seqLayoutSettings.style.display = isSequence ? 'flex' : 'none';
  };

  if (elType) {
    elType.addEventListener('change', syncSequenceLayoutVisibility);
  }
  syncSequenceLayoutVisibility();



  // Editor Font Size Stepper
  textSizeBtn = document.getElementById('textSizeBtn');
  textSizePopup = document.getElementById('textSizePopup');

  if (textSizeBtn && textSizePopup) {
    textSizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      textSizePopup.style.display = textSizePopup.style.display === 'none' ? 'flex' : 'none';
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#textSizePopup') && !e.target.closest('#textSizeBtn')) {
        textSizePopup.style.display = 'none';
      }
    });
  }

  const textSizeValueEl = document.getElementById('textSizeValue');
  const textSizeIncrease = document.getElementById('textSizeIncrease');
  const textSizeDecrease = document.getElementById('textSizeDecrease');
  const MIN_FONT = 10, MAX_FONT = 24;

  const applyFontSize = (size) => {
    size = Math.max(MIN_FONT, Math.min(MAX_FONT, size));
    document.documentElement.style.setProperty('--editor-font-size', size + 'px');
    localStorage.setItem('editorFontSize', size);
    if (textSizeValueEl) textSizeValueEl.textContent = size + 'px';
    // Phase 6: drive the CM text-size Compartment directly.
    if (window.__cmEditor) window.__cmEditor.setFontSize(size);
  };

  const getCurrentSize = () => {
    return parseInt(localStorage.getItem('editorFontSize') || '14', 10);
  };

  // Load saved size on init
  const savedFontSize = localStorage.getItem('editorFontSize');
  if (savedFontSize) {
    document.documentElement.style.setProperty('--editor-font-size', savedFontSize + 'px');
    if (textSizeValueEl) textSizeValueEl.textContent = savedFontSize + 'px';
  }

  if (textSizeIncrease) {
    textSizeIncrease.addEventListener('click', (e) => {
      e.stopPropagation();
      applyFontSize(getCurrentSize() + 1);
    });
  }
  if (textSizeDecrease) {
    textSizeDecrease.addEventListener('click', (e) => {
      e.stopPropagation();
      applyFontSize(getCurrentSize() - 1);
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

  const colorPaletteSelect = document.getElementById('colorPaletteSelect');
  if (colorPaletteSelect) {
    colorPaletteSelect.addEventListener('change', () => {
      window.dispatchEvent(new Event('paletteChanged'));
    });
  }

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

  // ---- Sequence Layout controls (margins / arrows via Mermaid config) ----
  const layoutControls = [
    { id: 'seqDiagramMarginX', key: 'diagramMarginX', type: 'range' },
    { id: 'seqDiagramMarginY', key: 'diagramMarginY', type: 'range' },
    { id: 'seqActorMargin', key: 'actorMargin', type: 'range' },
    { id: 'seqMessageMargin', key: 'messageMargin', type: 'range' },
    { id: 'seqNoteMargin', key: 'noteMargin', type: 'range' },
    { id: 'seqBoxTextMargin', key: 'boxTextMargin', type: 'range' },
    { id: 'seqBottomMarginAdj', key: 'bottomMarginAdj', type: 'range' },
    { id: 'seqMessageAlign', key: 'messageAlign', type: 'select' },
    { id: 'seqMirrorActors', key: 'mirrorActors', type: 'checkbox' },
    { id: 'seqWrap', key: 'wrap', type: 'checkbox' },
    { id: 'seqRightAngles', key: 'rightAngles', type: 'checkbox' }
  ];

  const restoreLayoutControls = () => {
    layoutControls.forEach(({ id, key, type }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const saved = localStorage.getItem('seqLayout.' + key);
      if (saved === null) return;
      if (type === 'checkbox') {
        el.checked = saved === 'true';
      } else {
        el.value = saved;
      }
      const valEl = document.getElementById(id + 'Val');
      if (valEl) valEl.textContent = el.value;
    });
  };

  const persistLayoutControl = ({ id, key, type }, el) => {
    const saved = type === 'checkbox' ? String(el.checked) : el.value;
    localStorage.setItem('seqLayout.' + key, saved);
  };

  layoutControls.forEach(ctrl => {
    const el = document.getElementById(ctrl.id);
    if (!el) return;

    if (ctrl.type === 'range') {
      el.addEventListener('input', () => {
        const valEl = document.getElementById(ctrl.id + 'Val');
        if (valEl) valEl.textContent = el.value;
      });
    }

    el.addEventListener('change', async () => {
      persistLayoutControl(ctrl, el);
      await reapplyMermaidConfig(getAutonumberConfig());
      renderOne(elSrc.value);
    });
  });

  restoreLayoutControls();

  // Re-apply restored layout choices to the live Mermaid config so a reload
  // reflects saved values before the first render.
  try {
    await reapplyMermaidConfig(getAutonumberConfig());
  } catch (e) { }

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

    const computed = getComputedStyle(sourceCol);
    const minW = parseFloat(computed.minWidth) || 0;
    const maxW = parseFloat(computed.maxWidth) || Infinity;

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
    setTimeout(() => { }, 50);
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
        if (translateMatch) {
          const ty = parseFloat(translateMatch[1] || 0);
          if (!isNaN(ty)) y += ty;
        } else {
          const matrixMatch = transform.match(/matrix\s*\(\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*([0-9.-]+)\s*\)/);
          if (matrixMatch) {
            const ty = parseFloat(matrixMatch[1]);
            if (!isNaN(ty)) y += ty;
          }
        }
      }
      current = current.parentElement;
    }
    return y;
  };

  allEls.forEach(el => {
    try {
      const b = el.getBBox();
      if (!b || isNaN(b.y) || isNaN(b.height)) return;
      const offY = getSVGOffset(el);
      const y1 = offY + b.y;
      const y2 = y1 + b.height;
      if (isFinite(y1) && isFinite(y2)) {
        minY = Math.min(minY, y1);
        maxY = Math.max(maxY, y2);
      }
    } catch (e) { }
  });

  const messages = Array.from(svg.querySelectorAll('.messageText, .noteText, .edgeLabel'));
  return messages.filter(msg => {
    try {
      const b = msg.getBBox();
      if (!b || isNaN(b.y)) return false;
      const offY = getSVGOffset(msg);
      const y = offY + b.y;
      return isFinite(y) && y >= minY && y <= maxY;
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

  const isNote = !!(
    (node.tagName?.toLowerCase() === 'rect' && node.classList?.contains('note')) ||
    node.classList?.contains('note') || node.classList?.contains('noteText') ||
    targetGroup.classList?.contains('note') || targetGroup.querySelector?.('rect.note, text.note, .noteText')
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
        } catch (e) { }
      });
    }
  } else if (isNote) {
    const rect = targetGroup.querySelector?.('rect.note') || (node.tagName?.toLowerCase() === 'rect' && node.classList?.contains('note') ? node : null);
    const text = targetGroup.querySelector?.('text.note, .noteText, text') || (node.tagName?.toLowerCase() === 'text' ? node : null);
    if (rect) elementsToBound.push(rect);
    if (text) elementsToBound.push(text);

    if (rect && !text) {
      try {
        const rBox = rect.getBBox();
        const allNoteTexts = svg.querySelectorAll('text.note, .noteText, text');
        allNoteTexts.forEach(t => {
          try {
            const tBox = t.getBBox();
            if (tBox.x >= rBox.x - 10 && tBox.x + tBox.width <= rBox.x + rBox.width + 10 &&
                tBox.y >= rBox.y - 10 && tBox.y + tBox.height <= rBox.y + rBox.height + 10) {
              elementsToBound.push(t);
            }
          } catch (e) { }
        });
      } catch (e) { }
    } else if (text && !rect) {
      try {
        const tBox = text.getBBox();
        const allNoteRects = svg.querySelectorAll('rect.note');
        allNoteRects.forEach(r => {
          try {
            const rBox = r.getBBox();
            if (tBox.x >= rBox.x - 10 && tBox.x + tBox.width <= rBox.x + rBox.width + 10 &&
                tBox.y >= rBox.y - 10 && tBox.y + tBox.height <= rBox.y + rBox.height + 10) {
              elementsToBound.push(r);
            }
          } catch (e) { }
        });
      } catch (e) { }
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
          const tx = parseFloat(translateMatch[1] || 0);
          const ty = parseFloat(translateMatch[2] || 0);
          if (!isNaN(tx)) x += tx;
          if (!isNaN(ty)) y += ty;
        } else {
          const matrixMatch = transform.match(/matrix\s*\(\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*([0-9.-]+)\s*,\s*([0-9.-]+)\s*\)/);
          if (matrixMatch) {
            const tx = parseFloat(matrixMatch[1]);
            const ty = parseFloat(matrixMatch[2]);
            if (!isNaN(tx)) x += tx;
            if (!isNaN(ty)) y += ty;
          }
        }
      }
      current = current.parentElement;
    }
    return { x, y };
  };

  elementsToBound.forEach(el => {
    try {
      const b = el.getBBox();
      if (!b || isNaN(b.x) || isNaN(b.y) || isNaN(b.width) || isNaN(b.height)) return;
      const off = getSVGOffset(el);
      const x1 = off.x + b.x;
      const y1 = off.y + b.y;
      const x2 = x1 + b.width;
      const y2 = y1 + b.height;
      if (isFinite(x1) && isFinite(y1) && isFinite(x2) && isFinite(y2)) {
        minX = Math.min(minX, x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2);
        maxY = Math.max(maxY, y2);
      }
    } catch (e) { }
  });

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY) || isNaN(minX) || isNaN(minY) || isNaN(maxX) || isNaN(maxY)) return;

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
  const loopMatch = trimmed.match(/^(?:loop|alt|else|opt|par|critical|break)\b\s*(.*)/i);
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

  // 2b. Rect block
  const rectMatch = trimmed.match(/^rect\b\s*(.*)/i);
  if (rectMatch) {
    const rectEls = Array.from(svg.querySelectorAll('rect.rect'));
    if (rectEls.length > 0) {
      highlightDiagramNode(rectEls[Math.min(occurrenceIndex, rectEls.length - 1)]);
      return;
    }
  }

  // 3. Note
  const noteMatch = trimmed.match(/^Note\s+(?:over|left of|right of)\s+[^:]+:\s*(.*)/i);
  if (noteMatch) {
    const noteText = noteMatch[1].trim();
    const rawNoteEls = Array.from(svg.querySelectorAll('rect.note, text.note, .noteText, g.note'));
    const allNoteGroups = rawNoteEls.reduce((acc, el) => {
      const g = el.closest ? (el.closest('g.note') || (el.parentElement?.tagName?.toLowerCase() === 'g' && el.parentElement !== svg ? el.parentElement : el)) : el;
      if (!acc.includes(g)) acc.push(g);
      return acc;
    }, []);

    const distinctNotes = allNoteGroups.length > 0 ? allNoteGroups : Array.from(svg.querySelectorAll('rect.note, .noteText'));
    const matchedNotes = distinctNotes.filter(g => {
      const txt = (g.textContent || '').trim();
      return txt === noteText || txt.includes(noteText) || (noteText && noteText.includes(txt));
    });

    if (matchedNotes.length > 0) {
      let noteOccurrenceIndex = 0;
      if (elSrc) {
        let exactLineCount = 0;
        const lines = elSrc.value.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i].trim();
          if (l === trimmed) {
            if (exactLineCount === occurrenceIndex) break;
            exactLineCount++;
          }
          const nm = l.match(/^Note\s+(?:over|left of|right of)\s+[^:]+:\s*(.*)/i);
          if (nm && (nm[1].trim() === noteText || nm[1].trim().includes(noteText) || (noteText && noteText.includes(nm[1].trim())))) {
            noteOccurrenceIndex++;
          }
        }
      } else {
        noteOccurrenceIndex = occurrenceIndex;
      }

      const target = matchedNotes[Math.min(noteOccurrenceIndex, matchedNotes.length - 1)];
      if (target) {
        highlightDiagramNode(target);
        return;
      }
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
    // (CodeMirror draws the active line natively; the legacy active-line bar is retired.)
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

      const isRectElement = !!(
        (node.tagName?.toLowerCase() === 'rect' && node.classList?.contains('rect')) ||
        node.classList?.contains('rect') ||
        targetGroup.classList?.contains('rect') ||
        targetGroup.querySelector?.('rect.rect')
      );

      const isLoopElement = !!(
        node.classList?.contains('loopLine') || node.classList?.contains('loopText') ||
        node.classList?.contains('labelText') || node.classList?.contains('labelBox') ||
        targetGroup.querySelector?.('.loopLine, .loopText')
      );

      const isNoteElement = !!(
        (node.tagName?.toLowerCase() === 'rect' && node.classList?.contains('note')) ||
        node.classList?.contains('note') || node.classList?.contains('noteText') ||
        targetGroup.classList?.contains('note') || targetGroup.querySelector?.('rect.note, text.note, .noteText')
      );

      const sourceText = elSrc.value;
      let startIndex = -1;

      if (isRectElement) {
        const allRects = Array.from(svg.querySelectorAll('rect.rect'));
        let svgOccurrenceIndex = 0;
        for (let i = 0; i < allRects.length; i++) {
          if (allRects[i] === targetGroup || allRects[i] === node || allRects[i].contains(node)) {
            svgOccurrenceIndex = i;
            break;
          }
        }

        const rectLine = /^\s*rect\b/igm;
        let matchCount = 0;
        let m;
        while ((m = rectLine.exec(sourceText)) !== null) {
          if (matchCount === svgOccurrenceIndex) {
            startIndex = m.index;
            break;
          }
          matchCount++;
        }
      } else if (isLoopElement) {
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
      } else if (isNoteElement) {
        const rawNoteEls = Array.from(svg.querySelectorAll('rect.note, text.note, .noteText, g.note'));
        const allNotes = rawNoteEls.reduce((acc, el) => {
          const g = el.closest ? (el.closest('g.note') || (el.parentElement?.tagName?.toLowerCase() === 'g' && el.parentElement !== svg ? el.parentElement : el)) : el;
          if (!acc.includes(g)) acc.push(g);
          return acc;
        }, []);

        const distinctNotes = allNotes.length > 0 ? allNotes : Array.from(svg.querySelectorAll('rect.note, .noteText'));
        const clickedNote = distinctNotes.find(g => g === targetGroup || g === node || g.contains(node)) || targetGroup;
        const noteText = (clickedNote.textContent || node.textContent || '').trim();

        const matchingNotes = distinctNotes.filter(g => {
          const txt = (g.textContent || '').trim();
          return txt === noteText || txt.includes(noteText) || (noteText && noteText.includes(txt));
        });

        let svgOccurrenceIndex = 0;
        for (let i = 0; i < matchingNotes.length; i++) {
          if (matchingNotes[i] === clickedNote || matchingNotes[i] === targetGroup || matchingNotes[i] === node || matchingNotes[i].contains(node)) {
            svgOccurrenceIndex = i;
            break;
          }
        }

        const noteRegex = /^\s*note\s+(?:over|left of|right of)\s+[^:]*:\s*(.*)$/igm;
        let matchCount = 0;
        let m;
        while ((m = noteRegex.exec(sourceText)) !== null) {
          const content = m[1].trim();
          if (content === noteText || content.includes(noteText) || (noteText && noteText.includes(content))) {
            if (matchCount === svgOccurrenceIndex) {
              startIndex = m.index;
              break;
            }
            matchCount++;
          }
        }

        if (startIndex === -1) {
          noteRegex.lastIndex = 0;
          let noteIdx = distinctNotes.findIndex(g => g === clickedNote || g === targetGroup || g.contains(node));
          if (noteIdx === -1) noteIdx = 0;
          let count = 0;
          while ((m = noteRegex.exec(sourceText)) !== null) {
            if (count === noteIdx) {
              startIndex = m.index;
              break;
            }
            count++;
          }
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
              const mGroup = matchingSvgNodes[i].closest ? matchingSvgNodes[i].closest('g') : null;
              if (matchingSvgNodes[i] === targetGroup || matchingSvgNodes[i] === node ||
                  mGroup === targetGroup || (targetGroup && targetGroup.contains(matchingSvgNodes[i]))) {
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

        if (window.__cmEditor && window.__cmEditor.selectRange) {
          // Phase 5: in CodeMirror mode, drive the CM selection directly instead
          // of the hidden legacy textarea.
          window.__cmEditor.selectRange(lineStart);
        } else {
          elSrc.focus();
          elSrc.setSelectionRange(lineStart, lineStart);

          const textBefore = sourceText.substring(0, lineStart);
          const lineNumber = textBefore.split('\n').length;
          const computed = getComputedStyle(elSrc);
          const lineHeight = parseFloat(computed.lineHeight) || 20;
          const paddingTop = parseFloat(computed.paddingTop) || 0;
          elSrc.scrollTop = Math.max(0, (lineNumber - 1) * lineHeight + paddingTop - (elSrc.clientHeight / 2));
        }
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

  const showCodePreview = () => {
    if (!exportPreviewBox) return;
    exportPreviewBox.style.display = 'block';
    exportPreviewBox.style.padding = '0';
    exportPreviewBox.style.background = 'var(--bg-editor)';
    
    const lines = elSrc.value.split('\n');
    const gutterHtml = lines.map((_, i) => `<div style="height: var(--editor-line-height, 20px); line-height: var(--editor-line-height, 20px);">${i + 1}</div>`).join('');

    exportPreviewBox.innerHTML = `
      <div style="
        display: flex;
        position: relative;
        width: 100%;
        height: 100%;
        overflow: auto;
        box-sizing: border-box;
        background: var(--bg-editor);
        padding: 0;
        align-items: stretch;
        justify-content: flex-start;
      ">
        <div style="
          position: sticky;
          left: 0;
          flex: 0 0 auto;
          width: 3.5em;
          padding: 1.5rem 0.6rem 1.5rem 0;
          text-align: right;
          font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
          font-size: 0.85rem;
          line-height: var(--editor-line-height, 20px);
          color: var(--text-gutter);
          background: var(--bg-gutter);
          border-right: 1px solid var(--border-color);
          user-select: none;
          box-sizing: border-box;
          z-index: 2;
        ">
          ${gutterHtml}
        </div>
        <pre style="
          flex: 1 1 auto;
          margin: 0;
          padding: 1.5rem;
          font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
          font-size: 0.85rem;
          color: var(--text-main);
          white-space: pre;
          word-break: normal;
          overflow: visible;
          box-sizing: border-box;
          text-align: left;
          line-height: var(--editor-line-height, 20px);
        ">${elSrc.value}</pre>
      </div>
    `;
  };

  const showSvgPreview = () => {
    if (!exportPreviewBox) return;
    exportPreviewBox.style.display = 'flex';
    exportPreviewBox.style.alignItems = 'center';
    exportPreviewBox.style.justifyContent = 'center';
    exportPreviewBox.style.padding = '3rem';
    
    const svg = document.querySelector('#target svg');
    exportPreviewBox.innerHTML = svg ? svg.outerHTML : '';
    updatePreviewBackground();
  };

  const updatePreviewBackground = () => {
    if (!exportPreviewBox) return;
    const selectedFormat = document.querySelector('input[name="exportFormat"]:checked')?.value || 'png';
    if (selectedFormat === 'mmd') {
      exportPreviewBox.style.background = 'var(--bg-editor)';
      return;
    }
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
      const selectedFormat = document.querySelector('input[name="exportFormat"]:checked')?.value || 'png';
      if (selectedFormat === 'mmd') {
        showCodePreview();
      } else {
        showSvgPreview();
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
      if (radio) {
        radio.checked = true;
        if (radio.value === 'mmd') {
          showCodePreview();
        } else {
          showSvgPreview();
        }
      }
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

      if (selectedFormat === 'mmd') {
        const blob = new Blob([elSrc.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.mmd';
        a.click();
        URL.revokeObjectURL(url);
      } else if (selectedFormat === 'svg') {
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
