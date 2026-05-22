/**
 * db_view_core.js - Entry point for the Database View.
 * Coordinates between specialized services.
 */

import { ModalManager } from './modules/ModalManager.js';
import { EventService } from './modules/EventService.js';
import { CalendarRenderer } from './modules/CalendarRenderer.js';
import { RecordService } from './modules/RecordService.js';
import { UIService } from './modules/UIService.js';
import { NoteService } from './modules/NoteService.js';
import { ChronoService } from './modules/ChronoService.js';
import { TaskService } from './modules/TaskService.js';
import { HabitService } from './modules/HabitService.js';
import { NotificationService } from './modules/NotificationService.js';
import { customConfirm, customChoice, customPrompt } from './modal_controller.js';
import { applyLocalTimeGlobally } from './ui_helpers.js';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Global UI interactions
    UIService.init();
    
    // Initialize Notification System
    NotificationService.init();

    // Initialize Global Modal Manager
    if (ModalManager.initGlobal) ModalManager.initGlobal();
    else if (ModalManager.init) ModalManager.init();
    
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
window.NotificationService = NotificationService;
window.showToast = (m, t) => NotificationService.show(m, t);
// Deletion Logic
window.deleteRecordCustom = (m, i, r) => RecordService.delete(m, i, r);

// Modal Helpers
window.customPrompt = (params) => customPrompt(params);
window.customConfirm = (params) => customConfirm(params);
window.customChoice = (params) => customChoice(params);

// Event Logic
window.showEventContextMenu = (e, ev) => EventService.showContextMenu(e, ev);

// Modal Helpers
window.openEditEventModal = (...args) => EventService.openEdit(...args);
window.closeEditEventModal = () => ModalManager.close('editEventModal');
window.saveEventEdit = () => EventService.save();
window.openEventDetailModal = (e) => EventService.openDetail(e);
window.toggleEditEventWeekdays = () => EventService.toggleWeekdays();
window.toggleEditEventEndMode = () => EventService.toggleEndMode();
window.calcEditEventEndDateFromCount = () => EventService.calcEndDateFromCount();
window.openAddEventForDay = (dateStr) => EventService.openAddForDay(dateStr);
window.toggleEventDone = (id) => EventService.toggleDone(id);

window.openEditNoteModal = (...args) => NoteService.openEdit(...args);
window.closeEditNoteModal = () => ModalManager.close('editNoteModal');
window.saveNoteEdit = () => NoteService.save();
window.openNoteViewModal = (...args) => NoteService.openView(...args);
window.closeNoteViewModal = () => ModalManager.close('noteViewModal');

window.openEditChronoModal = (...args) => ChronoService.openEdit(...args);
window.closeEditChronoModal = () => ModalManager.close('editChronoModal');
window.saveChronoEdit = () => ChronoService.save();
window.openChronoViewModal = (...args) => ChronoService.openView(...args);
window.closeChronoViewModal = () => ModalManager.close('chronoViewModal');

window.openEditHabitModal = (...args) => HabitService.openEdit(...args);
window.closeEditHabitModal = () => ModalManager.close('editHabitModal');
window.saveHabitEdit = () => HabitService.save();

window.openEditTaskModal = (...args) => TaskService.openEdit(...args);
window.closeEditTaskModal = () => ModalManager.close('editTaskModal');
window.saveTaskEdit = () => TaskService.save();
