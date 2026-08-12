/**
 * Class Diagram Validator & Auto-Fix Module
 * Contains keyword list, syntax validation, and auto-fix rules for Class Diagrams.
 */

export const CLASS_KEYWORDS = [
  'class', 'namespace', 'interface', 'abstract', 'service', 'enumeration',
  'direction', 'note', 'click', 'style', 'cssClass', 'accTitle', 'accDescr', 'title',
  'String', 'int', 'float', 'double', 'boolean', 'void'
];

export function validateClassDiagram(cleanText, lines, addDiag) {
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('%%') || /^classDiagram(?:-v2)?\b/i.test(trimmed)) return;

    // STEP 1: Keyword Typo Check FIRST! (e.g. "clas", "namespce", "interfac")
    if (/^(?:clas|namespce|interfac|abstractt)\b/i.test(trimmed)) {
      addDiag(lineNum, "Syntax Error: Misspelled Class Diagram keyword.", "error");
      return;
    }

    // STEP 2: Class Diagram Incomplete Relationships SECOND! (<|--, *--, o--, -->, --, ..>, ..|>, ..)
    if (/(?:<\|--|--\|>|\*--|--\*|o--|--o|-->|<--|--|\.\.>|<\.\.|\.\.\|>|<\|\.\.|\.\.)\s*$/.test(trimmed)) {
      addDiag(lineNum, "Incomplete relationship in Class Diagram. Missing target class.", "error");
    } else if (/(?:<\|--|--\|>|\*--|--\*|o--|--o|-->|<--|--|\.\.>|<\.\.|\.\.\|>|<\|\.\.|\.\.)\s*:/.test(trimmed)) {
      addDiag(lineNum, "Incomplete relationship definition. Missing target class before colon.", "error");
    }
  });
}

export function autoFixClassCode(fixed) {
  let code = fixed;
  code = code.replace(/^(\s*)clas\b/gmi, '$1class');
  code = code.replace(/^(\s*)namespce\b/gmi, '$1namespace');
  code = code.replace(/^(\s*)interfac\b/gmi, '$1interface');
  code = code.replace(/^(\s*[\w\-[\]()]+\s*(?:<\|--|--\|>|\*--|--\*|o--|--o|-->|<--|--|\.\.>|<\.\.|\.\.\|>|<\|\.\.|\.\.))\s*$/gm, '$1 ClassB');
  return code;
}
