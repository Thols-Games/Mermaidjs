# Mermaid Diagram Explorer — Refactor & Maintenance Notes

A client-side web application wrapping **Mermaid 11.16.0** (`mermaid-11.16.0/package/dist/`) into a clean, modern visual diagram editor / IDE.

Runtime is pure vanilla JS + native ES Modules (ESM) and CSS. There is no heavy framework or build step. `serve.mjs` is a zero-dependency static file server.

## How to run

```bash
node serve.mjs            # serves on http://localhost:5505
```

Then open `http://localhost:5505/`.

## How to test

The project has a comprehensive Playwright test suite under `tests/` (organized in per-feature subfolders with configuration in `playwright.config.js`). The configuration auto-starts the static server on port 5505.

```bash
npx playwright test --project=chromium          # fast: Chromium browser (43/43 tests green)
npx playwright test                              # all 3 browsers (chromium/firefox/webkit)
npx playwright test tests/zoom-pan/zoom-pan.spec.js   # a single spec file
```

## Module Layout & Architecture

The codebase follows a modular architecture cleanly separating HTML markup, CSS styling, and ES modules:

```
index.html              → Clean HTML5 semantic markup (references css/styles.css & js/app.js)
Config.js               → Bootstrap configuration (allowed diagram types)
mermaid-11.16.0/        → Vendored Mermaid 11.16.0 dist (mermaid.esm.min.mjs)
css/
  └── styles.css        → Complete unified application stylesheet (layout, theme tokens, panels, editor, modals)
js/
  ├── app.js            → Main controller: DOM event bindings, keyboard shortcuts, Mermaid init
  ├── ui.js             → UI interactions, panel toggles, snippets drawer, autocomplete, export modal, selection sync
  ├── editor.js         → Syntax highlighter (syncLocalHL, updateTextareaActiveBg, buildAliasColorMap), gutter numbering, error parsing
  ├── palettes.js       → Central color palette engine (PALETTES, getSeqPalette, getFlowPalette, badgeTint)
  ├── renderer.js       → Diagram rendering engine (renderOne), SVG colorizers, style/font/thickness applicators
  ├── zoom-pan.js       → Diagram scale, pan offsets, drag-panning, and zoom controls (+ / - / fit / wheel)
  ├── auto-fix.js       → Auto-fix syntax repair & participant alias auto-alignment engine
  ├── diagram-types.js  → Single source of truth for VALID_DIAGRAM_TYPES, ALLOWED_DIAGRAM_TYPES & isDiagramTypeAllowed
  ├── diagrams.js       → Catalog of starter example diagrams (DIAGRAMS)
  └── validators/       → Sequence, flowchart, and class diagram syntax validators
export-modal/           → Standalone export modal prototype component (reference only)
serve.mjs               → Zero-dependency static server (http://localhost:5505)
```

## Key Technical Features

1. **Modular Architecture**: Clean separation between semantic HTML in `index.html`, stylesheet rules in `css/styles.css`, and specialized ES modules in `js/`.
2. **Diagram Type Control**: Single source of truth for diagram types in `js/diagram-types.js` (`VALID_DIAGRAM_TYPES` & `ALLOWED_DIAGRAM_TYPES`), filtering dropdown options and editor autocomplete suggestions.
3. **Bi-Directional Selection Sync**: Interactive SVG node/actor/message selection in the preview pane syncs cursor position and line selection in the code editor, highlighting sequence diagram elements with green bounding box `#diagram-selection-box`.
4. **Pure CSS Variable Active Line Highlighter (`#textareaActiveBg`)**: Unified active line highlight bar styled with `calc(0.6rem + var(--line-index, 0) * var(--editor-line-height, 20px))`. Scales fluidly in 1:1 real-time sync with text font size slider (`#textSizeSlider`) without layout drift or double-bar duplication.
5. **Universal Cursor Tracking**: Omnipresent cursor line synchronization across keyboard navigation (`keydown`, `keyup`), mouse selection (`click`, `mouseup`, `select`, `focus`), scrolling (`scroll`), and SVG element clicks.
6. **Syntax Diagnostics & Auto-Fix**: Real-time syntax validation with line gutter indicators (red errors / amber warnings) and automated fixes.
7. **Zoom & Pan Engine**: Smooth canvas drag panning, scroll-wheel zoom, and scale controls (fit to screen, 25%–500% zoom).
8. **Multi-Theme Design**: Integrated dark/teal/light themes with customizable diagram stroke styles (sharp, rounded, pill), fonts, and stroke widths.
9. **Code Editor Syntax Highlighting**: Real-time local syntax tokenizer overlay (`#hlLayer`, `syncLocalHL`, `highlightLine`) decorating keywords, built-in statements, strings, numbers, connector arrows, and comments.
10. **Actor/Alias Token Color Synchronization**: Actor names and aliases in code editor lines dynamically match the exact SVG diagram lane colors (`buildAliasColorMap`).
11. **Text Size Control**: Header icon button (`#textSizeBtn`) with slider (`#textSizeSlider`) for dynamic font-size adjustment (10px–24px) with instant gutter & syntax re-sync.
12. **Multi-Palette Engine (`PALETTES`)**: 5 categorical palettes (`default`, `sunset`, `ocean`, `forest`, `mono`), Palette Picker buttons, and Reverse Palette Toggle in the Theme Panel.

## Verifying Changes

After making changes, run the Playwright test suite to confirm 100% pass:

```bash
npx playwright test --project=chromium
```
