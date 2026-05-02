/**
 * DragAndDropService.js - Manages Sortable.js instances on the dashboard.
 */

import { showToast } from '../ui_helpers.js';

export const DragAndDropService = {
    init() {
        this.initTasks();
        this.initEvents();
        this.initCorkboard();
    },

    initTasks() {
        const list = document.querySelector('.task-list');
        if (!list || typeof Sortable === 'undefined') return;
        Sortable.create(list, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => {
                const ids = Array.from(list.querySelectorAll('.task-item')).map(el => parseInt(el.dataset.id));
                fetch('/api/dnd/reorder_tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ids)
                });
            }
        });
    },

    initEvents() {
        const todayList = document.querySelector('.events-today ul');
        const tomorrowList = document.querySelector('.events-tomorrow ul');
        if (!todayList || !tomorrowList || typeof Sortable === 'undefined') return;

        const options = {
            group: 'events',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                const { item, to, from } = evt;
                const eventId = parseInt(item.dataset.id);
                if (to === from) {
                    const ids = Array.from(to.querySelectorAll('li')).map(el => parseInt(el.dataset.id));
                    fetch('/api/dnd/reorder_events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(ids)
                    });
                } else {
                    const newDate = to.closest('.events-today') ? 'today' : 'tomorrow';
                    const response = await fetch('/api/dnd/move_event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event_id: eventId, new_date: newDate })
                    });
                    if (response.ok) showToast(`✓ Moved to ${newDate}`, 'success');
                }
            }
        };
        Sortable.create(todayList, options);
        Sortable.create(tomorrowList, options);
    },

    initCorkboard() {
        const corkboard = document.getElementById('corkboard');
        if (!corkboard || typeof Sortable === 'undefined') return;
        Sortable.create(corkboard, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => {
                const ids = Array.from(corkboard.querySelectorAll('.sticker-thought')).map(el => parseInt(el.dataset.id));
                fetch('/api/stickers/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ids)
                }).then(res => {
                    if (res.ok) showToast('Order saved', 'success');
                });
            }
        });
    }
};
