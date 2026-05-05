/**
 * sticker_widget.js — Sticky Thoughts widget logic for the Dashboard.
 * Extracted from dashboard_index.js (lines 400–565).
 */

// window.createStickerElement and window.openStickerModal are provided by stickers.js (standard script)
import { showToast } from './ui_helpers.js';

// ─── Private state ────────────────────────────────────────────────────────────

let selectedStickerColor = '#fff9c4';
let stickerType = 'text';

// ─── Public API ───────────────────────────────────────────────────────────────

window.toggleStickerMode = function (mode) {
    const stInput = document.getElementById('stickerInput');
    stickerType = mode || (stickerType === 'text' ? 'list' : 'text');
    
    // Update UI Toggles
    const toggles = document.querySelectorAll('.sticker-type-segmented .type-segment');
    toggles.forEach(t => {
        const isCurrent = (t.id === `type-${stickerType}-quick`);
        t.classList.toggle('active', isCurrent);
    });

    if (stickerType === 'text') {
        if (stInput) stInput.placeholder = 'Write something... (Enter to save)';
    } else {
        if (stInput) stInput.placeholder = 'Add items (use commas or new lines)...';
    }
};

async function addSticker() {
    const stInput = document.getElementById('stickerInput');
    if (!stInput) return;
    const rawText = stInput.value.trim();
    const rawTitle = document.getElementById('stickerTitleInput')?.value.trim() || '';
    if (!rawText) return;

    let finalText = rawText;
    let finalType = stickerType;

    if (rawText.startsWith('- ') || rawText.includes('\n')) finalType = 'list';

    if (finalType === 'list') {
        const items = rawText.split(/[,\n]/).map(i => i.trim().replace(/^- /, '')).filter(i => i);
        if (items.length === 0) return;
        finalText = JSON.stringify({ items: items.map(t => ({ text: t, done: false })) });
    }

    try {
        const response = await fetch('/api/stickers/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: finalText, title: rawTitle || null, color: selectedStickerColor, type: finalType })
        });

        if (response.ok) {
            const note = await response.json();
            const corkboard = document.getElementById('corkboard');
            if (corkboard) {
                // Ensure we use the modular createStickerElement
                const noteDiv = window.createStickerElement(note);
                corkboard.appendChild(noteDiv);
            }
            stInput.value = '';
            stInput.style.height = '40px';
            const titleInput = document.getElementById('stickerTitleInput');
            if (titleInput) titleInput.value = '';
            if (typeof window.showToast === 'function') window.showToast('Sticker added!', 'success');
        } else {
            const errText = await response.text();
            console.error(`Failed to add sticker. Status: ${response.status}`, errText);
            if (typeof window.showToast === 'function') window.showToast(`Failed to save sticker`, 'error');
        }
    } catch (e) {
        console.error('Sticker fetch error:', e);
        if (typeof window.showToast === 'function') window.showToast('Network error', 'error');
    }
}
window.addSticker = addSticker;

window.openHeaderStickerModal = function () {
    const color = document.getElementById('headerStickerColor')?.value || '#fff9c4';
    const type  = document.getElementById('headerStickerType')?.value || 'text';
    openStickerModal({ source: 'header', color, type });
};

window.updateHeaderStickerUI = function (attached) {
    const btn = document.getElementById('headerStickerBtn');
    if (!btn) return;
    if (attached) {
        btn.classList.add('attached');
        btn.title = 'Sticker Attached (Click to Edit)';
    } else {
        btn.classList.remove('attached');
        btn.title = 'Add Sticker';
    }
};

window.syncCategoryStickerVisibility = function () {
    const cat = document.querySelector('select[name="common_category"]')?.value;
    const btn = document.getElementById('headerStickerBtn');
    if (!btn) return;
    btn.style.display = (cat === 'event' || cat === 'important') ? 'flex' : 'none';
};

// ─── Initializer ─────────────────────────────────────────────────────────────

export async function initStickerWidget() {
    // Color picker swatches
    const stickerColorPicker = document.getElementById('stickerColorPicker');
    if (stickerColorPicker) {
        stickerColorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                stickerColorPicker.querySelectorAll('.color-swatch').forEach(d => d.classList.remove('active'));
                swatch.classList.add('active');
                selectedStickerColor = swatch.dataset.color;
            });
        });
    }

    // Auto-resize and Enter-to-submit for sticker textarea
    const stInput = document.getElementById('stickerInput');
    if (stInput) {
        stInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
        stInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.ctrlKey || e.metaKey || stickerType === 'text') {
                    e.preventDefault();
                    addSticker();
                }
            }
        });
    }

    // Load existing stickers onto corkboard
    const corkboard = document.getElementById('corkboard');
    if (corkboard) {
        try {
            const res = await fetch('/api/stickers/');
            if (res.ok) {
                const stickers = await res.json();
                corkboard.innerHTML = '';
                stickers.forEach(s => {
                    const noteDiv = window.createStickerElement(s);
                    corkboard.appendChild(noteDiv);
                });
            }
        } catch (e) {
            console.error('Failed to load initial stickers', e);
        }
    }

    // Category-based sticker button visibility
    const catSelect = document.querySelector('select[name="common_category"]');
    if (catSelect) {
        catSelect.addEventListener('change', window.syncCategoryStickerVisibility);
        setTimeout(window.syncCategoryStickerVisibility, 100);
    }
}
