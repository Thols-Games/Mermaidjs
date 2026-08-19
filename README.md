# Mermaid Diagram Explorer — Architecture & Maintenance Notes

A client-side web application wrapping **Mermaid 11.16.0** (`mermaid-11.16.0/package/dist/`) into a clean, modern visual diagram editor / IDE.

Runtime is pure vanilla JS + native ES Modules (ESM) and CSS. There is no heavy framework or build step. `serve.mjs` is a zero-dependency static file server.

## How to run

```bash
node serve.mjs            # serves on http://localhost:5505
```

Then open `http://localhost:5505/`.

> Note: The former `Config.js` bootstrap (which could set `window.CONFIG.allowedDiagramTypes`) has been removed; `js/diagram-types.js` is now the single source of truth for allowed diagram types. The five split stylesheets (`main.css`, `theme.css`, `editor.css`, `ui.css`, `diagram.css`) are the only stylesheets linked in `index.html` — there is no legacy `css/styles.css` reference.

## How to test

The project has a comprehensive Playwright test suite under `tests/` (organized in per-feature subfolders; configuration in `playwright.config.js`). The configuration auto-starts the static server on port 5505.

```bash
npx playwright test --project=chromium          # Chromium only (fast; config defines a single project)
npx playwright test tests/zoom-pan/zoom-pan.spec.js   # a single spec file
```

> The Playwright config (`playwright.config.js`) declares only the **chromium** project. The previous "all 3 browsers" command is no longer valid — to run Firefox/WebKit, add those projects to `playwright.config.js`.

## Module Layout & Architecture

The codebase follows a modular architecture cleanly separating HTML markup, CSS styling, and ES modules:

```
index.html              → Clean HTML5 semantic markup (references css/*.css & js/app.js)
mermaid-11.16.0/        → Vendored Mermaid 11.16.0 dist (mermaid.esm.min.mjs)
css/
  ├── main.css          → App shell layout, preview canvas, panels, toolbar, export modal
  ├── theme.css         → Theme tokens + dark / teal / light theme variants
  ├── editor.css        → Code editor: gutter, textarea, highlight layer, active line bar
  ├── ui.css            → UI widgets: snippets, shape palette, theme panel, toggles, tooltips
  └── diagram.css       → Diagram-specific decoration (selection box, inline color pickers)
js/
  ├── app.js            → Main controller: DOM event bindings, keyboard shortcuts, Mermaid init, diagram history
  ├── dom.js            → Shared document helpers (PALETTE, contrastText, tint, setInline, replaceOutsideTags)
  ├── ui.js             → UI interactions, panel toggles, snippets drawer, export modal, bi-directional selection sync
  ├── editor.js         → Syntax highlighter (syncLocalHL, highlightLine), gutter numbering, error/warning parsing
  ├── palettes.js       → Central color palette engine (PALETTES, getSeqPalette, getFlowPalette, badgeTint)
  ├── renderer.js       → Diagram rendering engine (renderOne), SVG colorizers, style/font/thickness applicators
  ├── zoom-pan.js       → Diagram scale, pan offsets, drag-panning, and zoom controls (+ / - / fit / wheel)
  ├── auto-fix.js       → Auto-fix syntax repair, participant alias auto-alignment, code formatter
  ├── autocomplete.js   → Diagram-type autocomplete dropdown wired to DIAGRAMS
  ├── diagram-types.js  → Single source of truth for VALID_DIAGRAM_TYPES, ALLOWED_DIAGRAM_TYPES & isDiagramTypeAllowed
  ├── diagrams.js       → Catalog of starter example diagrams (DIAGRAMS)
  └── validators/       → Per-type syntax validation & auto-fix
        ├── sequence-validator.js   → Sequence keyword/alias/block checks + autoFixSequenceCode
        ├── flowchart-validator.js  → Flowchart keyword/arrow checks + autoFixFlowchartCode
        └── class-validator.js      → Class keyword/relationship checks + autoFixClassCode
serve.mjs               → Zero-dependency static server (http://localhost:5505)
tests/                  → Playwright specs (53 spec files / 57 test cases across 10 feature subfolders; see below)
Markdown/               → Documentation/notes assets
```

## Diagram Type Control

`js/diagram-types.js` is the single source of truth:

- `VALID_DIAGRAM_TYPES` — every Mermaid type the highlighter/validator knows about.
- `ALLOWED_DIAGRAM_TYPES` — the restricted set actually offered in the dropdown/autocomplete (sequence, class, flowchart, state, er, plus `none`). This built-in default is the single source of truth (the former `Config.js` override no longer exists).
- `isDiagramTypeAllowed(key, diagramObj)` — determines whether a given example/keyword is permitted, with alias matching (e.g. `sequence` ↔ `sequenceDiagram`, `class` ↔ `classDiagram`).

## Key Technical Features

1. **Modular Architecture**: Clean separation between semantic HTML in `index.html`, stylesheet rules in `css/`, and specialized ES modules in `js/`.
2. **Diagram Type Control**: Single source of truth in `js/diagram-types.js`, filtering dropdown options, snippets, and editor autocomplete suggestions.
3. **Bi-Directional Selection Sync**: Interactive SVG node/actor/message selection in the preview pane syncs cursor position and line selection in the code editor, highlighting elements with green bounding box `#diagram-selection-box` (`ui.js`).
4. **Pure CSS Variable Active Line Highlighter (`#textareaActiveBg`)**: Active line highlight bar positioned via `calc(0.6rem + var(--line-index, 0) * var(--editor-line-height, 20px))`. Scales 1:1 with the text font size slider (`#textSizeSlider`) without layout drift.
5. **Universal Cursor Tracking**: Cursor line synchronization across keyboard (`keydown`/`keyup`), mouse (`click`/`mouseup`/`select`/`focus`), scroll, and SVG element clicks.
6. **Syntax Diagnostics & Auto-Fix**: Real-time syntax validation with line gutter indicators (red errors / amber warnings). Dedicated validators in `js/validators/` cover sequence, flowchart, and class diagrams; `autoFixMermaidCode` repairs typos, unclosed blocks, unbalanced quotes/brackets, and incomplete arrows.
7. **Zoom & Pan Engine** (`zoom-pan.js`): Smooth canvas drag panning, scroll-wheel zoom, and scale controls (fit to screen, 20%–300% zoom).
8. **Multi-Theme Design**: Dark / teal / light themes plus diagram stroke styles (sharp, rounded, pill), fonts, and stroke widths applied via inline `!important` style overrides so they survive Mermaid's async re-render.
9. **Code Editor Syntax Highlighting**: Real-time local syntax tokenizer overlay (`#hlLayer`, `syncLocalHL`, `highlightLine`) decorating keywords, built-in statements, strings, numbers, connector arrows, and comments. Includes incremental re-render (only changed lines are rebuilt) and inline RGB color pickers.
10. **Actor/Alias Token Color Synchronization**: Actor names and aliases in editor lines dynamically match the exact SVG diagram lane colors (`buildAliasColorMap`).
11. **Text Size Control**: Header icon button (`#textSizeBtn`) with slider (`#textSizeSlider`) for dynamic font-size adjustment (10px–24px) with instant gutter & syntax re-sync; persisted to `localStorage`.
12. **Multi-Palette Engine (`PALETTES`)**: 5 categorical palettes (`default`, `sunset`, `ocean`, `forest`, `mono`), Palette Picker, and Reverse Palette Toggle in the Theme Panel.

## Known Gaps / Dead References

There are currently no dangling file references — the five split stylesheets are the only styles used.

## Verifying Changes

After making changes, run the Playwright test suite to confirm it still passes (currently **57 tests / 53 spec files** green on chromium):

```bash
npx playwright test --project=chromium
```
