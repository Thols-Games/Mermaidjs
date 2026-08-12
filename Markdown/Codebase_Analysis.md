# Mermaid Diagram Explorer — Codebase Analysis

The **Mermaid Diagram Explorer** is a client-side web application for creating, editing, rendering, validating, and exporting Mermaid diagrams. It combines a text code editor (with real-time local syntax highlighting, token-to-diagram color synchronization, and line gutter diagnostics) with a dynamic SVG preview surface, syntax diagnostics/auto-fix, bi-directional diagram↔editor selection, custom styling/themes, zoom/pan controls, and SVG export.

---

## 1. Project Architecture & Directory Structure

```
Mermaid/
├── index.html                   # Semantic HTML5 markup (loads css/styles.css & js/app.js)
├── Config.js                    # Classic <script>; defines global CONFIG.allowedDiagramTypes
├── serve.mjs                    # Zero-dependency ESM HTTP static server (:5505)
├── package.json                 # Dev dependencies & scripts
├── playwright.config.js         # End-to-end Playwright test suite configuration
├── css/
│   └── styles.css               # Complete unified application stylesheet
├── js/                          # Modular ES Modules
│   ├── app.js                   # Main application controller & event wiring
│   ├── ui.js                    # UI panels, snippet drawer, autocomplete, export modal & node selection sync
│   ├── editor.js                # Local syntax highlighter (syncLocalHL, highlightLine, buildAliasColorMap), gutter numbering, error parsing
│   ├── palettes.js              # Central color palette engine (PALETTES, getSeqPalette, getFlowPalette, badgeTint)
│   ├── renderer.js              # Diagram rendering engine (renderOne), SVG colorizers, style/font/thickness applicators
│   ├── zoom-pan.js              # Diagram transform scale, pan offsets, drag-panning, and zoom controls
│   ├── auto-fix.js              # Auto-fix syntax repair & participant alias auto-alignment formatters
│   ├── diagram-types.js         # VALID_DIAGRAM_TYPES, ALLOWED_DIAGRAM_TYPES, & isDiagramTypeAllowed
│   ├── diagrams.js              # DIAGRAMS catalog for diagram type dropdown, snippets, & autocomplete
│   └── validators/              # Diagram-specific syntax validators
│       ├── flowchart-validator.js
│       ├── sequence-validator.js
│       └── class-validator.js
├── export-modal/                # Standalone prototype component (reference only)
├── mermaid-11.16.0/             # Vendored Mermaid 11.16.0 ESM library (mermaid.esm.min.mjs)
├── tests/                       # Playwright test specs (43 specs, 100% green pass rate)
└── Markdown/                    # Project documentation & guides
```

---

## 2. Core Technical Components

### A. Main Application Controller (`js/app.js`)
- **Main Controller & Event Wiring**: Serves as the primary entry point loaded by `index.html`.
- **Mermaid Initialization**: Initializes `mermaid-11.16.0` dist with loose security levels, start-on-load disabled, and dark/light configuration.
- **DOM Event Listeners & Shortcuts**: Wires global keyboard shortcuts (`Ctrl+Enter` to render, `Ctrl+/` to toggle comments), diagram dropdown changes (`#diagramType`), theme toggle, auto-fix button triggers, and reset example loaders.
- **Editor Header Action Controls**: Wires `#textSizeBtn`, `#textSizeSlider` (dynamic `--editor-font-size` & `--editor-line-height`), `#copyBtn` (with visual feedback), and `#clearBtn` (with `syncLocalHL` overlay clearing).
- **Syntax Palette Injection**: Calls `injectHLPaletteColors()` on startup and palette changes to keep editor syntax colors synchronized with active palette choices.

### B. User Interface, Panels & Interactive Selection Sync (`js/ui.js`)
- **Panel Management**: Controls visibility and toggle states for Settings, Theme, Shapes, and Snippets drawer panels.
- **Snippet Drawer & Autocomplete Engine**: Renders category-grouped snippet grids for active diagram types and drives the live code editor autocomplete suggestion popup.
- **Palette Picker & Theme Controls**: Renders palette buttons (`Default`, `Sunset`, `Ocean`, `Forest`, `Mono`), Reverse Palette toggle, diagram stroke options (sharp, rounded, pill), stroke thickness sliders, and font selectors.
- **Bi-Directional Selection Sync**: Listens for clicks on SVG diagram nodes/actor lifelines, extracting metadata to automatically highlight the corresponding line and set cursor position in the code editor.
- **Export Modal & Resizer**: Drives PNG/SVG/PDF export modal workflows and draggable editor column resizing handle.

### C. Code Editor Syntax Highlighting & Line Architecture (`js/editor.js`)
- **`syncLocalHL()`**: Synchronizes syntax highlight overlay layer (`#hlLayer`) with `<textarea id="source">`, syncing scroll position (`scrollTop`, `scrollLeft`) and line numbers.
- **`highlightLine(line, actorColorMap)`**: Tokenizes keywords, built-in statements, strings, numbers, connector arrows, and comments.
- **`buildAliasColorMap(sourceText, seqPalette)`**: Maps sequence diagram participant aliases to their assigned SVG palette colors so editor code tokens match rendered diagram shapes.
- **Unified Block Line Architecture (`.hl-line`)**: Renders every line inside `<div class="hl-line">` sharing identical `display: block`, `height: var(--editor-line-height)`, and `line-height: var(--editor-line-height)` rules with `.gutter span`. Active line highlights (`.hl-active-line`) and error highlights (`.hl-error-line`) scale in 1-to-1 lockstep vertically and horizontally.

### D. Configuration & Diagram Type Control (`js/diagram-types.js` & `Config.js`)
- **Config.js**: Bootstrap script exposing `CONFIG.allowedDiagramTypes`.
- **js/diagram-types.js**: `VALID_DIAGRAM_TYPES` (all 27 valid syntax keywords) and `ALLOWED_DIAGRAM_TYPES` (permitted diagram types: `sequence`, `class`, `flowchart`, `state`, `er`). Includes `isDiagramTypeAllowed(key, diagramObj)` to dynamically filter settings dropdowns and autocomplete suggestions.
- **js/diagrams.js**: Starter diagram catalog (`DIAGRAMS`).

### E. Palette Engine & SVG Colorization (`js/palettes.js` & `js/renderer.js`)
- **js/palettes.js**: `PALETTES` dictionary providing 5 categorical color palettes (`default`, `sunset`, `ocean`, `forest`, `mono`). Exposes `seq` (10 index-based colors) and `flow` (8 depth-based colors) contrast objects `{ fill, text }` and `badgeTint(hex, isDarkTheme)` helper.
- **js/renderer.js**: `renderOne()` renders Mermaid code into SVG and applies post-processing colorizers (`colorizeSequence`, `colorizeClass`, `colorizeDiagram`, `colorizeFlowchart`) and stroke style applicators (`applyDiagramStyle`, `applyDiagramFont`, `applyDiagramThickness`).

### F. Syntax Validation & Auto-Fix Engine (`js/auto-fix.js` & `js/validators/`)
- **js/validators/**: Dedicated syntax validators for sequence (`sequence-validator.js`), flowchart (`flowchart-validator.js`), and class diagrams (`class-validator.js`).
- **js/auto-fix.js**: Exports `autoFixMermaidCode` and `formatAndAlignMermaidCode` for automated syntax repair, missing arrow insertion, and participant alias alignment.

### G. Canvas Zoom & Pan Controls (`js/zoom-pan.js`)
- Controls diagram transform scale (`zoomScale`), pan offsets (`panX`, `panY`), drag panning, mousewheel zoom, and canvas control buttons (+ / - / fit).

---

## 3. Automated Testing Suite

- **playwright.config.js** & **tests/**: Comprehensive Playwright end-to-end test suite organized into 10 feature subdirectories (`autofix`, `editor`, `errors`, `loops`, `selection-sync`, `snippets`, `theme`, `ui`, `warnings`, `zoom-pan`).
- All **43 out of 43 tests pass 100% green**.
