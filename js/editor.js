/**
 * Editor & Error Handling Module
 * Controls line gutter numbering, error parsing, error bar display, and warnings.
 */

import { VALID_DIAGRAM_TYPES } from './diagram-types.js';
import { validateSequenceDiagram } from './validators/sequence-validator.js';

export const editorErrorLines = new Set();
export const editorWarningLines = new Set();

import { getSeqPalette } from './palettes.js';
import { currentPaletteName, isPaletteReversed } from './renderer.js';

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

function _escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function replaceOutsideTags(html, regex, replacement) {
  return html.split(/(<[^>]*>)/).map((part, i) =>
    i % 2 === 0 ? part.replace(regex, replacement) : part
  ).join('');
}

export function highlightLine(line, actorColorMap = new Map()) {
  let s = _escHtml(line);

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
  const elSrc = document.getElementById('source');
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
  activeBg.style.setProperty('--line-index', currentLineNumber - 1);
  activeBg.style.transform = `translateY(-${elSrc.scrollTop}px)`;
}

export function syncLocalHL() {
  const elSrc = document.getElementById('source');
  const elHlLayer = document.getElementById('hlLayer');
  const elHlMode = document.getElementById('hlMode');
  if (!elSrc || !elHlLayer) return;

  const lines = elSrc.value.split('\n');
  const cursorIndex = elSrc.selectionStart || 0;
  let activeLineIndex = 0;
  let accumulatedLength = 0;
  for (let i = 0; i < lines.length; i++) {
    accumulatedLength += lines[i].length + 1;
    if (cursorIndex < accumulatedLength) {
      activeLineIndex = i;
      break;
    }
  }

  updateTextareaActiveBg(activeLineIndex + 1);

  const mode = elHlMode ? elHlMode.value : 'local';
  if (mode === 'off') {
    elHlLayer.innerHTML = '';
    elHlLayer.style.display = 'none';
    elSrc.classList.remove('hl-on');
    return;
  }

  elHlLayer.style.display = 'block';
  elSrc.classList.add('hl-on');

  const seqPalette = getSeqPalette(currentPaletteName(), isPaletteReversed());
  const actorColorMap = buildAliasColorMap(elSrc.value, seqPalette);

  elHlLayer.innerHTML = lines.map((line, i) => {
    let hl = highlightLine(line, actorColorMap);
    const isErr = (window.hlErrorLines && window.hlErrorLines.has(i)) || editorErrorLines.has(i + 1);
    const isActive = i === activeLineIndex;
    const classes = ['hl-line'];
    if (isActive) classes.push('hl-active-line');
    if (isErr) classes.push('hl-error-line');
    return `<div class="${classes.join(' ')}">${hl || ' '}</div>`;
  }).join('');

  elHlLayer.scrollTop = elSrc.scrollTop;
  elHlLayer.scrollLeft = elSrc.scrollLeft;
}

const VALIDATE_DEFAULT_HTML = `
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
  Validate
`;

export function syncGutter() {
  const elSrc = document.getElementById('source');
  const elGutter = document.getElementById('gutter');
  if (!elSrc || !elGutter) return;

  const lines = elSrc.value.split('\n').length;
  let html = '';
  for (let i = 1; i <= lines; i++) {
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
}

export function extractErrorLineNumber(err, hash) {
  if (hash && typeof hash.line === 'number' && hash.line > 0) {
    return hash.line;
  }
  if (err && typeof err.line === 'number' && err.line > 0) {
    return err.line;
  }
  if (err && err.hash && typeof err.hash.line === 'number' && err.hash.line > 0) {
    return err.hash.line;
  }
  if (err && err.loc && typeof err.loc.first_line === 'number' && err.loc.first_line > 0) {
    return err.loc.first_line;
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
  const elSrc = document.getElementById('source');
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
  if (btnFix) btnFix.style.display = 'inline-flex';
}

export function clearEditorError() {
  editorErrorLines.clear();
  editorWarningLines.clear();
  if (window.hlErrorLines) {
    window.hlErrorLines.clear();
  }
  syncGutter();

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
