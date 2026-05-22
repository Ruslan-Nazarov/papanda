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
            const r = await fetch('/edit_chrono_inline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: parseInt(id), title, date })
            });
            const data = await r.json();
            if (data.status === 'success') {
                ModalManager.close('editChronoModal');
                if (window.showToast) window.showToast('Chronology entry updated', 'success');
                this._updateRow(id, title, date);
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
    },

    closeChronoViewModal() {
        ModalManager.close('chronoViewModal');
    },

    _updateRow(id, title, date) {
        // Since Chronology view uses a complex grid with filters,
        // it is safest to reload to ensure the card moves to the right section (Recent/Archive)
        // if the date was changed.
        location.reload();
    }
};

// Global export
window.ChronoService = ChronoService;
window.openEditChronoModal = (...args) => ChronoService.openEdit(...args);
window.closeEditChronoModal = () => ModalManager.close('editChronoModal');
window.saveChronoEdit = () => ChronoService.save();
window.openChronoViewModal = (...args) => ChronoService.openView(...args);
window.closeChronoViewModal = () => ModalManager.close('chronoViewModal');
