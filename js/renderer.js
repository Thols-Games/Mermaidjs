/**
 * Renderer Engine Module
 * Controls diagram rendering via Mermaid.js and SVG diagram styling/colorizing.
 */

import mermaid from '../mermaid-11.16.0/package/dist/mermaid.esm.min.mjs';
import { clearEditorError, checkSequenceDiagramWarnings, showEditorError, showEditorWarnings, buildAliasColorMap } from './editor.js';
import { applyDiagramZoom } from './zoom-pan.js';
import { getSeqPalette, getFlowPalette, badgeTint, withAlpha, currentPaletteName, isPaletteReversed } from './palettes.js';
import { setInline } from './dom.js';

let currentMermaidTheme = 'dark';

// Maps a sequence layout config key to its UI control id + value type.
const SEQUENCE_LAYOUT_CONTROLS = {
  diagramMarginX: { id: 'seqDiagramMarginX', type: 'number' },
  diagramMarginY: { id: 'seqDiagramMarginY', type: 'number' },
  actorMargin: { id: 'seqActorMargin', type: 'number' },
  messageMargin: { id: 'seqMessageMargin', type: 'number' },
  noteMargin: { id: 'seqNoteMargin', type: 'number' },
  boxTextMargin: { id: 'seqBoxTextMargin', type: 'number' },
  bottomMarginAdj: { id: 'seqBottomMarginAdj', type: 'number' },
  messageAlign: { id: 'seqMessageAlign', type: 'string' },
  mirrorActors: { id: 'seqMirrorActors', type: 'checkbox' },
  wrap: { id: 'seqWrap', type: 'checkbox' },
  rightAngles: { id: 'seqRightAngles', type: 'checkbox' }
};

export function getSequenceLayoutConfig() {
  const config = {};
  for (const [key, spec] of Object.entries(SEQUENCE_LAYOUT_CONTROLS)) {
    const el = document.getElementById(spec.id);
    if (!el) continue;
    if (spec.type === 'number') {
      const n = Number(el.value);
      if (!Number.isNaN(n)) config[key] = n;
    } else if (spec.type === 'checkbox') {
      config[key] = el.checked;
    } else {
      config[key] = el.value;
    }
  }
  return config;
}

export async function applyMermaidConfig(autonumber, mermaidTheme) {
  currentMermaidTheme = mermaidTheme;
  const layout = getSequenceLayoutConfig();
  await mermaid.initialize({
    startOnLoad: false,
    theme: mermaidTheme,
    securityLevel: 'strict',
    sequence: { showSequenceNumbers: !!autonumber, ...layout }
  });
}

export function reapplyMermaidConfig(autonumber) {
  return applyMermaidConfig(autonumber, currentMermaidTheme);
}

export function getAutonumberConfig() {
  const btn = document.getElementById('diagramAutonumberToggleBtn');
  return btn ? btn.checked : false;
}

export let lastRenderedSrc = '';
export let renderSeq = 0;

export function getSequenceMessageColors(sourceText, seqPalette) {
  if (!sourceText) return [];
  const lines = sourceText.replace(/\r/g, '').split('\n');
  const actorColorMap = buildAliasColorMap(sourceText, seqPalette);
  const messageColors = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return;

    const msgMatch = trimmed.match(/^("[^"]+"|[A-Za-z0-9_]+)\s*(?:->>|->|-->>|-->|-x|--x|-\)|--\))\s*("[^"]+"|[A-Za-z0-9_]+)/);
    if (msgMatch) {
      const src = msgMatch[1].replace(/^"|"$/g, '');
      const colorObj = actorColorMap.get(src) || seqPalette[0];
      messageColors.push(colorObj);
    }
  });

  return messageColors;
}

function currentSvg() {
  return document.querySelector('#target svg');
}

export function isDarkFamily() {
  const themeEl = document.getElementById('theme');
  return themeEl ? (themeEl.value === 'dark' || themeEl.value === 'teal') : true;
}


export function colorizeSequence() {
  const svg = currentSvg();
  if (!svg) return false;
  const actorRects = svg.querySelectorAll('rect.actor');
  if (!actorRects.length) return false;

  const seqPalette = getSeqPalette(currentPaletteName(), isPaletteReversed());
  const isDark = isDarkFamily();

  const elSrc = document.getElementById('source');
  const srcText = elSrc ? elSrc.value : lastRenderedSrc;
  const messageColors = getSequenceMessageColors(srcText, seqPalette);

  const xCentres = [];
  actorRects.forEach(rect => {
    const x = parseFloat(rect.getAttribute('x')) || 0;
    const w = parseFloat(rect.getAttribute('width')) || 0;
    xCentres.push(Math.round(x + w / 2));
  });
  const laneByX = new Map();
  [...new Set(xCentres)].sort((a, b) => a - b).forEach((cx, i) => laneByX.set(cx, i));
  const sortedX = [...laneByX.keys()];
  const laneXOf = (x) => {
    let best = 0, bestDist = Infinity;
    sortedX.forEach((cx, idx) => { const d = Math.abs(cx - x); if (d < bestDist) { bestDist = d; best = idx; } });
    return best;
  };

  actorRects.forEach((rect, i) => {
    const lane = laneByX.get(xCentres[i]) ?? 0;
    const colorObj = seqPalette[lane % seqPalette.length];
    rect.setAttribute('data-lane', String(lane));
    setInline(rect, { fill: badgeTint(colorObj.fill, isDark), stroke: colorObj.fill, 'stroke-width': '2' });
  });

  svg.querySelectorAll('text.actor').forEach(t => {
    const x = parseFloat(t.getAttribute('x')) || 0;
    const lane = laneXOf(x);
    const colorObj = seqPalette[lane % seqPalette.length];
    setInline(t, { fill: colorObj.fill, 'font-weight': '700' });
    t.querySelectorAll('tspan').forEach(ts => setInline(ts, { fill: colorObj.fill, 'font-weight': '700' }));
  });

  svg.querySelectorAll('line.actor-line').forEach(line => {
    const x1 = parseFloat(line.getAttribute('x1'));
    const x2 = parseFloat(line.getAttribute('x2'));
    if (!isNaN(x1) && !isNaN(x2) && Math.abs(x1 - x2) < 1) {
      const lane = laneXOf(x1);
      const colorObj = seqPalette[lane % seqPalette.length];
      setInline(line, { fill: 'none', stroke: colorObj.fill });
    }
  });

  const msgLines = svg.querySelectorAll('line[class*="messageLine"], path[class*="messageLine"]');
  msgLines.forEach((el, i) => {
    let colorObj = messageColors[i];
    if (!colorObj) {
      let x1 = 0;
      if (el.tagName.toLowerCase() === 'line') {
        x1 = parseFloat(el.getAttribute('x1')) || 0;
      } else {
        const d = el.getAttribute('d') || '';
        const m = d.match(/^M\s*([0-9.-]+)/i);
        if (m) x1 = parseFloat(m[1]) || 0;
      }
      const lane = laneXOf(x1);
      colorObj = seqPalette[lane % seqPalette.length];
    }
    setInline(el, { stroke: colorObj.fill, 'stroke-width': '2' });
  });

  const msgTexts = svg.querySelectorAll('text.messageText, text[class*="messageText"], g.messageGroup text');
  msgTexts.forEach((t, i) => {
    let colorObj = messageColors[i];
    if (!colorObj) {
      const tx = parseFloat(t.getAttribute('x')) || 0;
      colorObj = seqPalette[laneXOf(tx) % seqPalette.length];
    }
    setInline(t, { fill: colorObj.fill, 'font-weight': '600' });
    t.querySelectorAll('tspan').forEach(ts => setInline(ts, { fill: colorObj.fill, 'font-weight': '600' }));
  });

  return true;
}

export function colorizeClass() {
  const svg = currentSvg();
  if (!svg) return false;
  const nodes = svg.querySelectorAll('g.classGroup');
  if (!nodes.length) return false;

  const seqPalette = getSeqPalette(currentPaletteName(), isPaletteReversed());
  const isDark = isDarkFamily();

  nodes.forEach((group, i) => {
    const colorObj = seqPalette[i % seqPalette.length];
    group.querySelectorAll('rect, polygon, circle').forEach(shape => {
      setInline(shape, { fill: badgeTint(colorObj.fill, isDark), stroke: colorObj.fill, 'stroke-width': '2' });
    });
  });
  return true;
}

export function colorizeDiagram() {
  const svg = currentSvg();
  if (!svg) return false;
  const nodes = svg.querySelectorAll('g.node, g.stateGroup');
  if (!nodes.length) return false;

  const flowPalette = getFlowPalette(currentPaletteName(), isPaletteReversed());
  const isDark = isDarkFamily();

  nodes.forEach((node, i) => {
    const colorObj = flowPalette[i % flowPalette.length];
    node.querySelectorAll('rect, circle, polygon, path').forEach(shape => {
      if (!shape.classList.contains('outer')) {
        setInline(shape, { fill: badgeTint(colorObj.fill, isDark), stroke: colorObj.fill, 'stroke-width': '2' });
      }
    });
  });
  return true;
}

function elViewportBox(el) {
  const b = el.getBBox();
  const ctm = el.getCTM();
  if (!ctm) return null;
  const pts = [
    [b.x, b.y], [b.x + b.width, b.y],
    [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]
  ].map(([x, y]) => ({ x: ctm.a * x + ctm.c * y + ctm.e, y: ctm.b * x + ctm.d * y + ctm.f }));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function distanceToBox(px, py, box) {
  const cx = Math.max(box.x, Math.min(px, box.x + box.w));
  const cy = Math.max(box.y, Math.min(py, box.y + box.h));
  return Math.hypot(px - cx, py - cy);
}

function pathStartPoint(pathEl) {
  const d = pathEl.getAttribute('d') || '';
  const m = d.match(/M\s*([-\d.]+)[ ,]+([-\d.]+)/i);
  if (!m) return null;
  const x = parseFloat(m[1]), y = parseFloat(m[2]);
  const ctm = pathEl.getCTM();
  if (!ctm) return null;
  return { x: ctm.a * x + ctm.c * y + ctm.e, y: ctm.b * x + ctm.d * y + ctm.f };
}

export function colorizeFlowchart() {
  const svg = currentSvg();
  if (!svg) return false;
  const elSrc = document.getElementById('source');
  const srcCode = elSrc ? elSrc.value.trim().replace(/^---[\s\S]*?---\s*/, '') : '';
  const isFlowchart = svg.classList.contains('flowchart') || /^(flowchart|graph)\b/i.test(srcCode);
  const isState = svg.classList.contains('statediagram') || /^stateDiagram\b/i.test(srcCode);
  const isDiagram = isFlowchart || isState;
  const nodeSelector = isState ? 'g.stateGroup' : 'g.node';

  const nodes = svg.querySelectorAll(nodeSelector);
  if (!nodes.length) return false;

  const flowPalette = getFlowPalette(currentPaletteName(), isPaletteReversed());
  const isDark = isDarkFamily();

  const nodeList = [];
  nodes.forEach((node, i) => {
    const colorObj = flowPalette[i % flowPalette.length];
    node.setAttribute('data-cnode', String(i));
    node.querySelectorAll('rect, circle, polygon, path').forEach(shape => {
      if (!shape.classList.contains('outer')) {
        setInline(shape, { fill: badgeTint(colorObj.fill, isDark), stroke: colorObj.fill, 'stroke-width': '2' });
      }
    });
    let box = null;
    try { box = elViewportBox(node); } catch (e) { box = null; }
    nodeList.push({ color: colorObj.fill, box });
  });

  if (isDiagram) {
    const edges = svg.querySelectorAll('.edgePaths path, .edgePath path');
    edges.forEach((edge, idx) => {
      const start = pathStartPoint(edge);
      if (!start) return;
      let best = null, bestDist = Infinity;
      for (const n of nodeList) {
        if (!n.box) continue;
        const dd = distanceToBox(start.x, start.y, n.box);
        if (dd < bestDist) { bestDist = dd; best = n; }
      }
      if (!best) return;
      const color = best.color;
      setInline(edge, { stroke: color, 'stroke-width': '2' });

      ['marker-end', 'marker-start'].forEach(attr => {
        const ref = edge.getAttribute(attr);
        if (!ref) return;
        const markerId = ref.replace(/^url\(#?/, '').replace(/\)$/, '').replace(/['"]/g, '');
        if (!markerId) return;
        const marker = svg.querySelector(`marker#${CSS.escape(markerId)}`);
        if (!marker || !marker.parentNode) return;
        const newId = markerId + '-fc' + idx;
        let clone = svg.querySelector(`marker#${CSS.escape(newId)}`);
        if (!clone) {
          clone = marker.cloneNode(true);
          clone.setAttribute('id', newId);
          clone.querySelectorAll('path').forEach(p => setInline(p, { fill: color, stroke: color }));
          marker.parentNode.appendChild(clone);
        }
        edge.setAttribute(attr, `url(#${newId})`);
      });
    });
  }

  return true;
}

export function applyDiagramStyle() {
  const activeStyleBtn = document.querySelector('.style-btn.active');
  const style = activeStyleBtn ? activeStyleBtn.getAttribute('data-style') : 'pill';
  const svg = currentSvg();
  if (!svg) return;

  const elSrc = document.getElementById('source');
  const srcCode = elSrc ? elSrc.value.trim().replace(/^---[\s\S]*?---\s*/, '') : '';
  const isFlowchart = svg.classList.contains('flowchart') || /^(flowchart|graph)\b/i.test(srcCode);
  const isSequence = /^(sequenceDiagram)\b/i.test(srcCode);

  if (isSequence) {
    const rects = svg.querySelectorAll('rect.actor');
    rects.forEach(rect => {
      if (style === 'sharp') {
        rect.setAttribute('rx', '0');
        rect.setAttribute('ry', '0');
        setInline(rect, { rx: '0px', ry: '0px' });
      } else if (style === 'rounded') {
        rect.setAttribute('rx', '8');
        rect.setAttribute('ry', '8');
        setInline(rect, { rx: '8px', ry: '8px' });
      } else if (style === 'pill') {
        const h = parseFloat(rect.getAttribute('height')) || rect.getBoundingClientRect().height || 40;
        const radius = Math.round(h / 2) || 20;
        rect.setAttribute('rx', String(radius));
        rect.setAttribute('ry', String(radius));
        setInline(rect, { rx: radius + 'px', ry: radius + 'px' });
      }
    });
  }

  if (!isFlowchart) return;

  const rects = svg.querySelectorAll('g.node rect, g.node .label-container');
  rects.forEach(rect => {
    if (style === 'sharp') {
      rect.setAttribute('rx', '0');
      rect.setAttribute('ry', '0');
      setInline(rect, { rx: '0px', ry: '0px' });
    } else if (style === 'rounded') {
      rect.setAttribute('rx', '8');
      rect.setAttribute('ry', '8');
      setInline(rect, { rx: '8px', ry: '8px' });
    } else if (style === 'pill') {
      const h = parseFloat(rect.getAttribute('height')) || rect.getBoundingClientRect().height || 40;
      const radius = Math.round(h / 2) || 18;
      rect.setAttribute('rx', String(radius));
      rect.setAttribute('ry', String(radius));
      setInline(rect, { rx: radius + 'px', ry: radius + 'px' });
    }
  });

  const shapes = svg.querySelectorAll('g.node polygon, g.node path');
  shapes.forEach(shape => {
    if (style === 'sharp') {
      setInline(shape, { 'stroke-linejoin': 'miter', 'stroke-linecap': 'square' });
    } else {
      setInline(shape, { 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    }
  });
}

export function applyDiagramFont() {
  const activeFontBtn = document.querySelector('.font-btn.active');
  const fontKey = activeFontBtn ? activeFontBtn.getAttribute('data-font') : 'sans';

  const FONT_MAP = {
    'sans': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    'serif': 'Georgia, Cambria, "Times New Roman", Times, serif',
    'mono': 'ui-monospace, "SFMono-Regular", Consolas, monospace',
    'comic': '"Comic Sans MS", "Comic Sans", cursive',
    'system': 'system-ui, sans-serif'
  };

  const fontFamily = FONT_MAP[fontKey] || FONT_MAP['sans'];
  const svg = currentSvg();
  if (!svg) return;

  svg.querySelectorAll('text, tspan, foreignObject div, foreignObject span, foreignObject p').forEach(el => {
    setInline(el, { 'font-family': fontFamily });
  });
}

export function applyDiagramThickness() {
  const slider = document.getElementById('diagramThicknessSlider');
  const thickness = slider ? slider.value : '2';

  const svg = currentSvg();
  if (!svg) return;

  // Flowchart elements
  const rects = svg.querySelectorAll('g.node rect, g.node polygon, g.node path, g.node circle, g.node ellipse, g.node .label-container');
  rects.forEach(el => {
    setInline(el, { 'stroke-width': thickness + 'px' });
  });
  const edges = svg.querySelectorAll('.edgePath .path, .edgePath path');
  edges.forEach(el => {
    setInline(el, { 'stroke-width': thickness + 'px' });
  });

  // Sequence elements
  const sequenceRects = svg.querySelectorAll('rect.actor, rect.note, rect.loopLine');
  sequenceRects.forEach(el => {
    setInline(el, { 'stroke-width': thickness + 'px' });
  });
  const sequenceLines = svg.querySelectorAll('line.actor-line, .messageLine0, .messageLine1');
  sequenceLines.forEach(el => {
    setInline(el, { 'stroke-width': thickness + 'px' });
  });
}

export async function renderOne(text) {
  const elTarget = document.getElementById('target');
  const btnRender = document.getElementById('renderBtn');
  if (!elTarget) return;

  if ((text || '').trim() === '') {
    if (btnRender) btnRender.classList.remove('rendered');
    elTarget.setAttribute('data-processed', 'empty');
    elTarget.innerHTML = `<div style="padding:2rem;color:var(--text-muted);text-align:center;display:flex;flex-direction:column;align-items:center;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom:1rem;opacity:0.5;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
      Start typing to create a diagram, or choose a snippet.</div>`;
    return;
  }

  if (btnRender) btnRender.classList.remove('rendered');
  lastRenderedSrc = text;

  elTarget.removeAttribute('data-processed');
  elTarget.textContent = text;

  try {
    const isValid = await mermaid.parse(text);
    if (isValid === false) return;
    await mermaid.run({ nodes: [elTarget], suppressErrors: false });
    applyDiagramZoom();

    const mySeq = ++renderSeq;
    const applyColors = () => {
      if (mySeq !== renderSeq) return;
      try { colorizeSequence(); } catch (e) {}
      try { colorizeClass(); } catch (e) {}
      try { colorizeDiagram(); } catch (e) {}
      try { colorizeFlowchart(); } catch (e) {}
      try { applyDiagramStyle(); } catch (e) {}
      try { applyDiagramFont(); } catch (e) {}
      try { applyDiagramThickness(); } catch (e) {}
    };
    applyColors();
    setTimeout(applyColors, 150);

    clearEditorError();
    const warnings = checkSequenceDiagramWarnings(text);
    if (warnings && warnings.length > 0) {
      showEditorWarnings(warnings);
    }
  } catch (e) {
    console.error('renderOne error:', e);
    showEditorError(e);
    applyDiagramZoom();

    elTarget.setAttribute('data-processed', 'error');
    elTarget.innerHTML = `
      <div class="render-error-container" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 2rem;
        max-width: 500px;
        margin: 2rem auto;
        box-sizing: border-box;
      ">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e2795b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem;">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h3 style="margin: 0 0 0.75rem 0; color: #e2795b; font-family: system-ui, sans-serif; font-size: 1.15rem; font-weight: 600;">Diagram Parsing Error</h3>
        <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem; font-family: system-ui, sans-serif; line-height: 1.4;">
          Check the red indicators in the gutter or click <strong>Auto-Fix</strong> to repair.
        </p>
      </div>
    `;
  }
}

if (typeof window !== 'undefined') {
  window.renderOne = renderOne;
}
