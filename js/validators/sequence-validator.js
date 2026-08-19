/**
 * Sequence Diagram Validator & Auto-Fix Module
 * Contains keyword list, syntax validation, alias validation, loop/block balancing, and auto-fix rules.
 */

import { VALID_DIAGRAM_TYPES } from '../diagram-types.js';

export const SEQUENCE_KEYWORDS = [
  'participant', 'actor', 'boundary', 'control', 'entity', 'database', 'collections',
  'queue', 'autonumber', 'title', 'accTitle', 'accDescr', 'box', 'end', 'loop', 'alt',
  'else', 'opt', 'par', 'and', 'rect', 'rgb', 'rgba', 'critical', 'option', 'break', 'activate',
  'deactivate', 'create', 'destroy', 'links', 'link', 'style', 'Note', 'over', 'left of', 'right of', 'as'
];

export function validateSequenceDiagram(cleanText, lines, addDiag) {
  const declared = new Set();
  const labelToIdMap = new Map(); // Maps Display Label -> Participant ID (e.g., "Alice" -> "A")
  const blockStack = []; // Tracks open loop / alt / opt / par / critical / rect / box blocks

  // --- Diagram-type header check -------------------------------------------
  // The first line is always the Diagram Type. For sequence diagrams, line 1
  // should be "sequenceDiagram". If it is misspelled (e.g. "sequencDiagram",
  // "sequencialDiagram"), report a Syntax Error on line 1.
  const firstLine = (lines[0] || '').trim();
  const firstWordMatch = firstLine.match(/^---[\s\S]*?---\s*\n?([a-zA-Z0-9-]+)/) || firstLine.match(/^([a-zA-Z0-9-]+)/);
  const firstWord = firstWordMatch ? firstWordMatch[1] : firstLine;

  if (firstWord) {
    const isExactSeq = /^sequenceDiagram\b/i.test(firstLine);
    if (!isExactSeq) {
      const normWord = firstWord.toLowerCase();
      if (normWord.startsWith('seq') || normWord.includes('sequence')) {
        addDiag(1, `Syntax Error: Misspelled diagram type "${firstWord}". Expected "sequenceDiagram".`, "error");
        return;
      }
    }
  }

  const SEQUENCE_TYPE_ALIASES = (VALID_DIAGRAM_TYPES || [])
    .filter(t => t.toLowerCase().startsWith('seq'))
    .map(t => t.toLowerCase());
  const headerLine = (lines.find(l => /^seq/i.test((l || '').trim())) || (lines[0] || '')).trim();
  if (headerLine && /^seq/i.test(headerLine)) {
    const norm = headerLine.toLowerCase().replace(/\s+/g, '');
    const isKnownSeq = SEQUENCE_TYPE_ALIASES.some(a => norm === a || norm.startsWith(a));
    if (!isKnownSeq) {
      addDiag(1, `Syntax Error: Misspelled diagram type "${headerLine}". Expected "sequenceDiagram".`, "error");
      return;
    }
  }

  // Scan declarations & aliases
  lines.forEach((lineText, lineIdx) => {
    const lineNum = lineIdx + 1;
    const trimmed = lineText.trim();
    // Declaration with identifier + display label but missing 'as'
    // (e.g. "participant a Alice" should be "participant a as Alice").
    const missingAsMatch = trimmed.match(/^(?:create\s+)?(?:participant|actor|boundary|control|entity|database|collections|queue)\s+("[^"]+"|[A-Za-z0-9_]+)(?:@\{[^}]*\})?\s+(?![Aa]s\b)("[^"]+"|[A-Za-z0-9_]+)(?!\s+as\b)/i);
    if (missingAsMatch) {
      addDiag(lineNum, "Syntax Error: Missing 'as' between identifier and display label (e.g. 'participant a as Alice').", "error");
      return;
    }
    const pMatch = trimmed.match(/^(?:create\s+)?(?:participant|actor|boundary|control|entity|database|collections|queue)\s+("[^"]+"|[A-Za-z0-9_]+)(?:@\{[^}]*\})?(?:\s+as\s+("[^"]+"|[A-Za-z0-9_]+))?/i);
    if (pMatch) {
      const partId = pMatch[1] ? pMatch[1].replace(/^"|"$/g, '') : '';
      const partLabel = pMatch[2] ? pMatch[2].replace(/^"|"$/g, '') : '';
      
      if (partId) declared.add(partId);
      if (partLabel) {
        declared.add(partLabel);
        // Both mappings for robust detection: Label -> ID and ID -> Label
        labelToIdMap.set(partLabel, partId);
      }
      const jsonMatch = trimmed.match(/"alias"\s*:\s*"([^"]+)"/i);
      if (jsonMatch) declared.add(jsonMatch[1]);
    }
  });

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('%%') || /^sequenceDiagram\b/i.test(trimmed)) return;

    const seqKeywordsRegex = new RegExp('^(?:' + SEQUENCE_KEYWORDS.join('|') + ')\\b', 'i');
    const validSeqArrow = /(?:->>|->|-->>|-->|-x|--x|-\)|--\)|->\+|->-|->>\+|->>-|-->>\+|-->>-)/;

    // STEP 1: Specific Keyword Typo Checks FIRST!
    const wordMatch = trimmed.match(/^([a-zA-Z0-9_-]+)/);
    const word = wordMatch ? wordMatch[1] : trimmed;

    if (/^partic[a-z]*\b/i.test(trimmed) && !/^participant\b/i.test(trimmed)) {
      addDiag(lineNum, `Syntax Error: Misspelled keyword "${word}". Expected "participant".`, "error");
      return;
    } else if (/^act[a-z]*\b/i.test(trimmed) && !/^(?:actor|activate|deactivate)\b/i.test(trimmed)) {
      addDiag(lineNum, `Syntax Error: Misspelled keyword "${word}". Expected "actor".`, "error");
      return;
    } else if (/^(?:boundar[a-z]*|contro[a-z]*|entit[a-z]*|databas[a-z]*|collectio[a-z]*|autonumb[a-z]*|activat[a-z]*|deactivat[a-z]*|destro[a-z]*|acctitle)\b/i.test(trimmed) && !seqKeywordsRegex.test(trimmed)) {
      addDiag(lineNum, `Syntax Error: Misspelled keyword "${word}". Expected valid sequence keyword.`, "error");
      return;
    }

    // STEP 2: Loop & Control Block Balancing Check (loop, alt, opt, par, critical, rect, box)
    const blockOpenMatch = trimmed.match(/^(loop|alt|opt|par|critical|rect|box)\b/i);
    if (blockOpenMatch) {
      blockStack.push({ type: blockOpenMatch[1], lineNum: lineNum, hasStatements: false });
    } else if (/^else\b/i.test(trimmed)) {
      if (blockStack.length > 0) {
        const top = blockStack[blockStack.length - 1];
        if (!top.hasStatements && top.type !== 'rect' && top.type !== 'box') {
          addDiag(top.lineNum, `Empty Block Warning: '${top.type}' block on line ${top.lineNum} has no inner messages. Add a message or note to avoid collapsed vertical text.`, "warning");
        }
        top.hasStatements = false;
        top.lineNum = lineNum;
        top.type = 'else';
      }
    } else if (/^end\b/i.test(trimmed)) {
      if (blockStack.length > 0) {
        const top = blockStack.pop();
        if (!top.hasStatements && top.type !== 'rect' && top.type !== 'box') {
          addDiag(top.lineNum, `Empty Block Warning: '${top.type}' block on line ${top.lineNum} has no inner messages. Add a message or note to avoid collapsed vertical text.`, "warning");
        }
      } else {
        addDiag(lineNum, `Syntax Error: Unmatched "end". Expected opening loop or block.`, "error");
        return;
      }
    } else {
      if (blockStack.length > 0 && !/^(?:rect|box|autonumber|title)\b/i.test(trimmed)) {
        blockStack[blockStack.length - 1].hasStatements = true;
      }
    }

    // STEP 3: Alias / Label Usage Check (Check if display label is used instead of participant ID)
    if (labelToIdMap.size > 0 && !/^\s*(?:participant|actor|boundary|control|entity|database|collections|queue|Note)\b/i.test(trimmed)) {
      for (const [label, id] of labelToIdMap.entries()) {
        const labelWordRegex = new RegExp(`\\b${label}\\b`, 'i');
        if (labelWordRegex.test(trimmed)) {
          addDiag(lineNum, `Alias Warning: Use declared identifier "${id}" instead of display label "${label}"`, "warning");
        }
      }
    }

    // STEP 4: Sequence Incomplete Arrows
    if (/(?:-->|->>|->|--x|-x|-\)|--\)|==>|-\.-\|>|-\.->|==|-|\.-)\s*$/.test(trimmed)) {
      addDiag(lineNum, `Syntax Error: Incomplete arrow on line ${lineNum}. Expected target actor.`, "error");
      return;
    } else if (/(?:-->|->>|->|--x|-x|-\)|--\)|==>|-\.-\|>|-\.->|==|-)\s*:/.test(trimmed)) {
      addDiag(lineNum, `Syntax Error: Incomplete arrow on line ${lineNum}. Expected target actor before colon.`, "error");
      return;
    }

    // STEP 5: Message lines with colons missing arrows
    if (trimmed.includes(':') && !seqKeywordsRegex.test(trimmed)) {
      const leftPart = trimmed.split(':')[0];
      if (!validSeqArrow.test(leftPart)) {
        addDiag(lineNum, `Syntax Error: Invalid message syntax on line ${lineNum}. Expected valid arrow before colon.`, "error");
        return;
      }
    }

    // STEP 6: Check lines without colon that are not keywords and have no arrow
    if (!trimmed.includes(':') && !seqKeywordsRegex.test(trimmed) && !validSeqArrow.test(trimmed)) {
      addDiag(lineNum, `Syntax Error: Invalid sequence statement on line ${lineNum}.`, "error");
      return;
    }

    // STEP 7: Undeclared actor warnings
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
      addDiag(lineNum, `Warning: ${missing} not declared as participant`, "warning");
    }
  });

  // Check for any unclosed loop/block at end of document
  if (blockStack.length > 0) {
    blockStack.forEach(b => {
      addDiag(b.lineNum, `Unclosed '${b.type}' block. Missing 'end' statement.`, "error");
    });
  }
}

export function autoFixSequenceCode(fixed) {
  let code = fixed;
  code = code.replace(/^(\s*)partic[a-z]*\b/gmi, '$1participant');
  code = code.replace(/^(\s*)act[a-z]*\b(?=\s+[A-Za-z0-9_])/gmi, '$1actor');

  // Alias auto-fix: Replace display label with participant ID on statement lines
  const labelToIdMap = new Map();
  const aliasRegex = /^(?:\s*)(?:create\s+)?(?:participant|actor|boundary|control|entity|database|collections|queue)\s+("[^"]+"|[A-Za-z0-9_]+)(?:@\{[^}]*\})?\s+as\s+("[^"]+"|[A-Za-z0-9_]+)/gmi;
  let match;
  while ((match = aliasRegex.exec(code)) !== null) {
    const partId = match[1].replace(/^"|"$/g, '');
    const partLabel = match[2].replace(/^"|"$/g, '');
    labelToIdMap.set(partLabel, partId);
  }

  if (labelToIdMap.size > 0) {
    const lns = code.split('\n');
    for (let i = 0; i < lns.length; i++) {
      let l = lns[i];
      if (!/^\s*(?:participant|actor|boundary|control|entity|database|collections|queue)\b/i.test(l)) {
        for (const [label, id] of labelToIdMap.entries()) {
          const labelRegex = new RegExp(`\\b${label}\\b`, 'g');
          l = l.replace(labelRegex, id);
        }
        lns[i] = l;
      }
    }
    code = lns.join('\n');
  }

  const seqArrowRegex = /(?:->>|->|-->>|-->|-x|--x|-\)|--\)|->\+|->-|->>\+|->>-|-->>\+|-->>-)/;

  // 0. Single hyphen between actors or aliases (e.g., "a-b: Hello" -> "a->>b: Hello", "a - b: Hello" -> "a ->> b: Hello")
  code = code.replace(/^(\s*)([\w\-[\]()]+)(\s*)-(\s*)([\w\-[\]()]+)(\s*:.*)$/gm, (m, indent, p1, s1, s2, p2, rest) => {
    if (seqArrowRegex.test(m)) return m;
    if (/^(?:participant|actor|boundary|control|entity|database|collections|queue|Note|title|accTitle|accDescr|loop|alt|opt|par|rect|critical|box|end)\b/i.test(p1)) return m;
    return `${indent}${p1}${s1}->>${s2}${p2}${rest}`;
  });

  // 1. Two actors with colon missing arrow (e.g., "Alice Bob: Hello" or "A B: Hello") -> "Alice ->> Bob: Hello"
  code = code.replace(/^(\s*[\w\-[\]()]+\s+)([\w\-[\]()]+)(\s*:.*)$/gm, (m, p1, p2, p3) => {
    if (seqArrowRegex.test(m)) return m;
    return `${p1}->> ${p2}${p3}`;
  });

  // 2. Single actor with colon missing arrow and target (e.g., "Alice: Hello") -> "Alice ->> Bob: Hello"
  code = code.replace(/^(\s*)([\w\-[\]()]+)(\s*:.*)$/gm, (m, indent, p1, rest) => {
    if (seqArrowRegex.test(m)) return m;
    if (/^(?:participant|actor|boundary|control|entity|database|collections|queue|Note|title|accTitle|accDescr|loop|alt|opt|par|rect|critical|box|end)\b/i.test(p1)) return m;
    return `${indent}${p1} ->> Bob${rest}`;
  });

  // 3. Simple single arrow -> convert to full arrow ->>
  code = code.replace(/^(\s*[\w\-[\]()]+\s*)->(\s*[\w\-[\]()]*\s*)$/gm, '$1->>$2');

  // 4. Incomplete arrow without colon/message at end of line (e.g., "Alice ->>" or "Alice ->") -> "Alice ->> Bob: Message"
  code = code.replace(/^(\s*[\w\-[\]()]+\s*(?:->>|->|-->>|-->|-x|--x|-\)|--\)|==>))\s*$/gm, '$1 Bob: Message');

  // 5. Arrow with target but missing colon (e.g., "Alice ->> Bob") -> "Alice ->> Bob: Message"
  code = code.replace(/^(\s*[\w\-[\]()]+\s*(?:->>|-->>)\s*[\w\-[\]()]+)\s*$/gm, '$1: Message');

  // 6. Fix empty sequence diagram blocks (alt, opt, loop, else, par, critical) by adding a neutral structural span note
  const allKnownActors = [];
  const pDeclRegex = /^\s*(?:participant|actor|boundary|control|entity|database|collections|queue)\s+("[^"]+"|[A-Za-z0-9_]+)/gim;
  let pMatch;
  while ((pMatch = pDeclRegex.exec(code)) !== null) {
    const id = pMatch[1].replace(/^"|"$/g, '');
    if (!allKnownActors.includes(id)) allKnownActors.push(id);
  }

  const msgRegex = /^\s*("[^"]+"|[A-Za-z0-9_]+)\s*(?:->>|->|-->>|-->|-x|--x|-\)|--\)|==>)\s*("[^"]+"|[A-Za-z0-9_]+)/gmi;
  let mMatch;
  while ((mMatch = msgRegex.exec(code)) !== null) {
    const src = mMatch[1].replace(/^"|"$/g, '');
    const dest = mMatch[2].replace(/^"|"$/g, '');
    if (!allKnownActors.includes(src)) allKnownActors.push(src);
    if (!allKnownActors.includes(dest)) allKnownActors.push(dest);
  }

  const firstActor = allKnownActors[0] || 'Alice';
  const lastActor = allKnownActors.length >= 2 ? allKnownActors[allKnownActors.length - 1] : (allKnownActors[1] || 'Bob');
  const defaultSpan = allKnownActors.length >= 2 ? `${firstActor}, ${lastActor}` : (allKnownActors[0] ? `${allKnownActors[0]}` : 'Alice, Bob');

  const lines = code.split('\n');
  const fixedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    fixedLines.push(line);
    const trimmed = line.trim();

    if (/^(?:alt|opt|loop|par|critical|else)\b/i.test(trimmed)) {
      // Look ahead to see if the next non-empty, non-comment line is 'else' or 'end'
      let nextStmtIdx = -1;
      for (let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j].trim();
        if (!nextTrimmed || nextTrimmed.startsWith('%%')) continue;
        nextStmtIdx = j;
        break;
      }

      if (nextStmtIdx !== -1 && /^(?:else|end)\b/i.test(lines[nextStmtIdx].trim())) {
        const indent = (line.match(/^\s*/) || [''])[0] + '    ';
        fixedLines.push(`${indent}Note over ${defaultSpan}: (action)`);
      }
    }
  }
  code = fixedLines.join('\n');

  // Auto-Fix unclosed loops / blocks by appending missing 'end' statements
  const lns = code.split('\n');
  let openCount = 0;
  lns.forEach(l => {
    const trimmed = l.trim();
    if (/^(loop|alt|opt|par|critical|rect|box)\b/i.test(trimmed)) openCount++;
    else if (/^end\b/i.test(trimmed) && openCount > 0) openCount--;
  });

  while (openCount > 0) {
    code += '\nend';
    openCount--;
  }

  return code;
}
