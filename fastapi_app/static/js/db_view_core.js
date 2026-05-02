import { customConfirm, customChoice } from './modal_controller.js';
import { deleteRecordApi, fetchWithJson } from './db_api.js';
import { ModalManager } from './modules/ModalManager.js';
import { EventService } from './modules/EventService.js';
import { NoteService } from './modules/NoteService.js';
import { ChronoService } from './modules/ChronoService.js';
import { TaskService } from './modules/TaskService.js';
import { HabitService } from './modules/HabitService.js';

// --- Global variables for stickers ---
let eventStickerColor = '#fff9c4';
let eventStickerType = 'text';
let tempStickers = []; // Buffer for stickers on NEW events

// --- Color Palette ---
const PRE_COLORS = [
    '#4F46E5', // Indigo Iris
    '#10B981', // Emerald Peak
    '#B91C1C', // Crimson Velvet
    '#F59E0B', // Amber Glow
    '#8B5CF6', // Royal Amethyst
    '#0EA5E9', // Ocean Sky
    '#EC4899', // Desert Rose
    '#1E293B'  // Midnight Slate
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Search UI Toggle animations
    const searchInput = document.querySelector('.search-wrapper input');
    const searchWrapper = document.querySelector('.search-wrapper');
    const searchIcon = document.querySelector('.search-icon-btn');

    if (searchIcon && searchInput && searchWrapper) {
        searchIcon.addEventListener('click', (e) => {
            if (!searchWrapper.classList.contains('has-query') && !searchWrapper.classList.contains('focused')) {
                if (searchInput.value.trim() === '') {
                    e.preventDefault();
                    searchInput.focus();
                }
            }
        });

        searchInput.addEventListener('focus', () => searchWrapper.classList.add('focused'));
        searchInput.addEventListener('blur', () => searchWrapper.classList.remove('focused'));
    }

    // Initialize sticker color dots
    document.querySelectorAll('#eventStickerColorPicker .color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('#eventStickerColorPicker .color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            eventStickerColor = dot.dataset.color;
        });
    });

    // Initialize Global Modal Manager
    ModalManager.initGlobal();
});

// --- Modal Management is now handled by ModalManager.js ---

// --- Deletion Logic IMPROVED ---
window.deleteRecordCustom = async function(modelName, recordId, isRecurring = false) {
    let confirmed = false;
    let deleteMode = 'only';

    try {
        if (modelName === 'Event' && isRecurring) {
            const choice = await customChoice({
                title: 'Delete Recurring Event',
                messageHTML: 'Choose how to delete this recurring event:',
                options: [
                    { value: 'only', label: 'Delete only this occurrence', checked: true },
                    { value: 'this_and_future', label: 'Delete this and all future occurrences' },
                    { value: 'future_only', label: 'Keep this, delete future occurrences' },
                    { value: 'all', label: 'Delete ALL occurrences in the series' }
                ],
                okLabel: 'Delete',
                cancelLabel: 'Cancel'
            });
            if (choice === null) return;
            confirmed = true;
            deleteMode = choice;
        } else {
            confirmed = await customConfirm({
                title: 'Confirm Deletion',
                message: `Are you sure you want to delete this ${modelName}?`,
                buttons: [
                    { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                    { label: 'Delete', value: true, class: 'confirm-btn-danger' }
                ]
            });
        }

        if (confirmed) {
            const resp = await deleteRecordApi(modelName, recordId, deleteMode);
            if (resp.ok) {
                // Optimistic UI Update
                if (modelName === 'Event' && deleteMode !== 'only') {
                    // Fade out the whole container for complex series deletions
                    const wrapper = document.querySelector('.calendar-wrapper') || document.querySelector('.table-container') || document.querySelector('.settings-wrapper');
                    if (wrapper) {
                        wrapper.style.transition = 'opacity 0.3s ease-out';
                        wrapper.style.opacity = '0';
                    }
                    setTimeout(() => location.reload(), 300);
                    return;
                }
                
                // Find the specific element (Card/Chip or Table Row)
                const eventCard = document.querySelector(`[data-id="${recordId}"]`);
                const tableBtns = document.querySelectorAll(`button[onclick*="'${recordId}'"]`);
                
                let found = false;
                if (eventCard) {
                    eventCard.classList.add('fade-out');
                    setTimeout(() => eventCard.remove(), 300);
                    found = true;
                } 
                
                if (tableBtns.length > 0) {
                    tableBtns.forEach(btn => {
                        const tr = btn.closest('tr');
                        if (tr) {
                            tr.classList.add('fade-out-row');
                            setTimeout(() => tr.remove(), 300);
                            found = true;
                        }
                    });
                }
                
                if (!found) {
                    // Fallback if we can't find the element in the DOM
                    location.reload();
                } else {
                    if (window.showToast) window.showToast(`${modelName} deleted`, 'success');
                }
            }
        }
    } catch (e) {
        console.error("Deletion error:", e);
        alert(e.message);
    }
}



// --- Event Modal Management ---
// --- Service-specific functions have been moved to modules/EventService.js, NoteService.js, etc. ---

// --- Event Context Menu ---
function showEventContextMenu(e, ev) {
    let menu = document.getElementById('customContextMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'customContextMenu';
        menu.className = 'custom-context-menu';
        document.body.appendChild(menu);
    }

    menu.innerHTML = '';
    const items = [
        { icon: '🔍', text: 'Показать полностью', action: () => EventService.openDetail(e) },
        { icon: '✎', text: 'Редактировать', action: () => EventService.openEdit(e.id, e.title, e.date, e.rule, e.end, e.recurrence_id, e.color) },
        { icon: e.done ? '○' : '✓', text: e.done ? 'Отменить выполнение' : 'Выполнить', action: () => EventService.toggleDone(e.id) }
    ];

    if (e.has_stickers) {
        items.splice(1, 0, { 
            icon: '<div class="sticker-icon-small"></div>', 
            text: 'Стикеры', 
            isHtmlIcon: true,
            action: () => EventService.openDetail(e) 
        });
    }

    if (e.color) {
        items.push({ icon: '🌳', text: 'Дерево группы', action: () => window.viewEventTree(e.color) });
    }

    items.push({ icon: '×', text: 'Удалить', danger: true, action: () => window.deleteRecordCustom('Event', e.id, !!e.recurrence_id) });

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'context-menu-item' + (item.danger ? ' danger' : '');
        div.innerHTML = `<span class="icon">${item.icon}</span><span>${item.text}</span>`;
        div.onclick = () => {
            menu.style.display = 'none';
            item.action();
        };
        menu.appendChild(div);
    });

    menu.style.display = 'block';
    
    // Position
    let x = ev.clientX;
    let y = ev.clientY;
    
    // Adjust if near bottom/right edge
    const menuWidth = 200;
    const menuHeight = items.length * 45;
    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}

// Global listener to close context menu
document.addEventListener('mousedown', (e) => {
    const menu = document.getElementById('customContextMenu');
    if (menu && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// --- Window Attachments for inline HTML calls ---
// --- Window Attachments for inline HTML calls (Legacy Support) ---
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
window.showEventContextMenu = showEventContextMenu;

// --- Sticker Board Logic (Canvas) ---
