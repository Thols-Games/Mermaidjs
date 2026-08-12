/**
 * Zoom & Pan Module
 * Controls canvas diagram scaling, pan offsets, and drag listeners.
 */

export let zoomScale = 1.0;
export let panX = 0;
export let panY = 0;
export let isPanActive = false;
export let isPanning = false;
let startPanX = 0;
let startPanY = 0;

export function applyDiagramZoom() {
  const zoomWrapEl = document.getElementById('zoomWrap');
  const targetSvg = document.querySelector('#target svg');
  const transformStr = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
  if (zoomWrapEl) {
    zoomWrapEl.style.transform = transformStr;
  }
  if (targetSvg) {
    targetSvg.style.transform = transformStr;
    targetSvg.style.transformOrigin = 'center center';
  }
}

export function resetZoom() {
  zoomScale = 1.0;
  panX = 0;
  panY = 0;
  applyDiagramZoom();
}

export function initZoomPanControls() {
  const btnZoomIn = document.getElementById('zoomInBtn');
  const btnZoomOut = document.getElementById('zoomOutBtn');
  const btnZoomFit = document.getElementById('zoomFitBtn');
  const btnPan = document.getElementById('panBtn');

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      zoomScale = Math.min(3.0, zoomScale + 0.1);
      applyDiagramZoom();
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      zoomScale = Math.max(0.2, zoomScale - 0.1);
      applyDiagramZoom();
    });
  }

  if (btnZoomFit) {
    btnZoomFit.addEventListener('click', () => resetZoom());
  }

  const btnFullscreen = document.getElementById('fullscreenBtn');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      const container = document.querySelector('.preview-container') || document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (container.requestFullscreen) {
          container.requestFullscreen().catch(() => {});
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    });

    const onFSChange = () => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
      btnFullscreen.classList.toggle('active', isFS);
      btnFullscreen.title = isFS ? 'Exit Fullscreen' : 'Fullscreen mode';
    };

    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('webkitfullscreenchange', onFSChange);
  }

  if (btnPan) {
    btnPan.addEventListener('click', () => {
      isPanActive = !isPanActive;
      btnPan.classList.toggle('active', isPanActive);
      const targetEl = document.getElementById('target');
      const previewEl = document.querySelector('.preview');
      if (targetEl) targetEl.classList.toggle('pan-mode', isPanActive);
      if (previewEl) previewEl.classList.toggle('pan-mode', isPanActive);
    });
  }

  const previewArea = document.querySelector('.preview');
  if (previewArea) {
    previewArea.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      zoomScale = Math.min(3.0, Math.max(0.2, zoomScale + delta));
      applyDiagramZoom();
    }, { passive: false });
  }

  document.addEventListener('mousedown', (e) => {
    if (!isPanActive || !e.target.closest('.preview, #target')) return;
    isPanning = true;
    startPanX = e.clientX - panX;
    startPanY = e.clientY - panY;
    const previewEl = document.querySelector('.preview');
    if (previewEl) previewEl.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startPanX;
    panY = e.clientY - startPanY;
    applyDiagramZoom();
  });

  document.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      const previewEl = document.querySelector('.preview');
      if (previewEl) previewEl.style.cursor = isPanActive ? 'grab' : '';
    }
  });
}
