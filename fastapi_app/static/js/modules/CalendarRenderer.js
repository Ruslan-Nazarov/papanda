/**
 * CalendarRenderer.js - Handles rendering of the event calendar grid for DB View.
 */

import { ModalManager } from './ModalManager.js';

export const CalendarRenderer = {
    render(records, currentYear, currentMonth, containerId = 'calendarGrid') {
        const grid = document.getElementById(containerId);
        if (!grid) return;

        if (this._sortables && this._sortables[containerId]) {
            this._sortables[containerId].forEach(s => {
                try { s.destroy(); } catch (e) {}
            });
        }
        if (!this._sortables) this._sortables = {};
        this._sortables[containerId] = [];

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

        const fragment = document.createDocumentFragment();

        for (let i = 1; i <= totalCells; i++) {
            const cellDate = new Date(y, m - 1, i - first + 1);
            const dayNum = cellDate.getDate();
            const key = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
            const inMonth = (cellDate.getMonth() + 1 === m) && (cellDate.getFullYear() === y);
            
            const cell = document.createElement('div');
            cell.className = 'calendar-cell' + (inMonth ? '' : ' other-month') + (key === todayStr ? ' today' : '');
            cell.dataset.date = key;
            
            const dayEvents = eventMap[key] || [];
            const count = dayEvents.length;
            const hasUnfinished = dayEvents.some(e => !e.done);
            const countBadge = count > 0 ? `<span style="font-size: 0.7rem; color: var(--color-text-muted); background: var(--color-bg-subtle); padding: 2px 6px; border-radius: 10px; margin-left: 6px; font-weight: 700;">${count}</span>` : '';
            const unfinishedDot = (count > 0 && hasUnfinished) ? `<span style="width: 8px; height: 8px; background-color: #FF9800; border-radius: 50%; display: inline-block; margin-left: 6px; box-shadow: 0 0 6px rgba(255, 152, 0, 0.9);" title="Has unfinished events"></span>` : '';

            cell.style.cursor = 'pointer';
            cell.onclick = () => {
                if(window.openDayViewModal) {
                    window.openDayViewModal(key);
                }
            };
            
            cell.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid var(--color-border-light); background: var(--color-bg-white); border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg);">
                    <div style="display: flex; align-items: center;">
                        <span class="cell-date" style="font-weight: 800; font-size: 1.1rem; color: var(--color-text-dark);">${dayNum}</span>
                        ${countBadge}
                        ${unfinishedDot}
                    </div>
                    <button class="cell-add" title="Add Event" style="background: none; border: none; font-size: 1.4rem; line-height: 0.5; cursor: pointer; color: var(--color-text-faint); transition: color 0.2s;">+</button>
                </div>
                <div class="events-container cell-body" style="overflow: hidden; flex: 1; padding: 4px; display: flex; flex-direction: column; gap: 2px;"></div>
            `;

            const addBtn = cell.querySelector('.cell-add');
            if (addBtn) {
                addBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    if (window.openAddEventForDay) {
                        window.openAddEventForDay(key);
                    }
                };
            }

            const eventsContainer = cell.querySelector('.events-container');
            const maxEvents = 4; // Show up to 4 items before truncation
            const displayEvents = dayEvents.slice(0, maxEvents);

            displayEvents.forEach(e => {
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
                        <span class="text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; font-size: 0.75rem;">${e.title}</span>
                    </div>
                `;

                chip.onclick = (ev) => { ev.stopPropagation(); window.openEventDetailModal(e); };
                chip.oncontextmenu = (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    window.showEventContextMenu(e, ev);
                };

                eventsContainer.appendChild(chip);
            });

            if (dayEvents.length > maxEvents) {
                const moreChip = document.createElement('div');
                moreChip.style.cssText = "font-size: 0.7rem; color: var(--color-text-faint); text-align: center; padding: 4px 0; font-weight: 700; margin-top: auto; border-top: 1px dashed var(--color-border-light);";
                moreChip.textContent = `+ ${dayEvents.length - maxEvents} more`;
                eventsContainer.appendChild(moreChip);
            }

            fragment.appendChild(cell);
        }

        grid.appendChild(fragment);
        this._initSortable(grid, containerId);
    },

    _initSortable(grid, containerId) {
        if (typeof Sortable === 'undefined' || !grid) return;
        grid.querySelectorAll('.cell-body').forEach(el => {
            const s = Sortable.create(el, {
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
                                if (window.showToast) window.showToast(window._("toast.event_moved"), 'success');
                                // Minimal local state update
                                if (window.eventRecords) {
                                    const rec = window.eventRecords.find(r => r.id == eventId);
                                    if (rec) rec.date = newDate;
                                }
                                // Trigger silent refresh to update counts and widgets
                                if (window.refreshCurrentView) {
                                    window.refreshCurrentView('Event');
                                }
                            }
                        } catch (e) { console.error("DnD Error:", e); }
                    }
                }
            });
            if (this._sortables && this._sortables[containerId]) {
                this._sortables[containerId].push(s);
            }
        });
    }
};

window.CalendarRenderer = CalendarRenderer;
