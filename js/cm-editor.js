/**
 * Primary CodeMirror 6 editor subsystem.
 *
 * The CM EditorView is the visible editing surface. To ensure full compatibility,
 * every CM document change is mirrored into the (visually hidden) legacy
 * <textarea id="source"> and an `input` event is dispatched, so the existing
 * render pipeline (renderer.js / app.js) keeps working seamlessly.
 * Conversely, external writes to #source (loadExample, history, fix, etc.) are
 * observed and pushed back into CM — guarded so the two never loop.
 */

import {
  EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  keymap, drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentOnInput, bracketMatching } from '@codemirror/language';
import { Compartment } from '@codemirror/state';
import { linter, lintGutter, forceLinting } from '@codemirror/lint';
import { mermaidLanguage, mermaidSyntaxHighlighting } from './mermaid-language.js';
import { mermaidLinterSource, setExternalDiagnostics, clearExternalDiagnostics } from './cm-diagnostics.js';
import { cmDecorations, applyRgbColor } from './cm-decorations.js';
import { cmAutocomplete, completionKeymap } from './cm-autocomplete.js';
import { highlightDiagramNodeByText } from './ui.js';

let view = null;
let syncingFromCm = false;

const cmTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--bg-editor)',
    color: 'var(--text-main)',
    fontSize: 'var(--editor-font-size, 13.12px)',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
    caretColor: 'var(--hl-kw)',
    padding: '0.6rem 1.3rem',
  },
  '.cm-scroller': { fontFamily: 'ui-monospace, "SFMono-Regular", Consolas, monospace' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-gutter)',
    color: 'var(--text-gutter)',
    border: 'none',
  },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent, #4fd1c5) 12%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--hl-kw)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(125, 127, 240, 0.25)',
  },
}, { dark: true });

// Phase 6 Compartments: text-size and highlight-mode can be reconfigured at
// runtime without rebuilding the whole EditorView.
const fontSizeCompartment = new Compartment();
const hlModeCompartment = new Compartment();

function fontSizeExtension(px) {
  return EditorView.theme({
    '&': { fontSize: px + 'px' },
    '.cm-content': { fontSize: px + 'px' },
  });
}

function hlModeExtension(on) {
  // When off, drop token colours entirely (plain text); when on, apply the
  // Mermaid StreamLanguage + highlight style.
  return on ? [mermaidLanguage, mermaidSyntaxHighlighting] : [];
}

function currentEditorFontSize() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--editor-font-size');
  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? n : 13.12;
}

function pushToSource(text) {
  const elSrc = document.getElementById('source');
  if (!elSrc) return;
  syncingFromCm = true;
  elSrc.value = text;
  elSrc.dispatchEvent(new Event('input', { bubbles: true }));
  syncingFromCm = false;
}

/**
 * Direction "code → diagram": mirror the CM selection into the (hidden) legacy
 * #source textarea and nudge the existing editor-side handler so it highlights
 * the matching diagram element. This reuses the entire legacy selection-sync
 * logic (occurrence counting, highlightDiagramNodeByText) untouched.
 */
function syncSelectionToDiagram(v) {
  const elSrc = document.getElementById('source');
  if (!elSrc) return;
  const sel = v.state.selection.main;
  elSrc.selectionStart = sel.head;
  elSrc.selectionEnd = sel.anchor;
  // The legacy initInteractiveSelection() listens for mouseup/click/keyup on
  // #source; a synthetic mouseup drives the same highlight without needing to
  // focus or reveal the hidden textarea.
  elSrc.dispatchEvent(new Event('mouseup'));
}

/**
 * @typedef {Object} CmDiagnostic
 * @property {number} line - 1-indexed line number
 * @property {string} message - Diagnostic description
 * @property {'error'|'warning'|'info'} [severity] - Severity level
 */

/**
 * Formal Typed Contract for the CodeMirror Editor API.
 * @typedef {Object} CmEditorAPI
 * @property {EditorView|null} view - The underlying CodeMirror EditorView instance
 * @property {() => string} getText - Get full document source text
 * @property {(text: string) => void} setContent - Replace full document text
 * @property {(diagnostics: CmDiagnostic[]) => void} setExternalDiagnostics - Display external linter diagnostics
 * @property {() => void} clearExternalDiagnostics - Clear external linter diagnostics
 * @property {() => void} forceLint - Trigger immediate linter recomputation
 * @property {(lineIndex: number, matchIndex: number, hex: string) => void} setRgbColor - Update RGB literal at line & index
 * @property {(from: number, to?: number) => void} selectRange - Move editor cursor / range selection and scroll into view
 * @property {() => {from: number, to: number, head: number, anchor: number}} getSelection - Get current selection offsets
 * @property {(px: number) => void} setFontSize - Dynamic font size reconfiguration
 * @property {(on: boolean) => void} setHlMode - Dynamic syntax highlighting mode toggle
 */

export function setContent(text) {
  if (!view) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}

export function getText() {
  return view ? view.state.doc.toString() : (document.getElementById('source')?.value || '');
}

export function selectRange(from, to = from) {
  if (!view) return;
  const len = view.state.doc.length;
  const safeFrom = Math.max(0, Math.min(from, len));
  const safeTo = Math.max(0, Math.min(to, len));
  view.dispatch({ selection: { anchor: safeFrom, head: safeTo }, scrollIntoView: true });
  view.focus();
}

export function getSelection() {
  if (!view) return { from: 0, to: 0, head: 0, anchor: 0 };
  const s = view.state.selection.main;
  return { from: s.from, to: s.to, head: s.head, anchor: s.anchor };
}

export function setFontSize(px) {
  if (!view) return;
  view.dispatch({ effects: fontSizeCompartment.reconfigure(fontSizeExtension(px)) });
}

export function setHlMode(on) {
  if (!view) return;
  view.dispatch({ effects: hlModeCompartment.reconfigure(hlModeExtension(!!on)) });
}

export function getCmEditor() {
  return window.__cmEditor || null;
}

export function initCmEditor() {
  const host = document.getElementById('cmHost');
  const elSrc = document.getElementById('source');
  if (!host || view) return null;

  const initial = elSrc?.value || '';

  try {
    const newView = new EditorView({
      doc: initial,
      parent: host,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        keymap.of([...completionKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        hlModeCompartment.of(hlModeExtension(true)),
        fontSizeCompartment.of(fontSizeExtension(currentEditorFontSize())),
        linter(mermaidLinterSource),
        lintGutter(),
        cmDecorations,
        cmAutocomplete,
        cmTheme,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) pushToSource(u.state.doc.toString());
          if (u.selectionSet) syncSelectionToDiagram(u.view);
        }),
      ],
    });

    view = newView;

    // Only after CodeMirror view is successfully built and mounted, retire the
    // legacy editor chrome. #source stays in the DOM as a fillable data mirror:
    // it is visually hidden (opacity 0, no pointer events) but NOT display:none,
    // so it keeps a layout box and Playwright can still drive it — while CodeMirror
    // is the visible, interactive surface on top.
    if (elSrc) {
      elSrc.style.opacity = '0';
      elSrc.style.position = 'absolute';
      elSrc.style.inset = '0';
      elSrc.style.pointerEvents = 'none';
      elSrc.style.zIndex = '1';
    }
    for (const id of ['hlLayer', 'gutter']) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
    host.style.display = 'block';

    // Pull external writes to #source back into CM (loadExample, history, fix, etc.)
    if (elSrc) {
      elSrc.addEventListener('input', () => {
        if (syncingFromCm || !view) return;
        setContent(elSrc.value);
      });
    }

    window.__cmEditor = {
      view,
      getText: () => view ? view.state.doc.toString() : '',
      setContent,
      setExternalDiagnostics,
      clearExternalDiagnostics,
      forceLint: () => forceLinting(view),
      setRgbColor: (lineIndex, matchIndex, hex) => applyRgbColor(lineIndex, matchIndex, hex),
      // Direction "diagram → code": move the CM selection (and reveal) to a source offset.
      selectRange: (from, to = from) => {
        if (!view) return;
        view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
        view.focus();
      },
      getSelection: () => {
        if (!view) return { from: 0, to: 0, head: 0, anchor: 0 };
        const s = view.state.selection.main;
        return { from: s.from, to: s.to, head: s.head, anchor: s.anchor };
      },
      setFontSize: (px) => {
        if (!view) return;
        view.dispatch({ effects: fontSizeCompartment.reconfigure(fontSizeExtension(px)) });
      },
      setHlMode: (on) => {
        if (!view) return;
        view.dispatch({ effects: hlModeCompartment.reconfigure(hlModeExtension(!!on)) });
      },
    };

    return view;
  } catch (err) {
    console.error('Failed to initialize CodeMirror 6 view:', err);
    // Cleanup host and leave legacy textarea fallback active
    host.innerHTML = '';
    host.style.display = 'none';
    view = null;
    return null;
  }
}
