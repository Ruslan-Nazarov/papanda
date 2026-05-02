/**
 * EventService.js - Logic for managing events in the DB View.
 */

import { ModalManager } from './ModalManager.js';
import { customConfirm, customChoice } from '../modal_controller.js';
import { deleteRecordApi, fetchWithJson } from '../db_api.js';

export const EventService = {
    tempStickers: [],

    async openDetail(e) {
        try {
            const id = e.id;
            const title = e.title;
            const dateStr = e.date || '';
            const rule = e.rule || e.recurrenceRule || 'none';
            const end = e.end || e.recurrenceEnd || '';
            const recId = e.recurrence_id || e.recurrenceId || '';
            const color = e.color || '';
            const important = e.important === true || e.important === 'true';
            const done = e.done === true || e.done === 'true';

            const titleEl = document.getElementById('detailModalTitle');
            if (titleEl) {
                titleEl.innerHTML = (important ? '<span style="color: var(--color-primary); margin-right: 8px;">⭐</span>' : '') + (title || '(No Title)');
            }
            
            const dateEl = document.getElementById('detailDateText');
            if (dateEl) {
                if (dateStr) {
                    const d = new Date(dateStr);
                    dateEl.textContent = d.toLocaleString([], { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                } else {
                    dateEl.textContent = 'No date set';
                }
            }

            const statusEl = document.getElementById('detailModalStatus');
            if (statusEl) {
                statusEl.innerHTML = done ? 
                    '<span style="color: var(--color-success); background: var(--color-success-light); padding: 4px 10px; border-radius: 20px;">✓ Complete</span>' : 
                    '<span style="color: var(--color-text-muted); background: var(--color-bg-subtle); padding: 4px 10px; border-radius: 20px;">○ Pending</span>';
            }

            const colorCircle = document.getElementById('detailModalColor');
            const categoryEl = document.getElementById('detailModalCategory');
            if (color && colorCircle && categoryEl) {
                colorCircle.style.background = color;
                colorCircle.style.display = 'block';
                const labelSpan = document.getElementById('label-' + color.replace('#', ''));
                categoryEl.textContent = (labelSpan && labelSpan.textContent.trim() !== 'Unnamed') ? labelSpan.textContent.trim() : 'Color: ' + color;
            } else if (colorCircle && categoryEl) {
                colorCircle.style.display = 'none';
                categoryEl.textContent = 'Regular Event';
            }

            const recRow = document.getElementById('detailModalRecurrenceRow');
            if (recRow) {
                if (rule && rule !== 'none') {
                    recRow.style.display = 'flex';
                    document.getElementById('detailModalRecRule').textContent = rule.replace('weekly:', 'Weekly: ');
                    const endEl = document.getElementById('detailModalRecEndRow');
                    if (end) {
                        endEl.style.display = 'block';
                        document.getElementById('detailModalRecEnd').textContent = new Date(end).toLocaleDateString();
                    } else if (endEl) {
                        endEl.style.display = 'none';
                    }
                } else {
                    recRow.style.display = 'none';
                }
            }

            const editBtn = document.getElementById('detailModalEditBtn');
            if (editBtn) {
                editBtn.onclick = () => this.openEdit(id, title, dateStr, rule, end, recId, color);
            }

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

        if (document.getElementById('editEventError')) {
            document.getElementById('editEventError').innerText = '';
        }

        const endModeDate = document.getElementById('editEventEndDateMode');
        if (endModeDate) endModeDate.checked = true;
        this.toggleEndMode();

        const checkboxes = document.querySelectorAll('#editEventWeekdaysRow input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);

        const recRuleSelect = document.getElementById('editEventRecRule');
        if (recRuleSelect) {
            if (recRule && recRule.startsWith('weekly:')) {
                recRuleSelect.value = 'weekly';
                const days = recRule.split(':')[1].split(',');
                checkboxes.forEach(cb => { if (days.includes(cb.value)) cb.checked = true; });
            } else {
                recRuleSelect.value = recRule || 'none';
            }
        }
        this.toggleWeekdays();

        const recModeRow = document.getElementById('editEventRecurrenceModeRow');
        if (recModeRow) recModeRow.style.display = (recRule && recRule !== 'none') ? 'block' : 'none';

        if (window.initColorPicker) window.initColorPicker(color || '');
        
        this.tempStickers = [];
        const sec = document.getElementById('eventStickersSection');
        if (sec) sec.style.display = 'block';
        
        this.renderStickers(id, recId);
        ModalManager.open('editEventModal');
    },

    async save() {
        const id = document.getElementById('editEventId').value;
        const recId = document.getElementById('editEventRecId').value;
        const title = document.getElementById('editEventTitle').value.trim();
        const date = document.getElementById('editEventDate').value;
        const color = document.getElementById('editEventColor')?.value || '';
        const errEl = document.getElementById('editEventError');
        
        if (errEl) errEl.innerText = '';

        let recEnd = document.getElementById('editEventRecEnd').value;
        if (document.getElementById('editEventEndCountMode')?.checked) {
            recEnd = document.getElementById('editEventRecEndFromCount')?.value;
        }
        
        let recRule = document.getElementById('editEventRecRule').value;
        if (recRule === 'weekly') {
            const ch = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')].map(cb => cb.value);
            if (ch.length > 0) recRule = 'weekly:' + ch.join(',');
        }
        
        const mode = document.querySelector('input[name="edit_event_mode"]:checked')?.value || 'only';
        if (!title || !date) {
            if (errEl) errEl.innerText = 'Required fields empty.';
            return;
        }

        try {
            const payload = { 
                id, title, date, 
                recurrence_rule: recRule, 
                recurrence_end: recEnd, 
                edit_mode: mode, 
                recurrence_id: recId, 
                color,
                stickers: this.tempStickers
            };
            const resp = await fetch('/edit_event_inline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (data.status === 'success') {
                ModalManager.close('editEventModal');
                location.reload();
            } else {
                if (errEl) errEl.innerText = data.message || 'Error saving event';
            }
        } catch (e) {
            if (errEl) errEl.innerText = 'Network error';
        }
    },

    toggleWeekdays() {
        const rule = document.getElementById('editEventRecRule')?.value;
        const row = document.getElementById('editEventWeekdaysRow');
        if (row) row.style.display = (rule === 'weekly') ? 'block' : 'none';
        this.calcEndDateFromCount();
    },

    toggleEndMode() {
        const isCount = document.getElementById('editEventEndCountMode')?.checked;
        const dateBlock = document.getElementById('editEventEndDateBlock');
        const countBlock = document.getElementById('editEventEndCountBlock');
        if (dateBlock) dateBlock.style.display = isCount ? 'none' : 'block';
        if (countBlock) countBlock.style.display = isCount ? 'block' : 'none';
        if (isCount) this.calcEndDateFromCount();
    },

    calcEndDateFromCount() {
        const freq = document.getElementById('editEventRecRule')?.value;
        const n = parseInt(document.getElementById('editEventRecCount')?.value) || 1;
        const startStr = document.getElementById('editEventDate')?.value;
        const endLabel = document.getElementById('editEventRecEndFromCountLabel');
        const endHidden = document.getElementById('editEventRecEndFromCount');
        
        if (!startStr || freq === 'none') return;
        
        const start = new Date(startStr);
        let end = new Date(start);
        if (freq === 'daily') end.setDate(start.getDate() + n);
        else if (freq === 'weekly') {
            const checked = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')];
            const d = checked.length || 1;
            end.setDate(start.getDate() + Math.ceil(n / d) * 7);
        }
        else if (freq === 'weekdays') end.setDate(start.getDate() + Math.ceil(n / 5) * 7);
        else if (freq === 'monthly') end.setMonth(start.getMonth() + n);
        else if (freq === 'yearly') end.setFullYear(start.getFullYear() + n);
        
        const ds = end.toISOString().split('T')[0];
        if (endLabel) endLabel.innerText = 'Calculated end: ' + ds;
        if (endHidden) endHidden.value = ds;
    },

    async loadDetailStickers(eventId, recId) {
        const listEl = document.getElementById('detailStickersList');
        const emptyEl = document.getElementById('detailStickersEmpty');
        if (!listEl || !emptyEl) return;

        listEl.innerHTML = '<div style="color: var(--color-text-faint); font-size: 0.9em; padding: 10px;">Loading stickers...</div>';
        emptyEl.style.display = 'none';

        try {
            let url = `/api/stickers/event/${eventId}/`;
            if (recId) url += `?recurrence_id=${recId}`;
            const resp = await fetch(url);
            const stickers = await resp.json();
            
            listEl.innerHTML = '';
            if (!stickers || stickers.length === 0) {
                emptyEl.style.display = 'block';
            } else {
                stickers.forEach(s => {
                    if (window.createStickerElement) {
                        listEl.appendChild(window.createStickerElement(s));
                    }
                });
            }
        } catch (e) {
            listEl.innerHTML = '<div style="color: var(--color-error); font-size: 0.9em; padding: 10px;">Failed to load stickers.</div>';
        }
    },

    async renderStickers(id, recId) {
        const listEl = document.getElementById('eventStickersList');
        if (!listEl) return;
        
        if (!id) {
            listEl.innerHTML = '<div style="color: var(--color-text-faint); font-size: 0.85em; font-style: italic;">Temporary stickers for new event:</div>';
            this.tempStickers.forEach((s, idx) => {
                const el = this._createTempStickerEl(s, idx);
                listEl.appendChild(el);
            });
            return;
        }

        listEl.innerHTML = 'Loading...';
        try {
            let url = `/api/stickers/event/${id}/`;
            if (recId) url += `?recurrence_id=${recId}`;
            const resp = await fetch(url);
            const stickers = await resp.json();
            listEl.innerHTML = '';
            stickers.forEach(s => {
                if (window.createStickerElement) {
                    listEl.appendChild(window.createStickerElement(s));
                }
            });
        } catch (e) {
            listEl.innerHTML = 'Error loading stickers';
        }
    },

    _createTempStickerEl(s, idx) {
        const div = document.createElement('div');
        div.className = 'sticker-chip-mini';
        div.style.background = s.color || 'var(--color-sticker-default)';
        div.innerHTML = `
            <span class="sticker-emoji">${s.type === 'list' ? '📋' : '📝'}</span>
            <span class="sticker-text-preview">${s.title || (s.text ? s.text.substring(0,10)+'...' : 'Sticker')}</span>
            <button onclick="window.EventService.removeTempSticker(${idx})" style="border:none; background:none; cursor:pointer; padding:0 4px; opacity:0.6;">✕</button>
        `;
        return div;
    },

    removeTempSticker(idx) {
        this.tempStickers.splice(idx, 1);
        const id = document.getElementById('editEventId').value;
        const recId = document.getElementById('editEventRecId').value;
        this.renderStickers(id, recId);
    },

    /**
     * Toggles the 'done' status of an event.
     */
    async toggleDone(eventId) {
        try {
            const resp = await fetch(`/api/events/${eventId}/toggle_done`, { method: 'POST' });
            const data = await resp.json();
            if (data.status === 'success') {
                location.reload(); // Simple reload for now to reflect changes everywhere
            } else {
                if (window.showToast) window.showToast(data.message, 'error');
            }
        } catch (e) {
            console.error("[EventService] toggleDone error:", e);
        }
    },

    /**
     * Shows a custom context menu for an event.
     */
    showContextMenu(e, ev) {
        let menu = document.getElementById('customContextMenu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'customContextMenu';
            menu.className = 'custom-context-menu';
            document.body.appendChild(menu);
        }

        menu.innerHTML = '';
        const items = [
            { icon: '🔍', text: 'Показать полностью', action: () => this.openDetail(e) },
            { icon: '✎', text: 'Редактировать', action: () => this.openEdit(e.id, e.title, e.date, e.rule, e.end, e.recurrence_id, e.color) },
            { icon: e.done ? '○' : '✓', text: e.done ? 'Отменить выполнение' : 'Выполнить', action: () => this.toggleDone(e.id) }
        ];

        if (e.has_stickers) {
            items.splice(1, 0, { 
                icon: '<div class="sticker-icon-small"></div>', 
                text: 'Стикеры', 
                isHtmlIcon: true,
                action: () => this.openDetail(e) 
            });
        }

        if (e.color) {
            items.push({ icon: '🌳', text: 'Дерево группы', action: () => window.viewEventTree(e.color) });
        }

        items.push({ icon: '×', text: 'Удалить', danger: true, action: () => window.deleteRecordCustom('Event', e.id, !!e.recurrence_id) });

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'context-menu-item' + (item.danger ? ' danger' : '');
            div.innerHTML = `<span class="icon">${item.icon}</span><span>${item.text}</span>`;
            div.onclick = () => {
                menu.style.display = 'none';
                item.action();
            };
            menu.appendChild(div);
        });

        menu.style.display = 'block';
        
        // Position
        let x = ev.clientX;
        let y = ev.clientY;
        
        const menuWidth = 200;
        const menuHeight = items.length * 45;
        if (x + menuWidth > window.innerWidth) x -= menuWidth;
        if (y + menuHeight > window.innerHeight) y -= menuHeight;

        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    },

    _getNowIso() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    }
};

// Global export for HTML compatibility
window.EventService = EventService;
window.openEditEventModal = (...args) => EventService.openEdit(...args);
window.closeEditEventModal = () => ModalManager.close('editEventModal');
window.saveEventEdit = () => EventService.save();
window.toggleEditEventWeekdays = () => EventService.toggleWeekdays();
window.toggleEditEventEndMode = () => EventService.toggleEndMode();
window.calcEditEventEndDateFromCount = () => EventService.calcEndDateFromCount();
window.closeEventDetailModal = () => ModalManager.close('eventDetailModal');
