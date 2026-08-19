/**
 * Mermaid syntax highlighting for CodeMirror 6.
 *
 * Ports the token rules from editor.js `highlightLine()` into a StreamParser so
 * the overlay/highlight-layer machinery can eventually be retired. Colors reuse
 * the same `--hl-*` custom properties injected by dom.js `injectHLPaletteColors`.
 */

import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const tokenTable = {
  comment: t.comment,
  keyword: t.keyword,
  builtin: t.variableName,
  string: t.string,
  number: t.number,
  arrow: t.operator,
  rgb: t.meta,
};

const mermaidParser = {
  token(stream) {
    if (stream.eatSpace()) return null;

    // Comments: lines starting with %%
    if (stream.match(/^\s*%%.*/)) return 'comment';

    // rgb() / rgba() color literals (inline picker handled later as a decoration)
    if (stream.match(/^rgba?\(/i)) {
      stream.skipTo(')');
      stream.eat(')');
      return 'rgb';
    }

    // Strings
    if (stream.match(/^"[^"]*"/) || stream.match(/^'[^']*'/)) return 'string';

    // Numbers with optional CSS-like unit
    if (stream.match(/^\d+(?:\.\d+)?(?:px|pt|em|rem|s|ms|deg|%)?/)) return 'number';

    // Arrows
    if (stream.match(/^(?:-->>|-->-|->>|-->-|-\.->>|-\.->|-->|->|==>|===|-x|-\)|@>|-\.->)/)) return 'arrow';

    // Diagram keywords / declarators
    if (stream.match(/^(?:sequenceDiagram|flowchart|graph|subgraph|end|classDef|class|participant|actor|note|loop|alt|opt|par|rect|stateDiagram|state|erDiagram|click|style|linkStyle|direction)\b/i)) return 'keyword';

    // `as` alias connector
    if (stream.match(/^as\b/i)) return 'builtin';

    // Single char, no style
    stream.next();
    return null;
  },
  tokenTable,
  languageData: { commentTokens: { line: '%%' } },
};

export const mermaidLanguage = StreamLanguage.define(mermaidParser);

export const mermaidHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--hl-kw)', fontWeight: '700' },
  { tag: t.variableName, color: 'var(--hl-bi)' },
  { tag: t.string, color: 'var(--hl-str)' },
  { tag: t.number, color: 'var(--hl-num)' },
  { tag: t.comment, color: 'var(--hl-cmt)', fontStyle: 'italic' },
  { tag: t.operator, color: 'var(--hl-arr)' },
  { tag: t.meta, color: 'var(--hl-num)' },
]);

export const mermaidSyntaxHighlighting = syntaxHighlighting(mermaidHighlightStyle);
