/**
 * CodeMirror 6 diagnostics (Phase 2).
 *
 * Reuses the existing validators in editor.js (findAllErrorLines,
 * checkSequenceDiagramWarnings) and exposes them as a CM `linter` source so
 * error/warning lines get gutter markers + squiggles instead of the legacy
 * (hidden) gutter. Mermaid's async parse errors are bridged in from
 * showEditorError via setExternalDiagnostics().
 */

import { findAllErrorLines, checkSequenceDiagramWarnings } from './editor.js';

// Async diagnostics coming from Mermaid's parse step (showEditorError).
let external = [];

function lineRange(doc, lineNo) {
  const n = Math.max(1, Math.min(lineNo || 1, doc.lines));
  const line = doc.line(n);
  return { from: line.from, to: line.to };
}

export function setExternalDiagnostics(list) {
  external = Array.isArray(list) ? list.slice() : [];
  if (window.__cmEditor && window.__cmEditor.forceLint) window.__cmEditor.forceLint();
}

export function clearExternalDiagnostics() {
  external = [];
  if (window.__cmEditor && window.__cmEditor.forceLint) window.__cmEditor.forceLint();
}

export function mermaidLinterSource(view) {
  const doc = view.state.doc;
  const text = doc.toString();
  const diags = [];

  for (const ln of findAllErrorLines(text)) {
    const { from, to } = lineRange(doc, ln);
    diags.push({ from, to, severity: 'error', message: 'Syntax issue detected on this line' });
  }

  for (const w of checkSequenceDiagramWarnings(text)) {
    const { from, to } = lineRange(doc, w.lineNum);
    diags.push({ from, to, severity: 'warning', message: w.msg });
  }

  for (const d of external) {
    const { from, to } = lineRange(doc, d.line);
    diags.push({ from, to, severity: d.severity || 'error', message: d.message || 'Error' });
  }

  return diags;
}
