/**
 * HabitService.js - Logic for managing habits in the DB View.
 */

import { ModalManager } from './ModalManager.js';

export const HabitService = {
    openEdit(id, title, start, end, read) {
        document.getElementById('editHabitId').value = id || '';
        document.getElementById('editHabitTitle').value = title || '';
        document.getElementById('editHabitStartDate').value = start || '';
        document.getElementById('editHabitEndDate').value = end || '';
        document.getElementById('editHabitRead').checked = !!read;
        ModalManager.open('editHabitModal');
    },

    async save() {
        const id = document.getElementById('editHabitId').value;
        const title = document.getElementById('editHabitTitle').value.trim();
        const start = document.getElementById('editHabitStartDate').value;
        const end = document.getElementById('editHabitEndDate').value;
        const read = document.getElementById('editHabitRead').checked;
        
        if (!title) return;
        
        try {
            const r = await fetch(`/edit_record/Habit/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, start_date: start, end_date: end || null, read })
            });
            if (r.ok) {
                ModalManager.close('editHabitModal');
                if (window.refreshCurrentView) window.refreshCurrentView('Habit');
                else location.reload();
            }
        } catch (e) {
            console.error("[HabitService] save error:", e);
        }
    }
};

// Global export
window.HabitService = HabitService;
window.openEditHabitModal = (...args) => HabitService.openEdit(...args);
window.closeEditHabitModal = () => ModalManager.close('editHabitModal');
window.saveHabitEdit = () => HabitService.save();
