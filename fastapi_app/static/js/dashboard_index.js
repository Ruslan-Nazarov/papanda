import { customConfirm, customChoice } from './modal_controller.js';
import { deleteRecordApi, fetchWithJson } from './db_api.js';
import { toggleWidget, initGrid } from './grid_controller.js';
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
window.showToast    = showToast;

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
