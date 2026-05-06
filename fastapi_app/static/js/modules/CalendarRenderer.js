/**
 * CalendarRenderer.js - Handles rendering of the event calendar grid for DB View.
 */

import { ModalManager } from './ModalManager.js';

export const CalendarRenderer = {
    render(records, currentYear, currentMonth) {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        grid.innerHTML = '';
        const y = currentYear;
        const m = currentMonth;
        
        const getFirstWeekday = (year, month) => {
            const d = new Date(year, month - 1, 1).getDay();
            return d === 0 ? 7 : d;
        };
        
        const first = getFirstWeekday(y, m);
        const totalCells = 42;
        
        // Group by date
        const eventMap = {};
        records.forEach(e => {
            if (!e.date) return;
            const key = e.date.substring(0, 10);
            if (!eventMap[key]) eventMap[key] = [];
            eventMap[key].push(e);
        });

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        for (let i = 1; i <= totalCells; i++) {
            const cellDate = new Date(y, m - 1, i - first + 1);
            const dayNum = cellDate.getDate();
            const key = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
            const inMonth = (cellDate.getMonth() + 1 === m) && (cellDate.getFullYear() === y);
            
            const cell = document.createElement('div');
            cell.className = 'calendar-cell' + (inMonth ? '' : ' other-month') + (key === todayStr ? ' today' : '');
            cell.dataset.date = key;
            
            cell.innerHTML = `
                <div class="cell-date">${dayNum}</div>
                <div class="events-container cell-body"></div>
                <button class="cell-add" onclick="event.stopPropagation(); window.openAddEventForDay('${key}')">+</button>
            `;

            const eventsContainer = cell.querySelector('.events-container');

            (eventMap[key] || []).forEach(e => {
                const chip = document.createElement('div');
                chip.className = 'event-chip' + (e.done ? ' done' : '') + (e.important ? ' important' : '');
                chip.dataset.id = e.id;
                if (e.color) chip.style.borderLeft = `3px solid ${e.color}`;
                
                const hasStickers = e.has_stickers || e.hasStickers || (e.stickers_count > 0);
                const stickerIndicator = hasStickers ? `<span class="sticker-dot-orange" title="Has Stickers"></span>` : '';

                chip.innerHTML = `
                    <div class="title" style="display: flex; align-items: center; gap: 6px; overflow: hidden; flex: 1;">
                        ${e.important ? '<span title="Important">⭐</span>' : ''}
                        ${e.recurrence_id ? '<span title="Recurring">🔁</span>' : ''}
                        ${stickerIndicator}
                        <span class="text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${e.title}</span>
                    </div>
                    <div class="chip-actions">
                        <button class="three-dots" title="Menu">⋮</button>
                    </div>
                `;

                chip.onclick = (ev) => { ev.stopPropagation(); window.openEventDetailModal(e); };
                chip.oncontextmenu = (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    window.showEventContextMenu(e, ev);
                };

                const dotsBtn = chip.querySelector('.three-dots');
                dotsBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    window.showEventContextMenu(e, ev);
                };

                eventsContainer.appendChild(chip);
            });

            grid.appendChild(cell);
        }

        this._initSortable();
    },

    _initSortable() {
        if (typeof Sortable === 'undefined') return;
        document.querySelectorAll('.cell-body').forEach(el => {
            Sortable.create(el, {
                group: 'events',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: async (evt) => {
                    if (evt.from === evt.to && evt.oldIndex === evt.newIndex) return;
                    const eventId = evt.item.dataset.id;
                    const newDate = evt.to.closest('.calendar-cell').dataset.date;
                    
                    if (evt.from !== evt.to) {
                        try {
                            const resp = await fetch('/api/dnd/move_event', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ event_id: parseInt(eventId), new_date: newDate })
                            });
                            if (resp.ok) {
                                if (window.showToast) window.showToast('Event moved', 'success');
                                // Minimal local state update
                                const rec = eventRecords.find(r => r.id == eventId);
                                if (rec) rec.date = newDate;
                            }
                        } catch (e) { console.error("DnD Error:", e); }
                    }
                }
            });
        });
    }
};

window.CalendarRenderer = CalendarRenderer;
