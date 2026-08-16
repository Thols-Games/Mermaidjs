/**
 * Single source of truth for diagram color palettes.
 * Contains 5 categorical color palettes (default, sunset, ocean, forest, mono).
 * Each palette provides:
 *   - `seq`: 10 index-based color objects { fill, text } for Sequence, Class, ER diagrams.
 *   - `flow`: 8 depth-based color objects { fill, text } for Flowcharts and State diagrams.
 */

export const PALETTES = {
  default: {
    seq: [
      { fill: '#e2795b', text: '#ffffff' },
      { fill: '#8b7ff0', text: '#ffffff' },
      { fill: '#3fb8af', text: '#ffffff' },
      { fill: '#e2a23b', text: '#1a1a1a' },
      { fill: '#5b9fe2', text: '#ffffff' },
      { fill: '#5cb896', text: '#ffffff' },
      { fill: '#d36ba1', text: '#ffffff' },
      { fill: '#7d8cf0', text: '#ffffff' },
      { fill: '#e2824a', text: '#ffffff' },
      { fill: '#5bc0de', text: '#1a1a1a' }
    ],
    flow: [
      { fill: '#8b7ff0', text: '#ffffff' },
      { fill: '#e2795b', text: '#ffffff' },
      { fill: '#3fb8af', text: '#ffffff' },
      { fill: '#e2a23b', text: '#1a1a1a' },
      { fill: '#5b9fe2', text: '#ffffff' },
      { fill: '#5cb896', text: '#ffffff' },
      { fill: '#d36ba1', text: '#ffffff' },
      { fill: '#7d8cf0', text: '#ffffff' }
    ]
  },
  sunset: {
    seq: [
      { fill: '#f43f5e', text: '#ffffff' },
      { fill: '#eab308', text: '#1a1a1a' },
      { fill: '#8b5cf6', text: '#ffffff' },
      { fill: '#f97316', text: '#ffffff' },
      { fill: '#a855f7', text: '#ffffff' },
      { fill: '#dc2626', text: '#ffffff' },
      { fill: '#f59e0b', text: '#1a1a1a' },
      { fill: '#6366f1', text: '#ffffff' },
      { fill: '#ec4899', text: '#ffffff' },
      { fill: '#fb923c', text: '#1a1a1a' }
    ],
    flow: [
      { fill: '#f43f5e', text: '#ffffff' },
      { fill: '#eab308', text: '#1a1a1a' },
      { fill: '#8b5cf6', text: '#ffffff' },
      { fill: '#f97316', text: '#ffffff' },
      { fill: '#a855f7', text: '#ffffff' },
      { fill: '#dc2626', text: '#ffffff' },
      { fill: '#6366f1', text: '#ffffff' },
      { fill: '#ec4899', text: '#ffffff' }
    ]
  },
  ocean: {
    seq: [
      { fill: '#0284c7', text: '#ffffff' },
      { fill: '#f43f5e', text: '#ffffff' },
      { fill: '#f59e0b', text: '#1a1a1a' },
      { fill: '#7c3aed', text: '#ffffff' },
      { fill: '#10b981', text: '#ffffff' },
      { fill: '#06b6d4', text: '#1a1a1a' },
      { fill: '#fb7185', text: '#ffffff' },
      { fill: '#1e40af', text: '#ffffff' },
      { fill: '#34d399', text: '#1a1a1a' },
      { fill: '#c084fc', text: '#ffffff' }
    ],
    flow: [
      { fill: '#0284c7', text: '#ffffff' },
      { fill: '#f43f5e', text: '#ffffff' },
      { fill: '#f59e0b', text: '#1a1a1a' },
      { fill: '#7c3aed', text: '#ffffff' },
      { fill: '#10b981', text: '#ffffff' },
      { fill: '#06b6d4', text: '#1a1a1a' },
      { fill: '#fb7185', text: '#ffffff' },
      { fill: '#1e40af', text: '#ffffff' }
    ]
  },
  forest: {
    seq: [
      { fill: '#15803d', text: '#ffffff' },
      { fill: '#ea580c', text: '#ffffff' },
      { fill: '#eab308', text: '#1a1a1a' },
      { fill: '#4f46e5', text: '#ffffff' },
      { fill: '#b91c1c', text: '#ffffff' },
      { fill: '#65a30d', text: '#ffffff' },
      { fill: '#be185d', text: '#ffffff' },
      { fill: '#854d0e', text: '#ffffff' },
      { fill: '#0284c7', text: '#ffffff' },
      { fill: '#d97706', text: '#ffffff' }
    ],
    flow: [
      { fill: '#15803d', text: '#ffffff' },
      { fill: '#ea580c', text: '#ffffff' },
      { fill: '#eab308', text: '#1a1a1a' },
      { fill: '#4f46e5', text: '#ffffff' },
      { fill: '#b91c1c', text: '#ffffff' },
      { fill: '#65a30d', text: '#ffffff' },
      { fill: '#be185d', text: '#ffffff' },
      { fill: '#854d0e', text: '#ffffff' }
    ]
  },
  mono: {
    seq: [
      { fill: '#4338ca', text: '#ffffff' },
      { fill: '#f43f5e', text: '#ffffff' },
      { fill: '#6366f1', text: '#ffffff' },
      { fill: '#d946ef', text: '#ffffff' },
      { fill: '#6b21a8', text: '#ffffff' },
      { fill: '#ec4899', text: '#ffffff' },
      { fill: '#581c87', text: '#ffffff' },
      { fill: '#e11d48', text: '#ffffff' },
      { fill: '#7e22ce', text: '#ffffff' },
      { fill: '#fb7185', text: '#ffffff' }
    ],
    flow: [
      { fill: '#4338ca', text: '#ffffff' },
      { fill: '#f43f5e', text: '#ffffff' },
      { fill: '#6366f1', text: '#ffffff' },
      { fill: '#d946ef', text: '#ffffff' },
      { fill: '#6b21a8', text: '#ffffff' },
      { fill: '#ec4899', text: '#ffffff' },
      { fill: '#581c87', text: '#ffffff' },
      { fill: '#e11d48', text: '#ffffff' }
    ]
  }
};

export function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function badgeTint(hex, isDarkTheme = false) {
  return withAlpha(hex, isDarkTheme ? 0.30 : 0.14);
}

export function getSeqPalette(name = 'default', isReversed = false) {
  const p = PALETTES[name] || PALETTES['default'];
  const list = [...p.seq];
  return isReversed ? list.reverse() : list;
}

export function getFlowPalette(name = 'default', isReversed = false) {
  const p = PALETTES[name] || PALETTES['default'];
  const list = [...p.flow];
  return isReversed ? list.reverse() : list;
}

// ─── Palette state accessors ────────────────────────────────────────────────
// Hosted here (a dependency-free leaf module) so neither editor.js nor
// renderer.js needs to import the other solely to read the active palette —
// this breaks the editor.js ⇄ renderer.js circular import.
export function currentPaletteName() {
  const selectEl = document.getElementById('colorPaletteSelect');
  return selectEl ? selectEl.value : 'default';
}

export function isPaletteReversed() {
  const toggle = document.getElementById('paletteReverseToggle');
  return toggle ? toggle.checked : false;
}

if (typeof window !== 'undefined') {
  window.PALETTES = PALETTES;
  window.withAlpha = withAlpha;
  window.badgeTint = badgeTint;
  window.getSeqPalette = getSeqPalette;
  window.getFlowPalette = getFlowPalette;
  window.currentPaletteName = currentPaletteName;
  window.isPaletteReversed = isPaletteReversed;
}
