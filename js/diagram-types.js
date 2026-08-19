/**
 * Single source of truth for valid Mermaid diagram types and aliases.
 */
export const VALID_DIAGRAM_TYPES = [
  'flowchart', 'graph', 'sequenceDiagram', 'sequence', 'sequenciediagram',
  'classDiagram', 'class', 'stateDiagram-v2', 'stateDiagram', 'state',
  'erDiagram', 'er', 'gantt', 'pie', 'gitGraph', 'mindmap', 'quadrantChart',
  'timeline', 'zenuml', 'requirementDiagram', 'sankey-beta', 'block-beta',
  'architecture-beta', 'C4Context', 'kanban', 'xychart-beta', 'packet-beta'
];

/**
 * Single source of truth for permitted/allowed Mermaid diagram types.
 * Only types included here will be loaded into the diagram type dropdown
 * and code editor autocomplete. Restricted strictly to: sequence, class,
 * flowchart, state, er.
 */
export const ALLOWED_DIAGRAM_TYPES = [
  'none', 'flowchart', 'sequenceDiagram', 'sequence', 'classDiagram', 'class',
  'stateDiagram-v2', 'stateDiagram', 'state', 'erDiagram', 'er'
];

/**
 * Helper function to check whether a given diagram type key or object is allowed.
 */
export function isDiagramTypeAllowed(key, diagramObj) {
  const allowed = ALLOWED_DIAGRAM_TYPES;

  if (!allowed || !Array.isArray(allowed)) return true;

  const allowedLower = allowed.map(t => String(t).toLowerCase());
  const srcKeyword = diagramObj && diagramObj.src
    ? diagramObj.src.trim().replace(/^---[\s\S]*?---\s*/, '').split(/[\s\n\({]/)[0].toLowerCase()
    : '';

  const kLower = String(key || '').toLowerCase();
  if (kLower === 'none') return true;

  return allowedLower.some(t => {
    return t === kLower ||
      (srcKeyword && (t === srcKeyword || srcKeyword.startsWith(t))) ||
      (kLower === 'sequence' && (t === 'sequencediagram' || t === 'sequence')) ||
      (kLower === 'class' && (t === 'classdiagram' || t === 'class')) ||
      (kLower === 'state' && (t === 'statediagram' || t === 'statediagram-v2' || t === 'state')) ||
      (kLower === 'er' && (t === 'erdiagram' || t === 'er')) ||
      (kLower === 'quadrant' && (t === 'quadrantchart' || t === 'quadrant')) ||
      (kLower === 'requirement' && (t === 'requirementdiagram' || t === 'requirement')) ||
      (kLower === 'c4' && (t === 'c4context' || t === 'c4')) ||
      (kLower === 'architecture' && (t === 'architecture-beta' || t === 'architecture')) ||
      (kLower === 'block' && (t === 'block-beta' || t === 'block')) ||
      (kLower === 'packet' && (t === 'packet-beta' || t === 'packet')) ||
      (kLower === 'sankey' && (t === 'sankey-beta' || t === 'sankey')) ||
      (kLower === 'ishikawa' && (t === 'mindmap' || t === 'ishikawa'));
  });
}

if (typeof window !== 'undefined') {
  window.VALID_DIAGRAM_TYPES = VALID_DIAGRAM_TYPES;
  window.ALLOWED_DIAGRAM_TYPES = ALLOWED_DIAGRAM_TYPES;
  window.isDiagramTypeAllowed = isDiagramTypeAllowed;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VALID_DIAGRAM_TYPES, ALLOWED_DIAGRAM_TYPES, isDiagramTypeAllowed };
}
