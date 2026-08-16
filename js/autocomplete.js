import { DIAGRAMS } from './diagrams.js';
import { isDiagramTypeAllowed } from './diagram-types.js';
import { renderOne } from './renderer.js';
import { syncGutter, syncLocalHL, clearEditorError } from './editor.js';

export function initAutocomplete(elSrc) {
  const autocompletePanel = document.getElementById('autocompletePanel');
  if (!elSrc || !autocompletePanel) return;

  let acActiveIndex = -1;
  let acFilteredKeys = [];
  let lastSelectionStart = 0;
  let lastSelectionEnd = 0;

  const hideAutocomplete = () => {
    autocompletePanel.classList.remove('show');
    autocompletePanel.innerHTML = '';
    acActiveIndex = -1;
    acFilteredKeys = [];
  };

  const selectAutocompleteItem = async (key) => {
    const diag = DIAGRAMS[key];
    if (!diag) return;

    elSrc.value = diag.src;
    hideAutocomplete();

    elSrc.focus();
    elSrc.selectionStart = elSrc.value.length;
    elSrc.selectionEnd = elSrc.value.length;

    syncGutter();
    syncLocalHL();
    clearEditorError();

    const elType = document.getElementById('diagramType');
    if (elType) {
      elType.value = key;
      elType.dispatchEvent(new Event('change'));
    }
    await renderOne(diag.src);
  };

  const updateAutocomplete = () => {
    const code = elSrc.value;
    if (code.includes('\n')) {
      hideAutocomplete();
      return;
    }

    const prefix = code.trim().toLowerCase();
    const allowedKeys = Object.keys(DIAGRAMS).filter(key => {
      return key !== 'none' && isDiagramTypeAllowed(key) && key.toLowerCase().startsWith(prefix);
    });

    if (allowedKeys.length === 0) {
      hideAutocomplete();
      return;
    }

    acFilteredKeys = allowedKeys;
    acActiveIndex = Math.min(acActiveIndex, acFilteredKeys.length - 1);
    if (acActiveIndex < 0 && acFilteredKeys.length > 0) {
      acActiveIndex = 0;
    }

    autocompletePanel.innerHTML = '';
    acFilteredKeys.forEach((key, idx) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = `ac-item${idx === acActiveIndex ? ' selected' : ''}`;
      
      let iconHtml = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
      if (key === 'flowchart') {
        iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>`;
      } else if (key === 'sequence') {
        iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="6" /></svg>`;
      } else if (key === 'class') {
        iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" /></svg>`;
      } else if (key === 'state') {
        iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 12 12 22 2 12" /></svg>`;
      } else if (key === 'er') {
        iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" /></svg>`;
      }

      itemDiv.innerHTML = `${iconHtml}<span>${DIAGRAMS[key].label}</span>`;
      itemDiv.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent losing focus
        e.stopPropagation();
        selectAutocompleteItem(key);
      });
      autocompletePanel.appendChild(itemDiv);
    });

    autocompletePanel.classList.add('show');
  };

  // Listeners
  elSrc.addEventListener('input', () => {
    updateAutocomplete();
  });

  elSrc.addEventListener('focus', () => {
    updateAutocomplete();
  });

  elSrc.addEventListener('click', () => {
    updateAutocomplete();
  });

  elSrc.addEventListener('keyup', (e) => {
    lastSelectionStart = elSrc.selectionStart;
    lastSelectionEnd = elSrc.selectionEnd;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Escape') {
      updateAutocomplete();
    }
  });

  elSrc.addEventListener('keydown', (e) => {
    if (autocompletePanel.classList.contains('show')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acActiveIndex = (acActiveIndex + 1) % acFilteredKeys.length;
        updateAutocomplete();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acActiveIndex = (acActiveIndex - 1 + acFilteredKeys.length) % acFilteredKeys.length;
        updateAutocomplete();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (acActiveIndex >= 0 && acActiveIndex < acFilteredKeys.length) {
          selectAutocompleteItem(acFilteredKeys[acActiveIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideAutocomplete();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#source') && !e.target.closest('#autocompletePanel')) {
      hideAutocomplete();
    }
  });

  // Listen for custom event to sync selection tracking from main app listeners
  window.addEventListener('cursorSync', (e) => {
    if (e.detail) {
      lastSelectionStart = e.detail.selectionStart;
      lastSelectionEnd = e.detail.selectionEnd;
    }
  });
}
