/**
 * event_widget.js — Event Edit/Delete Modal logic for the Dashboard.
 * Extracted from dashboard_index.js (lines 81–264).
 */

import { customConfirm, customChoice } from './modal_controller.js';
import { deleteRecordApi, fetchWithJson } from './db_api.js';
import { showToast, calculateEndDate } from './ui_helpers.js';

// ─── Private helpers ────────────────────────────────────────────────────────

function toggleEditEventWeekdays() {
    const rule = document.getElementById('editEventRecRule').value;
    const row = document.getElementById('editEventWeekdaysRow');
    if (row) row.style.display = (rule === 'weekly') ? 'block' : 'none';
    calcEditEventEndDateFromCount();
}

function toggleEditEventEndMode() {
    const isCount = document.getElementById('editEventEndCountMode').checked;
    document.getElementById('editEventEndDateBlock').style.display = isCount ? 'none' : 'block';
    document.getElementById('editEventEndCountBlock').style.display = isCount ? 'block' : 'none';
    if (isCount) calcEditEventEndDateFromCount();
}

function calcEditEventEndDateFromCount() {
    const freq = document.getElementById('editEventRecRule').value;
    const n = parseInt(document.getElementById('editEventRecCount').value) || 1;
    const startStr = document.getElementById('editEventDate').value;
    const weekdays = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')].map(cb => cb.value);

    const res = calculateEndDate(freq, n, startStr, weekdays);

    const endLabel = document.getElementById('editEventRecEndFromCountLabel');
    const endHidden = document.getElementById('editEventRecEndFromCount');
    if (endLabel) endLabel.innerText = res.label;
    if (endHidden) endHidden.value = res.hidden;
}

function openEventEditModal(id, title, dateStr, recRule, recEnd, recId) {
    document.getElementById('editEventId').value = id;
    document.getElementById('editEventRecId').value = recId || '';
    document.getElementById('editEventOriginalDate').value = dateStr || '';
    document.getElementById('editEventTitle').value = title || '';
    document.getElementById('editEventDate').value = dateStr || '';
    document.getElementById('editEventRecEnd').value = recEnd || '';
    document.getElementById('editEventError').innerText = '';

    document.getElementById('editEventEndDateMode').checked = true;
    toggleEditEventEndMode();

    const checkboxes = document.querySelectorAll('#editEventWeekdaysRow input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    const select = document.getElementById('editEventRecRule');
    if (!recRule || recRule === 'none') {
        select.value = 'none';
    } else if (recRule.startsWith('weekly:')) {
        select.value = 'weekly';
        const days = recRule.split(':')[1].split(',');
        checkboxes.forEach(cb => { if (days.includes(cb.value)) cb.checked = true; });
    } else {
        select.value = recRule;
    }

    const recRow = document.getElementById('editEventRecurrenceModeRow');
    if (recId) {
        recRow.style.display = 'block';
        document.querySelector('input[name="edit_event_mode"][value="only"]').checked = true;
    } else {
        recRow.style.display = 'none';
    }

    toggleEditEventWeekdays();
    document.getElementById('editEventModal').style.display = 'flex';
}

// ─── Public API (exposed on window for HTML inline handlers) ─────────────────

window.closeEventEditModal = function () {
    document.getElementById('editEventModal').style.display = 'none';
};

window.handleEventEditClick = function (e, btn) {
    e.stopPropagation();
    e.preventDefault();
    openEventEditModal(
        btn.dataset.eventId, btn.dataset.eventTitle, btn.dataset.eventDate,
        btn.dataset.eventRule, btn.dataset.eventEnd, btn.dataset.eventRecId
    );
};

window.deleteEvent = async function (eventId, isRecurring, eventDate = null) {
    let deleteMode = 'only';
    if (isRecurring) {
        const choice = await customChoice({
            title: 'Recurring Event',
            messageHTML: 'Choose how to delete this recurring event:',
            options: [
                { value: 'only', label: 'Delete only this occurrence', checked: true },
                { value: 'this_and_future', label: 'Delete this and all future occurrences' },
                { value: 'future_only', label: 'Keep this, delete future occurrences' },
                { value: 'all', label: 'Delete ALL occurrences in the series' }
            ],
            okLabel: 'Delete', cancelLabel: 'Cancel'
        });
        if (choice === null) return;
        deleteMode = choice;
    } else {
        const confirmed = await customConfirm({
            title: 'Delete Event',
            message: 'Are you sure you want to delete this event?',
            buttons: [
                { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                { label: 'Delete', value: true, class: 'confirm-btn-danger' }
            ]
        });
        if (!confirmed) return;
    }

    try {
        const resp = await deleteRecordApi('Event', eventId, deleteMode, eventDate);
        if (resp.ok) {
            const btn = document.querySelector(`[data-event-id="${eventId}"]`);
            if (btn) {
                const li = btn.closest('li');
                if (li) li.remove();
            }
            if (deleteMode !== 'only') {
                location.reload();
                return;
            }
            if (window.showToast) window.showToast('Event deleted successfully', 'success');
        }
    } catch (e) { console.error('Error deleting event:', e); }
};

window.saveEventEdit = async function () {
    const id = document.getElementById('editEventId').value;
    const recId = document.getElementById('editEventRecId').value;
    const title = document.getElementById('editEventTitle').value.trim();
    const date = document.getElementById('editEventDate').value;
    const errEl = document.getElementById('editEventError');
    errEl.innerText = '';

    let recEnd = document.getElementById('editEventRecEnd').value;
    if (document.getElementById('editEventEndCountMode').checked) {
        recEnd = document.getElementById('editEventRecEndFromCount').value;
    }

    let recRule = document.getElementById('editEventRecRule').value;
    if (recRule === 'weekly') {
        const checked = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')].map(cb => cb.value);
        if (checked.length > 0) recRule = 'weekly:' + checked.join(',');
    }

    const editMode = document.querySelector('input[name="edit_event_mode"]:checked')?.value || 'only';

    if (!title) { errEl.innerText = 'Title cannot be empty.'; return; }
    if (!date) { errEl.innerText = 'Date cannot be empty.'; return; }

    try {
        const originalDate = document.getElementById('editEventOriginalDate').value;
        const resp = await fetchWithJson('/edit_event_inline', {
            id, title, date,
            recurrence_rule: recRule === 'none' ? null : recRule,
            recurrence_end: recEnd || null,
            edit_mode: editMode,
            recurrence_id: recId,
            original_date: originalDate
        });
        const data = await resp.json();
        if (data.status === 'success' || data.success === true) {
            errEl.style.color = 'green';
            errEl.innerText = '✓ Success! Reloading...';
            showToast('✓ Event updated', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            const msg = data.message || data.detail || 'Unknown server error';
            errEl.style.color = '#c00';
            errEl.innerText = 'Error: ' + msg;
            showToast('Error: ' + msg, 'error');
        }
    } catch (e) {
        console.error('[saveEventEdit] Exception:', e);
        errEl.style.color = '#c00';
        errEl.innerText = 'JS Error: ' + e.message;
    }
};

// ─── Initializer (called from dashboard_index.js) ────────────────────────────

export function initEventWidget() {
    // Wire up internal handlers for the edit modal controls
    const recRuleEl = document.getElementById('editEventRecRule');
    if (recRuleEl) recRuleEl.addEventListener('change', toggleEditEventWeekdays);

    document.querySelectorAll('input[name="edit_event_end_mode"]').forEach(radio => {
        radio.addEventListener('change', toggleEditEventEndMode);
    });

    const recCount = document.getElementById('editEventRecCount');
    if (recCount) recCount.addEventListener('input', calcEditEventEndDateFromCount);

    const editDate = document.getElementById('editEventDate');
    if (editDate) editDate.addEventListener('change', calcEditEventEndDateFromCount);
}
