/**
 * recurrence_form.js — Recurrence controls for the Dashboard header add-form.
 * Extracted from dashboard_index.js (lines 315–398).
 */

import { calculateEndDate } from './ui_helpers.js';

// ─── Private state (DOM refs resolved on init) ───────────────────────────────

let repeatSelect, repeatHidden, repeatEnd, repeatCount;
let repeatEndFromCount, endDateBlock, endCountBlock, weekdayRow;
let recurrenceToggle, recurrenceMenu;

// ─── Private helpers ─────────────────────────────────────────────────────────

function calcEndDateFromCount() {
    if (!repeatSelect || !repeatCount || !repeatEndFromCount) return;
    const freq = repeatSelect.value;
    const n = parseInt(repeatCount.value) || 1;
    const startStr = document.getElementById('common_date')?.value;
    const weekdays = weekdayRow
        ? [...weekdayRow.querySelectorAll('input:checked')].map(cb => cb.value)
        : [];
    const res = calculateEndDate(freq, n, startStr, weekdays);
    repeatEndFromCount.value = res.hidden;
}

function buildRepeatValue() {
    if (!repeatSelect) return 'none';
    const freq = repeatSelect.value;
    if (freq === 'none') return 'none';
    const checked = weekdayRow
        ? [...weekdayRow.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value)
        : [];
    if (freq === 'weekly' && checked.length > 0) return 'weekly:' + checked.join(',');
    return freq;
}

function updateRecurrenceBtnStyle() {
    if (!repeatHidden || !recurrenceToggle) return;
    const val = repeatHidden.value;
    recurrenceToggle.classList.toggle('active', val && val !== 'none');
}

// ─── Public API ───────────────────────────────────────────────────────────────

window.closeRecurrence = function () {
    if (repeatHidden) repeatHidden.value = buildRepeatValue();
    if (recurrenceMenu) recurrenceMenu.classList.remove('show');
    updateRecurrenceBtnStyle();
};

// ─── Initializer ─────────────────────────────────────────────────────────────

export function initRecurrenceForm() {
    recurrenceToggle = document.getElementById('recurrenceToggle');
    recurrenceMenu   = document.getElementById('recurrenceMenu');
    repeatSelect     = document.getElementById('repeatSelect');
    repeatHidden     = document.getElementById('repeatHidden');
    repeatEnd        = document.getElementById('repeatEnd');
    repeatCount      = document.getElementById('repeatCount');
    repeatEndFromCount = document.getElementById('repeatEndFromCount');
    endDateBlock     = document.getElementById('endDateBlock');
    endCountBlock    = document.getElementById('endCountBlock');
    weekdayRow       = document.getElementById('weekdayRow');

    // End-mode radio buttons (date vs count)
    document.querySelectorAll('input[name="rec_end_mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const isCount = document.getElementById('recEndCount').checked;
            if (endDateBlock) endDateBlock.style.display = isCount ? 'none' : 'block';
            if (endCountBlock) endCountBlock.style.display = isCount ? 'block' : 'none';
            if (repeatEnd) repeatEnd.disabled = isCount;
            if (repeatEndFromCount) repeatEndFromCount.disabled = !isCount;
        });
    });

    if (repeatEnd) repeatEnd.disabled = false;
    if (repeatEndFromCount) repeatEndFromCount.disabled = true;

    // Count/date change recalculates end date
    if (repeatCount) repeatCount.addEventListener('input', calcEndDateFromCount);
    if (repeatSelect) repeatSelect.addEventListener('change', calcEndDateFromCount);
    const commonDateEl = document.getElementById('common_date');
    if (commonDateEl) commonDateEl.addEventListener('change', calcEndDateFromCount);

    // Toggle menu visibility
    if (recurrenceToggle && recurrenceMenu) {
        recurrenceToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            recurrenceMenu.classList.toggle('show');
        });
    }

    // Weekly day-of-week row visibility
    if (repeatSelect && weekdayRow) {
        repeatSelect.addEventListener('change', () => {
            const isWeekly = repeatSelect.value === 'weekly';
            weekdayRow.style.display = isWeekly ? 'flex' : 'none';
            if (!isWeekly) weekdayRow.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
        });
    }

    // Close menu on outside click
    document.addEventListener('click', (e) => {
        if (recurrenceMenu && recurrenceToggle) {
            if (!recurrenceMenu.contains(e.target) && e.target !== recurrenceToggle) {
                if (recurrenceMenu.classList.contains('show')) window.closeRecurrence();
            }
        }
    });
}
