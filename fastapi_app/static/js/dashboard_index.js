/**
 * dashboard_index.js — Dashboard orchestrator.
 *
 * This file is intentionally thin. All feature logic lives in dedicated modules:
 *   event_widget.js      — Event edit/delete modal
 *   word_widget.js       — Word learning widget
 *   recurrence_form.js   — Recurrence controls in the add-form
 *   sticker_widget.js    — Sticky Thoughts corkboard
 *   note_chrono_widget.js — Note & Chronology expand modals, language rule widget
 *
 * Responsibilities kept here:
 *   - Module initialization orchestration
 *   - GridStack layout init
 *   - Drag-and-drop (Sortable) for tasks / events / corkboard
 *   - Modal backdrop click-to-close
 *   - AJAX submit for the main common_form
 *   - Optimistic UI for mark-done forms
 *   - Header color picker
 */

import { customConfirm, customChoice } from './modal_controller.js';
import { deleteRecordApi, fetchWithJson } from './db_api.js';
import { toggleWidget, applyCollapsedState, saveLayout } from './grid_controller.js';
import { showToast, calculateEndDate } from './ui_helpers.js';

import { initEventWidget }       from './event_widget.js';
import { initWordWidget }        from './word_widget.js';
import { initRecurrenceForm }    from './recurrence_form.js';
import { initStickerWidget }     from './sticker_widget.js';
import { initNoteChronoWidget }  from './note_chrono_widget.js';

window.toggleWidget = toggleWidget;
window.showToast    = showToast;

document.addEventListener('DOMContentLoaded', async function () {

    // ── Initialize feature modules ────────────────────────────────────────────
    initEventWidget();
    initWordWidget();
    initRecurrenceForm();
    await initStickerWidget();   // async: loads stickers from API
    initNoteChronoWidget();

    // ── Optimistic UI: Intercept mark-done form submits ───────────────────────
    document.addEventListener('submit', async (e) => {
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
                        let msg = 'Completed';
                        if (isEvent) msg = 'Event completed';
                        if (isTask)  msg = 'Task completed';
                        if (isHabit) msg = 'Habit updated';
                        showToast(msg, 'success');

                        if (isEvent || isTask) {
                            if (li) { li.classList.add('fade-out'); setTimeout(() => li.remove(), 400); }
                        } else if (isHabit) {
                            if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.value = '✓'; }
                        }
                    } else {
                        showToast('Status: Pending', 'info');
                    }
                } else {
                    showToast('Failed to update status', 'error');
                }
            } catch (err) {
                console.error('[OptimisticUI] Error:', err);
                showToast('Network error', 'error');
            }
        }
    });

    // ── GridStack layout init ─────────────────────────────────────────────────
    let grid = null;
    try {
        grid = window.grid = GridStack.init({
            cellHeight: 45,
            margin: 10,
            handle: '.drag-handle',
            minRow: 1,
            animate: false
        });

        const savedLayout = window.P_DASHBOARD_LAYOUT;
        if (grid && savedLayout && Object.keys(savedLayout).length > 0) {
            Object.values(savedLayout).forEach(item => {
                const el = document.querySelector(`.grid-stack-item[gs-id="${item.id}"]`);
                if (el) grid.update(el, { x: item.x, y: item.y, w: item.w, h: item.h });
            });
        }
    } catch (e) {
        console.error('GridStack initialization failed:', e);
    }

    const gridStackEl = document.querySelector('.grid-stack');
    if (gridStackEl) gridStackEl.style.visibility = 'visible';

    applyCollapsedState();

    if (grid) grid.on('change', saveLayout);

    // ── Header Color Picker ───────────────────────────────────────────────────
    window.toggleHeaderColorPicker = function (e) {
        if (e) e.stopPropagation();
        const popup = document.getElementById('headerColorPickerPopup');
        if (!popup) return;
        const isShown = popup.style.display === 'flex';
        const btn  = document.getElementById('headerColorBtn');
        const rect = btn.getBoundingClientRect();
        popup.style.left = (rect.left + window.scrollX - 50) + 'px';
        popup.style.top  = (rect.bottom + window.scrollY + 5) + 'px';
        popup.style.display = isShown ? 'none' : 'flex';
    };

    window.setHeaderColor = function (color, el) {
        const input     = document.getElementById('headerCommonColor');
        const indicator = document.getElementById('headerColorIndicator');
        if (input)     input.value = color;
        if (indicator) indicator.style.background = color || '#e0e0e0';

        document.querySelectorAll('#headerColorPickerPopup .color-dot').forEach(d => d.classList.remove('active'));
        if (el) el.classList.add('active');

        const popup = document.getElementById('headerColorPickerPopup');
        if (popup) popup.style.display = 'none';
    };

    window.addEventListener('click', function (e) {
        const popup = document.getElementById('headerColorPickerPopup');
        const btn   = document.getElementById('headerColorBtn');
        if (popup && popup.style.display === 'flex') {
            if (!popup.contains(e.target) && !btn.contains(e.target)) {
                popup.style.display = 'none';
            }
        }
    });

    // ── Main form AJAX submit ─────────────────────────────────────────────────
    window.submitCommonForm = async function (e) {
        if (e) e.preventDefault();
        const form = document.getElementById('common_form');
        if (!form) return;
        try {
            const response = await fetch('/submit_form_json', { method: 'POST', body: new FormData(form) });
            const data = await response.json();
            if (data.status === 'success') {
                showToast('✓ ' + (data.message || 'Saved'), 'success');
                form.reset();
                window.updateHeaderStickerUI(false);
                window.syncCategoryStickerVisibility();
                setHeaderColor('', document.querySelector('.bg-none'));
                setTimeout(() => location.reload(), 500);
            } else {
                showToast('⚠ ' + (data.message || 'Error saving'), 'error');
            }
        } catch (error) {
            console.error('Submit form error:', error);
            showToast('⚠ Network error', 'error');
        }
    };

    const mainFormElem = document.getElementById('common_form');
    if (mainFormElem) mainFormElem.addEventListener('submit', window.submitCommonForm);

    // ── Drag-and-Drop (Sortable) ──────────────────────────────────────────────

    // Tasks
    const taskList = document.querySelector('.task-list');
    if (taskList) {
        Sortable.create(taskList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function () {
                const ids = Array.from(taskList.querySelectorAll('.task-item')).map(el => el.dataset.id);
                fetch('/api/dnd/reorder_tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ids.map(id => parseInt(id)))
                });
            }
        });
    }

    // Events Today / Tomorrow
    const todayList    = document.querySelector('.events-today ul');
    const tomorrowList = document.querySelector('.events-tomorrow ul');
    if (todayList && tomorrowList) {
        const sortableOptions = {
            group: 'events',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async function (evt) {
                const { item, to, from } = evt;
                const eventId = item.dataset.id;
                if (to === from) {
                    const ids = Array.from(to.querySelectorAll('li')).map(el => el.dataset.id);
                    fetch('/api/dnd/reorder_events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(ids.map(id => parseInt(id)))
                    });
                } else {
                    const newDate  = to.closest('.events-today') ? 'today' : 'tomorrow';
                    const response = await fetch('/api/dnd/move_event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event_id: parseInt(eventId), new_date: newDate })
                    });
                    if (response.ok) showToast(`✓ Moved to ${newDate}`, 'success');
                }
            }
        };
        Sortable.create(todayList,    sortableOptions);
        Sortable.create(tomorrowList, sortableOptions);
    }

    // Corkboard sticker reorder
    const corkboard = document.getElementById('corkboard');
    if (corkboard) {
        Sortable.create(corkboard, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function () {
                const ids = Array.from(corkboard.querySelectorAll('.sticker-thought')).map(el => el.dataset.id);
                fetch('/api/stickers/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ids.map(id => parseInt(id)))
                }).then(res => {
                    if (res.ok) showToast('Order saved', 'success');
                }).catch(e => console.error('Failed to save order:', e));
            }
        });
    }

    // ── Modal backdrop click-to-close ─────────────────────────────────────────
    window.addEventListener('click', (e) => {
        const evModal     = document.getElementById('editEventModal');
        const wordModal   = document.getElementById('editWordModal');
        const chronoModal = document.getElementById('chronoExpandModal');
        const noteModal   = document.getElementById('noteExpandModal');
        if (e.target === evModal)     window.closeEventEditModal();
        if (e.target === wordModal)   window.closeEditModal();
        if (e.target === chronoModal) window.closeChronoExpandModal(false);
        if (e.target === noteModal)   window.closeNoteExpandModal(false);
    });

});
