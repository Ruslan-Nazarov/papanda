/**
 * NoteHistoryManager.js - Управление историей открытых конспектов и навигацией по холсту (goToBlock)
 */
import { customConfirm } from '../../modal_controller.js';

export const NoteHistoryManager = {
    getNoteHistory() {
        try {
            const data = sessionStorage.getItem('dialectics_note_history');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    saveNoteHistory(history) {
        try {
            sessionStorage.setItem('dialectics_note_history', JSON.stringify(history));
        } catch (e) {}
    },

    async loadPreviousNote(ctx) {
        if (ctx.state.isDirty) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title', 'Внимание') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_msg', 'Есть несохранённые изменения. Продолжить?') : "Есть несохранённые изменения. Продолжить?",
                icon: '',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel', 'Отмена') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.continue_btn', 'Продолжить') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (!confirmed) return;
        }
        ctx.state.isDirty = false;

        const history = ctx.getNoteHistory();
        if (history.length > 0) {
            const prevId = history.pop();
            ctx.saveNoteHistory(history);
            ctx.loadNoteToEditor(prevId, false);
            window.showToast(window._("toast.loaded_previous_note"), "info");
        } else {
            window.location.href = '/';
        }
    },

    goToBlock(ctx, blockId) {
        if (window.closeParentStickersOverview) {
            window.closeParentStickersOverview();
        }
        const canvas = document.getElementById('dialecticsCanvas');
        if (!canvas) return;
        const blockEl = canvas.querySelector(`[data-block-id="${blockId}"]`);
        if (blockEl) {
            blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            blockEl.style.boxShadow = '0 0 0 4px #3b82f6, 0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            blockEl.style.transform = 'scale(1.02)';
            blockEl.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                blockEl.style.boxShadow = '';
                blockEl.style.transform = '';
            }, 2000);
        } else {
            if (window.showToast) window.showToast("Блок не найден на холсте", "warning");
        }
    }
};
