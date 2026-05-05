/**
 * event_widget.js — Event Edit/Delete logic.
 * Fully autonomous version to bypass import issues.
 */

console.log("[EventWidget] LOADED - Script version 2.2");

// ─── Private helpers ────────────────────────────────────────────────────────

function getModal(id) {
    const m = document.getElementById(id);
    if (!m) console.error(`[EventWidget] Modal not found: ${id}`);
    return m;
}

window.toggleEditEventWeekdays = function() {
    const rule = document.getElementById('editEventRecRule')?.value;
    const row = document.getElementById('editEventWeekdaysRow');
    if (row) row.style.display = (rule === 'weekly') ? 'block' : 'none';
};

window.toggleEditEventEndMode = function() {
    const isCount = document.getElementById('editEventEndCountMode')?.checked;
    const dateBlock = document.getElementById('editEventEndDateBlock');
    const countBlock = document.getElementById('editEventEndCountBlock');
    if (dateBlock) dateBlock.style.display = isCount ? 'none' : 'block';
    if (countBlock) countBlock.style.display = isCount ? 'block' : 'none';
};

window.calcEditEventEndDateFromCount = async function() {
    const freq = document.getElementById('editEventRecRule')?.value;
    const n = parseInt(document.getElementById('editEventRecCount')?.value) || 1;
    const startStr = document.getElementById('editEventDate')?.value;
    if (!startStr) return;

    try {
        const { calculateEndDate } = await import('./ui_helpers.js');
        const weekdays = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')].map(cb => cb.value);
        const res = calculateEndDate(freq, n, startStr, weekdays);
        
        const label = document.getElementById('editEventRecEndFromCountLabel');
        const hidden = document.getElementById('editEventRecEndFromCount');
        if (label) label.innerText = res.label;
        if (hidden) hidden.value = res.hidden;
    } catch (e) { console.warn("ui_helpers not ready", e); }
};

// ─── Public API ─────────────────────────────────────────────────────────────

window.handleEventEditClick = function (e, btn) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    console.log("[EventWidget] handleEventEditClick triggered", btn.dataset.eventId);
    
    const modal = getModal('editEventModal');
    if (!modal) return;

    // Set values
    const d = btn.dataset;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    
    setVal('editEventId', d.eventId);
    setVal('editEventRecId', d.eventRecId);
    setVal('editEventOriginalDate', d.eventDate);
    setVal('editEventTitle', d.eventTitle);
    setVal('editEventDate', d.eventDate);
    setVal('editEventRecEnd', d.eventEnd);
    
    const impCb = document.getElementById('editEventImportant');
    if (impCb) impCb.checked = d.eventImportant === 'true';

    const select = document.getElementById('editEventRecRule');
    if (select) {
        const recRule = d.eventRule;
        if (!recRule || recRule === 'none') {
            select.value = 'none';
        } else if (recRule.startsWith('weekly:')) {
            select.value = 'weekly';
            const days = recRule.split(':')[1].split(',');
            document.querySelectorAll('#editEventWeekdaysRow input').forEach(cb => {
                cb.checked = days.includes(cb.value);
            });
        } else {
            select.value = recRule;
        }
    }

    const recRow = document.getElementById('editEventRecurrenceModeRow');
    if (recRow) recRow.style.display = d.eventRecId ? 'block' : 'none';

    window.toggleEditEventWeekdays();
    window.toggleEditEventEndMode();
    
    modal.style.display = 'flex';
};

window.closeEditEventModal = function() {
    const modal = getModal('editEventModal');
    if (modal) modal.style.display = 'none';
};

window.deleteEvent = async function (e, eventId, isRecurring, eventDate = null) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    console.log("[EventWidget] deleteEvent triggered", eventId);

    // Dynamic import for modal controller
    const { customConfirm, customChoice } = await import('./modal_controller.js');
    const { deleteRecordApi } = await import('./db_api.js');
    
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
            const btn = document.querySelector(`[onclick*="'${eventId}'"]`);
            const li = btn?.closest('li');
            if (li) {
                const m = await import('./ui_helpers.js');
                await m.animateItemRemoval(li);
            }
            // Update header badges
            if (window.HeaderService) window.HeaderService.refreshBadges();

            if (deleteMode !== 'only') setTimeout(() => location.reload(), 500);
        }
    } catch (err) { console.error('Error deleting event:', err); }
};

window.markEventDone = async function(form, eventId) {
    const li = form.closest('li');
    try {
        const { animateItemRemoval } = await import('./ui_helpers.js');
        const animationPromise = animateItemRemoval(li);
        await fetch(form.action, { method: 'POST', body: new FormData(form) });
        await animationPromise;
        // Update header badges
        if (window.HeaderService) window.HeaderService.refreshBadges();
    } catch (e) { 
        console.error('Error marking event done:', e); 
        location.reload();
    }
};

window.saveEventEdit = async function () {
    const id = document.getElementById('editEventId').value;
    const title = document.getElementById('editEventTitle').value.trim();
    const date = document.getElementById('editEventDate').value;
    const mode = document.querySelector('input[name="edit_event_mode"]:checked')?.value || 'only';
    
    try {
        const { fetchWithJson } = await import('./db_api.js');
        const resp = await fetchWithJson('/edit_event_inline', {
            id, title, date, edit_mode: mode,
            important: document.getElementById('editEventImportant')?.checked || false,
            recurrence_rule: document.getElementById('editEventRecRule').value,
            recurrence_id: document.getElementById('editEventRecId').value,
            recurrence_end: document.getElementById('editEventRecEnd').value,
            original_date: document.getElementById('editEventOriginalDate').value
        });
        if (resp.ok) location.reload();
    } catch (e) { console.error('Error saving event:', e); }
};

export function initEventWidget() {
    console.log("[EventWidget] Core hooks initialized");
}
