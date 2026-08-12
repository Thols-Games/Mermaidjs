/**
 * Flowchart Diagram Validator & Auto-Fix Module
 * Contains keyword list, syntax validation, and auto-fix rules for Flowchart Diagrams.
 */

export const FLOWCHART_KEYWORDS = [
  'subgraph', 'end', 'direction', 'classDef', 'class', 'linkStyle', 'style', 'click',
  'accTitle', 'accDescr', 'title', 'TB', 'TD', 'BT', 'RL', 'LR'
];

export function validateFlowchart(cleanText, lines, addDiag) {
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('%%') || /^(?:flowchart|graph)\b/i.test(trimmed)) return;

    // STEP 1: Keyword Typo Check FIRST! (e.g. "subgrap", "classdef", "direciton")
    if (/^(?:subgrap[a-z]*|classdef|linkstyle|direciton)\b/i.test(trimmed)) {
      addDiag(lineNum, "Syntax Error: Misspelled Flowchart keyword.", "error");
      return;
    }

    // STEP 2: Flowchart Incomplete Arrows SECOND!
    if (/(?:-->|--->|==>|-\.-\|>|-\.->|--x|--o|---|-.-|==)\s*$/.test(trimmed) || /(?:-->|--->|==>|-\.-\|>|-\.->|--x|--o|---|--)\s*\|[^|]*\|\s*$/.test(trimmed)) {
      addDiag(lineNum, "Incomplete arrow in Flowchart. Missing target node.", "error");
    } else if (/(?:-->|--->|==>|-\.-\|>|-\.->|--x|--o|---|-.-|==)\s*:/.test(trimmed)) {
      addDiag(lineNum, "Incomplete arrow definition. Missing target node before colon.", "error");
    }
  });
}

export function autoFixFlowchartCode(fixed) {
  let code = fixed;
  code = code.replace(/^(\s*)subgrap[a-z]*\b/gmi, '$1subgraph');
  code = code.replace(/^(\s*)classdef\b/gmi, '$1classDef');
  code = code.replace(/^(\s*)linkstyle\b/gmi, '$1linkStyle');
  code = code.replace(/^(\s*)direciton\b/gmi, '$1direction');

  code = code.replace(/^(\s*[\w\-[\]()]+\s*)->\s*$/gm, '$1--> B');
  code = code.replace(/^(\s*[\w\-[\]()]+\s*(?:-->|==>|-\.-\|>|-\.->|--x|-x)\s*)$/gm, '$1 B');
  return code;
}
