import { customConfirm, customChoice } from './modal_controller.js';
import { deleteRecordApi, fetchWithJson } from './db_api.js';
import { toggleWidget, initGrid, saveLayout } from './grid_controller.js';
import { showToast } from './ui_helpers.js';
import { ModalManager } from './modules/ModalManager.js';

import { initEventWidget }       from './event_widget.js';
import { initWordWidget }        from './word_widget.js?v=5';
import { initRecurrenceForm }    from './recurrence_form.js';
import { initStickerWidget }     from './sticker_widget.js';
import { initNoteChronoWidget }  from './note_chrono_widget.js';

import { DashboardActionService } from './modules/DashboardActionService.js';
import { DragAndDropService }     from './modules/DragAndDropService.js';
import { HeaderService }          from './modules/HeaderService.js';

window.DragAndDropService = DragAndDropService;

window.toggleWidget = toggleWidget;
window.saveLayout   = saveLayout;
window.showToast    = showToast;

window.markTaskDone = async function(form, taskId) {
    const li = form.closest('li');
    const { animateItemRemoval, showToast } = await import('./ui_helpers.js');
    
    // Animate immediately
    const animationPromise = animateItemRemoval(li);
    if (showToast) showToast('Task completed', 'success');

    try {
        if (resp.ok) {
            if (window.HeaderService) window.HeaderService.refreshBadges();
            if (typeof window.refreshDashboardTasks === 'function') window.refreshDashboardTasks();
        } else {
            console.error('Task mark failed');
            if (typeof window.refreshDashboardTasks === 'function') window.refreshDashboardTasks();
        }
    } catch (e) {
        console.error('Error marking task done:', e);
        if (typeof window.refreshDashboardTasks === 'function') window.refreshDashboardTasks();
    }
    await animationPromise;
};

window.markHabitDone = async function(form, habitId) {
    const li = form.closest('li');
    const { animateItemRemoval, showToast } = await import('./ui_helpers.js');
    
    const animationPromise = animateItemRemoval(li);
    if (showToast) showToast('Habit completed for today!', 'success');

    try {
        const resp = await fetch(form.action, { method: 'POST' });
        if (!resp.ok) {
            if (typeof window.refreshDashboardHabits === 'function') window.refreshDashboardHabits();
        } else {
            if (typeof window.refreshDashboardHabits === 'function') window.refreshDashboardHabits();
        }
    } catch (e) {
        if (typeof window.refreshDashboardHabits === 'function') window.refreshDashboardHabits();
    }
    await animationPromise;
};

window.refreshDashboardTasks = async function() {
    try {
        const resp = await fetch('/api/dashboard/widget/tasks');
        if (resp.ok) {
            const html = await resp.text();
            const wrapper = document.querySelector('#tasks .grid-stack-item-content');
            if (wrapper) {
                wrapper.innerHTML = html;
                if (window.DragAndDropService) window.DragAndDropService.initTasks();
            }
        }
    } catch (e) { console.error('Failed to refresh tasks', e); }
};

window.refreshDashboardHabits = async function() {
    try {
        const resp = await fetch('/api/dashboard/widget/habits');
        if (resp.ok) {
            const html = await resp.text();
            const wrapper = document.querySelector('#habits .grid-stack-item-content');
            if (wrapper) wrapper.innerHTML = html;
        }
    } catch (e) { console.error('Failed to refresh habits', e); }
};

document.addEventListener('DOMContentLoaded', async function () {
    if (window.dbLog) window.dbLog('DOMContentLoaded fired');
    console.log("[Dashboard] Starting initialization...");

    // 1. Initialize core GridStack FIRST
    initGrid();

    // 2. Initialize feature modules with safety wrappers
    const initSafe = async (fn, name) => {
        try { await fn(); }
        catch (e) { console.error(`[Dashboard] Failed to init ${name}:`, e); }
    };

    initSafe(initEventWidget, 'EventWidget');
    initSafe(initWordWidget, 'WordWidget');
    initSafe(initRecurrenceForm, 'RecurrenceForm');
    await initSafe(initStickerWidget, 'StickerWidget');
    initSafe(initNoteChronoWidget, 'NoteChronoWidget');

    // 3. Initialize core services
    DashboardActionService.init();
    DragAndDropService.init();
    HeaderService.init();
    ModalManager.initGlobal();

    // Listen for stickers updating to refresh respective dashboard widgets in real-time
    window.addEventListener('stickersUpdated', async (e) => {
        const parentType = e.detail?.parentType;
        console.log(`[Dashboard] stickersUpdated event received for parentType: ${parentType}`);
        if (parentType === 'event') {
            if (typeof window.refreshDashboardEvents === 'function') window.refreshDashboardEvents();
            if (typeof window.loadCalendarData === 'function') {
                await window.loadCalendarData();
            }
            if (typeof window.refreshDayViewModalIfOpen === 'function') window.refreshDayViewModalIfOpen();
        } else if (parentType === 'task') {
            if (typeof window.refreshDashboardTasks === 'function') window.refreshDashboardTasks();
        } else if (parentType === 'habit') {
            if (typeof window.refreshDashboardHabits === 'function') window.refreshDashboardHabits();
        }
    });
});
