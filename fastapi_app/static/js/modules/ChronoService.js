import { ModalManager } from './ModalManager.js';
import { EditorSync } from './EditorSync.js';

export const ChronoService = {
    openEdit(id, title, date) {
        console.log("[ChronoService] Opening edit for ID:", id);
        const fields = {
            'editChronoId': id || '',
            'editChronoTitle': title || '',
            'editChronoDate': date ? date.replace(' ', 'T').substring(0, 16) : ''
        };
        for (const [key, val] of Object.entries(fields)) {
            const el = document.getElementById(key);
            if (el) el.value = val;
        }
        
        const header = document.getElementById('chronoModalHeader');
        if (header) {
            header.innerHTML = '<span style="color: var(--color-primary);">📅</span> ' + (id ? 'Edit Chronology Entry' : 'Add Chronology Entry');
        }

        if (document.getElementById('editChronoError')) {
            document.getElementById('editChronoError').innerText = '';
        }
        ModalManager.open('editChronoModal');
    },

    async save() {
        const id = document.getElementById('editChronoId').value;
        const title = document.getElementById('editChronoTitle').value.trim();
        const date = document.getElementById('editChronoDate').value;
        const errEl = document.getElementById('editChronoError');
        
        if (!title || !date) {
            if (errEl) errEl.innerText = "Title and Date are required";
            return;
        }
        
        try {
            let resp;
            if (id) {
                resp = await fetch('/edit_chrono_inline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: parseInt(id), title, date })
                });
            } else {
                const formData = new FormData();
                formData.append('chrono_text', title);
                formData.append('chrono_date', date);
                resp = await fetch('/submit_chrono_json', { method: 'POST', body: formData });
            }

            const data = await resp.json();
            if (data.status === 'success') {
                ModalManager.close('editChronoModal');
                if (window.showToast) window.showToast('✓ ' + (data.message || 'Saved'), 'success');
                
                const wText = document.getElementById('chronoWidgetText');
                if (wText) wText.value = '';
                
                if (!id) {
                    // Force refresh chronology view if it was a new record
                    if (window.refreshCurrentView) window.refreshCurrentView('Chronology');
                } else {
                    this._updateRow(id, title, date);
                }
            } else {
                if (errEl) errEl.innerText = data.message || "Save failed";
            }
        } catch (e) {
            console.error("[ChronoService] save error:", e);
            if (errEl) errEl.innerText = "Network error";
        }
    },

    openView(date, text) {
        const viewDate = document.getElementById('chronoViewDate');
        const viewText = document.getElementById('chronoViewFullText');
        if (viewDate) viewDate.textContent = date;
        if (viewText) viewText.textContent = text; 
        ModalManager.open('chronoViewModal');
    },

    closeEditChronoModal() {
        ModalManager.close('editChronoModal');
        
        // Only sync back if it was a NEW record
        if (!this.currentId) {
            const expTa = document.getElementById('editChronoTitle');
            const wText = document.getElementById('chronoWidgetText');
            if (expTa && wText) wText.value = expTa.value;
            
            const expDate = document.getElementById('editChronoDate');
            const wDate = document.getElementById('chronoWidgetDate');
            if (expDate && wDate) wDate.value = expDate.value;
        }

        this.currentId = null;
    },

    closeChronoViewModal() {
        ModalManager.close('chronoViewModal');
    },

    _updateRow(id, title, date) {
        // Since Chronology view uses a complex grid with filters,
        // it is safest to reload to ensure the card moves to the right section (Recent/Archive)
        // if the date was changed.
        if (window.refreshCurrentView) window.refreshCurrentView('Chronology');
        else location.reload();
    }
};

// Global export
window.ChronoService = ChronoService;
window.openEditChronoModal = (...args) => ChronoService.openEdit(...args);
window.closeEditChronoModal = () => ModalManager.close('editChronoModal');
window.saveChronoEdit = () => ChronoService.save();
window.openChronoViewModal = (...args) => ChronoService.openView(...args);
window.closeChronoViewModal = () => ModalManager.close('chronoViewModal');
