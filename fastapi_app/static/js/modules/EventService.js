/**
 * EventService.js - UI logic for managing events in the DB View.
 */

import { ModalManager } from './ModalManager.js';

import { StickerRenderer } from './StickerRenderer.js';

export const EventService = {
    tempStickers: [],

    async fetchStickers(eventId, recId = null) {
        let url = `/api/stickers/event/${eventId}/`;
        if (recId) url += `?recurrence_id=${recId}`;
        const resp = await fetch(url);
        return await resp.json();
    },

    async saveEvent(payload) {
        const resp = await fetch('/edit_event_inline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await resp.json();
    },

    async openDetail(e) {
        try {
            // Support both raw objects (snake_case) and DOM datasets (camelCase)
            const id = e.id;
            const title = e.title;
            const dateStr = e.date;
            const color = e.color;
            const important = (e.important === true || e.important === 'true');
            const done = (e.done === true || e.done === 'true');
            const recId = e.recurrence_id || e.recurrenceId || '';
            const rule = e.rule || e.recurrenceRule || e.recurrence_rule || 'none';
            const end = e.end || e.recurrenceEnd || e.recurrence_end || '';

            const idEl = document.getElementById('detailEventId');
            if (idEl) idEl.value = id || '';
            const recIdEl = document.getElementById('detailEventRecId');
            if (recIdEl) recIdEl.value = recId || '';

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
            if (editBtn) editBtn.onclick = () => this.openEdit(id, title, dateStr, rule, end, recId, color, important, done);

            this.loadDetailStickers(id, recId);
            ModalManager.open('eventDetailModal');
        } catch (err) {
            console.error("[EventService] openDetail Error:", err);
        }
    },

    async openEdit(id, title, dateStr, recRule, recEnd, recId, color, important = false, done = false) {
        ModalManager.close('eventDetailModal');

        if (id === 'null' || id === 'None') id = null;
        if (recId === 'null' || recId === 'None') recId = null;

        const fields = {
            'editEventId': id || '',
            'editEventRecId': recId || '',
            'editEventTitle': title || '',
            'editEventDate': dateStr ? dateStr.replace(' ', 'T').slice(0, 16) : this._getNowIso(),
            'editEventRecEnd': recEnd || '',
            'editEventColor': color || '',
            'editEventImportant': !!important,
            'editEventDone': !!done
        };

        for (const [fid, val] of Object.entries(fields)) {
            const el = document.getElementById(fid);
            if (!el) continue;
            if (el.type === 'checkbox') el.checked = val;
            else el.value = val;
        }

        this._updateEditStickersList(id, recId);

        this._resetEditState(recRule, color, important);
        ModalManager.open('editEventModal');
    },

    openDraftSticker() {
        const color = document.getElementById('editEventStickerColor')?.value || '#fff9c4';
        const type  = document.getElementById('editEventStickerType')?.value || 'text';
        window.openStickerModal({ source: 'event_editor', color, type });
    },

    updateDraftStickerUI(hasDraft) {
        const btn = document.getElementById('editEventDraftStickerBtn');
        const listEl = document.getElementById('editEventStickersList');
        if (!btn || !listEl) return;

        if (hasDraft) {
            btn.classList.add('attached');
            const text = document.getElementById('editEventStickerText').value;
            const title = document.getElementById('editEventStickerTitle').value;
            const type = document.getElementById('editEventStickerType').value;
            const color = document.getElementById('editEventStickerColor').value;

            listEl.innerHTML = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'mini-sticker-wrapper';
            
            const sticker = StickerRenderer.createStickerElement({
                text: text,
                title: title,
                type: type,
                color: color
            }, {
                isWidget: true,
                onClick: () => this.openDraftSticker(),
                onDelete: () => this.clearDraftSticker()
            });
            
            wrapper.appendChild(sticker);
            listEl.appendChild(wrapper);
        } else {
            btn.classList.remove('attached');
            listEl.innerHTML = '<div style="color:var(--color-text-faint); font-size:0.8rem; font-style:italic;">No stickers drafted.</div>';
        }
    },

    clearDraftSticker() {
        document.getElementById('editEventStickerText').value = '';
        document.getElementById('editEventStickerTitle').value = '';
        const eNoteId = document.getElementById('editEventStickerNoteId');
        if (eNoteId) eNoteId.value = '';
        this.updateDraftStickerUI(false);
    },

    openManageStickers() {
        const id = document.getElementById('editEventId').value;
        const recId = document.getElementById('editEventRecId').value;
        if (!id) return;
        window.openParentStickers('event', id, recId);
    },

    async _updateEditStickersList(id, recId) {
        const listEl = document.getElementById('editEventStickersList');
        const section = document.getElementById('editEventStickersSection');
        const manageBtn = document.getElementById('editEventManageStickersBtn');
        const draftBtn = document.getElementById('editEventDraftStickerBtn');
        
        if (!listEl || !section) return;

        // Clear draft inputs on open if it's a new event
        if (!id) {
            this.clearDraftSticker();
            if (manageBtn) manageBtn.style.display = 'none';
            if (draftBtn) draftBtn.style.display = 'flex';
            section.style.display = 'block';
            return;
        }

        if (manageBtn) manageBtn.style.display = 'block';
        if (draftBtn) draftBtn.style.display = 'none';
        section.style.display = 'block';
        listEl.innerHTML = '<div style="color:var(--color-text-faint); font-size:0.8rem;">Loading...</div>';

        try {
            const stickers = await this.fetchStickers(id, recId);
            listEl.innerHTML = '';
            if (!stickers || !stickers.length) {
                listEl.innerHTML = '<div style="color:var(--color-text-faint); font-size:0.8rem; font-style:italic;">No stickers attached.</div>';
                return;
            }

            stickers.forEach(s => {
                const wrapper = document.createElement('div');
                wrapper.className = 'mini-sticker-wrapper';
                const sticker = StickerRenderer.createStickerElement(s, { 
                    isWidget: true,
                    onClick: () => window.openParentStickers('event', id, recId)
                });
                wrapper.appendChild(sticker);
                listEl.appendChild(wrapper);
            });
        } catch (e) {
            listEl.innerHTML = '';
        }
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
                important: document.getElementById('editEventImportant')?.checked || false,
                done: document.getElementById('editEventDone')?.checked || false,
                stickers: []
            };

            const draftText = document.getElementById('editEventStickerText')?.value;
            const draftTitle = document.getElementById('editEventStickerTitle')?.value;
            const draftNoteId = document.getElementById('editEventStickerNoteId')?.value;
            if (draftText || draftTitle || draftNoteId) {
                const noteIdEl = document.getElementById('editEventStickerNoteId');
                payload.stickers.push({
                    text: draftText || '',
                    title: draftTitle || null,
                    color: document.getElementById('editEventStickerColor').value,
                    type: document.getElementById('editEventStickerType').value,
                    note_id: noteIdEl && noteIdEl.value ? parseInt(noteIdEl.value) : null,
                    apply_series: true
                });
            }

            const data = await this.saveEvent(payload);
            if (data.status === 'success') {
                ModalManager.close('editEventModal');
                if (window.showToast) window.showToast(id ? "Event updated" : "Event created", "success");

                const isNew = !id;
                const newId = data.message.match(/ID: (\d+)/)?.[1] || id;

                // Update local state for instant feedback
                const newRecord = {
                    id: parseInt(newId),
                    title: title,
                    date: date,
                    color: payload.color,
                    important: payload.important,
                    done: payload.done,
                    rule: payload.recurrence_rule,
                    end: payload.recurrence_end,
                    recurrence_id: payload.recurrence_id,
                    has_stickers: (payload.stickers && payload.stickers.length > 0)
                };

                if (window.eventRecords) {
                    if (isNew) {
                        window.eventRecords.push(newRecord);
                    } else {
                        const idx = window.eventRecords.findIndex(r => r.id == id);
                        if (idx !== -1) window.eventRecords[idx] = { ...window.eventRecords[idx], ...newRecord };
                    }
                }

                if (payload.edit_mode === 'only') {
                    // Update DOM instantly
                    if (isNew) {
                        this._performOptimisticAdd(newRecord);
                    } else {
                        this._performOptimisticEdit(newRecord);
                    }
                } else {
                    // For complex recurrence updates, just reload the view silently
                    setTimeout(() => {
                        if (window.refreshCurrentView) window.refreshCurrentView('Event');
                        else location.reload();
                    }, 300);
                }
            } else if (errEl) {
                errEl.innerText = data.message || 'Error saving event';
            }
        } catch (e) {
            console.error("Save error:", e);
            if (errEl) errEl.innerText = 'Network error';
        }
    },

    _performOptimisticAdd(record) {
        if (!record.date) return;
        const key = record.date.substring(0, 10);
        
        // 1. Calendar Grid Cell
        const cell = document.querySelector(`.calendar-cell[data-date="${key}"]`);
        if (cell) {
            const counter = cell.querySelector('.cell-date + span');
            if (counter) {
                const count = parseInt(counter.innerText) || 0;
                counter.innerText = count + 1;
            } else {
                // If there was no counter (count 0), we can just let refreshCurrentView handle creating it
            }
        }

        // Always fetch latest to ensure calendar state is perfect without page reload
        if (window.refreshCurrentView) window.refreshCurrentView('Event');
    },

    _performOptimisticEdit(record) {
        // Just refresh view silently to reflect changes everywhere
        if (window.refreshCurrentView) window.refreshCurrentView('Event');
    },

    async toggleDone(eventId, eventDate = null, recurrenceId = null) {
        try {
            let resp;
            const rec = (window.eventRecords || []).find(r => r.id == eventId);
            const isDone = rec ? rec.done : false;

            if (recurrenceId && eventDate && !isDone) {
                const formData = new FormData();
                formData.append('date', eventDate.substring(0, 10));
                formData.append('recurrence_id', recurrenceId);
                resp = await fetch(`/mark_event_done/${eventId}`, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });
            } else {
                resp = await fetch(`/toggle_event_done/${eventId}`, { method: 'POST' });
            }
            const data = await resp.json();

            if (data.done !== undefined) {
                const record = (window.eventRecords || []).find(r => r.id == eventId);
                if (record) record.done = data.done;

                if (window.refreshCurrentView) {
                    window.refreshCurrentView('Event');
                } else {
                    location.reload();
                }

                if (window.showToast) window.showToast(`Event ${data.done ? 'completed' : 'reopened'}`, 'success');
            }
            else if (window.showToast) window.showToast(data.message || 'Error updating status', 'error');
        } catch (e) {
            console.error("[EventService] toggleDone error:", e);
        }
    },

    showContextMenu(e, ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const oldMenu = document.getElementById('eventContextMenu');
        if (oldMenu) oldMenu.remove();

        const menu = document.createElement('div');
        menu.id = 'eventContextMenu';
        menu.className = 'glass-context-menu';
        menu.style.left = ev.clientX + 'px';
        menu.style.top = ev.clientY + 'px';

        const actions = [
            { label: '📝 Edit Event', onClick: () => this.openEdit(e.id, e.title, e.date, e.rule || e.recurrenceRule, e.end || e.recurrenceEnd, e.recurrence_id || e.recurrenceId, e.color, e.important, e.done) },
            { label: e.done ? '🔄 Reopen Event' : '✅ Mark Completed', onClick: () => this.toggleDone(e.id) },
            { label: '🗑️ Delete Event', onClick: (ev) => {
                if (window.deleteEvent) window.deleteEvent(ev, e.id, !!(e.recurrence_id || e.recurrenceId), e.date ? e.date.substring(0, 10) : null);
                else window.deleteRecordCustom('Event', e.id, !!(e.recurrence_id || e.recurrenceId));
            }, class: 'danger' }
        ];

        // Tree view for categorized events
        if (e.color) {
            actions.push({ label: '🌳 View Event Tree', onClick: () => window.viewEventTree(e.color) });
        }

        // Sticker overview
        const hasStickers = e.has_stickers || e.hasStickers || e.stickers_count > 0;
        actions.push({ 
            label: `<div class="sticker-icon-menu" style="margin-right: 8px;"></div> ${hasStickers ? 'View Stickers' : 'Add Sticker'}`, 
            onClick: () => window.openParentStickers('event', e.id) 
        });

        actions.forEach(act => {
            const item = document.createElement('div');
            item.className = 'menu-item' + (act.class ? ' ' + act.class : '');
            item.innerHTML = act.label;
            item.onclick = (ev) => {
                ev.stopPropagation();
                this._hideContextMenu();
                act.onClick();
            };
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Position menu
        const { clientX: x, clientY: y } = ev;
        const menuRect = menu.getBoundingClientRect();
        let posX = x;
        let posY = y;

        if (x + menuRect.width > window.innerWidth) posX = x - menuRect.width;
        if (y + menuRect.height > window.innerHeight) posY = y - menuRect.height;

        menu.style.left = posX + 'px';
        menu.style.top = posY + 'px';

        document.addEventListener('click', () => this._hideContextMenu(), { once: true });
    },

    async viewTree(color) {
        if (!color) return;
        const modal = document.getElementById('eventTreeModal');
        const body = document.getElementById('eventTreeBody');
        const colorName = document.getElementById('treeColorName');
        if (!modal || !body) return;

        // Clear previous nodes
        body.innerHTML = '';

        if (colorName) colorName.textContent = `(${color})`;
        body.style.setProperty('--tree-color', color);
        ModalManager.open('eventTreeModal');

        try {
            const resp = await fetch(`/api/events/tree/${color.replace('#', '')}`);
            const data = await resp.json();
            if (data.status === 'success') {
                data.data.forEach((e, index) => {
                    const node = document.createElement('div');
                    node.className = `tree-node ${index % 2 === 0 ? 'left' : 'right'}`;
                    const dateStr = new Date(e.date).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                    node.innerHTML = `
                        <div class="tree-card ${e.done ? 'done' : ''}" onclick="openEditEventModal('${e.id}', '${e.title}', '${e.date}', '', '', '${e.recurrence_id || ''}', '${e.color || color}', ${e.important}, ${e.done})">
                            <div class="tree-card-date">${dateStr}</div>
                            <div class="tree-card-title">${e.title}</div>
                        </div>
                    `;
                    body.appendChild(node);
                });
            }
        } catch (err) {
            console.error("[EventService] viewTree error:", err);
            if (window.showToast) window.showToast("Failed to load tree", "error");
        }
    },

    _hideContextMenu() {
        const menu = document.getElementById('eventContextMenu');
        if (menu) menu.remove();
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
            row.style.display = 'block';
            let displayRule = rule;
            if (rule.startsWith('weekly:')) {
                displayRule = rule.replace('weekly:', 'Weekly: ');
            } else {
                displayRule = rule.charAt(0).toUpperCase() + rule.slice(1);
            }
            document.getElementById('detailModalRecRule').textContent = displayRule;
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

    _resetEditState(recRule, color, important = false) {
        const errEl = document.getElementById('editEventError');
        if (errEl) errEl.innerText = '';

        const impCb = document.getElementById('editEventImportant');
        if (impCb) impCb.checked = !!important;

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

        this.initColorPicker(color || '');
    },

    initColorPicker(selectedColor) {
        const container = document.getElementById('editEventColorDots');
        const input = document.getElementById('editEventColor');
        if (!container || !input) return;

        const colors = ['#4F46E5', '#10B981', '#B91C1C', '#F59E0B', '#8B5CF6', '#0EA5E9', '#EC4899', '#1E293B'];
        container.innerHTML = '';
        input.value = selectedColor;

        colors.forEach(c => {
            const dot = document.createElement('div');
            dot.className = 'color-dot' + (c === selectedColor ? ' active' : '');
            dot.style.background = c;
            dot.onclick = () => {
                input.value = c;
                container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
            };
            container.appendChild(dot);
        });

        // Add "None" option
        const none = document.createElement('div');
        none.className = 'color-dot' + (!selectedColor ? ' active' : '');
        none.style.background = '#e2e8f0';
        none.innerHTML = '✕';
        none.style.display = 'flex';
        none.style.alignItems = 'center';
        none.style.justifyContent = 'center';
        none.style.fontSize = '12px';
        none.style.color = '#64748b';
        none.onclick = () => {
            input.value = '';
            container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            none.classList.add('active');
        };
        container.appendChild(none);
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
        const emptyEl = document.getElementById('detailStickersEmpty');
        if (!listEl) return;

        listEl.innerHTML = '<div class="loading-hint" style="color:var(--color-text-faint); padding:10px;">Loading stickers...</div>';
        if (emptyEl) emptyEl.style.display = 'none';

        try {
            const stickers = await this.fetchStickers(eventId, recId);
            listEl.innerHTML = '';

            if (!stickers || !stickers.length) {
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            }

            stickers.forEach(s => {
                if (typeof window.createStickerElement === 'function') {
                    listEl.appendChild(window.createStickerElement(s, { isWidget: false }));
                } else {
                    console.error("[EventService] window.createStickerElement is missing!");
                    const errDiv = document.createElement('div');
                    errDiv.style.cssText = "background:var(--color-error-soft); padding:8px; border-radius:8px; font-size:0.8rem; color:var(--color-error);";
                    errDiv.textContent = s.title || s.text.substring(0, 30);
                    listEl.appendChild(errDiv);
                }
            });
        } catch (e) {
            console.error("[EventService] loadDetailStickers failed:", e);
            listEl.innerHTML = '<div style="color:var(--color-error); font-size:0.85rem; padding:10px;">⚠️ Failed to load stickers</div>';
        }
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
            const stickers = await this.fetchStickers(id, recId);
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
            <span class="sticker-text-preview">${s.title || (s.text ? s.text.substring(0, 10) + '...' : 'Sticker')}</span>
            <button onclick="window.EventService.removeTempSticker(${idx})" class="btn-remove-temp">✕</button>
        `;
        return div;
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
    },

    openAddForDay(dateStr) {
        this.openEdit(null, '', dateStr + 'T09:00', 'none', '', '', '');
    }
};

// Global exports
window.EventService = EventService;
window.openEditEventModal = (...args) => EventService.openEdit(...args);
window.closeEditEventModal = () => ModalManager.close('editEventModal');
window.saveEventEdit = () => EventService.save();
window.openEventDetailModal = (e) => EventService.openDetail(e);
window.toggleEditEventWeekdays = () => EventService.toggleWeekdays();
window.toggleEditEventEndMode = () => EventService.toggleEndMode();
window.calcEditEventEndDateFromCount = () => EventService.calcEndDateFromCount();
window.openAddEventForDay = (dateStr) => EventService.openAddForDay(dateStr);
window.toggleEventDone = (id) => EventService.toggleDone(id);
window.initColorPicker = (c) => EventService.initColorPicker(c);
window.viewEventTree = (color) => EventService.viewTree(color);
window.closeEventTreeModal = () => ModalManager.close('eventTreeModal');

window.addEventListener('stickersUpdated', (e) => {
    if (e.detail && e.detail.parentType === 'event') {
        const id = document.getElementById('editEventId')?.value;
        const recId = document.getElementById('editEventRecId')?.value;
        const editModal = document.getElementById('editEventModal');
        if (editModal && editModal.style.display !== 'none' && id && String(e.detail.parentId) === String(id)) {
            EventService._updateEditStickersList(id, recId);
        }

        const detailModal = document.getElementById('eventDetailModal');
        const detailId = document.getElementById('detailEventId')?.value;
        const detailRecId = document.getElementById('detailEventRecId')?.value;
        if (detailModal && detailModal.style.display !== 'none' && detailId && String(e.detail.parentId) === String(detailId)) {
            EventService.loadDetailStickers(detailId, detailRecId);
        }
    }
});
