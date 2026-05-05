/**
 * db_view_core.js - Entry point for the Database View.
 * Coordinates between specialized services.
 */

import { ModalManager } from './modules/ModalManager.js';
import { EventService } from './modules/EventService.js';
import { RecordService } from './modules/RecordService.js';
import { UIService } from './modules/UIService.js';
import { NoteService } from './modules/NoteService.js';
import { ChronoService } from './modules/ChronoService.js';
import { TaskService } from './modules/TaskService.js';
import { HabitService } from './modules/HabitService.js';
import { applyLocalTimeGlobally } from './ui_helpers.js';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Global UI interactions
    UIService.init();

    // Initialize Global Modal Manager
    ModalManager.initGlobal();
    
    // Apply local time to all .local-time elements
    applyLocalTimeGlobally();

    console.log("[Papanda] DB View Core initialized.");
});

// --- Window Attachments for Legacy HTML Compatibility ---
window.RecordService = RecordService;
window.EventService = EventService;
window.NoteService = NoteService;
window.ChronoService = ChronoService;
window.TaskService = TaskService;
window.HabitService = HabitService;

// Deletion Logic
window.deleteRecordCustom = (m, i, r) => RecordService.delete(m, i, r);

// Event Logic
window.showEventContextMenu = (e, ev) => EventService.showContextMenu(e, ev);

// Modal Helpers
window.openEditEventModal = (...args) => EventService.openEdit(...args);
window.saveEventEdit = () => EventService.save();
window.openEventDetailModal = (e) => EventService.openDetail(e);
window.toggleEditEventWeekdays = () => EventService.toggleWeekdays();
window.toggleEditEventEndMode = () => EventService.toggleEndMode();
window.calcEditEventEndDateFromCount = () => EventService.calcEndDateFromCount();

window.openEditNoteModal = (...args) => NoteService.openEdit(...args);
window.saveNoteEdit = () => NoteService.save();
window.openNoteViewModal = (...args) => NoteService.openView(...args);

window.openEditChronoModal = (...args) => ChronoService.openEdit(...args);
window.saveChronoEdit = () => ChronoService.save();
window.openChronoViewModal = (...args) => ChronoService.openView(...args);

window.openEditHabitModal = (...args) => HabitService.openEdit(...args);
window.saveHabitEdit = () => HabitService.save();

window.openEditTaskModal = (...args) => TaskService.openEdit(...args);
window.saveTaskEdit = () => TaskService.save();
