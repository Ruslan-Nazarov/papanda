/**
 * stickers.js - Modular Entry Point & Global Bridge
 */
import { StickerRenderer } from './modules/StickerRenderer.js?v=2';
import { StickerService } from './modules/StickerService.js?v=2';
import { StickerModal } from './modules/StickerModal.js?v=2';
import { StickerOverview } from './modules/StickerOverview.js?v=2';

// Note Search Logic (Refactored to use StickerService)
let noteSearchTimeout = null;

async function searchNotesForSticker(query, immediate = false) {
    clearTimeout(noteSearchTimeout);
    const performSearch = async () => {
        const resultsEl = document.getElementById('noteSearchResults');
        if (!resultsEl) return;
        
        try {
            const notes = await StickerService.searchNotes(query);
            renderNoteSearchResults(notes);
        } catch (e) {
            console.error('Search failed:', e);
            resultsEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff5252;">Search failed: ${e.message}</div>`;
        }
    };

    if (immediate) performSearch();
    else noteSearchTimeout = setTimeout(performSearch, 300);
}

function renderNoteSearchResults(notes) {
    const container = document.getElementById('noteSearchResults');
    if (!container) return;
    if (notes.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No notes found</div>';
        return;
    }
    container.innerHTML = notes.map(n => {
        const escapedNote = n.note
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/\n/g, ' ')
            .substring(0, 200);
            
        return `
            <div class="note-search-item" onclick="attachNoteToSticker(${n.id}, '${escapedNote}')">
                <span class="note-category">${n.category || 'General'}</span>
                <div class="note-text">${n.note}</div>
            </div>
        `;
    }).join('');
}

function attachNoteToSticker(noteId, noteText) {
    StickerModal.state.noteId = noteId;
    StickerModal.updateAttachedNoteUI({ id: noteId, note: noteText });
    StickerModal.switchType('text'); // Ensure we are in text mode for attached notes
    window.closeNoteSelectionModal();
}

async function expandNoteOnSticker(noteId, cardEl, fullText = null) {
    let fullTextEl = cardEl.querySelector('.note-card-full-text');
    if (fullTextEl) {
        const isExpanded = fullTextEl.style.display !== 'none';
        fullTextEl.style.display = isExpanded ? 'none' : 'block';
        cardEl.classList.toggle('expanded', !isExpanded);
        return;
    }

    if (!fullText) {
        try {
            const notes = await StickerService.searchNotes(); 
            const found = notes.find(n => n.id === noteId);
            if (found) fullText = found.note;
        } catch(e) { console.error(e); }
    }

    if (fullText) {
        fullTextEl = document.createElement('div');
        fullTextEl.className = 'note-card-full-text';
        fullTextEl.innerHTML = fullText.replace(/\n/g, '<br>');
        cardEl.appendChild(fullTextEl);
        cardEl.classList.add('expanded');
    }
}

// Actions
async function archiveStickerGlobal(btn, id) {
    const confirmed = await window.NotificationService.confirm('Archive this thought? (It will be hidden from the dashboard)', { okText: 'Archive' });
    if (!confirmed) return;
    try {
        await StickerService.archive(id);
        const el = btn.closest('.sticker-thought') || btn.closest('.note-card');
        if (el) {
            el.style.opacity = '0.5';
            el.style.transform = 'scale(0.9)';
            setTimeout(() => el.remove(), 300);
        } else {
            if (typeof window.refreshDashboardStickers === 'function') window.refreshDashboardStickers();
            else location.reload();
        }
    } catch(e) { console.error(e); }
}

async function hardDeleteStickerGlobal(btn, id) {
    const confirmed = await window.NotificationService.confirm('PERMANENTLY DELETE this sticker? This cannot be undone.', { isDanger: true, okText: 'Delete Forever' });
    if (!confirmed) return;
    try {
        await StickerService.hardDelete(id);
        const el = btn.closest('.note-card') || btn.closest('.sticker-thought');
        if (el) {
            el.style.backgroundColor = 'var(--color-error-light)';
            el.style.opacity = '0.5';
            setTimeout(() => el.remove(), 300);
        } else {
            if (typeof window.refreshDashboardStickers === 'function') window.refreshDashboardStickers();
            else location.reload();
        }
    } catch(e) { console.error(e); }
}

// Global Bridge
window.openStickerModal = (opts) => StickerModal.open(opts);
window.closeStickerModal = () => StickerModal.close();
window.closeStickerDetail = () => StickerModal.close();
window.saveStickerDetail = () => StickerModal.save();
window.updateStickerPreview = () => StickerModal.updatePreview();
window.setStickerDetailType = (t) => StickerModal.switchType(t);
window.setStickerDetailColor = (c, b) => StickerModal.setColor(c, b);
window.setStickerModalMode = (m) => StickerModal.setMode(m);
window.archiveStickerGlobal = archiveStickerGlobal;
window.hardDeleteStickerGlobal = hardDeleteStickerGlobal;
window.deleteStickerFromModal = () => {
    if (StickerModal.state.id) archiveStickerGlobal(null, StickerModal.state.id);
    else StickerModal.close();
};


window.openParentStickers = (type, id) => StickerOverview.open(type, id);
window.closeParentStickersOverview = () => StickerOverview.close();
window.archiveStickerInOverview = (btn, id) => StickerOverview.archive(btn, id);
window.createNewStickerForCurrentParent = () => {
    StickerOverview.close();
    StickerModal.open({ parentType: StickerModal.state.parentType, parentId: StickerModal.state.parentId });
};

window.openNoteSelectionModal = () => {
    const modal = document.getElementById('noteSelectionModal');
    if (modal) modal.style.display = 'flex';
    document.getElementById('noteSearchInput').value = '';
    searchNotesForSticker('', true);
};
window.closeNoteSelectionModal = () => {
    const modal = document.getElementById('noteSelectionModal');
    if (modal) modal.style.display = 'none';
};
window.searchNotesForSticker = searchNotesForSticker;
window.attachNoteToSticker = attachNoteToSticker;
window.removeNoteFromSticker = () => {
    StickerModal.state.noteId = -1;
    document.getElementById('modalStickerAttachedNoteContainer').style.display = 'none';
};
window.expandNoteOnSticker = expandNoteOnSticker;

window.createNewNoteFromSticker = () => {
    window.closeNoteSelectionModal();
    window.noteCreationCallback = (noteId, noteText) => {
        attachNoteToSticker(noteId, noteText);
    };
    if (typeof window.openNoteExpandModal === 'function') {
        window.openNoteExpandModal();
    } else {
        if (typeof window.showToast === 'function') window.showToast('Error: Note editor not found', 'error');
    }
};

window.createStickerElement = (note, opts) => StickerRenderer.createStickerElement(note, opts);

// Hydration
document.addEventListener('DOMContentLoaded', () => {
    const placeholders = document.querySelectorAll('.sticker-thought-placeholder');
    placeholders.forEach(el => {
        const note = {
            id: el.dataset.id,
            text: el.dataset.text || '',
            title: el.dataset.title || '',
            color: el.dataset.color || '#fff9c4',
            type: el.dataset.type || 'text'
        };
        const noteDiv = StickerRenderer.createStickerElement(note);
        el.parentNode.replaceChild(noteDiv, el);
    });
});

async function refreshDashboardStickers() {
    const corkboard = document.getElementById('corkboard');
    if (!corkboard) return;
    try {
        const response = await fetch('/api/dashboard/widget/stickers');
        if (response.ok) {
            const html = await response.text();
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const newCorkboard = temp.querySelector('#corkboard');
            if (newCorkboard) {
                corkboard.innerHTML = newCorkboard.innerHTML;
                
                // Hydrate the new stickers
                const placeholders = corkboard.querySelectorAll('.sticker-thought-placeholder');
                placeholders.forEach(el => {
                    const note = {
                        id: el.dataset.id,
                        text: el.dataset.text || '',
                        title: el.dataset.title || '',
                        color: el.dataset.color || '#fff9c4',
                        type: el.dataset.type || 'text'
                    };
                    const noteDiv = StickerRenderer.createStickerElement(note);
                    el.parentNode.replaceChild(noteDiv, el);
                });
            }
        }
    } catch (e) { console.error('Failed to refresh dashboard stickers', e); }
}

window.refreshDashboardStickers = refreshDashboardStickers;

export { StickerRenderer, StickerService, StickerModal, StickerOverview };
