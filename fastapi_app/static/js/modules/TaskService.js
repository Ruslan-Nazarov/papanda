/**
 * TaskService.js - Logic for managing tasks in the DB View.
 */

import { ModalManager } from './ModalManager.js';
import { fetchWithJson } from '../db_api.js';

export const TaskService = {
    openEdit(id, name, done) {
        document.getElementById('editTaskId').value = id || '';
        document.getElementById('editTaskName').value = name || '';
        document.getElementById('editTaskDone').checked = !!done;
        ModalManager.open('editTaskModal');
    },

    async save() {
        const id = document.getElementById('editTaskId').value;
        const name = document.getElementById('editTaskName').value.trim();
        const done = document.getElementById('editTaskDone').checked;
        
        if (!name) return;
        
        try {
            const r = await fetchWithJson(`/edit_task_inline`, { id: parseInt(id), name, done });
            if (r.ok) {
                ModalManager.close('editTaskModal');
                if (window.refreshCurrentView) window.refreshCurrentView('Task');
                else location.reload(); // Tasks often change position or list, so reload is safer
            }
        } catch (e) {
            console.error("[TaskService] save error:", e);
        }
    }
};

// Global export
window.TaskService = TaskService;
window.openEditTaskModal = (...args) => TaskService.openEdit(...args);
window.closeEditTaskModal = () => ModalManager.close('editTaskModal');
window.saveTaskEdit = () => TaskService.save();
