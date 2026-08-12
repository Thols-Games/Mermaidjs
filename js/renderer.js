/**
 * Renderer Engine Module
 * Controls diagram rendering via Mermaid.js and SVG diagram styling/colorizing.
 */

import mermaid from '../mermaid-11.16.0/package/dist/mermaid.esm.min.mjs';
import { clearEditorError, checkSequenceDiagramWarnings, showEditorError, showEditorWarnings, buildAliasColorMap } from './editor.js';
import { resetZoom } from './zoom-pan.js';
import { getSeqPalette, getFlowPalette, badgeTint, withAlpha } from './palettes.js';
import { setInline } from './dom.js';

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

export function currentPaletteName() {
  const activeBtn = document.querySelector('.palette-btn.active');
  return activeBtn ? activeBtn.getAttribute('data-palette') : 'default';
}

export function isPaletteReversed() {
  const toggle = document.getElementById('paletteReverseToggle');
  return toggle ? toggle.checked : false;
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

export function colorizeFlowchart() {
  const svg = currentSvg();
  if (!svg) return false;
  const nodes = svg.querySelectorAll('g.node');
  if (!nodes.length) return false;

  const flowPalette = getFlowPalette(currentPaletteName(), isPaletteReversed());
  const isDark = isDarkFamily();

  nodes.forEach((node, i) => {
    const colorObj = flowPalette[i % flowPalette.length];
    node.setAttribute('data-cnode', String(i));
    node.querySelectorAll('rect, circle, polygon, path').forEach(shape => {
      setInline(shape, { fill: badgeTint(colorObj.fill, isDark), stroke: colorObj.fill, 'stroke-width': '2' });
    });
  });
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
    elTarget.removeAttribute('data-processed');
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
    resetZoom();

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
  }
}
