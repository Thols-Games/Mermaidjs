# Coloring System — How Color Is Applied to the Editor & Diagrams

This document explains **all** the coloring logic in `mermaid-editor.html` so an agent (or developer) can port it into another project and understand exactly how colors flow from the palette definitions, into the code editor's syntax highlighting, and onto the rendered SVG diagrams.

There are **three independent coloring subsystems**:

1. **Editor syntax highlighting** — colors tokens in the code textarea
2. **Diagram colorization** — post-processes Mermaid's rendered SVG
3. **Palette / theme system** — the color source of truth + canvas/editor theming

---

## Table of Contents

1. [The Palette System (source of truth)](#1-the-palette-system-source-of-truth)
2. [Theme System (canvas + editor backgrounds)](#2-theme-system-canvas--editor-backgrounds)
3. [Editor Syntax Highlighting](#3-editor-syntax-highlighting)
4. [Diagram Colorization (SVG post-processing)](#4-diagram-colorization-svg-post-processing)
5. [The `badgeTint()` Helper](#5-the-badgetint-helper)
6. [Porting Checklist](#6-porting-checklist)

---

## 1. The Palette System (source of truth)

All diagram colors come from the `PALETTES` object. Every palette has **two** color arrays:

| Array | Length | Used by | Coloring strategy |
|-------|--------|---------|-------------------|
| `seq` | 10 | Sequence, Class, ER diagrams | **Index-based** — each entity gets the next color by declaration order |
| `flow` | 8 | Flowcharts, State diagrams | **Depth-based** — BFS depth from root determines color |

```js
const PALETTES = {
  default: {
    seq: [ { fill:'#e2795b', text:'#ffffff' }, ... 10 total ],
    flow: [ { fill:'#8b7ff0', text:'#ffffff' }, ... 8 total ],
  },
  sunset: { seq: [...], flow: [...] },
  ocean:  { seq: [...], flow: [...] },
  forest: { seq: [...], flow: [...] },
  mono:   { seq: [...], flow: [...] },
};
```

**Each color object has two fields:**
- `fill` — the hex color used for fills, borders, strokes, and text
- `text` — the contrast color (`#ffffff` or `#1a1a1a`) for text placed *on* that fill (kept in the palette so text stays legible regardless of fill brightness)

### Palette design philosophy

All palettes (including themed ones) use **distinct categorical hues per slot** — like a pie chart, not a heatmap. Each color is visually different from its neighbours so nodes at different indices or depths read as clearly separate colors, not steps in a smooth ramp.

**Adjacent-color constraint:** No two adjacent slots in any palette may share the same color family. Colors are ordered so each slot's hue is as far as possible from its neighbours on the color wheel — e.g. blue is never next to teal, red is never next to orange, and in the Mono palette blue-end purples strictly alternate with red-end magentas.

The **Default** palette uses a mixed variety of hues. The **themed palettes** (sunset, ocean, forest, mono) pull their distinct hues from real things in that theme:
- **Sunset** — coral, golden yellow, royal purple, burnt orange, dusk lavender, crimson, amber, twilight indigo, hot pink, peach (alternating warm/cool so no two adjacent hues are similar)
- **Ocean** — blue whale, coral fish, sandy shore, sea urchin purple, seaweed, turquoise, krill pink, deep sea, seafoam, jellyfish (no two blues/greens adjacent)
- **Forest** — pine, fox fur, autumn gold, evening sky, maple red, moss, wild berry, bark, blue jay, mushroom (no two greens/browns adjacent)
- **Mono** — deep indigo, pink blossom, electric blue-indigo, hot magenta, muted iris, vivid magenta, plum, deep fuchsia, violet, rose pink (blue-end and red-end purples strictly alternate so neighbours are maximally far apart on the hue wheel)

### Palette selection + reversal

Two getters read the active palette from the UI controls:

```js
function getSeqPalette()   // reads #palettePicker + #paletteReverse checkbox
function getFlowPalette()  // same controls, returns the .flow array
```

If the **Reverse palette** checkbox is on, the array is `.reverse()`d before use.

---

## 2. Theme System (canvas + editor backgrounds)

Themes do **not** change the palette colors — they change the **background** of the canvas and editor, and the **syntax token colors** in the editor. Four themes:

| Theme | Canvas class | Editor class | Description |
|-------|-------------|-------------|-------------|
| **Light** | *(none)* | *(none)* | Default teal-on-white |
| **Dark** | `canvas-dark` | `theme-dark` | Deep navy background |
| **Console** | `canvas-dark` + `canvas-console` | `theme-dark` + `theme-console-bg` | GitHub-dark; layers background-only overrides on Dark |
| **Classic** | `canvas-classic` | `theme-classic` | Original violet/pink/amber; fully independent |

**Key design principle:** Console and Classic are layered differently.
- **Console** = Dark + background-only overrides (shares Dark's text/token colors)
- **Classic** = fully independent (own backgrounds AND own token colors)

The theme also tells **Mermaid itself** to render with `theme: 'dark'` or `theme: 'default'` — this affects default colors on elements our colorizers don't touch.

```js
function applyCanvasTheme() {
  // toggles the CSS classes on #preview-pane and #main
  // calls mermaid.initialize({ theme: isDarkFamily ? 'dark' : 'default' })
}
```

**The theme also affects badge tint strength** — see [§5](#5-the-badgetint-helper).

---

## 3. Editor Syntax Highlighting & Line Architecture

The editor is a `<textarea id="source">` overlaid on top of `<div id="hlLayer" class="hl-layer">`. When local highlighting mode is active (`textarea.hl-on`), the textarea text is invisible (`color: transparent`), while the cursor caret remains visible (`caret-color: var(--text-main)`). The colorized syntax rendered in `#hlLayer` shows through transparently behind the text.

### Unified Block Line Architecture (`.hl-line`)

Every line in `#hlLayer` is rendered inside an explicit `<div class="hl-line">` container sharing the **exact same line-height and height calculation** as `.gutter span`:

```css
.gutter span,
.hl-line {
  display: block;
  height: var(--editor-line-height, 20px);
  line-height: var(--editor-line-height, 20px);
  box-sizing: border-box;
  white-space: pre;
  width: 100%;
}

.hl-line.hl-active-line {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  border-radius: 2px;
}

.hl-line.hl-error-line {
  background: rgba(226, 121, 91, 0.25);
  border-radius: 2px;
}
```

This guarantees that text lines, line highlight boxes, error lines, and gutter line numbers scale in 1-to-1 lockstep vertically and horizontally whenever `--editor-font-size` or `--editor-line-height` changes.

### Tokenization (`highlightLine` & Regex Matching)

The editor tokenizer `highlightLine(line, actorColorMap)` in [js/editor.js](file:///d:/Mermaid/js/editor.js#L65-L89) performs single-pass regex replacement on each line. To prevent corrupting already-inserted HTML tags (such as `<span class="...">`), all replacements run through a `replaceOutsideTags(html, regex, replacement)` helper function.

#### Tokenization Order & Engine:

1. **HTML Escaping (`_escHtml`)**: Converts `&`, `<`, `>` to `&amp;`, `&lt;`, `&gt;` so HTML code within labels renders safely.
2. **Comment Tokenization (`%%`)**: Matches full-line comments (`/^\s*%%.*/`) and wraps them in `<span class="hl-comment">`.
3. **Diagram Keywords (`_DKW`)**: Matches diagram header keywords (`sequenceDiagram`, `flowchart`, `classDiagram`, `stateDiagram-v2`, `erDiagram`, `gantt`, `pie`, `gitGraph`, etc.) and wraps them in `<span class="hl-keyword">`.
4. **Builtin Statements (`_BKW`)**: Matches structural keywords (`participant`, `actor`, `autonumber`, `title`, `subgraph`, `end`, `note`, `alt`, `else`, `opt`, `loop`, `par`, `rect`, etc.) and wraps them in `<span class="hl-builtin">`.
5. **String Literals (`"..."` & `|...|`)**: Matches quoted labels and flowchart pipe strings, wrapping them in `<span class="hl-string">`.
6. **Numbers & Durations (`\b\d+\.?\d*[dw]?\b`)**: Matches integers, decimals, and Gantt time units (`5d`, `2w`), wrapping them in `<span class="hl-number">`.
7. **Connector Arrows (`-->`, `->>`, `==>`, `<-->`, `~~~`)**: Matches connector symbols and wraps them in `<span class="hl-arrow">`.
8. **Actor/Alias Colors**: Scans for actor names in `actorColorMap` and wraps them in `<span style="color: ${hex}; font-weight: 700">`.

```javascript
const _DKW = 'sequenceDiagram|flowchart|graph|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|quadrantChart|timeline|zenuml|requirementDiagram|sankey-beta|block-beta|architecture-beta|C4Context|kanban|xychart-beta|packet-beta';
const _BKW = 'participant|actor|autonumber|title|subgraph|end|note|over|left of|right of|alt|else|opt|loop|par|and|rect|class|style|linkStyle|click|callback|classDef';

export function highlightLine(line, actorColorMap = new Map()) {
  let s = _escHtml(line);

  const cm = s.match(/^(\s*)(%%.*)/);
  if (cm) return cm[1] + '<span class="hl-comment">' + cm[2] + '</span>';

  const safe = (rx, repl) => { s = replaceOutsideTags(s, rx, repl); };

  safe(new RegExp('(^\\s*)(' + _DKW + ')(\\s|$)', 'i'), '$1<span class="hl-keyword">$2</span>$3');
  safe(new RegExp('(\\s|^)(' + _BKW + ')(\\s|$|:|[(])', 'gi'), '$1<span class="hl-builtin">$2</span>$3');
  safe(/"([^"]*?)"/g, '"<span class="hl-string">$1</span>"');
  safe(/\b(\d+\.?\d*[dw]?)\b/g, '<span class="hl-number">$1</span>');
  safe(/(--&gt;&gt;|--&gt;|-&gt;&gt;|-&gt;|==&gt;|&lt;--&gt;|&lt;--|~~~)/g, '<span class="hl-arrow">$1</span>');
  safe(/\|([^|\n]*)\|/g, '|<span class="hl-string">$1</span>|');

  for (const [name, colorObj] of actorColorMap.entries()) {
    if (!name) continue;
    const color = typeof colorObj === 'string' ? colorObj : colorObj.fill;
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    safe(new RegExp('(?<![\\w-])(' + esc + ')(?![\\w-])', 'g'),
      '<span style="color:' + color + ';font-weight:700">$1</span>');
  }

  return s;
}
```

### Token CSS Classes

| Class | CSS Custom Property | Token Type | Example |
|---|---|---|---|
| `.hl-keyword` | `var(--hl-kw)` (`#c792ea` dark / `#a33f9b` light) | Diagram keywords | `sequenceDiagram`, `flowchart` |
| `.hl-builtin` | `var(--hl-bi)` (`#82d4f5` dark / `#0d7ea3` light) | Built-in statements | `participant`, `actor`, `alt`, `loop`, `end` |
| `.hl-string` | `var(--hl-str)` (`#b5e8a0` dark / `#147a52` light) | String literals & labels | `"Message text"`, `|Label|` |
| `.hl-number` | `var(--hl-num)` (`#f0a45d` dark / `#b4560f` light) | Numbers & durations | `100`, `5d`, `2w` |
| `.hl-arrow` | `var(--hl-arr)` (`#35d0c0` dark / `#123c36` light) | Connector arrows | `-->`, `->>`, `==>` |
| `.hl-comment` | `var(--hl-cmt)` (`#46656f` dark / `#8fa9a5` light) | Comments | `%% comment line` |

### Alias ↔ Diagram Color Synchronization (`buildAliasColorMap`)

For **sequence diagrams**, `buildAliasColorMap(sourceText, seqPalette)` maps each participant or actor alias to its assigned `seq` palette color in declaration order — **mirroring exactly what `colorizeSequence()` does on the rendered SVG**.

```javascript
export function buildAliasColorMap(sourceText, seqPalette) {
  const map = new Map();
  if (!sourceText) return map;
  const lines = sourceText.replace(/\r/g, '').split('\n');
  let colorIndex = 0;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return;

    // 1. Check for participant / actor declarations: participant Alice as User
    const declMatch = trimmed.match(/^(?:participant|actor)\s+(?:("[^"]+"|[A-Za-z0-9_]+)\s+as\s+)?("[^"]+"|[A-Za-z0-9_]+)/i);
    if (declMatch) {
      const alias = (declMatch[1] || declMatch[2]).replace(/^"|"$/g, '');
      if (!map.has(alias)) {
        map.set(alias, seqPalette[colorIndex % seqPalette.length]);
        colorIndex++;
      }
    } else {
      // 2. Check for message lines: Alice ->> Bob: Hello
      const msgMatch = trimmed.match(/^("[^"]+"|[A-Za-z0-9_]+)\s*(?:->>|->|-->>|-->|-x|--x|-\)|--\))\s*("[^"]+"|[A-Za-z0-9_]+)/);
      if (msgMatch) {
        const src = msgMatch[1].replace(/^"|"$/g, '');
        const dest = msgMatch[2].replace(/^"|"$/g, '');
        if (!map.has(src)) {
          map.set(src, seqPalette[colorIndex % seqPalette.length]);
          colorIndex++;
        }
        if (!map.has(dest)) {
          map.set(dest, seqPalette[colorIndex % seqPalette.length]);
          colorIndex++;
        }
      }
    }
  });

  return map;
}
```

This guarantees that actor names typed in the code editor and actor lifelines/boxes rendered in the SVG diagram share identical palette colors.

---

## 4. Diagram Colorization (SVG post-processing)

After Mermaid renders the SVG into `#diagram-host`, **five colorizer functions** run in sequence (all are no-ops if the diagram type doesn't match):

```js
async function render() {
  const { svg } = await mermaid.render(id, src);
  hostEl.innerHTML = svg;
  colorizeSequence();      // 1
  colorizeFlowchart();     // 2
  colorizeState(src);      // 3
  colorizeClassDiagram();  // 4
  colorizeER();            // 5
}
```

### Why post-processing instead of Mermaid's theme?

Mermaid embeds a `<style>` block with rules like `#g2 .actor { fill:#ECECFF; }`. **CSS beats presentation attributes**, so setting `fill=""` attributes has no visible effect. The colorizers instead **tag elements with `data-*` attributes and inject their own `<style>` block with `!important`**, which wins over Mermaid's rules.

### Universal pattern (all 5 colorizers)

1. **Find** the diagram's elements via type-specific selectors
2. **Tag** each with a `data-*` attribute carrying its color index/depth/lane
3. **Inject** a `<style id="...">` block with CSS rules keyed off those attributes
4. (Where needed) **Clone SVG markers** per color, since `<marker>` elements render in an isolated context and don't inherit stroke color

---

### 4a. `colorizeSequence()` — Index-based (uses `seq` palette)

**Goal:** Each actor lane gets a distinct color; arrows + message labels match their source actor.

1. **Lane assignment:** Actor `<rect class="actor">` boxes are grouped by their x-centre → distinct columns become `data-lane="0"`, `"1"`, etc. (left-to-right)
2. **Lifelines:** Vertical `<line>` elements (`x1 === x2`) are matched to the nearest actor lane; lifeline y-coords are trimmed to the box edges (because tinted badges are semi-transparent, the hidden overlap behind opaque boxes becomes visible)
3. **Activation bars:** `rect[class^="activation"]` tagged by their owner lane
4. **Arrows + markers:** Message arrowheads are `<marker>` shapes that don't inherit color. So the code **clones** each marker template once per lane, tints it, and repoints every arrow's `marker-start`/`marker-end` to its source-lane clone
5. **Message labels:** Each `text.messageText` is geometrically matched to its arrow (by midpoint x + y proximity) and tagged with the source lane
6. **CSS injection:**
   ```css
   svg [data-lane="0"] { fill:#e2795b!important; stroke:#e2795b!important; }
   svg rect.actor[data-lane="0"] { fill:<14% tint>!important; stroke:#e2795b!important; rx:16px; }
   svg text.actor[data-lane="0"] { fill:#e2795b!important; font-weight:700; }
   svg text.messageText[data-lane="0"] { fill:#e2795b!important; }
   ```

---

### 4b. `colorizeFlowchart()` — Depth-based (uses `flow` palette)

**Goal:** BFS depth-based coloring from root nodes. Each depth level gets a distinct hue from the palette.

1. **Build graph:** Nodes are `g.node[id^="flowchart-"]`. Edges are `path[id^="L-"]` with `LS-<src>` / `LE-<tgt>` classes (classes are reliable since node names can contain hyphens)
2. **BFS depth:** Start from all zero-indegree nodes; disconnected clusters each get their own root
3. **Tag** each node with `data-depth="<d % flow.length>"`
4. **Edge arrowheads:** Same marker-cloning technique as sequence, one clone per depth
5. **Edge labels:** Paired by document order with their edge paths
6. **CSS injection:** Tinted badge fill + colored border + colored label per depth. **Subgraphs/clusters** (`g.cluster rect`) get a neutral violet tint since they're containers, not nodes.

---

### 4c. `colorizeState(sourceText)` — Depth-based (uses `flow` palette)

**Goal:** BFS depth from the `[*]` start state.

State diagrams are special: **Mermaid's SVG doesn't encode source/target on transition edges** (edges are just `id="edge0"`, `"edge1"`...), unlike flowcharts. So this colorizer **parses the raw source text** for `A --> B` lines to rebuild the transition graph.

1. **Parse source** for `[\w.]+|\[\*\]` → `[\w.]+|\[\*\]` transitions
2. **BFS** from all states that `[*]` transitions *to*
3. Exclude `[*]` pseudo-states (rendered as `state-start`/`state-end` solid dots) from coloring
4. Transition edge paths are paired by declaration order (edges render in source order)
5. Marker cloning + CSS injection, same as flowchart

---

### 4d. `colorizeClassDiagram()` — Index-based (uses `seq` palette)

**Goal:** Each class gets a distinct color by declaration order; relations tinted by source class.

1. Nodes are `g.node[id^="classId-"]`, tagged `data-idx` by declaration order
2. Edge paths `id="id_<Source>_<Target>_<n>"` → parsed for source class (assumes class names don't contain underscores)
3. Marker cloning per source-class index
4. CSS injection: tinted badge fill, colored border, **divider lines** inside class boxes tinted at 45% opacity

---

### 4e. `colorizeER()` — Index-based (uses `seq` palette)

**Goal:** Each entity box gets a distinct color by declaration order.

1. Entities are `g[id^="entity-"]`, tagged `data-idx`
2. CSS injection: entity box + `text.er.entityLabel` (real SVG `<text>`, not foreignObject span, so plain `fill` works)
3. **Limitation:** Relationship lines carry no entity reference in the SVG, so they can't be tinted per-entity — only entity boxes are colored

---

## 5. The `badgeTint()` Helper

Nodes/actors are rendered as **"outlined badges"** rather than solid-filled boxes: a light tinted fill + full-strength colored border + full-strength colored text. This needs theme-aware tinting:

```js
function badgeTint(hex) {
  const dark = ['dark', 'console', 'classic'].includes(themePicker.value);
  return withAlpha(hex, dark ? 0.30 : 0.14);  // 30% on dark, 14% on light
}
```

**Why:** A 14% tint reads as a soft pastel on white, but the same 14% on a dark canvas is nearly invisible. Dark themes need 30% to register as a visible tint. Both get equally legible badges, just calibrated differently.

`withAlpha(hex, alpha)` converts a hex color to an `rgba()` string.

---

## 6. Porting Checklist

To port the coloring system into another project:

### Required pieces (copy verbatim)
- [ ] The `PALETTES` object + `getSeqPalette()` / `getFlowPalette()` getters
- [ ] `withAlpha()` + `badgeTint()` helpers
- [ ] All 5 colorizer functions: `colorizeSequence`, `colorizeFlowchart`, `colorizeState`, `colorizeClassDiagram`, `colorizeER`
- [ ] Call them in sequence after `mermaid.render()` inside your render function
- [ ] The syntax tokenizer: `TOKEN_RE` + `highlightLine()` + `renderHighlight()`
- [ ] Sequence-specific highlighters: `buildAliasColorMap()`, `highlightParticipantLine()`, `highlightMessageLine()`

### CSS to copy
- [ ] `.tok-*` token classes (light theme) + per-theme overrides (`theme-dark`, `theme-console-bg`, `theme-classic`)
- [ ] Canvas theme classes (`canvas-dark`, `canvas-console`, `canvas-classic`)

### Assumptions to verify in your target project
- [ ] **Mermaid version ~0.16.x** — the selectors (`rect.actor`, `g.node[id^="flowchart-"]`, `path[id^="L-"]`, etc.) are version-specific. Different Mermaid versions emit different SVG structures.
- [ ] The rendered SVG lives in a known container (here `#diagram-host` / `hostEl`)
- [ ] A `<textarea>`-based editor with a `#highlight-layer` overlay (if you want editor coloring too)
- [ ] Controls named `#palettePicker`, `#paletteReverse`, `#themePicker` (or update the getter references)

### Gotchas
- **Don't try to set `fill` attributes directly** — Mermaid's embedded `<style>` block wins over attributes. Use injected `<style>` with `!important`.
- **Markers don't inherit color** — `<marker>` renders in an isolated context. Must clone + tint per color and repoint `marker-start`/`marker-end`.
- **Sequence diagram lifelines need y-trimming** — semi-transparent actor boxes reveal the lifeline overlap that opaque boxes used to hide.
- **State diagram edges have no source/target in the SVG** — must parse source text to build the transition graph.
- **Console theme layers on Dark** — apply both `canvas-dark` + `canvas-console` (and `theme-dark` + `theme-console-bg` for the editor).
- **Classic theme is fully independent** — don't layer it on Dark; it has its own token colors.
