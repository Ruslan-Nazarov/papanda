/**
 * DashboardActionService.js - Handles optimistic UI updates and AJAX form submissions.
 */

import { showToast } from './NotificationService.js';

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
            const formData = new FormData(form);
            const jsonData = Object.fromEntries(formData.entries());
            
            // Handle checkbox for Pydantic boolean
            if (jsonData.sticker_apply_series !== undefined) {
                jsonData.sticker_apply_series = formData.has('sticker_apply_series');
            }

            const response = await fetch('/submit_form_json', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonData) 
            });
            
            const data = await response.json();
            if (response.ok && data.status === 'success') {
                showToast('✓ ' + (data.message || 'Saved'), 'success');
                form.reset();
                if (window.syncCategoryStickerVisibility) window.syncCategoryStickerVisibility();
                if (window.setHeaderColor) window.setHeaderColor('', document.querySelector('.bg-none'));
                
                // Refresh badges immediately
                if (window.HeaderService) window.HeaderService.refreshBadges();

                // Selective refresh based on category
                const cat = jsonData.common_category;
                if (cat === 'event' || cat === 'important') {
                    if (typeof window.refreshDashboardEvents === 'function') window.refreshDashboardEvents();
                } else if (cat === 'task') {
                    if (typeof window.refreshDashboardTasks === 'function') window.refreshDashboardTasks();
                } else if (cat === 'habits') {
                    if (typeof window.refreshDashboardHabits === 'function') window.refreshDashboardHabits();
                } else if (cat === 'note') {
                    if (window.notesWidget && typeof window.notesWidget.refreshPinnedNotes === 'function') window.notesWidget.refreshPinnedNotes();
                } else if (cat === 'observation') {
                    if (typeof window.refreshDashboardObservations === 'function') window.refreshDashboardObservations();
                } else if (cat === 'sticker') {
                    if (typeof window.refreshDashboardStickers === 'function') window.refreshDashboardStickers();
                } else {
                    // Fallback for metadata types like wink, count until, etc. that are hardcoded in the header layout
                    setTimeout(() => location.reload(), 500);
                }
            } else {
                const errorMsg = data.detail ? (Array.isArray(data.detail) ? data.detail[0].msg : data.detail) : (data.message || 'Error saving');
                showToast('⚠ ' + errorMsg, 'error');
            }
        } catch (error) {
            console.error('[ActionService] Submit form error:', error);
            showToast('⚠ Network error', 'error');
        }
    }
};

window.submitCommonForm = (e) => DashboardActionService.handleMainFormSubmit(e);
