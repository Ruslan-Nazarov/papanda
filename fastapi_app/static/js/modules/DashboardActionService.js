/**
 * DashboardActionService.js - Handles optimistic UI updates and AJAX form submissions.
 */

import { showToast } from '../ui_helpers.js';

export const DashboardActionService = {
    init() {
        // Intercept all mark-done form submits for optimistic UI
        document.addEventListener('submit', (e) => this._handleMarkDone(e));
        
        // Main form submission
        const mainForm = document.getElementById('common_form');
        if (mainForm) {
            mainForm.addEventListener('submit', (e) => this.handleMainFormSubmit(e));
        }
    },

    async _handleMarkDone(e) {
        const form = e.target;
        if (!form.action) return;

        const isEvent = form.action.includes('/mark_event_done/');
        const isTask  = form.action.includes('/mark_done/');
        const isHabit = form.action.includes('/mark_as_done/');

        if (isEvent || isTask || isHabit) {
            e.preventDefault();
            const btn = form.querySelector('button, input[type="submit"]');
            const li  = form.closest('li, tr');

            try {
                const resp = await fetch(form.action, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' }
                });

                if (resp.ok) {
                    const data  = await resp.json();
                    const isDone = data.done || data.status === 'success';

                    if (isDone) {
                        let msg = isEvent ? 'Event completed' : (isTask ? 'Task completed' : 'Habit updated');
                        showToast(msg, 'success');

                        if (isEvent || isTask) {
                            if (li) {
                                li.classList.add('fade-out');
                                setTimeout(() => li.remove(), 400);
                            }
                        } else if (isHabit && btn) {
                            btn.disabled = true;
                            btn.style.opacity = '0.5';
                            if (btn.tagName === 'INPUT') btn.value = '✓';
                            else btn.innerHTML = '✓';
                        }
                    } else {
                        showToast('Status: Pending', 'info');
                    }
                } else {
                    showToast('Failed to update status', 'error');
                }
            } catch (err) {
                console.error('[ActionService] Error:', err);
                showToast('Network error', 'error');
            }
        }
    },

    async handleMainFormSubmit(e) {
        if (e) e.preventDefault();
        const form = e.target;
        try {
            const response = await fetch('/submit_form_json', { method: 'POST', body: new FormData(form) });
            const data = await response.json();
            if (data.status === 'success') {
                showToast('✓ ' + (data.message || 'Saved'), 'success');
                form.reset();
                if (window.updateHeaderStickerUI) window.updateHeaderStickerUI(false);
                if (window.syncCategoryStickerVisibility) window.syncCategoryStickerVisibility();
                if (window.setHeaderColor) window.setHeaderColor('', document.querySelector('.bg-none'));
                setTimeout(() => location.reload(), 500);
            } else {
                showToast('⚠ ' + (data.message || 'Error saving'), 'error');
            }
        } catch (error) {
            console.error('[ActionService] Submit form error:', error);
            showToast('⚠ Network error', 'error');
        }
    }
};

window.submitCommonForm = (e) => DashboardActionService.handleMainFormSubmit(e);
