/**
 * RecordService.js - Unified deletion and record management logic.
 */

import { customConfirm, customChoice } from '../modal_controller.js';
import { deleteRecordApi } from '../db_api.js';

export const RecordService = {
    /**
     * Deletes a record with optional recurrence handling and optimistic UI updates.
     */
    async delete(modelName, recordId, isRecurring = false) {
        let confirmed = false;
        let deleteMode = 'only';

        try {
            if (modelName === 'Event' && isRecurring) {
                const choice = await customChoice({
                    title: 'Delete Recurring Event',
                    messageHTML: 'Choose how to delete this recurring event:',
                    options: [
                        { value: 'only', label: 'Delete only this occurrence', checked: true },
                        { value: 'this_and_future', label: 'Delete this and all future occurrences' },
                        { value: 'future_only', label: 'Keep this, delete future occurrences' },
                        { value: 'all', label: 'Delete ALL occurrences in the series' }
                    ],
                    okLabel: 'Delete',
                    cancelLabel: 'Cancel'
                });
                if (choice === null) return;
                confirmed = true;
                deleteMode = choice;
            } else {
                confirmed = await customConfirm({
                    title: 'Confirm Deletion',
                    message: `Are you sure you want to delete this ${modelName}?`,
                    buttons: [
                        { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                        { label: 'Delete', value: true, class: 'confirm-btn-danger' }
                    ]
                });
            }

            if (confirmed) {
                const resp = await deleteRecordApi(modelName, recordId, deleteMode);
                if (resp.ok) {
                    this._performOptimisticDelete(modelName, recordId, deleteMode);
                }
            }
        } catch (e) {
            console.error("[RecordService] Deletion error:", e);
            if (window.showToast) window.showToast(e.message, 'error');
            else alert(e.message);
        }
    },

    /**
     * Private helper to remove elements from DOM without reload.
     */
    _performOptimisticDelete(modelName, recordId, deleteMode) {
        if (modelName === 'Event' && deleteMode !== 'only') {
            const wrapper = document.querySelector('.calendar-wrapper') || 
                          document.querySelector('.table-container') || 
                          document.querySelector('.settings-wrapper');
            if (wrapper) {
                wrapper.style.transition = 'opacity 0.3s ease-out';
                wrapper.style.opacity = '0';
            }
            setTimeout(() => location.reload(), 300);
            return;
        }

        const eventCard = document.querySelector(`[data-id="${recordId}"]`);
        const tableBtns = document.querySelectorAll(`button[onclick*="'${recordId}'"]`);
        
        let found = false;
        if (eventCard) {
            eventCard.classList.add('fade-out');
            setTimeout(() => eventCard.remove(), 300);
            found = true;
        } 
        
        if (tableBtns.length > 0) {
            tableBtns.forEach(btn => {
                const tr = btn.closest('tr');
                if (tr) {
                    tr.classList.add('fade-out-row');
                    setTimeout(() => tr.remove(), 300);
                    found = true;
                }
            });
        }
        
        if (!found) {
            location.reload();
        } else {
            if (window.showToast) window.showToast(`${modelName} deleted`, 'success');
        }
    }
};

// Global export for legacy HTML calls
window.deleteRecordCustom = (m, i, r) => RecordService.delete(m, i, r);
