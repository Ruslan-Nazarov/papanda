/**
 * db_view_core.js - Entry point for the Database View.
 * Coordinates between specialized services.
 */

import { ModalManager } from './modules/ModalManager.js';
import { EventService } from './modules/EventService.js?v=3';
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

// Global Refresh Logic
window.refreshCurrentView = function (modelName) {
    const modalEl = document.getElementById('dbViewModal');
    const calendarModalEl = document.getElementById('fullCalendarModal');

    // Asynchronously refresh corresponding dashboard widgets if their refresh functions are available
    if (modelName === 'Event' && typeof window.refreshDashboardEvents === 'function') {
        window.refreshDashboardEvents();
    }
    if (modelName === 'Task' && typeof window.refreshDashboardTasks === 'function') {
        window.refreshDashboardTasks();
    }
    if (modelName === 'Habit' && typeof window.refreshDashboardHabits === 'function') {
        window.refreshDashboardHabits();
    }
    if (modelName === 'Observation' && typeof window.refreshDashboardObservations === 'function') {
        window.refreshDashboardObservations();
    }
    if (modelName === 'Stickers' && typeof window.refreshDashboardStickers === 'function') {
        window.refreshDashboardStickers();
    }

    // If the centralized modal is open, silently fetch its content again
    if (modalEl && modalEl.style.display === 'flex' && window.openDbViewModal) {
        window.openDbViewModal(modelName);
    } 
    // If calendar modal is open, silently refresh it
    else if (calendarModalEl && calendarModalEl.style.display === 'flex' && window.loadCalendarData) {
        const dayViewModal = document.getElementById('dayViewModal');
        const dayViewDate = window.currentDayViewDateStr;
        const isDayViewOpen = dayViewModal && dayViewModal.style.display !== 'none';
        
        window.loadCalendarData(false).then(() => {
            if (isDayViewOpen && window.openDayViewModal) {
                window.openDayViewModal(dayViewDate);
            }
        });
    } else {
        // Fallback for standalone pages or widgets (bypass if already updated asynchronously)
        if (modelName === 'Event' && typeof window.refreshDashboardEvents === 'function') return;
        if (modelName === 'Task' && typeof window.refreshDashboardTasks === 'function') return;
        if (modelName === 'Habit' && typeof window.refreshDashboardHabits === 'function') return;
        if (modelName === 'Observation' && typeof window.refreshDashboardObservations === 'function') return;
        if (modelName === 'Stickers' && typeof window.refreshDashboardStickers === 'function') return;
        if (modelName === 'Chronology') return;
        if (modelName === 'Notes') return;
        location.reload();
    }
};

// Global Search System
window.openSearchModal = function (modelOverride) {
    if (typeof ModalManager !== 'undefined') {
        if (modelOverride) {
            window.searchModelOverride = modelOverride;
        } else {
            window.searchModelOverride = null;
        }
        
        // Update modal title if possible
        const titleEl = document.querySelector('#dbSearchModal h2');
        if (titleEl) {
            const displayModel = modelOverride || window.currentDbViewModel || 'All';
            titleEl.textContent = 'Search: ' + displayModel;
        }

        ModalManager.open('dbSearchModal');
        setTimeout(() => {
            const input = document.getElementById('dbSearchInput');
            if (input) {
                input.focus();
                input.value = ''; // Clear previous
                if (typeof window.performAjaxSearch === 'function') window.performAjaxSearch();
            }
        }, 350);
    }
};

window.performAjaxSearch = async function () {
    const query = (document.getElementById('dbSearchInput')?.value || '').trim();
    // To support generic search, we fetch the active model name.
    // If we're in the modal, we can derive it from the modal title or store it.
    // We use searchModelOverride if set (e.g. from a specific widget), else currentDbViewModel, else 'All'.
    const modelName = window.searchModelOverride || window.currentDbViewModel || 'All';
    const resultsBox = document.getElementById('dbSearchResults');
    const placeholder = document.getElementById('searchPlaceholder');

    if (query.length < 2) {
        if (resultsBox) resultsBox.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        return;
    }

    if (placeholder) {
        placeholder.innerHTML = '<div class="search-loader"></div><div style="font-weight: 600; margin-top: 15px;">Searching...</div>';
        placeholder.style.display = 'block';
    }
    if (resultsBox) resultsBox.style.display = 'none';

    if (window.searchTimeout) clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(async function () {
        try {
            const url = '/api/db/search/' + modelName + '?search=' + encodeURIComponent(query);
            const resp = await fetch(url);

            if (!resp.ok) throw new Error("HTTP " + resp.status);
            const data = await resp.json();

            if (data.status === 'success') {
                window.renderSearchItems(data.data);
            } else {
                throw new Error(data.message || "Error");
            }
        } catch (e) {
            if (placeholder) placeholder.innerHTML = '<div style="color:red; padding:20px;">⚠️ ' + e.message + '</div>';
        }
    }, 300);
};

window.renderSearchItems = function (items) {
    const resultsBox = document.getElementById('dbSearchResults');
    const placeholder = document.getElementById('searchPlaceholder');
    if (!resultsBox) return;

    if (!items || items.length === 0) {
        resultsBox.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No matches found</div>';
    } else {
        resultsBox.innerHTML = items.map(function (item) {
            return '<div class="search-result-item" onclick="window.jumpToRecord(\'' + item.id + '\', \'' + (item.model || '') + '\')">' +
                '<div class="search-result-info">' +
                '<div class="search-result-title">' + (item.title || 'Untitled') + '</div>' +
                '<div class="search-result-meta">' + (item.date || item.text || 'ID: ' + item.id) + '</div>' +
                '</div>' +
                '<div class="search-result-action"><span class="btn btn-primary" style="padding: 4px 10px; font-size: 0.8rem;">View</span></div>' +
                '</div>';
        }).join('');
    }

    resultsBox.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
};

window.jumpToRecord = async function (id, itemModel = null) {
    const selector = '.event-chip[data-id="' + id + '"], ' +
        '.note-card[data-id="' + id + '"], ' +
        '.record-row[data-id="' + id + '"], ' +
        '[data-id="' + id + '"]';

    const el = document.querySelector(selector);

    if (el) {
        if (typeof ModalManager !== 'undefined') ModalManager.close('dbSearchModal');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '4px solid #4F46E5';
        el.style.boxShadow = '0 0 25px rgba(79, 70, 229, 0.4)';
        setTimeout(function () {
            el.click();
        }, 500);
        setTimeout(function () { el.style.outline = 'none'; el.style.boxShadow = 'none'; }, 3000);
    } else {
        if (typeof ModalManager !== 'undefined') ModalManager.close('dbSearchModal');

        const modelName = itemModel || window.currentDbViewModel || 'All';
        try {
            const resp = await fetch('/api/db/get_record/' + modelName + '/' + id);
            if (!resp.ok) throw new Error("Fetch failed");
            const data = await resp.json();
            if (data.status === 'success') {
                if (modelName === 'Event' && window.openEventDetailModal) {
                    window.openEventDetailModal(data.data);
                } else if ((modelName === 'Note' || modelName === 'Notes') && window.openNoteViewModal) {
                    window.openNoteViewModal(data.data);
                } else if (modelName === 'Chronology' && window.openChronoViewModal) {
                    window.openChronoViewModal(data.data.date, data.data.title);
                } else {
                    if (window.openDbViewModal) {
                        await window.openDbViewModal(modelName);
                        setTimeout(() => {
                            const modalEl = document.querySelector('#dbViewModalContent [data-id="' + id + '"]');
                            if (modalEl) {
                                modalEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                modalEl.style.outline = '4px solid #4F46E5';
                                setTimeout(() => modalEl.click(), 500);
                            }
                        }, 800);
                    }
                }
            } else {
                throw new Error(data.message);
            }
        } catch (e) {
            console.error("Jump to record error:", e);
        }
    }
};

// Pagination Helper
window.initPagination = function (gridId, btnContainerId, initialCount = 10, batchSize = 10) {
    const grid = document.getElementById(gridId);
    const btnContainer = document.getElementById(btnContainerId);
    if (!grid) return;

    // We assume children are the cards
    const cards = Array.from(grid.children);
    let visibleCount = initialCount;

    cards.forEach((card, idx) => {
        if (idx >= visibleCount) card.style.display = 'none';
        else card.style.display = ''; // reset to default display
    });

    if (cards.length <= visibleCount && btnContainer) {
        btnContainer.style.display = 'none';
    } else if (btnContainer) {
        btnContainer.style.display = 'flex'; // show container
        const btn = btnContainer.querySelector('button');
        if (btn) {
            btn.onclick = function () {
                let count = 0;
                for (let i = visibleCount; i < cards.length && count < batchSize; i++) {
                    cards[i].style.display = '';
                    count++;
                    visibleCount++;
                }
                if (visibleCount >= cards.length) {
                    btnContainer.style.display = 'none';
                }
            };
        }
    }
};

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
window.closeEditNoteModal = () => NoteService.closeEditNoteModal();
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
