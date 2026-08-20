/**
 * CodeMirror decorations: inline RGB color pickers + alias→lane colors.
 *
 * Implemented as native CM ViewPlugin decorations:
 *
 *  - RGB literals render as a small color swatch (`.cm-color-square`) followed
 *    by the literal text colored with its own value. Clicking the swatch opens
 *    a single persistent native color proxy (kept OUTSIDE the CM DOM so the
 *    open picker dialog survives doc changes while dragging).
 *  - Sequence `participant`/`actor` aliases (and inferred lane names) are
 *    colored with the active sequence palette via `buildAliasColorMap`.
 */

import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import { StateEffect } from '@codemirror/state';
import {
  RGB_REGEX, buildDiagramColorMap, buildAliasColorMap, parseRgb, hexToRgb, rgbToHex,
} from './editor.js';
import { currentPaletteName, isPaletteReversed } from './palettes.js';

// Module-level handle to the active EditorView so the (out-of-DOM) color proxy
// can push edits back into the document.
let _view = null;

export const forceDecorationRefreshEffect = StateEffect.define();

export function refreshCmDecorations() {
  if (_view) {
    _view.dispatch({
      effects: forceDecorationRefreshEffect.of(null)
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('paletteChanged', () => {
    refreshCmDecorations();
  });
}

// Persistent, off-screen native color input. A single instance is reused for
// every swatch so the OS color dialog stays open across live edits.
let _proxyInput = null;
let _pending = null; // { lineIndex, matchIndex }

function ensureProxy() {
  if (_proxyInput) return _proxyInput;
  const input = document.createElement('input');
  input.type = 'color';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.style.top = '-9999px';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';

  const apply = () => {
    if (!_pending) return;
    applyRgbColor(_pending.lineIndex, _pending.matchIndex, input.value);
  };
  input.addEventListener('input', apply);
  input.addEventListener('change', () => {
    apply();
    _pending = null;
  });
  document.body.appendChild(input);
  _proxyInput = input;
  return input;
}

function openColorPicker(lineIndex, matchIndex, hex) {
  _pending = { lineIndex, matchIndex };
  const proxy = ensureProxy();
  proxy.value = hex;
  // Programmatically open the native picker. Because the proxy lives outside the
  // CM DOM, rebuilding decorations during drag won't destroy the open dialog.
  proxy.click();
}

/** Replace the Nth (0-based) rgb() literal on a given line with a new hex color. */
export function applyRgbColor(lineIndex, matchIndex, newHex) {
  if (!_view) return false;
  const lineNo = lineIndex + 1;
  if (lineNo > _view.state.doc.lines) return false;

  const line = _view.state.doc.line(lineNo);
  const text = line.text;
  let cur = 0, from = -1, to = -1, parsed = null;
  RGB_REGEX.lastIndex = 0;
  let m;
  while ((m = RGB_REGEX.exec(text))) {
    if (cur === matchIndex) {
      from = line.from + m.index;
      to = from + m[0].length;
      parsed = parseRgb(m[0]);
      break;
    }
    cur++;
  }
  if (from < 0) return false;

  const replacement = hexToRgb(newHex, parsed ? parsed.a : null);
  _view.dispatch({ changes: { from, to, insert: replacement } });
  return true;
}

class ColorSwatchWidget extends WidgetType {
  constructor(lineIndex, matchIndex, hex) {
    super();
    this.lineIndex = lineIndex;
    this.matchIndex = matchIndex;
    this.hex = hex;
  }

  eq(other) {
    return other.lineIndex === this.lineIndex &&
      other.matchIndex === this.matchIndex &&
      other.hex === this.hex;
  }

  toDOM() {
    const swatch = document.createElement('span');
    swatch.className = 'cm-color-square';
    swatch.style.background = this.hex;
    swatch.title = this.hex;
    swatch.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openColorPicker(this.lineIndex, this.matchIndex, this.hex);
    });
    return swatch;
  }

  ignoreEvent() {
    // Let CM ignore interactions on the swatch so it never moves the cursor.
    return true;
  }
}

function buildDecorations(view) {
  const doc = view.state.doc;
  const text = doc.toString();
  const decos = [];

  // ── RGB literals: swatch widget + value-colored text ───────────────────────
  const rgbRanges = [];
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const ltext = line.text;
    RGB_REGEX.lastIndex = 0;
    let m, matchIndex = 0;
    while ((m = RGB_REGEX.exec(ltext))) {
      const from = line.from + m.index;
      const to = from + m[0].length;
      const parsed = parseRgb(m[0]);
      const hex = parsed ? rgbToHex(parsed.r, parsed.g, parsed.b) : '#000000';

      rgbRanges.push({ from, to });
      decos.push(
        Decoration.widget({ widget: new ColorSwatchWidget(i - 1, matchIndex, hex), side: -1 })
          .range(from, from)
      );
      decos.push(
        Decoration.mark({ class: 'cm-rgb', attributes: { style: `color:${hex}` } })
          .range(from, to)
      );
      matchIndex++;
    }
  }

  // ── Diagram entity / node / alias colors ────────────────────────────────────
  const colorMap = buildDiagramColorMap(text, currentPaletteName(), isPaletteReversed());
  if (colorMap.size) {
    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i);
      const ltext = line.text;
      const trimmed = ltext.trim();
      if (trimmed.startsWith('%%')) continue;

      for (const [name, colorObj] of colorMap.entries()) {
        if (!name) continue;
        const color = typeof colorObj === 'string' ? colorObj : (colorObj.fill || colorObj);
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('\\b(' + esc + ')\\b', 'g');
        let am;
        while ((am = re.exec(ltext))) {
          const from = line.from + am.index;
          const to = from + am[0].length;
          // Don't recolor a name that sits inside an rgb() literal.
          if (rgbRanges.some(r => from < r.to && to > r.from)) continue;
          decos.push(
            Decoration.mark({
              class: 'cm-alias',
              attributes: { style: `color:${color};font-weight:700` },
            }).range(from, to)
          );
        }
      }
    }
  }

  return Decoration.set(decos, true);
}

export const cmDecorations = ViewPlugin.fromClass(
  class {
    constructor(view) {
      _view = view;
      this.decorations = buildDecorations(view);
    }
    update(u) {
      const hasRefresh = u.transactions.some(tr => tr.effects.some(e => e.is(forceDecorationRefreshEffect)));
      if (u.docChanged || u.viewportChanged || hasRefresh) {
        this.decorations = buildDecorations(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);
