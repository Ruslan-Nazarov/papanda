/**
 * NoteService.js - Logic for managing notes in the DB View.
 */

import { ModalManager } from './ModalManager.js';
import { fetchWithJson } from '../db_api.js';

export const NoteService = {
    openEdit(id, text, category) {
        const fields = {
            'editNoteId': id || '',
            'editNoteText': text || '',
            'editNoteCategory': category || ''
        };
        for (const [key, val] of Object.entries(fields)) {
            const el = document.getElementById(key);
            if (el) el.value = val;
        }
        ModalManager.open('editNoteModal');
    },

    async save() {
        const id = document.getElementById('editNoteId').value;
        const note = document.getElementById('editNoteText').value.trim();
        const category = document.getElementById('editNoteCategory').value;
        
        if (!note) return;
        
        try {
            // Using the dedicated inline endpoint which expects JSON (GenericUpdateSchema)
            const r = await fetch('/edit_note_inline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: parseInt(id), note, category })
            });
            const data = await r.json();
            if (data.status === 'success') {
                ModalManager.close('editNoteModal');
                this._updateRow(id, note, category);
                if (window.showToast) window.showToast('Note updated', 'success');
            } else {
                console.error("[NoteService] save failed:", data.message);
            }
        } catch (e) {
            console.error("[NoteService] save error:", e);
        }
    },

    openView(id, text, category, stickers = []) {
        const viewText = document.getElementById('noteViewFullText');
        const viewCat = document.getElementById('noteViewCategory');
        const stickerBoard = document.getElementById('dbViewNoteStickerBoard');
        const stickersList = document.getElementById('dbViewNoteStickersList');
        const addBtn = document.getElementById('addStickerToNoteBtn');

        if (viewText) viewText.innerHTML = text; // Content
        if (viewCat) viewCat.textContent = category || 'No Category';

        // Stickers logic
        if (stickerBoard && stickersList) {
            stickerBoard.style.display = 'block';
            stickersList.innerHTML = '';
            
            if (stickers && stickers.length > 0) {
                stickers.forEach(s => {
                    const sCard = document.createElement('div');
                    sCard.className = 'mini-sticker-card';
                    sCard.style.cssText = `
                        background-color: ${s.color || '#fff9c4'};
                        padding: 10px;
                        border-radius: 8px;
                        min-width: 110px;
                        max-width: 170px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        font-size: 0.85em;
                        cursor: pointer;
                        border: 1px solid rgba(0,0,0,0.05);
                    `;
                    
                    let content = s.title ? `<div style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 2px;">${s.title}</div>` : '';
                    content += `<div style="color: #334155; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">${s.text}</div>`;
                    
                    sCard.innerHTML = content;
                    sCard.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof window.openStickerModal === 'function') {
                            window.openStickerModal({ id: s.id });
                        }
                    };
                    stickersList.appendChild(sCard);
                });
            } else {
                stickersList.innerHTML = '<div style="font-size: 0.85em; color: #94a3b8; font-style: italic;">No stickers linked to this note</div>';
            }

            if (addBtn) {
                addBtn.onclick = () => {
                    if (typeof window.openStickerModal === 'function') {
                        window.openStickerModal({ 
                            parentType: 'note', 
                            parentId: id,
                            source: 'parent'
                        });
                    }
                };
            }
        }

        ModalManager.open('noteViewModal');
    },

    _updateRow(id, text, category) {
        // Find the card in the grid (Note View uses cards, not table rows usually)
        const card = document.querySelector(`.note-card[data-id="${id}"]`);
        if (card) {
            const catEl = card.querySelector('.note-cat');
            const textEl = card.querySelector('.note-text');
            if (catEl) catEl.textContent = category || 'Uncategorized';
            if (textEl) textEl.textContent = text;
            
            // Update the onclick handler with new data
            // We need to re-fetch the stickers or just reload for simplicity if complex
            // But for now, let's just reload to be safe with all the data
            location.reload();
        } else {
            location.reload();
        }
    }
};

// Global export
window.NoteService = NoteService;
window.openEditNoteModal = (...args) => NoteService.openEdit(...args);
window.closeEditNoteModal = () => ModalManager.close('editNoteModal');
window.saveNoteEdit = () => NoteService.save();
window.openNoteViewModal = (...args) => NoteService.openView(...args);
window.closeNoteViewModal = () => ModalManager.close('noteViewModal');
