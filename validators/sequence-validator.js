/**
 * Sequence Diagram Validator & Auto-Fix Module
 * Contains keyword list, syntax validation, alias validation, loop/block balancing, and auto-fix rules.
 */

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

  // Scan declarations & aliases
  lines.forEach(lineText => {
    const trimmed = lineText.trim();
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
    if (/^partic[a-z]*\b/i.test(trimmed) && !/^participant\b/i.test(trimmed)) {
      addDiag(lineNum, "Syntax Error: Misspelled Participant keyword.", "error");
      return;
    } else if (/^act[a-z]*\b/i.test(trimmed) && !/^(?:actor|activate|activate)\b/i.test(trimmed)) {
      addDiag(lineNum, "Syntax Error: Misspelled Actor keyword.", "error");
      return;
    } else if (/^(?:boundar[a-z]*|contro[a-z]*|entit[a-z]*|databas[a-z]*|collectio[a-z]*|autonumb[a-z]*|activat[a-z]*|deactivat[a-z]*|destro[a-z]*|acctitle)\b/i.test(trimmed) && !seqKeywordsRegex.test(trimmed)) {
      addDiag(lineNum, "Syntax Error: Misspelled Sequence Diagram keyword.", "error");
      return;
    }

    // STEP 2: Loop & Control Block Balancing Check (loop, alt, opt, par, critical, rect, box)
    const blockOpenMatch = trimmed.match(/^(loop|alt|opt|par|critical|rect|box)\b/i);
    if (blockOpenMatch) {
      blockStack.push({ type: blockOpenMatch[1], lineNum: lineNum });
    } else if (/^end\b/i.test(trimmed)) {
      if (blockStack.length > 0) {
        blockStack.pop();
      } else {
        addDiag(lineNum, "Unmatched 'end' statement without opening loop or block.", "error");
        return;
      }
    }

    // STEP 3: Alias / Label Usage Check (Check if display label is used instead of participant ID)
    if (labelToIdMap.size > 0 && !/^\s*(?:participant|actor|boundary|control|entity|database|collections|queue)\b/i.test(trimmed)) {
      for (const [label, id] of labelToIdMap.entries()) {
        const labelWordRegex = new RegExp(`\\b${label}\\b`, 'i');
        if (labelWordRegex.test(trimmed)) {
          addDiag(lineNum, `Alias Warning: Use declared identifier "${id}" instead of display label "${label}"`, "warning");
        }
      }
    }

    // STEP 4: Sequence Incomplete Arrows
    if (/(?:-->|->>|->|--x|-x|-\)|--\)|==>|-\.-\|>|-\.->|==|-|\.-)\s*$/.test(trimmed)) {
      addDiag(lineNum, "Incomplete arrow or statement in Sequence Diagram. Missing target actor.", "error");
      return;
    } else if (/(?:-->|->>|->|--x|-x|-\)|--\)|==>|-\.-\|>|-\.->|==|-)\s*:/.test(trimmed)) {
      addDiag(lineNum, "Incomplete arrow definition. Missing target actor before colon.", "error");
      return;
    }

    // STEP 5: Message lines with colons missing arrows
    if (trimmed.includes(':') && !seqKeywordsRegex.test(trimmed)) {
      const leftPart = trimmed.split(':')[0];
      if (!validSeqArrow.test(leftPart)) {
        addDiag(lineNum, "Invalid message syntax in Sequence Diagram. Missing valid arrow before colon.", "error");
        return;
      }
    }

    // STEP 6: Check lines without colon that are not keywords and have no arrow
    if (!trimmed.includes(':') && !seqKeywordsRegex.test(trimmed) && !validSeqArrow.test(trimmed)) {
      addDiag(lineNum, "Invalid sequence statement or incomplete arrow.", "error");
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
