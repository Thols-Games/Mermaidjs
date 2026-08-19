/**
 * Editor & Error Handling Module
 * Controls line gutter numbering, error parsing, error bar display, and warnings.
 */

import { VALID_DIAGRAM_TYPES } from './diagram-types.js';
import { validateSequenceDiagram } from './validators/sequence-validator.js';

export const editorErrorLines = new Set();
export const editorWarningLines = new Set();

import { getSeqPalette, currentPaletteName, isPaletteReversed } from './palettes.js';

// ─── Module-level cache & state ───────────────────────────────────────────────
// DOM reference cache — populated lazily on first use
let _elSrc = null, _elHlLayer = null, _elGutter = null, _elHlMode = null;
// Dirty-line diffing state
let _prevSyncLines = null;   // string[] snapshot of last rendered lines
let _prevActiveIndex = -1;   // active line index from last syncLocalHL
let _prevErrKey = '';         // serialised error/warning fingerprint
// Memoised colour-map state
let _prevColorMapKey = '', _prevColorMap = new Map();
// Gutter rebuild caching
let _prevGutterLineCount = 0, _prevGutterErrKey = '';
// Active-line bar geometry cache (invalidated only when --editor-font-size changes)
let _barMetrics = null, _barFontKey = null;
// ──────────────────────────────────────────────────────────────────────────────

export function buildAliasColorMap(sourceText, seqPalette) {
  const map = new Map();
  if (!sourceText) return map;
  const lines = sourceText.replace(/\r/g, '').split('\n');
  let colorIndex = 0;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return;

    const declMatch = trimmed.match(/^(?:participant|actor)\s+(?:("[^"]+"|[A-Za-z0-9_]+)\s+as\s+)?("[^"]+"|[A-Za-z0-9_]+)/i);
    if (declMatch) {
      const alias = (declMatch[1] || declMatch[2]).replace(/^"|"$/g, '');
      if (!map.has(alias)) {
        map.set(alias, seqPalette[colorIndex % seqPalette.length]);
        colorIndex++;
      }
    } else {
      const msgMatch = trimmed.match(/^("[^"]+"|[A-Za-z0-9_]+)\s*(?:->>|->|-->>|-->|-x|--x|-\)|--\))\s*("[^"]+"|[A-Za-z0-9_]+)/);
      if (msgMatch) {
        const src = msgMatch[1].replace(/^"|"$/g, '');
        const dest = msgMatch[2].replace(/^"|"$/g, '');
        if (!map.has(src)) {
          map.set(src, seqPalette[colorIndex % seqPalette.length]);
          colorIndex++;
        }
        if (!map.has(dest)) {
          map.set(dest, seqPalette[colorIndex % seqPalette.length]);
          colorIndex++;
        }
      }
    }
  });

  return map;
}

const _DKW = 'sequenceDiagram|flowchart|graph|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|quadrantChart|timeline|zenuml|requirementDiagram|sankey-beta|block-beta|architecture-beta|C4Context|kanban|xychart-beta|packet-beta';
const _BKW = 'participant|actor|autonumber|title|subgraph|end|note|over|left of|right of|alt|else|opt|loop|par|and|rect|class|style|linkStyle|click|callback|classDef';

// Pre-compiled RGB regex — safe to share across .replace() calls (.replace resets lastIndex internally)
const RGB_REGEX = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[0-9.]+\s*)?\)/gi;

function _escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function replaceOutsideTags(html, regex, replacement) {
  return html.split(/(<[^>]*>)/).map((part, i) =>
    i % 2 === 0 ? part.replace(regex, replacement) : part
  ).join('');
}

export function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.max(0, Math.min(255, c)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function parseRgb(str) {
  const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)/i);
  if (!m) return null;
  return {
    r: parseInt(m[1], 10),
    g: parseInt(m[2], 10),
    b: parseInt(m[3], 10),
    a: m[4] !== undefined ? parseFloat(m[4]) : null,
    isRgba: str.toLowerCase().startsWith('rgba')
  };
}

export function hexToRgb(hex, alpha = null) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (alpha !== null) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function updateCodeColor(lineIndex, matchIndex, newHex, skipSync = false) {
  if (!_elSrc) _elSrc = document.getElementById('source');
  const elSrc = _elSrc;
  if (!elSrc) return;
  const lines = elSrc.value.split('\n');
  const line = lines[lineIndex];
  if (line === undefined) return;

  let currentMatch = 0;
  RGB_REGEX.lastIndex = 0;
  const updatedLine = line.replace(RGB_REGEX, (match) => {
    if (currentMatch === matchIndex) {
      const parsed = parseRgb(match);
      const replacement = hexToRgb(newHex, parsed ? parsed.a : null);
      currentMatch++;
      return replacement;
    }
    currentMatch++;
    return match;
  });

  lines[lineIndex] = updatedLine;
  
  const selStart = elSrc.selectionStart;
  const selEnd = elSrc.selectionEnd;

  elSrc.value = lines.join('\n');
  
  if (skipSync) {
    if (typeof window !== 'undefined' && typeof window.renderOne === 'function') {
      window.renderOne(elSrc.value);
    }
  } else {
    elSrc.setSelectionRange(selStart, selEnd);
    syncLocalHL();
    elSrc.dispatchEvent(new Event('input'));
  }
}

export function highlightLine(line, actorColorMap = new Map(), lineIndex = 0) {
  let s = _escHtml(line);

  let matchIndex = 0;
  RGB_REGEX.lastIndex = 0;
  s = s.replace(RGB_REGEX, (match) => {
    const parsed = parseRgb(match);
    if (parsed) {
      const hex = rgbToHex(parsed.r, parsed.g, parsed.b);
      const pickerHtml = `<input type="color" class="inline-color-picker" data-line="${lineIndex}" data-match-index="${matchIndex}" value="${hex}">`;
      matchIndex++;
      return `<span class="hl-rgb-wrapper"><span class="inline-color-picker-slot">${pickerHtml}</span><span class="hl-rgb-text">${match}</span></span>`;
    }
    return match;
  });

  const cm = s.match(/^(\s*)(%%.*)/);
  if (cm) return cm[1] + '<span class="hl-comment">' + cm[2] + '</span>';

  const safe = (rx, repl) => { s = replaceOutsideTags(s, rx, repl); };

  safe(new RegExp('(^\\s*)(' + _DKW + ')(\\s|$)', 'i'), '$1<span class="hl-keyword">$2</span>$3');
  safe(new RegExp('(\\s|^)(' + _BKW + ')(\\s|$|:|[(])', 'gi'), '$1<span class="hl-builtin">$2</span>$3');
  safe(/"([^"]*?)"/g, '"<span class="hl-string">$1</span>"');
  safe(/\b(\d+\.?\d*[dw]?)\b/g, '<span class="hl-number">$1</span>');
  safe(/(--&gt;&gt;|--&gt;|-&gt;&gt;|-&gt;|==&gt;|&lt;--&gt;|&lt;--|~~~)/g, '<span class="hl-arrow">$1</span>');
  safe(/\|([^|\n]*)\|/g, '|<span class="hl-string">$1</span>|');

  for (const [name, colorObj] of actorColorMap.entries()) {
    if (!name) continue;
    const color = typeof colorObj === 'string' ? colorObj : colorObj.fill;
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    safe(new RegExp('(?<![\\w-])(' + esc + ')(?![\\w-])', 'g'),
      '<span style="color:' + color + ';font-weight:700">$1</span>');
  }

  return s;
}

export function updateTextareaActiveBg(lineNumber) {
  if (!_elSrc) _elSrc = document.getElementById('source');
  const elSrc = _elSrc;
  if (!elSrc) return;
  const textareaWrap = elSrc.parentElement;
  if (!textareaWrap) return;

  let activeBg = document.getElementById('textareaActiveBg');
  if (!activeBg) {
    activeBg = document.createElement('div');
    activeBg.id = 'textareaActiveBg';
    textareaWrap.insertBefore(activeBg, textareaWrap.firstChild);
  }

  if (lineNumber !== undefined && lineNumber !== null) {
    activeBg.dataset.lineNumber = lineNumber;
  }

  const currentLineNumber = parseInt(activeBg.dataset.lineNumber || '1', 10);
  if (!currentLineNumber || currentLineNumber <= 0) {
    activeBg.style.display = 'none';
    return;
  }

  activeBg.style.display = 'block';

  // Derive the bar geometry from the textarea's REAL, computed metrics instead
  // of the hardcoded `0.6rem` top offset and `--editor-line-height` calc. The
  // textarea's `paddingTop` and `lineHeight` are exactly the values the browser
  // uses to lay out the text, so the bar now tracks it 1:1 — without the
  // per-line drift that previously grew with line number (sub-pixel rounding of
  // the calc, or any future border/padding change on the textarea).
  //
  // Geometry only changes when the text-size slider sets `--editor-font-size`
  // (it drives `--editor-line-height`; paddingTop is constant `.6rem`). So we
  // cache the metrics and only re-run getComputedStyle (a style flush) when that
  // custom property changes — not on every keystroke/cursor move.
  const fontKey = document.documentElement.style.getPropertyValue('--editor-font-size') || '';
  if (!_barMetrics || fontKey !== _barFontKey) {
    const cs = getComputedStyle(elSrc);
    _barMetrics = {
      paddingTop: parseFloat(cs.paddingTop) || 0,
      lineHeight: parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) || 13.12) * 1.5
    };
    _barFontKey = fontKey;
  }
  const { paddingTop, lineHeight } = _barMetrics;

  // barY = textOrigin + (lineIndex * lineHeight) - currentScroll
  activeBg.style.top = (paddingTop + (currentLineNumber - 1) * lineHeight - elSrc.scrollTop) + 'px';
  activeBg.style.height = lineHeight + 'px';
}

export function syncLocalHL() {
  if (!_elSrc) _elSrc = document.getElementById('source');
  if (!_elHlLayer) _elHlLayer = document.getElementById('hlLayer');
  if (!_elHlMode) _elHlMode = document.getElementById('hlMode');
  const elSrc = _elSrc, elHlLayer = _elHlLayer, elHlMode = _elHlMode;
  if (!elSrc || !elHlLayer) return;

  const lines = elSrc.value.split('\n');
  const cursorIndex = elSrc.selectionStart || 0;
  let activeLineIndex = 0, acc = 0;
  for (let i = 0; i < lines.length; i++) {
    acc += lines[i].length + 1;
    if (cursorIndex < acc) { activeLineIndex = i; break; }
  }

  updateTextareaActiveBg(activeLineIndex + 1);

  const mode = elHlMode ? elHlMode.value : 'local';
  if (mode === 'off') {
    elHlLayer.innerHTML = '';
    elHlLayer.style.display = 'none';
    elSrc.classList.remove('hl-on');
    _prevSyncLines = null;
    return;
  }

  elHlLayer.style.display = 'block';
  elSrc.classList.add('hl-on');

  // Skip DOM rebuild while a color picker is actively open (dragging circle/slider)
  if (window._colorPickerActive) return;

  // Memoised colour-map — rebuilt only when source or palette actually changes
  const cmKey = elSrc.value + '\0' + currentPaletteName() + '\0' + isPaletteReversed();
  const colorMapChanged = cmKey !== _prevColorMapKey;
  if (colorMapChanged) {
    _prevColorMap = buildAliasColorMap(elSrc.value, getSeqPalette(currentPaletteName(), isPaletteReversed()));
    _prevColorMapKey = cmKey;
  }
  const actorColorMap = _prevColorMap;

  // Error/warning state fingerprint
  const errKey = (window.hlErrorLines ? [...window.hlErrorLines].join(',') : '') +
    '|' + [...editorErrorLines].join(',');
  const errChanged = errKey !== _prevErrKey;

  const prevLines = _prevSyncLines;
  const lineCountChanged = !prevLines || prevLines.length !== lines.length;

  if (lineCountChanged || colorMapChanged) {
    // Full rebuild: first render, line count changed, or palette/theme changed.
    // Lines live inside a single .hl-content wrapper so the whole block can be
    // translated by the textarea's exact scroll pixels (see scroll sync below).
    elHlLayer.innerHTML = '<div class="hl-content">' + lines.map((line, i) => {
      const hl = highlightLine(line, actorColorMap, i);
      const isErr = (window.hlErrorLines && window.hlErrorLines.has(i)) || editorErrorLines.has(i + 1);
      const isActive = i === activeLineIndex;
      return `<div class="hl-line${isActive ? ' hl-active-line' : ''}${isErr ? ' hl-error-line' : ''}">${hl || ' '}</div>`;
    }).join('') + '</div>';
  } else {
    // Incremental update: only touch lines whose content or state changed
    const children = elHlLayer.firstElementChild ? elHlLayer.firstElementChild.children : [];
    for (let i = 0; i < lines.length; i++) {
      const lineChanged = prevLines[i] !== lines[i];
      const isActive = i === activeLineIndex;
      const wasActive = i === _prevActiveIndex;
      const activeChanged = isActive !== wasActive;
      const isErr = (window.hlErrorLines && window.hlErrorLines.has(i)) || editorErrorLines.has(i + 1);

      if (!lineChanged && !activeChanged && !errChanged) continue;

      const el = children[i];
      if (!el) continue;

      if (lineChanged) {
        el.innerHTML = highlightLine(lines[i], actorColorMap, i) || ' ';
      }
      el.className = 'hl-line' + (isActive ? ' hl-active-line' : '') + (isErr ? ' hl-error-line' : '');
    }
  }

  _prevSyncLines = lines.slice();
  _prevActiveIndex = activeLineIndex;
  _prevErrKey = errKey;

  // Scroll sync: translate the content wrapper by the textarea's exact scroll
  // pixels. Because the hl-layer is now a non-scrolling viewport (overflow:
  // hidden) sharing the textarea's coordinate space, the highlight stays locked
  // to the text regardless of scrollbar geometry — no two-scroll-container drift.
  const hlContent = elHlLayer.firstElementChild;
  if (hlContent) {
    hlContent.style.transform = `translate(${-elSrc.scrollLeft}px, ${-elSrc.scrollTop}px)`;
  }
}

const VALIDATE_DEFAULT_HTML = `
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
  Validate
`;

export function syncGutter() {
  if (!_elSrc) _elSrc = document.getElementById('source');
  if (!_elGutter) _elGutter = document.getElementById('gutter');
  const elSrc = _elSrc, elGutter = _elGutter;
  if (!elSrc || !elGutter) return;

  const lineCount = elSrc.value.split('\n').length;
  const errKey = (window.hlErrorLines ? [...window.hlErrorLines].join(',') : '') +
    '|' + [...editorErrorLines].join(',') + '|' + [...editorWarningLines].join(',');

  // Skip full rebuild if nothing changed — just sync scroll
  if (lineCount === _prevGutterLineCount && errKey === _prevGutterErrKey) {
    elGutter.scrollTop = elSrc.scrollTop;
    return;
  }

  let html = '';
  for (let i = 1; i <= lineCount; i++) {
    const isErr = (window.hlErrorLines && window.hlErrorLines.has(i - 1)) || editorErrorLines.has(i);
    const isWarn = editorWarningLines.has(i);
    if (isErr) {
      html += `<span class="gutter-error-line">${i}</span>`;
    } else if (isWarn) {
      html += `<span class="gutter-warning-line">${i}</span>`;
    } else {
      html += `<span>${i}</span>`;
    }
  }
  elGutter.innerHTML = html;
  elGutter.scrollTop = elSrc.scrollTop;

  _prevGutterLineCount = lineCount;
  _prevGutterErrKey = errKey;
}

export function extractErrorLineNumber(err, hash) {
  if (hash && typeof hash.line === 'number' && hash.line > 0) {
    return hash.line;
  }
  if (err && err.hash && typeof err.hash.line === 'number' && err.hash.line > 0) {
    return err.hash.line;
  }
  if (err && err.loc && typeof err.loc.first_line === 'number' && err.loc.first_line > 0) {
    return err.loc.first_line;
  }
  if (err && typeof err.line === 'number' && err.line > 0 && !err.sourceURL) {
    return err.line;
  }
  const msg = (typeof err === 'string' ? err : (err?.message || err?.str || String(err || '')));
  const m = msg.match(/line\s*:?\s*(\d+)/i) || msg.match(/on\s+line\s*:?\s*(\d+)/i) || msg.match(/:\s*(\d+)\s*:/);
  if (m) {
    return parseInt(m[1], 10);
  }
  if (/diagram type|no diagram|unknown diagram|lexical error/i.test(msg)) {
    return 1;
  }
  return null;
}

export function findAllErrorLines(text, mainErr, hash) {
  const errLines = new Set();

  const firstLineNum = extractErrorLineNumber(mainErr, hash);
  if (firstLineNum !== null && firstLineNum > 0) {
    errLines.add(firstLineNum);
  }

  const cleanText = (text || '').replace(/\r/g, '');
  const lines = cleanText.split('\n');

  // Check line 1 diagram type
  const firstLineText = (lines[0] || '').trim();
  const firstWordMatch = firstLineText.match(/^---[\s\S]*?---\s*\n?([a-zA-Z0-9-]+)/) || firstLineText.match(/^([a-zA-Z0-9-]+)/);
  const firstWord = firstWordMatch ? firstWordMatch[1] : '';
  if (firstWord && !VALID_DIAGRAM_TYPES.some(t => t.toLowerCase() === firstWord.toLowerCase())) {
    errLines.add(1);
  }

  // Scan each line for syntax flaws
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return;

    if (/[\w\-[\]()]+?\s*(?:-->|->>|->|==>|-\.-\|>|-\.->|--x|-x)\s*$/.test(trimmed)) {
      errLines.add(lineNum);
    }

    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      errLines.add(lineNum);
    }

    if (/[\w\-[\]()]+\s*\[[^\]\n]*$/.test(trimmed) || /[\w\-[\]()]+\s*\([^)\n]*$/.test(trimmed) || /[\w\-[\]()]+\s*\{[^}\n]*$/.test(trimmed)) {
      const remaining = lines.slice(idx).join('\n');
      const unclosedSquare = (remaining.match(/\[/g) || []).length > (remaining.match(/\]/g) || []).length;
      const unclosedParen = (remaining.match(/\(/g) || []).length > (remaining.match(/\)/g) || []).length;
      const unclosedBrace = (remaining.match(/\{/g) || []).length > (remaining.match(/\}/g) || []).length;
      
      if (
        (/[\w\-[\]()]+\s*\[[^\]\n]*$/.test(trimmed) && unclosedSquare) ||
        (/[\w\-[\]()]+\s*\([^)\n]*$/.test(trimmed) && unclosedParen) ||
        (/[\w\-[\]()]+\s*\{[^}\n]*$/.test(trimmed) && unclosedBrace)
      ) {
        errLines.add(lineNum);
      }
    }
  });

  return Array.from(errLines).sort((a, b) => a - b);
}

export function getDiagramDiagnostic(text) {
  const cleanText = (text || '').replace(/\r/g, '');
  const lines = cleanText.split('\n');
  let diagnosticMsg = null;
  const addDiag = (lineNum, msg, type) => {
    if (!diagnosticMsg && type === 'error') {
      diagnosticMsg = msg;
    }
  };

  const firstLine = (lines[0] || '').trim();
  if (/^seq/i.test(firstLine) || lines.some(l => /^seq/i.test((l || '').trim()))) {
    validateSequenceDiagram(cleanText, lines, addDiag);
  }
  return diagnosticMsg;
}

export function showEditorError(err, hash) {
  if (!_elSrc) _elSrc = document.getElementById('source');
  const elSrc = _elSrc;
  if (!elSrc) return;
  const text = elSrc.value;
  const linesArray = findAllErrorLines(text, err, hash);

  editorErrorLines.clear();
  linesArray.forEach(lineNum => editorErrorLines.add(lineNum));

  if (window.hlErrorLines) {
    window.hlErrorLines.clear();
    linesArray.forEach(lineNum => window.hlErrorLines.add(lineNum - 1));
  }

  syncGutter();

  let displayMsg = '';
  const customDiagMsg = getDiagramDiagnostic(text);
  if (customDiagMsg) {
    displayMsg = customDiagMsg;
  } else if (linesArray.length === 1) {
    displayMsg = `Error in line ${linesArray[0]}`;
  } else if (linesArray.length > 1) {
    displayMsg = `Errors in lines ${linesArray.join(', ')}`;
  } else {
    displayMsg = `Error in code editor`;
  }

  const errBar = document.getElementById('editorErrorBar');
  const errText = document.getElementById('editorErrorText');
  if (errBar && errText) {
    errText.textContent = displayMsg;
    errBar.classList.remove('warning-mode');
    errBar.style.display = 'flex';
  }

  const btnValidate = document.getElementById('validateBtn');
  if (btnValidate) {
    btnValidate.innerHTML = '<span style="color: #e2795b; font-weight: 600;">Invalid ✗</span>';
  }

  const btnFix = document.getElementById('fixBtn');
  if (btnFix) {
    const trimmed = text.trim().toLowerCase();
    const isHeaderTyping = !text.includes('\n') && (
      trimmed === '' ||
      ['flowchart', 'sequence', 'sequencediagram', 'class', 'classdiagram', 'state', 'statediagram', 'statediagram-v2', 'er', 'erdiagram'].some(p => p.startsWith(trimmed))
    );
    btnFix.style.display = isHeaderTyping ? 'none' : 'inline-flex';
  }
}

export function clearEditorError() {
  editorErrorLines.clear();
  editorWarningLines.clear();
  if (window.hlErrorLines) {
    window.hlErrorLines.clear();
  }
  syncGutter();
  syncLocalHL();

  const errBar = document.getElementById('editorErrorBar');
  if (errBar) {
    errBar.classList.remove('warning-mode');
    errBar.style.display = 'none';
  }

  const btnValidate = document.getElementById('validateBtn');
  if (btnValidate) {
    btnValidate.innerHTML = VALIDATE_DEFAULT_HTML;
  }

  const btnFix = document.getElementById('fixBtn');
  if (btnFix) btnFix.style.display = 'none';
}

export function checkSequenceDiagramWarnings(text) {
  const cleanText = (text || '').replace(/\r/g, '');
  const lines = cleanText.split('\n');

  if (!/^sequenceDiagram\b/i.test(cleanText.trim().replace(/^---[\s\S]*?---\s*/, ''))) {
    return [];
  }

  const declared = new Set();
  lines.forEach(line => {
    const trimmed = line.trim();
    const pMatch = trimmed.match(/^(?:participant|actor)\s+([A-Za-z0-9_]+)/i);
    if (pMatch) {
      declared.add(pMatch[1]);
    }
  });

  const warnings = [];
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%') || /^sequenceDiagram\b/i.test(trimmed) || /^(?:participant|actor|autonumber|title)\b/i.test(trimmed)) {
      return;
    }

    const lineUndeclared = new Set();

    const noteMatch = trimmed.match(/^Note\s+(?:over|left of|right of)\s+([A-Za-z0-9_,\s]+):/i);
    if (noteMatch) {
      const parts = noteMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        if (declared.size > 0 && !declared.has(p)) {
          lineUndeclared.add(p);
        } else if (declared.size === 0 && (p === 'S' || p === 'C' || /^[A-Z0-9_]+$/.test(p))) {
          lineUndeclared.add(p);
        }
      });
    }

    const arrowMatch = trimmed.match(/^("[^"]+"|[A-Za-z0-9_]+)\s*(?:->>|->|-->>|-->)\s*("[^"]+"|[A-Za-z0-9_]+)/);
    if (arrowMatch && declared.size > 0) {
      const src = arrowMatch[1].replace(/^"|"$/g, '');
      const dest = arrowMatch[2].replace(/^"|"$/g, '');
      if (!declared.has(src)) lineUndeclared.add(src);
      if (!declared.has(dest)) lineUndeclared.add(dest);
    }

    if (lineUndeclared.size > 0) {
      const missing = Array.from(lineUndeclared).join(', ');
      warnings.push({ lineNum, msg: `Line ${lineNum}: Warning: ${missing} not declared as participant` });
    }
  });

  return warnings;
}

export function showEditorWarnings(warnings) {
  if (!warnings || warnings.length === 0) return;

  editorWarningLines.clear();
  const messages = warnings.map(w => {
    editorWarningLines.add(w.lineNum);
    return w.msg;
  });

  syncGutter();

  const errBar = document.getElementById('editorErrorBar');
  const errText = document.getElementById('editorErrorText');
  if (errBar && errText) {
    errText.textContent = messages.join(' | ');
    errBar.classList.add('warning-mode');
    errBar.style.display = 'flex';
  }

  const btnFix = document.getElementById('fixBtn');
  if (btnFix) btnFix.style.display = 'inline-flex';
}

if (typeof document !== 'undefined') {
  // Track when a color picker dialog is open so syncLocalHL skips DOM rebuild
  document.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.classList.contains('inline-color-picker')) {
      window._colorPickerActive = true;
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target && e.target.classList.contains('inline-color-picker')) {
      const lineIndex = parseInt(e.target.getAttribute('data-line'), 10);
      const matchIndex = parseInt(e.target.getAttribute('data-match-index'), 10);
      const newHex = e.target.value;
      updateCodeColor(lineIndex, matchIndex, newHex, true);
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('inline-color-picker')) {
      // Color picker dialog closed — safe to rebuild highlight layer
      window._colorPickerActive = false;
      const lineIndex = parseInt(e.target.getAttribute('data-line'), 10);
      const matchIndex = parseInt(e.target.getAttribute('data-match-index'), 10);
      const newHex = e.target.value;
      updateCodeColor(lineIndex, matchIndex, newHex, false);
    }
  });

  // Safety: clear _colorPickerActive if user dismisses dialog with Escape
  // (no 'change' event fires in that case, leaving highlights frozen)
  document.addEventListener('focusout', (e) => {
    if (e.target && e.target.classList.contains('inline-color-picker') && window._colorPickerActive) {
      window._colorPickerActive = false;
      syncLocalHL();
    }
  }, true);
}
