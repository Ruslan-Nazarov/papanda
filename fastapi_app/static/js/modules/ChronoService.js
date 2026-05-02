/**
 * ChronoService.js - Logic for managing chronology in the DB View.
 */

import { ModalManager } from './ModalManager.js';
import { fetchWithJson } from '../db_api.js';

export const ChronoService = {
    openEdit(id, title, date) {
        document.getElementById('editChronoId').value = id || '';
        document.getElementById('editChronoTitle').value = title || '';
        document.getElementById('editChronoDate').value = date || '';
        ModalManager.open('editChronoModal');
    },

    async save() {
        const id = document.getElementById('editChronoId').value;
        const title = document.getElementById('editChronoTitle').value.trim();
        const date = document.getElementById('editChronoDate').value;
        
        if (!title || !date) return;
        
        try {
            const r = await fetchWithJson(`/edit_record/Chronology/${id}`, { title, date });
            if (r.ok) {
                ModalManager.close('editChronoModal');
                this._updateRow(id, title, date);
                if (window.showToast) window.showToast('Chronology updated', 'success');
            }
        } catch (e) {
            console.error("[ChronoService] save error:", e);
        }
    },

    openView(date, text) {
        const viewDate = document.getElementById('chronoViewDate');
        const viewText = document.getElementById('chronoViewFullText');
        if (viewDate) viewDate.textContent = date;
        if (viewText) viewText.innerHTML = text;
        ModalManager.open('chronoViewModal');
    },

    _updateRow(id, title, date) {
        const btn = document.querySelector(`button[onclick*="'${id}'"]`);
        if (btn) {
            const tr = btn.closest('tr');
            if (tr) {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 2) tds[0].textContent = title.substring(0, 50) + (title.length > 50 ? '...' : '');
                if (tds.length >= 3) tds[2].textContent = date;
            }
        } else {
            location.reload();
        }
    }
};

// Global export
window.ChronoService = ChronoService;
window.openEditChronoModal = (...args) => ChronoService.openEdit(...args);
window.closeEditChronoModal = () => ModalManager.close('editChronoModal');
window.saveChronoEdit = () => ChronoService.save();
window.openChronoViewModal = (...args) => ChronoService.openView(...args);
window.closeChronoViewModal = () => ModalManager.close('chronoViewModal');
