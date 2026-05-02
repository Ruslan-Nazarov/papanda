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
        const text = document.getElementById('editNoteText').value.trim();
        const category = document.getElementById('editNoteCategory').value;
        
        if (!text) return;
        
        try {
            const r = await fetchWithJson(`/edit_record/Notes/${id}`, { text, category });
            if (r.ok) {
                ModalManager.close('editNoteModal');
                this._updateRow(id, text, category);
                if (window.showToast) window.showToast('Note updated', 'success');
            }
        } catch (e) {
            console.error("[NoteService] save error:", e);
        }
    },

    openView(text, category) {
        const viewText = document.getElementById('noteViewFullText');
        const viewCat = document.getElementById('noteViewCategory');
        if (viewText) viewText.innerHTML = text; // Consider using a safer way if text contains HTML
        if (viewCat) viewCat.textContent = category || 'No Category';
        ModalManager.open('noteViewModal');
    },

    _updateRow(id, text, category) {
        const btn = document.querySelector(`button[onclick*="'${id}'"]`);
        if (btn) {
            const tr = btn.closest('tr');
            if (tr) {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 2) tds[0].textContent = text.substring(0, 50) + (text.length > 50 ? '...' : '');
                if (tds.length >= 3) tds[2].textContent = category || 'General';
            }
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
