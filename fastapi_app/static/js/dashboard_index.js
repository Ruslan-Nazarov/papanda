import { customConfirm, customChoice } from './modal_controller.js';
import { deleteRecordApi, fetchWithJson } from './db_api.js';
import { toggleWidget, initGrid, saveLayout } from './grid_controller.js';
import { showToast } from './ui_helpers.js';
import { ModalManager } from './modules/ModalManager.js';

import { initEventWidget }       from './event_widget.js';
import { initWordWidget }        from './word_widget.js';
import { initRecurrenceForm }    from './recurrence_form.js';
import { initStickerWidget }     from './sticker_widget.js';
import { initNoteChronoWidget }  from './note_chrono_widget.js';

import { DashboardActionService } from './modules/DashboardActionService.js';
import { DragAndDropService }     from './modules/DragAndDropService.js';
import { HeaderService }          from './modules/HeaderService.js';

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
        const resp = await fetch(form.action, { method: 'POST' });
        if (resp.ok) {
            if (window.HeaderService) window.HeaderService.refreshBadges();
        } else {
            console.error('Task mark failed');
            location.reload();
        }
    } catch (e) {
        console.error('Error marking task done:', e);
        location.reload();
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
        if (!resp.ok) location.reload();
    } catch (e) {
        location.reload();
    }
    await animationPromise;
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
});
