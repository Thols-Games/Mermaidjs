/**
 * Shared, document-independent helpers used by index.html (and previously
 * duplicated inline).
 *
 * Extracted in Phase 2. These functions do NOT depend on any
 * module-scoped DOM reference (e.g. `elTarget`/`currentSvg`), so they are safe
 * to share. `currentSvg()` is intentionally left inline in each HTML file
 * because it resolves against that document's own `elTarget`.
 */

export const PALETTE = ['#8b7ff0', '#e2795b', '#3fb8af', '#e2a23b', '#5b9fe2', '#5cb896', '#d36ba1', '#7d8cf0', '#e2824a', '#5bc0de', '#a98bd9', '#6abe5c'];

// Inject syntax-highlight token colours explicitly for light and dark themes.
// This strictly separates code editor keyword colours from diagram actor colours.
export function injectHLPaletteColors() {
  const style = document.createElement('style');
  style.id = 'hl-palette-colors';
  style.textContent = [
    `:root, :root.theme-teal {`,
    `  --hl-kw: #c792ea;`,
    `  --hl-bi: #82d4f5;`,
    `  --hl-str: #b5e8a0;`,
    `  --hl-num: #f0a45d;`,
    `  --hl-arr: #35d0c0;`,
    `  --hl-cmt: #46656f;`,
    `}`,
    `:root.theme-light {`,
    `  --hl-kw: #a33f9b;`,
    `  --hl-bi: #0d7ea3;`,
    `  --hl-str: #147a52;`,
    `  --hl-num: #b4560f;`,
    `  --hl-arr: #123c36;`,
    `  --hl-cmt: #8fa9a5;`,
    `}`,
    `.hl-keyword { color: var(--hl-kw); font-weight:700; }`,
    `.hl-builtin { color: var(--hl-bi); }`,
    `.hl-string  { color: var(--hl-str); }`,
    `.hl-number  { color: var(--hl-num); }`,
    `.hl-arrow   { color: var(--hl-arr); }`,
    `.hl-comment { color: var(--hl-cmt); font-style:italic; }`,
    `textarea.hl-on { caret-color: var(--hl-kw); }`
  ].join('\n');
  document.head.appendChild(style);
}

export function contrastText(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#1a1a1a' : '#ffffff';
}

// A light translucent tint of `hex` for the pill fill (~18% opacity over white).
export function tint(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.18)`;
}

// A richer tint (~55%) for area-fill shapes (pie slices, gantt bands) where
// a pale tint would read as blank — they need to read as coloured regions.
export function tintStrong(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.55)`;
}

// Set/merge inline style props with !important on an element. Inline
// !important beats stylesheet rules, so these survive mermaid's async
// post-render theme re-injection (which clobbers any <style> we add).
export function setInline(el, props) {
  const keep = (el.getAttribute('style') || '')
    .split(';').map(s => s.trim()).filter(Boolean)
    .filter(s => !Object.keys(props).some(k => s.toLowerCase().startsWith(k.toLowerCase() + ':')));
  for (const [k, v] of Object.entries(props)) keep.push(`${k}:${v}!important`);
  el.setAttribute('style', keep.join(';'));
}

// Replace `regex` with `replacement` only in text nodes (not inside HTML tags).
export function replaceOutsideTags(html, regex, replacement) {
  return html.split(/(<[^>]*>)/).map((part, i) =>
    i % 2 === 0 ? part.replace(regex, replacement) : part
  ).join('');
}

if (typeof window !== 'undefined') {
  window.PALETTE = PALETTE;
  window.injectHLPaletteColors = injectHLPaletteColors;
  window.contrastText = contrastText;
  window.tint = tint;
  window.tintStrong = tintStrong;
  window.setInline = setInline;
  window.replaceOutsideTags = replaceOutsideTags;
}
