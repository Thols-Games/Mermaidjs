/**
 * Auto-Fix Module for Mermaid Diagrams
 * Contains automatic syntax repair, alias normalization, and code formatting/alignment rules.
 */

import { VALID_DIAGRAM_TYPES } from './diagram-types.js';
import { autoFixSequenceCode } from './validators/sequence-validator.js';
import { autoFixClassCode } from './validators/class-validator.js';
import { autoFixFlowchartCode } from './validators/flowchart-validator.js';

export function autoFixMermaidCode(code, editorErrorLines = new Set()) {
  let fixed = (code || '').replace(/\r/g, '');

  // 0. Auto-fix invalid diagram type on line 1
  const lines = fixed.split('\n');
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    const m = firstLine.match(/^([a-zA-Z0-9-]+)(\s.*)?$/);
    if (m) {
      const typeWord = m[1].toLowerCase();
      if (!VALID_DIAGRAM_TYPES.some(t => t.toLowerCase() === typeWord)) {
        let bestMatch = 'flowchart';
        if (typeWord.includes('seq') || typeWord.includes('sequence')) bestMatch = 'sequenceDiagram';
        else if (typeWord.includes('class')) bestMatch = 'classDiagram';
        else if (typeWord.includes('state')) bestMatch = 'stateDiagram-v2';
        else if (typeWord.includes('er') || typeWord.includes('entity')) bestMatch = 'erDiagram';
        else if (typeWord.includes('gant')) bestMatch = 'gantt';
        else if (typeWord.includes('pie')) bestMatch = 'pie';
        else if (typeWord.includes('git')) bestMatch = 'gitGraph';
        else if (typeWord.includes('mind')) bestMatch = 'mindmap';
        else if (typeWord.includes('graph')) bestMatch = 'graph';
        else if (typeWord.includes('flow')) bestMatch = 'flowchart';

        lines[0] = bestMatch + (m[2] || '');
        fixed = lines.join('\n');
      }
    }
  }

  // 0.5 Auto-fix keyword typos (e.g. participan -> participant, actr -> actor, subgrap -> subgraph)
  fixed = fixed.replace(/^(\s*)part[ic][a-z]*\b/gmi, '$1participant');
  fixed = fixed.replace(/^(\s*)act[or]*\b(?=\s+[A-Za-z0-9_])/gmi, '$1actor');
  fixed = fixed.replace(/^(\s*)subgrap[a-z]*\b/gmi, '$1subgraph');

  const cleanHeader = fixed.trim().replace(/^---[\s\S]*?---\s*/, '');
  const isSeq = /^sequenceDiagram\b/i.test(cleanHeader);
  const isClass = /^classDiagram(?:-v2)?\b/i.test(cleanHeader);
  const isFlow = /^(?:flowchart|graph)\b/i.test(cleanHeader);

  if (isSeq && typeof autoFixSequenceCode === 'function') {
    fixed = autoFixSequenceCode(fixed);
  } else if (isClass && typeof autoFixClassCode === 'function') {
    fixed = autoFixClassCode(fixed);
  } else if (isFlow && typeof autoFixFlowchartCode === 'function') {
    fixed = autoFixFlowchartCode(fixed);
  } else {
    // Legacy fallback for arrows
    fixed = fixed.replace(/^(\s*[\w\-[\]()]+\s*)->\s*$/gm, '$1--> B');
    fixed = fixed.replace(/^(\s*[\w\-[\]()]+\s*(?:-->|==>|-\.-\|>|-\.->|--x|-x)\s*)$/gm, '$1 B');
  }

  // Common auto-fixes for quotes and brackets
  const lineArr = fixed.split('\n');
  lineArr.forEach((line, i) => {
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      lineArr[i] = line + '"';
    }
  });
  fixed = lineArr.join('\n');

  const lineArr2 = fixed.split('\n');
  lineArr2.forEach((line, i) => {
    let l = line.trimEnd();
    const remaining = lineArr2.slice(i).join('\n');
    const unclosedSquare = (remaining.match(/\[/g) || []).length > (remaining.match(/\]/g) || []).length;
    const unclosedParen = (remaining.match(/\(/g) || []).length > (remaining.match(/\)/g) || []).length;
    const unclosedBrace = (remaining.match(/\{/g) || []).length > (remaining.match(/\}/g) || []).length;

    if (/[\w\-[\]()]+\s*\[[^\]]+$/.test(l) && !l.endsWith(']') && unclosedSquare) {
      lineArr2[i] = line + ']';
    } else if (/[\w\-[\]()]+\s*\([^)]+$/.test(l) && !l.endsWith(')') && unclosedParen) {
      lineArr2[i] = line + ')';
    } else if (/[\w\-[\]()]+\s*\{[^}]+$/.test(l) && !l.endsWith('}') && unclosedBrace) {
      lineArr2[i] = line + '}';
    }
  });
  fixed = lineArr2.join('\n');

  // Fix sequence diagram empty alt/opt/else blocks
  fixed = fixed.replace(/((?:alt|opt|else)[^\n]*\n)(?=\s*(?:else|end))/g, `$1    %% (empty block)\n`);

  // Fix missing 'end' for subgraphs / loops / alts / opts / pars / rects
  const openCount = (fixed.match(/^\s*(subgraph|loop|alt|opt|par|rect)\b/gim) || []).length;
  const endCount = (fixed.match(/^\s*end\b/gim) || []).length;
  if (openCount > endCount) {
    for (let i = 0; i < (openCount - endCount); i++) {
      fixed += '\nend';
    }
  }

  // Fallback line fix if code was not changed and error lines exist
  if (fixed === code && editorErrorLines && editorErrorLines.size > 0) {
    const lArr = code.split('\n');
    editorErrorLines.forEach(errLine => {
      if (errLine > 0 && errLine <= lArr.length) {
        const idx = errLine - 1;
        let line = lArr[idx];
        if (/\s*(?:-->|->>|->)\s*$/.test(line)) {
          lArr[idx] = line + ' TargetNode';
        } else if (line.trim()) {
          lArr[idx] = '%% ' + line;
        }
      }
    });
    fixed = lArr.join('\n');
  }

  return fixed;
}

export function updateParticipantAliasesInCode(code) {
  if (!code) return code;
  const lines = code.split('\n');
  const aliasMap = new Map();

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const match = l.match(/^\s*(participant|actor)\s+([A-Za-z0-9_]+)\s+as\s+(.+)$/i);
    if (match) {
      const alias = match[2].trim();
      const name = match[3].trim();
      if (alias && name && alias !== name) {
        aliasMap.set(name, alias);
      }
    }
  }

  if (aliasMap.size === 0) return code;

  const updatedLines = lines.map(line => {
    if (/^\s*(participant|actor)\b/i.test(line)) {
      return line;
    }

    let modifiedLine = line;
    aliasMap.forEach((alias, name) => {
      const safeName = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('\\b' + safeName + '\\b', 'g');
      modifiedLine = modifiedLine.replace(regex, alias);
    });
    return modifiedLine;
  });

  return updatedLines.join('\n');
}

export function formatAndAlignMermaidCode(code) {
  if (!code) return code;
  const lines = code.split('\n');
  let indent = 0;
  const result = [];
  const INDENT_STR = '    ';

  const isHeaderLine = (line) => {
    return /^(?:sequenceDiagram|flowchart|graph|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|quadrantChart|sankey-beta)\b/i.test(line);
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      result.push('');
      continue;
    }

    if (/^(?:end|else|option|and)\b/i.test(line)) {
      indent = Math.max(1, indent - 1);
    }

    let currentLineIndent = indent;
    if (isHeaderLine(line)) {
      currentLineIndent = 0;
    }

    const indented = INDENT_STR.repeat(currentLineIndent) + line;
    result.push(indented);

    if (isHeaderLine(line)) {
      indent = 1;
    } else if (/^(?:subgraph|loop|alt|opt|par|rect|critical|break)\b/i.test(line)) {
      indent++;
    }
  }
  return result.join('\n');
}
