/**
 * Core JavaScript logic for DB View management.
 * Extracted from db_view.html for maintainability.
 */

import { customConfirm, customChoice } from './modal_controller.js';
import { deleteRecordApi, fetchWithJson } from './db_api.js';

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
});

// --- Modal Management ---
window.onclick = function(e) {
    const modals = [
        'editEventModal', 'editNoteModal', 'editChronoModal', 
        'chronoViewModal', 'noteViewModal', 'editHabitModal', 
        'editTaskModal', 'customConfirmModal', 'eventTreeModal',
        'stickerDetailModal', 'editWinkModal', 'eventDetailModal'
    ];
    
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && e.target == modal) {
            // Prevent accidental closing if double clicked or clicked too fast after opening
            if (modal.openedAt && (Date.now() - modal.openedAt < 300)) return;
            
            // Special handling for a specific close function if needed,
            // or just generic hide.
            if (id === 'editEventModal') closeEditEventModal();
            else if (id === 'editNoteModal') closeEditNoteModal();
            else if (id === 'editChronoModal') closeEditChronoModal();
            else if (id === 'chronoViewModal') closeChronoViewModal();
            else if (id === 'noteViewModal') closeNoteViewModal();
            else if (id === 'editHabitModal') closeEditHabitModal();
            else if (id === 'editTaskModal') closeEditTaskModal();
            else if (id === 'editWinkModal') closeEditWinkModal();
            else if (id === 'eventDetailModal') closeEventDetailModal();
            else if (id === 'stickerDetailModal') closeStickerModal();
            else if (id === 'eventTreeModal') closeEventTreeModal();
            else modal.style.display = 'none';
        }
    });
    
    // Close popover if clicked outside
    const popover = document.getElementById('eventPopover');
    if (popover && popover.style.display === 'block' && !popover.contains(e.target) && !e.target.closest('.event-chip')) {
        closePopover();
    }
}

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
function openEditEventModal(id, title, dateStr, recRule, recEnd, recId, color) {
    // If opening from detail modal, close detail modal first
    closeEventDetailModal();
    
    document.getElementById('editEventId').value = id || '';
    document.getElementById('editEventRecId').value = recId || '';
    document.getElementById('editEventTitle').value = title || '';
    document.getElementById('editEventDate').value = dateStr || '';
    document.getElementById('editEventRecEnd').value = recEnd || '';
    if (document.getElementById('editEventError')) document.getElementById('editEventError').innerText = '';

    document.getElementById('editEventEndDateMode').checked = true;
    toggleEditEventEndMode();

    const checkboxes = document.querySelectorAll('#editEventWeekdaysRow input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    const select = document.getElementById('editEventRecRule');
    if (!recRule || recRule === 'none') {
        select.value = 'none';
    } else if (recRule.startsWith('weekly:')) {
        select.value = 'weekly';
        const days = recRule.split(':')[1].split(',');
        checkboxes.forEach(cb => { if (days.includes(cb.value)) cb.checked = true; });
    } else {
        select.value = recRule;
    }

    const recRow = document.getElementById('editEventRecurrenceModeRow');
    if (recRow) recRow.style.display = recId ? 'block' : 'none';

    initColorPicker(color || ''); // No default blue here
    
    // Stickers section
    tempStickers = []; // Reset for new/edit
    const sec = document.getElementById('eventStickersSection');
    if (sec) sec.style.display = 'block'; // Always show, even for new
    
    if (id) {
        renderEventStickers(id, recId);
    } else {
        renderEventStickers('', '');
    }

    document.getElementById('editEventModal').style.setProperty('display', 'flex', 'important');
}

function closeEditEventModal() {
    document.getElementById('editEventModal').style.display = 'none';
}

/**
 * Event Detail Modal (Expand)
 */
async function openEventDetailModal(e) {
    try {
        // Normalizing event object (e might be dataset from table row)
        const id = e.id;
        const title = e.title;
        const dateStr = e.date || '';
        const rule = e.rule || e.recurrenceRule || 'none';
        const end = e.end || e.recurrenceEnd || '';
        const recId = e.recurrence_id || e.recurrenceId || '';
        const color = e.color || '';
        const important = e.important === true || e.important === 'true';
        const done = e.done === true || e.done === 'true';

        console.log("[DetailModal] Opening for event ID:", id);

        // Populate fields
        const titleEl = document.getElementById('detailModalTitle');
        if (!titleEl) throw new Error("ID 'detailModalTitle' not found");
        titleEl.innerHTML = (important ? '<span style="color: #F2D14A; margin-right: 8px;">⭐</span>' : '') + (title || '(No Title)');
        
        const dateEl = document.getElementById('detailDateText');
        if (dateEl) {
            if (dateStr) {
                const d = new Date(dateStr);
                dateEl.textContent = d.toLocaleString([], { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            } else {
                dateEl.textContent = 'No date set';
            }
        }

        const statusEl = document.getElementById('detailModalStatus');
        if (statusEl) {
            statusEl.innerHTML = done ? 
                '<span style="color: #10B981; background: #ecfdf5; padding: 4px 10px; border-radius: 20px;">✓ Complete</span>' : 
                '<span style="color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">○ Pending</span>';
        }

        // Color/Category
        const colorCircle = document.getElementById('detailModalColor');
        const categoryEl = document.getElementById('detailModalCategory');
        if (color && colorCircle && categoryEl) {
            colorCircle.style.background = color;
            colorCircle.style.display = 'block';
            // Try to find label in legend
            const labelSpan = document.getElementById('label-' + color.replace('#', ''));
            categoryEl.textContent = (labelSpan && labelSpan.textContent.trim() !== 'Unnamed') ? labelSpan.textContent.trim() : 'Color: ' + color;
        } else if (colorCircle && categoryEl) {
            colorCircle.style.display = 'none';
            categoryEl.textContent = 'Regular Event';
        }

        // Recurrence
        const recRow = document.getElementById('detailModalRecurrenceRow');
        if (recRow) {
            if (rule && rule !== 'none') {
                recRow.style.display = 'flex';
                document.getElementById('detailModalRecRule').textContent = rule.replace('weekly:', 'Weekly: ');
                const endEl = document.getElementById('detailModalRecEndRow');
                if (end) {
                    endEl.style.display = 'block';
                    document.getElementById('detailModalRecEnd').textContent = new Date(end).toLocaleDateString();
                } else {
                    if (endEl) endEl.style.display = 'none';
                }
            } else {
                recRow.style.display = 'none';
            }
        }

        // Edit button linkage
        const editBtn = document.getElementById('detailModalEditBtn');
        if (editBtn) {
            editBtn.onclick = () => openEditEventModal(id, title, dateStr, rule, end, recId, color);
        }

        // Stickers
        loadDetailStickers(id, recId);

        // Show modal
        const modal = document.getElementById('eventDetailModal');
        if (modal) {
            modal.style.setProperty('display', 'flex', 'important');
            modal.openedAt = Date.now();
        } else {
            throw new Error("Modal element 'eventDetailModal' not found");
        }
    } catch (err) {
        console.error("openEventDetailModal Error:", err);
        alert("Ошибка при открытии окна деталей: " + err.message);
    }
}
window.openEventDetailModal = openEventDetailModal;

function closeEventDetailModal() {
    const modal = document.getElementById('eventDetailModal');
    if (modal) modal.style.display = 'none';
}



async function loadDetailStickers(eventId, recId) {
    const listEl = document.getElementById('detailStickersList');
    const emptyEl = document.getElementById('detailStickersEmpty');
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = '<div style="color: #94a3b8; font-size: 0.9em; padding: 10px;">Loading stickers...</div>';
    emptyEl.style.display = 'none';

    try {
        let url = `/api/stickers/event/${eventId}/`;
        if (recId) url += `?recurrence_id=${recId}`;
        const resp = await fetch(url);
        const stickers = await resp.json();
        
        listEl.innerHTML = '';
        if (!stickers || stickers.length === 0) {
            emptyEl.style.display = 'block';
        } else {
            stickers.forEach(s => {
                const div = createStickerElement(s);
                listEl.appendChild(div);
            });
        }
    } catch (e) {
        listEl.innerHTML = '<div style="color: #ef4444; font-size: 0.9em; padding: 10px;">Failed to load stickers.</div>';
    }
}

function toggleEditEventWeekdays() {
    const rule = document.getElementById('editEventRecRule').value;
    const row = document.getElementById('editEventWeekdaysRow');
    if (row) row.style.display = (rule === 'weekly') ? 'block' : 'none';
    calcEditEventEndDateFromCount();
}

function toggleEditEventEndMode() {
    const isCount = document.getElementById('editEventEndCountMode').checked;
    const dateBlock = document.getElementById('editEventEndDateBlock');
    const countBlock = document.getElementById('editEventEndCountBlock');
    if (dateBlock) dateBlock.style.display = isCount ? 'none' : 'block';
    if (countBlock) countBlock.style.display = isCount ? 'block' : 'none';
    if (isCount) calcEditEventEndDateFromCount();
}

function calcEditEventEndDateFromCount() {
    const freq = document.getElementById('editEventRecRule').value;
    const n = parseInt(document.getElementById('editEventRecCount').value) || 1;
    const startStr = document.getElementById('editEventDate').value;
    const endLabel = document.getElementById('editEventRecEndFromCountLabel');
    const endHidden = document.getElementById('editEventRecEndFromCount');
    if (!startStr || freq === 'none') return;
    const start = new Date(startStr);
    let end = new Date(start);
    if (freq === 'daily') end.setDate(start.getDate() + n);
    else if (freq === 'weekly') {
        const checked = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')];
        const d = checked.length || 1;
        end.setDate(start.getDate() + Math.ceil(n / d) * 7);
    }
    else if (freq === 'weekdays') end.setDate(start.getDate() + Math.ceil(n / 5) * 7);
    else if (freq === 'monthly') end.setMonth(start.getMonth() + n);
    else if (freq === 'yearly') end.setFullYear(start.getFullYear() + n);
    const ds = end.toISOString().split('T')[0];
    if (endLabel) endLabel.innerText = 'Calculated end: ' + ds;
    if (endHidden) endHidden.value = ds;
}

async function saveEventEdit() {
    const id = document.getElementById('editEventId').value;
    const recId = document.getElementById('editEventRecId').value;
    const title = document.getElementById('editEventTitle').value.trim();
    const date = document.getElementById('editEventDate').value;
    const color = document.getElementById('editEventColor').value;
    const errEl = document.getElementById('editEventError');
    if (errEl) errEl.innerText = '';

    let recEnd = document.getElementById('editEventRecEnd').value;
    if (document.getElementById('editEventEndCountMode').checked) {
        recEnd = document.getElementById('editEventRecEndFromCount').value;
    }
    let recRule = document.getElementById('editEventRecRule').value;
    if (recRule === 'weekly') {
        const ch = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')].map(cb => cb.value);
        if (ch.length > 0) recRule = 'weekly:' + ch.join(',');
    }
    const mode = document.querySelector('input[name="edit_event_mode"]:checked')?.value || 'only';
    if (!title || !date) { if (errEl) errEl.innerText = 'Required fields empty.'; return; }

    try {
        const payload = { 
            id, title, date, 
            recurrence_rule: recRule, 
            recurrence_end: recEnd, 
            edit_mode: mode, 
            recurrence_id: recId, 
            color,
            stickers: tempStickers // Send buffered stickers
        };
        const resp = await fetch('/edit_event_inline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        console.log('[saveEventEdit DB] Server response:', data);

        if (data.status === 'success' || data.success === true) {
            if (errEl) {
                errEl.style.color = 'green';
                errEl.innerText = '✓ Success! Reloading...';
            }
            setTimeout(() => location.reload(), 1000);
        } else {
            const msg = data.message || data.detail || 'Unknown error';
            if (errEl) {
                errEl.style.color = '#c00';
                errEl.innerText = 'Error: ' + msg;
            }
            alert('Error saving event: ' + msg);
        }
    } catch (e) { 
        console.error('[saveEventEdit DB] Exception:', e);
        if (errEl) {
            errEl.style.color = '#c00';
            errEl.innerText = 'JS Error: ' + e.message;
        }
    }
}

async function renderEventStickers(id, recId) {
    const listEl = document.getElementById('eventStickersList');
    if (!listEl) return;

    if (!id) {
        // Render from tempStickers
        listEl.innerHTML = '';
        tempStickers.forEach((s, idx) => {
            const div = createStickerElement(s, {
                onClick: (e) => { 
                    // No editing for temp stickers yet
                },
                onDelete: (e) => deleteStickerFromEvent(idx, true)
            });
            listEl.appendChild(div);
        });
        return;
    }

    listEl.innerHTML = '<div style="color:#999; font-size:0.8em; padding: 10px;">Loading...</div>';
    let url = `/api/stickers/event/${id}/`;
    if (recId) url += `?recurrence_id=${recId}`;
    try {
        const r = await fetch(url);
        const stickers = await r.json();
        listEl.innerHTML = '';
        stickers.forEach(s => {
            const div = createStickerElement(s, {
                onDelete: (e) => deleteStickerFromEvent(s.id, false)
            });
            listEl.appendChild(div);
        });
    } catch (e) { listEl.innerHTML = 'Error loading stickers.'; }
}

async function addNewStickerToEvent() {
    const eventId = document.getElementById('editEventId').value;
    const recId = document.getElementById('editEventRecId').value;
    const title = document.getElementById('eventStickerTitleInput').value.trim();
    const text = document.getElementById('eventStickerInput').value.trim();
    if (!text) return;

    if (!eventId) {
        // Buffer locally
        tempStickers.push({
            title: title || null,
            text: text,
            color: eventStickerColor,
            type: eventStickerType,
            apply_series: false // Default for now
        });
        document.getElementById('eventStickerTitleInput').value = '';
        document.getElementById('eventStickerInput').value = '';
        renderEventStickers('', '');
        return;
    }

    try {
        const resp = await fetch('/api/stickers/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, title: title || null, color: eventStickerColor, type: eventStickerType, event_id: eventId, recurrence_id: recId || null })
        });
        if (resp.ok) {
            document.getElementById('eventStickerTitleInput').value = '';
            document.getElementById('eventStickerInput').value = '';
            renderEventStickers(eventId, recId);
        }
    } catch (e) { console.error(e); }
}

async function deleteStickerFromEvent(id, isLocal) {
    if (!confirm('Delete sticker?')) return;
    
    if (isLocal) {
        tempStickers.splice(id, 1);
        renderEventStickers('', '');
        return;
    }

    try {
        const r = await fetch(`/api/stickers/${id}/archive/`, { method: 'POST' });
        if (r.ok) {
            const eid = document.getElementById('editEventId').value;
            const rid = document.getElementById('editEventRecId').value;
            renderEventStickers(eid, rid);
        }
    } catch (e) { console.error(e); }
}

function toggleEventStickerMode() {
    const btn = document.getElementById('eventStickerTypeBtn');
    if (eventStickerType === 'text') {
        eventStickerType = 'list';
        btn.textContent = '📋';
    } else {
        eventStickerType = 'text';
        btn.textContent = '📝';
    }
}

// --- Event Done Toggle ---
window.toggleEventDone = async function(id) {
    try {
        const resp = await fetch(`/toggle_event_done/${id}`, { method: 'POST', headers: {'Accept': 'application/json'} });
        if (resp.ok) {
            const data = await resp.json();
            const isDone = data.done;
            
            // Optimistic Update
            // Attempt to update the UI element visually
            let elementUpdated = false;
            
            // 1. If it's a card in db_view (with green checkmark or text)
            const eventCard = document.querySelector(`[data-id="${id}"]`);
            if (eventCard) {
                // If there's a status text or button inside, we'd update it
                // For a quick generic update, we can reload or try to find the button
                const btn = document.querySelector(`button[onclick*="toggleEventDone('${id}')"]`);
                if (btn) {
                    btn.innerHTML = isDone ? '<span class="icon">○</span><span>Отменить выполнение</span>' : '<span class="icon">✓</span><span>Выполнить</span>';
                    elementUpdated = true;
                }
            }
            
            // 2. If it's the dashboard event list
            const dashBtn = document.querySelector(`form[action="/mark_event_done/${id}"] button`);
            if (dashBtn) {
                 // For dashboard, a full reload might be needed to update stats, but we can visually change the color
                 dashBtn.style.color = isDone ? '#10B981' : '#ccc';
                 elementUpdated = true;
            }
            
            if (!elementUpdated) {
                const wrapper = document.querySelector('.calendar-wrapper') || document.querySelector('.table-container');
                if (wrapper) {
                    wrapper.style.transition = 'opacity 0.2s ease-out';
                    wrapper.style.opacity = '0.5';
                }
                location.reload();
            } else {
                if (window.showToast) window.showToast(isDone ? 'Event completed' : 'Event pending', 'success');
            }
        } else {
            console.error("Failed to toggle done state");
        }
    } catch (e) {
        console.error(e);
    }
}

// --- Color Picker ---
function initColorPicker(selectedColor) {
    const container = document.getElementById('colorPicker');
    if (!container) return;
    container.innerHTML = '';
    
    // Add "None" option
    const noneDiv = document.createElement('div');
    noneDiv.className = 'color-option none-option' + (!selectedColor ? ' selected' : '');
    noneDiv.title = 'No Color (Regular Event)';
    noneDiv.innerHTML = '<span>/</span>';
    noneDiv.onclick = () => selectColor('');
    container.appendChild(noneDiv);

    PRE_COLORS.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-option' + (color === selectedColor ? ' selected' : '');
        div.style.background = color;
        div.onclick = () => selectColor(color);
        container.appendChild(div);
    });
    const input = document.getElementById('editEventColor');
    if (input) input.value = selectedColor || '';
}

function selectColor(color) {
    const input = document.getElementById('editEventColor');
    if (input) input.value = color;
    const options = document.querySelectorAll('.color-option');
    options.forEach(opt => {
        const isNone = opt.classList.contains('none-option');
        if (color === '' && isNone) {
            opt.classList.add('selected');
        } else if (color !== '' && opt.style.backgroundColor === hexToRgb(color)) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "";
    return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
}

// --- Popover Logic ---
function openPopover(e, chip) {
    const popover = document.getElementById('eventPopover');
    if (!popover) return;
    document.getElementById('popoverTitle').textContent = e.title || '(No Title)';
    const d = new Date(e.date);
    document.getElementById('popoverDate').textContent = d.toLocaleDateString();
    const timeRow = document.getElementById('popoverTimeRow');
    if (e.date && e.date.includes('T')) {
        timeRow.style.display = 'flex';
        document.getElementById('popoverTime').textContent = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    } else {
        timeRow.style.display = 'none';
    }
    const ruleRow = document.getElementById('popoverRuleRow');
    if (e.rule && e.rule !== 'none') {
        ruleRow.style.display = 'flex';
        document.getElementById('popoverRule').textContent = e.rule;
    } else {
        ruleRow.style.display = 'none';
    }
    const rect = chip.getBoundingClientRect();
    popover.style.display = 'block';
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 5;
    if (left + 250 > window.innerWidth) left = window.innerWidth - 270;
    if (top + 200 > window.innerHeight + window.scrollY) top = rect.top + window.scrollY - 210;
    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
    loadPopoverStickers(e.id, e.recurrence_id);
}

function closePopover() {
    const popover = document.getElementById('eventPopover');
    if (popover) popover.style.display = 'none';
}

async function loadPopoverStickers(eventId, recId) {
    const listEl = document.getElementById('popoverStickersList');
    const container = document.getElementById('popoverStickers');
    if (!listEl || !container) return;
    listEl.innerHTML = '<div style="font-size:0.8em; color:#999;">Loading...</div>';
    container.style.display = 'block';
    let url = `/api/stickers/event/${eventId}/`;
    if (recId) url += `?recurrence_id=${recId}`;
    try {
        const resp = await fetch(url);
        const stickers = await resp.json();
        listEl.innerHTML = '';
        if (stickers.length === 0) container.style.display = 'none';
        else {
            stickers.forEach(s => {
                const item = createStickerElement(s, {
                    onClick: () => {} // Prevent opening modal in preview
                });
                item.style.marginBottom = '10px';
                listEl.appendChild(item);
            });
        }
    } catch (e) { listEl.innerHTML = '<div style="font-size:0.8em; color:#ef4444;">Error loading.</div>'; }
}

// --- Notes ---
function openEditNoteModal(id, text, category) {
    document.getElementById('editNoteId').value = id || '';
    document.getElementById('editNoteText').value = text || '';
    document.getElementById('editNoteCategory').value = category || '';
    document.getElementById('editNoteModal').style.display = 'flex';
}
function closeEditNoteModal() { document.getElementById('editNoteModal').style.display = 'none'; }
async function saveNoteEdit() {
    const id = document.getElementById('editNoteId').value;
    const text = document.getElementById('editNoteText').value.trim();
    const category = document.getElementById('editNoteCategory').value;
    if (!text) return;
    try {
        const r = await fetchWithJson(`/edit_record/Notes/${id}`, { text, category });
        if (r.ok) {
            closeEditNoteModal();
            // Optimistic UI update for the db_note_view table row
            const btn = document.querySelector(`button[onclick*="openEditNoteModal('${id}'"]`);
            if (btn) {
                const tr = btn.closest('tr');
                if (tr) {
                    const tds = tr.querySelectorAll('td');
                    if (tds.length >= 2) tds[0].textContent = text;
                    if (tds.length >= 3) tds[2].textContent = category || 'Общая';
                }
            } else {
                 location.reload(); // Fallback if element not found
                 return;
            }
            if (window.showToast) window.showToast('Note updated', 'success');
        }
    } catch (e) { console.error(e); }
}

// --- Chronology ---
function openEditChronoModal(id, title, date) {
    document.getElementById('editChronoId').value = id || '';
    document.getElementById('editChronoTitle').value = title || '';
    document.getElementById('editChronoDate').value = date || '';
    document.getElementById('editChronoModal').style.display = 'flex';
}
function closeEditChronoModal() { document.getElementById('editChronoModal').style.display = 'none'; }
async function saveChronoEdit() {
    const id = document.getElementById('editChronoId').value;
    const title = document.getElementById('editChronoTitle').value.trim();
    const date = document.getElementById('editChronoDate').value;
    if (!title || !date) return;
    try {
        const r = await fetchWithJson(`/edit_record/Chronology/${id}`, { title, date });
        if (r.ok) {
            closeEditChronoModal();
            const btn = document.querySelector(`button[onclick*="openEditChronoModal('${id}'"]`);
            if (btn) {
                const tr = btn.closest('tr');
                if (tr) {
                    const tds = tr.querySelectorAll('td');
                    if (tds.length >= 2) tds[0].textContent = title;
                    if (tds.length >= 3) tds[2].textContent = date;
                }
            } else {
                 location.reload();
                 return;
            }
            if (window.showToast) window.showToast('Chronology updated', 'success');
        }
    } catch (e) { console.error(e); }
}

// --- Habits ---
function openEditHabitModal(id, title, start, end, read) {
    document.getElementById('editHabitId').value = id || '';
    document.getElementById('editHabitTitle').value = title || '';
    document.getElementById('editHabitStartDate').value = start || '';
    document.getElementById('editHabitEndDate').value = end || '';
    document.getElementById('editHabitRead').checked = !!read;
    document.getElementById('editHabitModal').style.display = 'flex';
}
function closeEditHabitModal() { document.getElementById('editHabitModal').style.display = 'none'; }
async function saveHabitEdit() {
    const id = document.getElementById('editHabitId').value;
    const title = document.getElementById('editHabitTitle').value.trim();
    const start = document.getElementById('editHabitStartDate').value;
    const end = document.getElementById('editHabitEndDate').value;
    const read = document.getElementById('editHabitRead').checked;
    if (!title) return;
    try {
        const r = await fetch(`/edit_record/Habit/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, start_date: start, end_date: end || null, read })
        });
        if (r.ok) location.reload();
    } catch (e) { console.error(e); }
}

// --- Tasks ---
function openEditTaskModal(id, name, done) {
    document.getElementById('editTaskId').value = id || '';
    document.getElementById('editTaskName').value = name || '';
    document.getElementById('editTaskDone').checked = !!done;
    document.getElementById('editTaskModal').style.display = 'flex';
}
function closeEditTaskModal() { document.getElementById('editTaskModal').style.display = 'none'; }
async function saveTaskEdit() {
    const id = document.getElementById('editTaskId').value;
    const name = document.getElementById('editTaskName').value.trim();
    const done = document.getElementById('editTaskDone').checked;
    if (!name) return;
    try {
        const r = await fetch(`/edit_record/Task/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_name: name, done })
        });
        if (r.ok) location.reload();
    } catch (e) { console.error(e); }
}

// --- Winks ---
function openAddWinkForDay(isoDate) {
    openEditWinkModal('', '', isoDate);
}
function openEditWinkModal(id, title, date) {
    document.getElementById('editWinkId').value = id || '';
    document.getElementById('editWinkTitle').value = title || '';
    document.getElementById('editWinkDate').value = date || '';
    document.getElementById('editWinkModal').style.display = 'flex';
}
function closeEditWinkModal() { document.getElementById('editWinkModal').style.display = 'none'; }
async function saveWinkEdit() {
    const id = document.getElementById('editWinkId').value;
    const title = document.getElementById('editWinkTitle').value.trim();
    const date = document.getElementById('editWinkDate').value;
    if (!title || !date) return;
    try {
        const r = await fetch(id ? `/edit_record/Wink/${id}` : '/add_wink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, date })
        });
        if (r.ok) location.reload();
    } catch (e) { console.error(e); }
}

// --- View Modals ---
function openChronoViewModal(text, dateStr) {
    document.getElementById('chronoViewDate').innerText = dateStr;
    document.getElementById('chronoViewFullText').innerText = text;
    document.getElementById('chronoViewModal').style.display = 'flex';
}
function closeChronoViewModal() { document.getElementById('chronoViewModal').style.display = 'none'; }
function openNoteViewModal(text, category) {
    document.getElementById('noteViewCategory').innerText = category;
    document.getElementById('noteViewFullText').innerText = text;
    document.getElementById('noteViewModal').style.display = 'flex';
}
function closeNoteViewModal() { document.getElementById('noteViewModal').style.display = 'none'; }

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
        { icon: '🔍', text: 'Показать полностью', action: () => openEventDetailModal(e) },
        { icon: '✎', text: 'Редактировать', action: () => openEditEventModal(e.id, e.title, e.date, e.rule, e.end, e.recurrence_id, e.color) },
        { icon: e.done ? '○' : '✓', text: e.done ? 'Отменить выполнение' : 'Выполнить', action: () => toggleEventDone(e.id) }
    ];

    if (e.has_stickers) {
        items.splice(1, 0, { 
            icon: '<div class="sticker-icon-small"></div>', 
            text: 'Стикеры', 
            isHtmlIcon: true,
            action: () => openEventDetailModal(e) 
        });
    }

    if (e.color) {
        items.push({ icon: '🌳', text: 'Дерево группы', action: () => viewEventTree(e.color) });
    }

    items.push({ icon: '×', text: 'Удалить', danger: true, action: () => deleteRecordCustom('Event', e.id, !!e.recurrence_id) });

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
window.openEditEventModal = openEditEventModal;
window.closeEditEventModal = closeEditEventModal;
window.saveEventEdit = saveEventEdit;
window.openEventDetailModal = openEventDetailModal;
window.closeEventDetailModal = closeEventDetailModal;
window.toggleEditEventWeekdays = toggleEditEventWeekdays;
window.toggleEditEventEndMode = toggleEditEventEndMode;
window.calcEditEventEndDateFromCount = calcEditEventEndDateFromCount;
window.addNewStickerToEvent = addNewStickerToEvent;
window.deleteStickerFromEvent = deleteStickerFromEvent;
window.toggleEventStickerMode = toggleEventStickerMode;
window.toggleEventDone = toggleEventDone;
window.initColorPicker = initColorPicker;
window.selectColor = selectColor;
window.openPopover = openPopover;
window.closePopover = closePopover;

window.openEditNoteModal = openEditNoteModal;
window.closeEditNoteModal = closeEditNoteModal;
window.saveNoteEdit = saveNoteEdit;
window.openEditChronoModal = openEditChronoModal;
window.closeEditChronoModal = closeEditChronoModal;
window.saveChronoEdit = saveChronoEdit;
window.openEditHabitModal = openEditHabitModal;
window.closeEditHabitModal = closeEditHabitModal;
window.saveHabitEdit = saveHabitEdit;
window.openEditTaskModal = openEditTaskModal;
window.closeEditTaskModal = closeEditTaskModal;
window.saveTaskEdit = saveTaskEdit;
window.openAddWinkForDay = openAddWinkForDay;
window.openEditWinkModal = openEditWinkModal;
window.closeEditWinkModal = closeEditWinkModal;
window.saveWinkEdit = saveWinkEdit;

window.openChronoViewModal = openChronoViewModal;
window.closeChronoViewModal = closeChronoViewModal;
window.openNoteViewModal = openNoteViewModal;
window.closeNoteViewModal = closeNoteViewModal;
window.showEventContextMenu = showEventContextMenu;

// --- Sticker Board Logic (Canvas) ---
