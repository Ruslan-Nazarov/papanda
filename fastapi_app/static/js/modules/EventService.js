/**
 * EventService.js - UI logic for managing events in the DB View.
 */

import { ModalManager } from './ModalManager.js';
import { EventApi } from './EventApi.js';

export const EventService = {
    tempStickers: [],

    async openDetail(e) {
        try {
            const { id, title, date: dateStr, color, important, done, recurrence_id: recId } = e;
            const rule = e.rule || e.recurrenceRule || 'none';
            const end = e.end || e.recurrenceEnd || '';

            this._setDetailText('detailModalTitle', (important ? '<span style="color: var(--color-primary); margin-right: 8px;">⭐</span>' : '') + (title || '(No Title)'), true);
            this._setDetailText('detailDateText', dateStr ? new Date(dateStr).toLocaleString([], { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No date set');
            
            const statusEl = document.getElementById('detailModalStatus');
            if (statusEl) {
                statusEl.innerHTML = done ? 
                    '<span style="color: var(--color-success); background: var(--color-success-light); padding: 4px 10px; border-radius: 20px;">✓ Complete</span>' : 
                    '<span style="color: var(--color-text-muted); background: var(--color-bg-subtle); padding: 4px 10px; border-radius: 20px;">○ Pending</span>';
            }

            this._updateCategoryInfo(color);
            this._updateRecurrenceInfo(rule, end);

            const editBtn = document.getElementById('detailModalEditBtn');
            if (editBtn) editBtn.onclick = () => this.openEdit(id, title, dateStr, rule, end, recId, color);

            this.loadDetailStickers(id, recId);
            ModalManager.open('eventDetailModal');
        } catch (err) {
            console.error("[EventService] openDetail Error:", err);
        }
    },

    async openEdit(id, title, dateStr, recRule, recEnd, recId, color) {
        ModalManager.close('eventDetailModal');
        
        const fields = {
            'editEventId': id || '',
            'editEventRecId': recId || '',
            'editEventTitle': title || '',
            'editEventDate': id ? dateStr : this._getNowIso(),
            'editEventRecEnd': recEnd || ''
        };

        for (const [key, val] of Object.entries(fields)) {
            const el = document.getElementById(key);
            if (el) el.value = val;
        }

        this._resetEditState(recRule, color);
        
        this.tempStickers = [];
        this.renderStickers(id, recId);
        ModalManager.open('editEventModal');
    },

    async save() {
        const id = document.getElementById('editEventId').value;
        const title = document.getElementById('editEventTitle').value.trim();
        const date = document.getElementById('editEventDate').value;
        const errEl = document.getElementById('editEventError');
        
        if (errEl) errEl.innerText = '';

        if (!title || !date) {
            if (errEl) errEl.innerText = 'Required fields empty.';
            return;
        }

        try {
            const payload = { 
                id, title, date, 
                recurrence_rule: this._getRecRule(), 
                recurrence_end: this._getRecEnd(), 
                edit_mode: document.querySelector('input[name="edit_event_mode"]:checked')?.value || 'only', 
                recurrence_id: document.getElementById('editEventRecId').value, 
                color: document.getElementById('editEventColor')?.value || '',
                stickers: this.tempStickers
            };
            
            const data = await EventApi.saveEvent(payload);
            if (data.status === 'success') {
                ModalManager.close('editEventModal');
                location.reload();
            } else if (errEl) {
                errEl.innerText = data.message || 'Error saving event';
            }
        } catch (e) {
            if (errEl) errEl.innerText = 'Network error';
        }
    },

    async toggleDone(eventId) {
        try {
            const data = await EventApi.toggleDone(eventId);
            if (data.status === 'success') location.reload();
            else if (window.showToast) window.showToast(data.message, 'error');
        } catch (e) {
            console.error("[EventService] toggleDone error:", e);
        }
    },

    // --- Private / Helper Methods ---

    _setDetailText(id, text, isHtml = false) {
        const el = document.getElementById(id);
        if (el) isHtml ? (el.innerHTML = text) : (el.textContent = text);
    },

    _updateCategoryInfo(color) {
        const circle = document.getElementById('detailModalColor');
        const catEl = document.getElementById('detailModalCategory');
        if (!circle || !catEl) return;

        if (color) {
            circle.style.background = color;
            circle.style.display = 'block';
            const label = document.getElementById('label-' + color.replace('#', ''))?.textContent.trim();
            catEl.textContent = (label && label !== 'Unnamed') ? label : 'Color: ' + color;
        } else {
            circle.style.display = 'none';
            catEl.textContent = 'Regular Event';
        }
    },

    _updateRecurrenceInfo(rule, end) {
        const row = document.getElementById('detailModalRecurrenceRow');
        if (!row) return;

        if (rule && rule !== 'none') {
            row.style.display = 'flex';
            document.getElementById('detailModalRecRule').textContent = rule.replace('weekly:', 'Weekly: ');
            const endRow = document.getElementById('detailModalRecEndRow');
            if (end && endRow) {
                endRow.style.display = 'block';
                document.getElementById('detailModalRecEnd').textContent = new Date(end).toLocaleDateString();
            } else if (endRow) {
                endRow.style.display = 'none';
            }
        } else {
            row.style.display = 'none';
        }
    },

    _resetEditState(recRule, color) {
        const errEl = document.getElementById('editEventError');
        if (errEl) errEl.innerText = '';

        const endModeDate = document.getElementById('editEventEndDateMode');
        if (endModeDate) endModeDate.checked = true;
        this.toggleEndMode();

        const checkboxes = document.querySelectorAll('#editEventWeekdaysRow input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);

        const recSelect = document.getElementById('editEventRecRule');
        if (recSelect) {
            if (recRule?.startsWith('weekly:')) {
                recSelect.value = 'weekly';
                const days = recRule.split(':')[1].split(',');
                checkboxes.forEach(cb => { if (days.includes(cb.value)) cb.checked = true; });
            } else {
                recSelect.value = recRule || 'none';
            }
        }
        this.toggleWeekdays();

        const recModeRow = document.getElementById('editEventRecurrenceModeRow');
        if (recModeRow) recModeRow.style.display = (recRule && recRule !== 'none') ? 'block' : 'none';

        if (window.initColorPicker) window.initColorPicker(color || '');
    },

    _getRecRule() {
        let rule = document.getElementById('editEventRecRule').value;
        if (rule === 'weekly') {
            const days = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')].map(cb => cb.value);
            if (days.length > 0) rule = 'weekly:' + days.join(',');
        }
        return rule;
    },

    _getRecEnd() {
        if (document.getElementById('editEventEndCountMode')?.checked) {
            return document.getElementById('editEventRecEndFromCount')?.value;
        }
        return document.getElementById('editEventRecEnd').value;
    },

    async loadDetailStickers(eventId, recId) {
        const listEl = document.getElementById('detailStickersList');
        if (!listEl) return;
        listEl.innerHTML = '<div class="loading-hint">Loading...</div>';
        try {
            const stickers = await EventApi.fetchStickers(eventId, recId);
            listEl.innerHTML = '';
            if (!stickers.length) document.getElementById('detailStickersEmpty').style.display = 'block';
            else stickers.forEach(s => window.createStickerElement && listEl.appendChild(window.createStickerElement(s)));
        } catch (e) { listEl.innerHTML = 'Error loading stickers'; }
    },

    async renderStickers(id, recId) {
        const listEl = document.getElementById('eventStickersList');
        if (!listEl) return;
        if (!id) {
            listEl.innerHTML = '<div class="temp-sticker-hint">Temp stickers:</div>';
            this.tempStickers.forEach((s, idx) => listEl.appendChild(this._createTempStickerEl(s, idx)));
            return;
        }
        listEl.innerHTML = 'Loading...';
        try {
            const stickers = await EventApi.fetchStickers(id, recId);
            listEl.innerHTML = '';
            stickers.forEach(s => window.createStickerElement && listEl.appendChild(window.createStickerElement(s)));
        } catch (e) { listEl.innerHTML = 'Error loading stickers'; }
    },

    _createTempStickerEl(s, idx) {
        const div = document.createElement('div');
        div.className = 'sticker-chip-mini';
        div.style.background = s.color || 'var(--color-sticker-default)';
        div.innerHTML = `
            <span class="sticker-emoji">${s.type === 'list' ? '📋' : '📝'}</span>
            <span class="sticker-text-preview">${s.title || (s.text ? s.text.substring(0,10)+'...' : 'Sticker')}</span>
            <button onclick="window.EventService.removeTempSticker(${idx})" class="btn-remove-temp">✕</button>
        `;
        return div;
    },

    removeTempSticker(idx) {
        this.tempStickers.splice(idx, 1);
        this.renderStickers(document.getElementById('editEventId').value, document.getElementById('editEventRecId').value);
    },

    toggleWeekdays() {
        const row = document.getElementById('editEventWeekdaysRow');
        if (row) row.style.display = (document.getElementById('editEventRecRule')?.value === 'weekly') ? 'block' : 'none';
        this.calcEndDateFromCount();
    },

    toggleEndMode() {
        const isCount = document.getElementById('editEventEndCountMode')?.checked;
        document.getElementById('editEventEndDateBlock').style.display = isCount ? 'none' : 'block';
        document.getElementById('editEventEndCountBlock').style.display = isCount ? 'block' : 'none';
        if (isCount) this.calcEndDateFromCount();
    },

    calcEndDateFromCount() {
        const freq = document.getElementById('editEventRecRule')?.value;
        const n = parseInt(document.getElementById('editEventRecCount')?.value) || 1;
        const startStr = document.getElementById('editEventDate')?.value;
        if (!startStr || freq === 'none') return;
        
        const start = new Date(startStr);
        let end = new Date(start);
        if (freq === 'daily') end.setDate(start.getDate() + n);
        else if (freq === 'weekly') end.setDate(start.getDate() + Math.ceil(n / ([...document.querySelectorAll('#editEventWeekdaysRow input:checked')].length || 1)) * 7);
        else if (freq === 'weekdays') end.setDate(start.getDate() + Math.ceil(n / 5) * 7);
        else if (freq === 'monthly') end.setMonth(start.getMonth() + n);
        else if (freq === 'yearly') end.setFullYear(start.getFullYear() + n);
        
        const ds = end.toISOString().split('T')[0];
        document.getElementById('editEventRecEndFromCountLabel').innerText = 'Calculated end: ' + ds;
        document.getElementById('editEventRecEndFromCount').value = ds;
    },

    _getNowIso() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    }
};

// Global exports
window.EventService = EventService;
window.openEditEventModal = (...args) => EventService.openEdit(...args);
window.saveEventEdit = () => EventService.save();
window.toggleEditEventWeekdays = () => EventService.toggleWeekdays();
window.toggleEditEventEndMode = () => EventService.toggleEndMode();
window.calcEditEventEndDateFromCount = () => EventService.calcEndDateFromCount();
