/**
 * sticker_widget.js — Sticky Thoughts widget logic for the Dashboard.
 * Extracted from dashboard_index.js (lines 400–565).
 */

import { createStickerElement, openStickerModal } from './stickers.js';
import { showToast } from './ui_helpers.js';

// ─── Private state ────────────────────────────────────────────────────────────

let selectedStickerColor = '#fff9c4';
let stickerType = 'text';

// ─── Public API ───────────────────────────────────────────────────────────────

window.toggleStickerMode = function () {
    const btn = document.getElementById('stickerTypeBtn');
    const stInput = document.getElementById('stickerInput');
    if (stickerType === 'text') {
        stickerType = 'list';
        btn.textContent = '📋';
        btn.classList.add('active');
        if (stInput) stInput.placeholder = 'Add items (Enter each item, or use commas)...';
    } else {
        stickerType = 'text';
        btn.textContent = '📝';
        btn.classList.remove('active');
        if (stInput) stInput.placeholder = 'Thought on your mind... (Enter to add)';
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
                const noteDiv = createStickerElement(note, { isWidget: true });
                corkboard.appendChild(noteDiv);
            }
            stInput.value = '';
            stInput.style.height = 'auto';
            const titleInput = document.getElementById('stickerTitleInput');
            if (titleInput) titleInput.value = '';
            showToast('Sticker added!', 'success');
        } else {
            const errText = await response.text();
            console.error(`Failed to add sticker. Status: ${response.status}`, errText);
            showToast(`Failed to save sticker (Error ${response.status})`, 'error');
        }
    } catch (e) {
        console.error('Sticker fetch error:', e);
        showToast('Network error while adding sticker', 'error');
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
    // Color picker dots
    const stickerColorPicker = document.getElementById('stickerColorPicker');
    if (stickerColorPicker) {
        stickerColorPicker.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                stickerColorPicker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                selectedStickerColor = dot.dataset.color;
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
                    const noteDiv = createStickerElement(s, { isWidget: true });
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
