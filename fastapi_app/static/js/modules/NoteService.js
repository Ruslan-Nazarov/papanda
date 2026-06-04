/**
 * NoteService.js - Logic for managing notes in the DB View.
 */

import { ModalManager } from './ModalManager.js';
import { fetchWithJson } from '../db_api.js';

export const NoteService = {
    openEdit(id, text, category) {
        console.log("[NoteService] Opening edit for ID:", id);
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
        
        if (!note) {
            if (window.showToast) window.showToast('Note content cannot be empty', 'error');
            return;
        }
        
        try {
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
                if (window.showToast) window.showToast(data.message || 'Save failed', 'error');
            }
        } catch (e) {
            console.error("[NoteService] save error:", e);
        }
    },

    showAddCategoryModal() {
        const modal = document.getElementById('addCategoryModal');
        const input = document.getElementById('newCategoryName');
        if (modal) {
            modal.style.display = 'flex';
            if (input) {
                input.value = '';
                setTimeout(() => input.focus(), 100);
            }
        }
    },

    async saveNewCategory() {
        const input = document.getElementById('newCategoryName');
        if (!input || !input.value.trim()) {
            if (typeof window.showToast === 'function') window.showToast("Category name cannot be empty", "error");
            return;
        }

        const name = input.value.trim();
        try {
            const res = await fetch('/api/notes/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name })
            });

            if (res.ok) {
                if (typeof window.showToast === 'function') window.showToast(`✓ Category "${name}" added`, "success");
                document.getElementById('addCategoryModal').style.display = 'none';
                
                this.updateCategorySelects(name);
            } else {
                const err = await res.json();
                if (typeof window.showToast === 'function') window.showToast(err.detail || "Error adding category", "error");
            }
        } catch (e) {
            console.error("[NoteService] Failed to add category:", e);
        }
    },

    updateCategorySelects(newName) {
        const selects = ['regularNoteCategory', 'expandedNoteCategory', 'editNoteCategory'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const opt = document.createElement('option');
                opt.value = newName;
                opt.text = newName;
                el.add(opt);
                el.value = newName;
            }
        });
    },

    openView(id, text, category, stickers = []) {
        const viewText = document.getElementById('noteViewFullText');
        const viewCat = document.getElementById('noteViewCategory');
        const stickerBoard = document.getElementById('dbViewNoteStickerBoard');
        const stickersList = document.getElementById('dbViewNoteStickersList');
        const addBtn = document.getElementById('addStickerToNoteBtn');

        if (viewText) viewText.innerHTML = text; 
        if (viewCat) viewCat.textContent = category || 'No Category';

        if (stickerBoard && stickersList) {
            stickerBoard.style.display = 'block';
            stickersList.innerHTML = '';
            
            if (stickers && stickers.length > 0) {
                stickers.forEach(s => {
                    if (typeof window.createStickerElement === 'function') {
                        const el = window.createStickerElement(s, { 
                            isWidget: true, 
                            onClick: () => {
                                if (typeof window.openStickerModal === 'function') {
                                    window.openStickerModal({ id: s.id });
                                }
                            }
                        });
                        stickersList.appendChild(el);
                    }
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

    closeEditNoteModal() {
        ModalManager.close('editNoteModal');
    },

    closeNoteViewModal() {
        ModalManager.close('noteViewModal');
    },

    _updateRow(id, text, category) {
        const card = document.querySelector(`.note-card[data-id="${id}"]`);
        if (card) {
            const catEl = card.querySelector('.note-cat');
            const textEl = card.querySelector('.note-text');
            if (catEl) catEl.textContent = category || 'Uncategorized';
            if (textEl) textEl.textContent = text;
            
            // Re-fetch or reload if complex. For now, we try to update without reload
            // but location.reload() is safer if onclick is stale.
            // Let's try to be smart.
            if (card.onclick) {
                // If it's on a card in DB view, it likely has a complex onclick.
                // For simplicity in this turn, reload is fine to ensure all data-attributes and onclicks are fresh.
                if (window.refreshCurrentView) window.refreshCurrentView('Notes');
                else location.reload();
            }
        } else {
            if (window.refreshCurrentView) window.refreshCurrentView('Notes');
            else location.reload();
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
window.showAddCategoryModal = () => NoteService.showAddCategoryModal();
window.saveNewCategory = () => NoteService.saveNewCategory();
