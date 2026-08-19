/**
 * CodeMirror autocomplete subsystem (replaces legacy js/autocomplete.js).
 *
 * Offers context-aware autocompletions:
 *  - On empty/header lines: offers completions from DIAGRAMS. Selecting one
 *    replaces the document with that diagram's template and updates the dropdown.
 *  - In diagram bodies: offers keyword snippets with tabstops, context-aware
 *    position completions (e.g. note left of/right of/over), and participant aliases.
 */

import { autocompletion, completionKeymap, startCompletion, snippet } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import { DIAGRAMS } from './diagrams.js';
import { isDiagramTypeAllowed } from './diagram-types.js';

/**
 * Catalog of diagram-body keywords exposed by autocomplete. Each entry expands
 * to a snippet (via @codemirror/autocomplete's `snippet`) so tab-stops/placeholders
 * are filled in. `${name}` markers become editable fields the user tabs through.
 */
const DIAGRAM_KEYWORDS = [
  // Sequence diagram
  { label: 'loop', snippet: 'loop ${name}\nend', detail: 'Sequence · loop block' },
  { label: 'alt', snippet: 'alt ${description}\nend', detail: 'Sequence · alt block' },
  { label: 'opt', snippet: 'opt ${description}\nend', detail: 'Sequence · opt block' },
  { label: 'par', snippet: 'par ${description}\nend', detail: 'Sequence · par block' },
  { label: 'rect', snippet: 'rect ${#f9f} ${description}\nend', detail: 'Sequence · rect block' },
  { label: 'participant', snippet: 'participant ${Alice}', detail: 'Sequence · actor' },
  { label: 'actor', snippet: 'actor ${Bob}', detail: 'Sequence · actor' },
  { label: 'note', snippet: 'note', detail: 'Sequence · note (keyword)' },
  { label: 'note left of', snippet: 'note left of ${name}: ${text}', detail: 'Sequence · note left of' },
  { label: 'note right of', snippet: 'note right of ${name}: ${text}', detail: 'Sequence · note right of' },
  { label: 'note over', snippet: 'note over ${name}: ${text}', detail: 'Sequence · note over' },
  { label: 'autonumber', snippet: 'autonumber', detail: 'Sequence · show numbers' },
  { label: 'end', snippet: 'end', detail: 'Sequence · close block' },
  // Flowchart
  { label: 'subgraph', snippet: 'subgraph ${title}\nend', detail: 'Flowchart · subgraph' },
  { label: 'direction', snippet: 'direction ${TB}', detail: 'Flowchart · direction' },
  { label: 'classDef', snippet: 'classDef ${name} fill:${#fff},stroke:${#333}', detail: 'Flowchart · style class' },
  { label: 'class', snippet: 'class ${id} ${className}', detail: 'Flowchart · assign class' },
  { label: 'style', snippet: 'style ${id} fill:${#fff},stroke:${#333}', detail: 'Flowchart · inline style' },
  { label: 'click', snippet: 'click ${id} ${"https://example.com"}', detail: 'Flowchart · click action' },
  // State
  { label: 'state', snippet: 'state ${id} ${"Label"}', detail: 'State · state node' },
  // Class
  { label: 'classDiagram', snippet: 'classDiagram', detail: 'Class · diagram header' },
  { label: 'class', snippet: 'class ${Animal} {\n  +${name}\n}', detail: 'Class · class body' },
  // ER
  { label: 'erDiagram', snippet: 'erDiagram', detail: 'ER · diagram header' },
  { label: 'entity', snippet: '${ENTITY} {\n  ${id} ${int}\n}', detail: 'ER · entity' },
  { label: 'relationship', snippet: '${A} ||--o{ ${B} : ${label}', detail: 'ER · relationship' },
];

// Selected from the tooltip: load the diagram's full template into the editor
// and sync the diagram-type <select> (mirrors legacy selectAutocompleteItem).
function loadDiagramIntoEditor(view, key) {
  const diag = DIAGRAMS[key];
  if (!diag) return;
  const src = (diag.src ? diag.src : '') + '\n';

  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: src },
    selection: { anchor: src.length },
  });

  const elType = document.getElementById('diagramType');
  if (elType) {
    elType.value = key;
    elType.dispatchEvent(new Event('change'));
  }
}

function diagramTypeSource(context) {
  const docText = context.state.doc.toString();
  // Only meaningful on the header line (single line, no whitespace) — this is
  // where the user types the diagram type. A space means they've moved on to the
  // body, so we stop offering completions (and avoid hijacking Enter).
  if (docText.includes('\n') || /\s/.test(docText.trim())) return null;

  const prefix = docText.trim().toLowerCase();
  const allowedKeys = Object.keys(DIAGRAMS).filter(k =>
    k !== 'none' && isDiagramTypeAllowed(k) && k.toLowerCase().startsWith(prefix)
  );
  if (allowedKeys.length === 0) return null;

  return {
    from: 0,
    to: context.state.doc.length,
    options: allowedKeys.map(key => ({
      label: key,
      displayLabel: DIAGRAMS[key].label,
      type: 'keyword',
      apply: (view, _completion, _from, _to) => loadDiagramIntoEditor(view, key),
    })),
  };
}

/**
 * Catalog of position phrases allowed after a `note` keyword in sequence diagrams.
 * Only these position completions are offered once `note ` has been typed.
 */
const NOTE_POSITION_KEYWORDS = [
  { label: 'left of', snippet: 'left of ${name}: ${text}', detail: 'Sequence · note left of' },
  { label: 'right of', snippet: 'right of ${name}: ${text}', detail: 'Sequence · note right of' },
  { label: 'over', snippet: 'over ${name}: ${text}', detail: 'Sequence · note over' },
];

/**
 * Body-keyword completion: offers diagram keywords (loop, alt, participant, …)
 * while typing inside the diagram body. Each completion expands to a snippet:
 * e.g. `loop` → `loop ${name}\nend` with the `name` placeholder selected.
 *
 * If the line up to the cursor begins with `note ` (or `Note `), it restricts
 * completions strictly to `left of`, `right of`, and `over`.
 *
 * Active only on body lines (a line that contains whitespace or follows a
 * newline). The single whitespace-free header line is owned by diagramTypeSource.
 */
function keywordSource(context) {
  const docText = context.state.doc.toString();
  // Leave the single header line (no whitespace, no newline) to diagramTypeSource.
  if (!docText.includes('\n') && !/\s/.test(docText.trim())) return null;

  const line = context.state.doc.lineAt(context.pos);
  const textBefore = line.text.slice(0, context.pos - line.from);

  // If the line up to the cursor begins with a `note` keyword followed by whitespace,
  // offer ONLY note-position completions: `left of`, `right of`, `over`.
  const noteMatch = textBefore.match(/^(\s*note\s+)(.*)$/i);
  if (noteMatch) {
    const afterNote = noteMatch[2];
    // If the note statement already contains a colon or a completed position phrase followed by whitespace, stop.
    if (afterNote.includes(':') || /^(?:left\s+of|right\s+of|over)\s+/i.test(afterNote)) {
      return null;
    }
    const prefix = afterNote.toLowerCase();
    const from = line.from + noteMatch[1].length;
    const options = NOTE_POSITION_KEYWORDS
      .filter(k => k.label.toLowerCase().startsWith(prefix))
      .map(k => ({
        label: k.label,
        detail: k.detail,
        type: 'keyword',
        apply: snippet(k.snippet),
      }));
    if (options.length === 0) return null;
    return { from, to: context.pos, options };
  }

  // Word currently being typed at the cursor (letters/digits/underscore only).
  // Only offer completions while an identifier is being typed; this avoids
  // noisy popups after every space/arrow in the diagram body.
  const word = context.matchBefore(/[\w]+/);
  if (!word || word.text.length === 0) return null;
  const from = word.from;
  const prefix = word.text.toLowerCase();

  const options = DIAGRAM_KEYWORDS
    .filter(k => k.label.toLowerCase().startsWith(prefix))
    .map(k => ({
      label: k.label,
      detail: k.detail,
      type: 'keyword',
      apply: snippet(k.snippet),
    }));

  if (options.length === 0) return null;

  return { from, to: context.pos, options };
}

export const cmAutocomplete = [
  autocompletion({ override: [diagramTypeSource, keywordSource], activateOnTyping: true, icons: false }),
  EditorView.domEventHandlers({
    focus: (event, view) => {
      const text = view.state.doc.toString();
      if (!text.includes('\n') && !/\s/.test(text.trim())) {
        startCompletion(view);
      }
    },
  }),
];

// completionKeymap is merged into the main keymap in cm-editor.js (before
// defaultKeymap) so Enter/Tab accept a completion only while one is active.
export { completionKeymap };
