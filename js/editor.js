/**
 * Editor & Error Handling Module (CodeMirror-era)
 *
 * The visual overlay (hlLayer, gutter, active-line bar, token highlighting,
 * inline RGB pickers) has been retired in favour of the CodeMirror editor
 * (cm-editor.js + cm-decorations.js + cm-diagnostics.js). This module now owns
 * only the diagram-agnostic logic: error/warning detection and the alias→colour
 * map reused by the CM decorations. The legacy #source textarea remains the data
 * mirror consumed by the rest of the app and kept in sync by cm-editor.js.
 */

import { VALID_DIAGRAM_TYPES } from './diagram-types.js';
import { validateSequenceDiagram } from './validators/sequence-validator.js';

export const editorErrorLines = new Set();
export const editorWarningLines = new Set();

import { getSeqPalette, currentPaletteName, isPaletteReversed } from './palettes.js';

// Single shared instance so the CM lint gutter and any legacy consumers agree.
export const hlErrorLines = new Set();
if (typeof window !== 'undefined') window.hlErrorLines = hlErrorLines;

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
      const id = declMatch[1] ? declMatch[1].replace(/^"|"$/g, '') : '';
      const label = declMatch[2] ? declMatch[2].replace(/^"|"$/g, '') : '';
      // Prefer the identifier (left of `as`); if there is no `as`, the single
      // name is both the id and the (only) label.
      const alias = id || label;
      if (alias && !map.has(alias)) {
        const color = seqPalette[colorIndex % seqPalette.length];
        map.set(alias, color);
        // The identifier and display label refer to the SAME participant, so
        // they must share one color in the editor (e.g. `A` and `Alice`).
        if (id && label && id !== label && !map.has(label)) {
          map.set(label, color);
        }
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

const RGB_REGEX = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[0-9.]+\s*)?\)/gi;
export { RGB_REGEX };


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

  const firstLineText = (lines[0] || '').trim();
  const firstWordMatch = firstLineText.match(/^---[\s\S]*?---\s*\n?([a-zA-Z0-9-]+)/) || firstLineText.match(/^([a-zA-Z0-9-]+)/);
  const firstWord = firstWordMatch ? firstWordMatch[1] : '';
  if (firstWord && !VALID_DIAGRAM_TYPES.some(t => t.toLowerCase() === firstWord.toLowerCase())) {
    errLines.add(1);
  }

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
  const text = elSrc ? elSrc.value : '';
  const linesArray = findAllErrorLines(text, err, hash);

  editorErrorLines.clear();
  linesArray.forEach(lineNum => editorErrorLines.add(lineNum));

  hlErrorLines.clear();
  linesArray.forEach(lineNum => hlErrorLines.add(lineNum - 1));

  const customDiagMsg = getDiagramDiagnostic(text);
  let displayMsg;
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

  // Bridge Mermaid's async parse-error line into the CodeMirror lint gutter.
  const errLine = extractErrorLineNumber(err, hash);
  if (errLine && window.__cmEditor) {
    window.__cmEditor.setExternalDiagnostics([{ line: errLine, message: displayMsg || 'Mermaid parse error', severity: 'error' }]);
  }
}

export function clearEditorError() {
  editorErrorLines.clear();
  editorWarningLines.clear();
  hlErrorLines.clear();
  if (window.__cmEditor) window.__cmEditor.clearExternalDiagnostics();

  const errBar = document.getElementById('editorErrorBar');
  if (errBar) {
    errBar.classList.remove('warning-mode');
    errBar.style.display = 'none';
  }

  const btnValidate = document.getElementById('validateBtn');
  if (btnValidate) {
    btnValidate.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      Validate
    `;
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

  const declared = new Set();        // ids + labels (used for undeclared checks)
  const declaredIds = new Set();      // ids only (used for alias-use checks)
  const labelToIdMap = new Map();      // display label -> identifier
  lines.forEach(line => {
    const trimmed = line.trim();
    const pMatch = trimmed.match(/^(?:participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+([A-Za-z0-9_]+))?/i);
    if (pMatch) {
      declared.add(pMatch[1]);
      declaredIds.add(pMatch[1]);
      if (pMatch[2]) {
        declared.add(pMatch[2]);
        labelToIdMap.set(pMatch[2], pMatch[1]);
      }
    }
  });

  const warnings = [];
  const blockStack = [];
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%') || /^sequenceDiagram\b/i.test(trimmed) || /^(?:participant|actor|autonumber|title)\b/i.test(trimmed)) {
      return;
    }

    const bOpen = trimmed.match(/^(alt|opt|loop|par|critical)\b/i);
    if (bOpen) {
      blockStack.push({ type: bOpen[1], lineNum, hasStatements: false });
    } else if (/^else\b/i.test(trimmed)) {
      if (blockStack.length > 0) {
        const top = blockStack[blockStack.length - 1];
        if (!top.hasStatements && top.type !== 'rect' && top.type !== 'box') {
          warnings.push({ lineNum: top.lineNum, msg: `Line ${top.lineNum}: Warning: '${top.type}' block is empty. Add a message or note inside to avoid collapsed vertical text.` });
        }
        top.hasStatements = false;
        top.lineNum = lineNum;
        top.type = 'else';
      }
    } else if (/^end\b/i.test(trimmed)) {
      if (blockStack.length > 0) {
        const top = blockStack.pop();
        if (!top.hasStatements && top.type !== 'rect' && top.type !== 'box') {
          warnings.push({ lineNum: top.lineNum, msg: `Line ${top.lineNum}: Warning: '${top.type}' block is empty. Add a message or note inside to avoid collapsed vertical text.` });
        }
      }
    } else {
      if (blockStack.length > 0 && !/^(?:rect|box|autonumber|title)\b/i.test(trimmed)) {
        blockStack[blockStack.length - 1].hasStatements = true;
      }
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
      // A display label used in a message should be the identifier instead
      // (e.g. `participant A as Alice` ⇒ use `A`, not `Alice`).
      if (!declaredIds.has(src)) {
        if (labelToIdMap.has(src)) warnings.push({ lineNum, msg: `Line ${lineNum}: Use declared identifier "${labelToIdMap.get(src)}" instead of display label "${src}"` });
        else if (!declared.has(src)) lineUndeclared.add(src);
      }
      if (!declaredIds.has(dest)) {
        if (labelToIdMap.has(dest)) warnings.push({ lineNum, msg: `Line ${lineNum}: Use declared identifier "${labelToIdMap.get(dest)}" instead of display label "${dest}"` });
        else if (!declared.has(dest)) lineUndeclared.add(dest);
      }
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
