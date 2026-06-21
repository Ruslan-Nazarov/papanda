/**
 * DragAndDropService.js - Manages Sortable.js instances on the dashboard.
 */

import { showToast } from './NotificationService.js';

export const DragAndDropService = {
    init() {
        this.initTasks();
        this.initEvents();
        this.initCorkboard();
    },

    initTasks() {
        const list = document.querySelector('.tasks-widget ul');
        if (!list || typeof Sortable === 'undefined') return;
        Sortable.create(list, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: () => {
                const ids = Array.from(list.querySelectorAll('li')).map(el => parseInt(el.dataset.id));
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

        const handleCrossListMove = async (evt) => {
            const { item, to, from, oldIndex } = evt;
            const eventId = parseInt(item.dataset.id);
            const newDate = to.closest('.events-today') ? 'today' : 'tomorrow';

            const response = await fetch('/api/dnd/move_event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId, new_date: newDate })
            });

            if (!response.ok) {
                // Rollback: return item to original list at original position
                const refNode = from.children[oldIndex] || null;
                from.insertBefore(item, refNode);
                showToast(window._("toast.failed_to_move_event"), 'error');
                return;
            }

            showToast(`✓ Moved to ${newDate}`, 'success');

            if (newDate === 'today') {
                // Remove tomorrow opacity
                item.classList.remove('tomorrow-item');

                // Update data-event-date on the edit button to today's date
                const editBtn = item.querySelector('button[data-event-id]');
                if (editBtn && editBtn.dataset.eventDate) {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const timePart = editBtn.dataset.eventDate.slice(11) || '09:00';
                    editBtn.dataset.eventDate = `${todayStr}T${timePart}`;
                }

                // Inject "mark done" form if missing
                const rowActions = item.querySelector('.row-actions');
                if (rowActions && !rowActions.querySelector('form[action*="mark_event_done"]')) {
                    const recId = item.querySelector('button[data-event-rec-id]')?.dataset.eventRecId || '';
                    const todayDateStr = new Date().toISOString().slice(0, 10);
                    const form = document.createElement('form');
                    form.action = `/mark_event_done/${eventId}`;
                    form.method = 'post';
                    form.style.margin = '0';
                    form.onsubmit = (e) => { e.preventDefault(); window.markEventDone(form, eventId); };
                    const hiddenDate = document.createElement('input');
                    hiddenDate.type = 'hidden'; hiddenDate.name = 'date'; hiddenDate.value = todayDateStr;
                    const hiddenRec = document.createElement('input');
                    hiddenRec.type = 'hidden'; hiddenRec.name = 'recurrence_id'; hiddenRec.value = recId;
                    const btn = document.createElement('button');
                    btn.type = 'submit';
                    btn.className = 'btn-row-action done';
                    btn.title = 'Complete event';
                    btn.textContent = '✓';
                    form.appendChild(hiddenDate);
                    form.appendChild(hiddenRec);
                    form.appendChild(btn);
                    const editBtnRef = rowActions.querySelector('button[data-event-id]');
                    rowActions.insertBefore(form, editBtnRef || rowActions.children[1] || null);
                }

                // Show tomorrow section if it's now empty
                const tomorrowSection = document.querySelector('.events-tomorrow');
                if (tomorrowSection && tomorrowList.children.length === 0) {
                    tomorrowSection.style.display = 'none';
                }
            } else {
                // Add tomorrow opacity
                item.classList.add('tomorrow-item');

                // Update data-event-date to tomorrow's date
                const editBtn = item.querySelector('button[data-event-id]');
                if (editBtn && editBtn.dataset.eventDate) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
                    const timePart = editBtn.dataset.eventDate.slice(11) || '09:00';
                    editBtn.dataset.eventDate = `${tomorrowStr}T${timePart}`;
                }

                // Remove "mark done" form
                const form = item.querySelector('form[action*="mark_event_done"]');
                if (form) form.remove();

                // Show tomorrow section
                const tomorrowSection = document.querySelector('.events-tomorrow');
                if (tomorrowSection) tomorrowSection.style.display = '';
            }
        };

        Sortable.create(todayList, {
            group: 'events',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                if (evt.to === evt.from) {
                    const ids = Array.from(todayList.querySelectorAll('li')).map(el => parseInt(el.dataset.id));
                    fetch('/api/dnd/reorder_events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(ids)
                    });
                } else {
                    await handleCrossListMove(evt);
                }
            }
        });

        Sortable.create(tomorrowList, {
            group: 'events',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                if (evt.to === evt.from) {
                    const ids = Array.from(tomorrowList.querySelectorAll('li')).map(el => parseInt(el.dataset.id));
                    fetch('/api/dnd/reorder_events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(ids)
                    });
                } else {
                    await handleCrossListMove(evt);
                }
            }
        });
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
                    if (res.ok) showToast(window._("toast.order_saved"), 'success');
                });
            }
        });
    }
};
