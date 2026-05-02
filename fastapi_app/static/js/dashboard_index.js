import { customConfirm, customChoice } from './modal_controller.js';
import { deleteRecordApi, fetchWithJson } from './db_api.js';
import { toggleWidget, applyCollapsedState, saveLayout } from './grid_controller.js';
import { showToast, calculateEndDate } from './ui_helpers.js';

window.toggleWidget = toggleWidget;
window.showToast = showToast;

document.addEventListener('DOMContentLoaded', async function () {

    // ===== Toast Notification =====
    // Handled by ui_helpers.js


    // ===== Intercept mark_done forms for Optimistic UI =====
    document.addEventListener('submit', async (e) => {
        const form = e.target;
        if (!form.action) return;

        const isEvent = form.action.includes('/mark_event_done/');
        const isTask = form.action.includes('/mark_done/');
        const isHabit = form.action.includes('/mark_as_done/');

        if (isEvent || isTask || isHabit) {
            e.preventDefault();
            const btn = form.querySelector('button, input[type="submit"]');
            const li = form.closest('li, tr');

            try {
                const resp = await fetch(form.action, { 
                    method: 'POST', 
                    headers: { 'Accept': 'application/json' } 
                });
                
                if (resp.ok) {
                    const data = await resp.json();
                    const isDone = data.done || data.status === 'success';

                    if (isDone) {
                        // Success Toast
                        let msg = 'Completed';
                        if (isEvent) msg = 'Event completed';
                        if (isTask) msg = 'Task completed';
                        if (isHabit) msg = 'Habit updated';
                        showToast(msg, 'success');

                        // UI Feedback
                        if (isEvent || isTask) {
                            if (li) {
                                li.classList.add('fade-out');
                                setTimeout(() => li.remove(), 400);
                            }
                        } else if (isHabit) {
                            if (btn) {
                                btn.disabled = true;
                                btn.style.opacity = '0.5';
                                btn.value = '✓';
                            }
                            // Optionally update the counter column if we had the data
                            // For now, simple feedback is enough as per "audit/debug" request
                        }
                    } else {
                        showToast('Status: Pending', 'info');
                    }
                } else {
                    showToast('Failed to update status', 'error');
                }
            } catch (err) {
                console.error('[OptimisticUI] Error:', err);
                showToast('Network error', 'error');
            }
        }
    });

    // Widget Collapse Logic is now handled by grid_controller.js
    // Call applyCollapsedState once grid is ready, usually later in the file.

    // ===== Event Edit Modal =====
    // calculateEndDate is now imported from ui_helpers.js

    function toggleEditEventWeekdays() {
        const rule = document.getElementById('editEventRecRule').value;
        const row = document.getElementById('editEventWeekdaysRow');
        if (row) row.style.display = (rule === 'weekly') ? 'block' : 'none';
        calcEditEventEndDateFromCount();
    }

    function toggleEditEventEndMode() {
        const isCount = document.getElementById('editEventEndCountMode').checked;
        document.getElementById('editEventEndDateBlock').style.display = isCount ? 'none' : 'block';
        document.getElementById('editEventEndCountBlock').style.display = isCount ? 'block' : 'none';
        if (isCount) calcEditEventEndDateFromCount();
    }

    function calcEditEventEndDateFromCount() {
        const freq = document.getElementById('editEventRecRule').value;
        const n = parseInt(document.getElementById('editEventRecCount').value) || 1;
        const startStr = document.getElementById('editEventDate').value;
        const weekdays = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')].map(cb => cb.value);
        
        const res = calculateEndDate(freq, n, startStr, weekdays);
        
        const endLabel = document.getElementById('editEventRecEndFromCountLabel');
        const endHidden = document.getElementById('editEventRecEndFromCount');
        if (endLabel) endLabel.innerText = res.label;
        if (endHidden) endHidden.value = res.hidden;
    }

    function openEventEditModal(id, title, dateStr, recRule, recEnd, recId) {
        document.getElementById('editEventId').value = id;
        document.getElementById('editEventRecId').value = recId || '';
        document.getElementById('editEventOriginalDate').value = dateStr || '';
        document.getElementById('editEventTitle').value = title || '';
        document.getElementById('editEventDate').value = dateStr || '';
        document.getElementById('editEventRecEnd').value = recEnd || '';
        document.getElementById('editEventError').innerText = '';

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
        if (recId) {
            recRow.style.display = 'block';
            document.querySelector('input[name="edit_event_mode"][value="only"]').checked = true;
        } else {
            recRow.style.display = 'none';
        }

        toggleEditEventWeekdays();
        document.getElementById('editEventModal').style.display = 'flex';
    }

    window.closeEventEditModal = function () {
        document.getElementById('editEventModal').style.display = 'none';
    };

    window.handleEventEditClick = function (e, btn) {
        e.stopPropagation();
        e.preventDefault();
        openEventEditModal(
            btn.dataset.eventId, btn.dataset.eventTitle, btn.dataset.eventDate,
            btn.dataset.eventRule, btn.dataset.eventEnd, btn.dataset.eventRecId
        );
    };

    window.deleteEvent = async function (eventId, isRecurring, eventDate = null) {
        let deleteMode = 'only';
        if (isRecurring) {
            const choice = await customChoice({
                title: 'Recurring Event',
                messageHTML: 'Choose how to delete this recurring event:',
                options: [
                    { value: 'only', label: 'Delete only this occurrence', checked: true },
                    { value: 'this_and_future', label: 'Delete this and all future occurrences' },
                    { value: 'future_only', label: 'Keep this, delete future occurrences' },
                    { value: 'all', label: 'Delete ALL occurrences in the series' }
                ],
                okLabel: 'Delete', cancelLabel: 'Cancel'
            });
            if (choice === null) return;
            deleteMode = choice;
        } else {
            const confirmed = await customConfirm({
                title: 'Delete Event',
                message: 'Are you sure you want to delete this event?',
                buttons: [
                    { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                    { label: 'Delete', value: true, class: 'confirm-btn-danger' }
                ]
            });
            if (!confirmed) return;
        }

        try {
            const resp = await deleteRecordApi('Event', eventId, deleteMode, eventDate);
            if (resp.ok) {
                // Optimistic UI Update: Remove element from DOM
                const btn = document.querySelector(`[data-event-id="${eventId}"]`);
                if (btn) {
                    const li = btn.closest('li');
                    if (li) li.remove();
                }
                
                // If recurring and deleting all, remove all related instances
                if (deleteMode === 'all' || deleteMode === 'this_and_future') {
                    document.querySelectorAll(`button[data-event-rec-id]`).forEach(b => {
                        // We don't have the rec_id directly in the function arguments, 
                        // so a full reload might be safer for series deletions, 
                        // but let's just reload if it's a series to be perfectly safe
                        // Alternatively, we could fetch the rec_id from the clicked element.
                    });
                    // For simplicity and correctness with series, reload if deleting a series
                    if (deleteMode !== 'only') {
                         location.reload();
                         return;
                    }
                }
                
                if (window.showToast) window.showToast('Event deleted successfully', 'success');
            }
        } catch (e) { console.error('Error deleting event:', e); }
    };

    window.saveEventEdit = async function () {
        const id = document.getElementById('editEventId').value;
        const recId = document.getElementById('editEventRecId').value;
        const title = document.getElementById('editEventTitle').value.trim();
        const date = document.getElementById('editEventDate').value;
        const errEl = document.getElementById('editEventError');
        errEl.innerText = '';

        let recEnd = document.getElementById('editEventRecEnd').value;
        if (document.getElementById('editEventEndCountMode').checked) {
            recEnd = document.getElementById('editEventRecEndFromCount').value;
        }

        let recRule = document.getElementById('editEventRecRule').value;
        if (recRule === 'weekly') {
            const checked = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')].map(cb => cb.value);
            if (checked.length > 0) recRule = 'weekly:' + checked.join(',');
        }

        const editMode = document.querySelector('input[name="edit_event_mode"]:checked')?.value || 'only';

        if (!title) { errEl.innerText = 'Title cannot be empty.'; return; }
        if (!date) { errEl.innerText = 'Date cannot be empty.'; return; }

        try {
            const originalDate = document.getElementById('editEventOriginalDate').value;
            const resp = await fetchWithJson('/edit_event_inline', {
                id, title, date, recurrence_rule: recRule === 'none' ? null : recRule, recurrence_end: recEnd || null, edit_mode: editMode, recurrence_id: recId, original_date: originalDate
            });
            const data = await resp.json();
            if (data.status === 'success' || data.success === true) {
                errEl.style.color = 'green';
                errEl.innerText = '✓ Success! Reloading...';
                showToast('✓ Event updated', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                const msg = data.message || data.detail || 'Unknown server error';
                errEl.style.color = '#c00';
                errEl.innerText = 'Error: ' + msg;
                showToast('Error: ' + msg, 'error');
            }
        } catch (e) { 
            console.error('[saveEventEdit] Exception:', e);
            errEl.style.color = '#c00';
            errEl.innerText = 'JS Error: ' + e.message; 
        }
    };

    // ===== Word Edit Modal =====
    window.openEditModalFromData = function (btn) {
        const d = btn.dataset;
        let translations = {};
        try {
            if (d.translations) {
                translations = typeof d.translations === 'string' ? JSON.parse(d.translations) : d.translations;
                if (typeof translations === 'string') translations = JSON.parse(translations);
            }
        } catch (e) { console.error('Parse error:', e); }
        if (!translations || typeof translations !== 'object') translations = {};
        if (!translations.en && d.eng) translations.en = d.eng;
        if (!translations.it && d.it) translations.it = d.it;
        if (!translations.de && d.de) translations.de = d.de;
        openEditModal(d.eng, translations, d.ru, d.meaning);
    };

    function openEditModal(eng, translations, ru, meaning) {
        document.getElementById('modalWordEng').innerText = 'Edit: ' + eng;
        document.getElementById('inputWordEng').value = eng;

        const container = document.getElementById('dynamicLangsContainer');
        container.innerHTML = '';
        const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
        const allLangNames = window.P_ALL_LANGUAGES || {};

        activeLangs.forEach(code => {
            const group = document.createElement('div');
            group.className = 'form-group-large';
            let val = (translations[code] || '').toString();
            const normCode = code.toLowerCase().trim();
            const label = (allLangNames[code] || '').toLowerCase();
            if (!val && (normCode === 'en' || normCode === 'eng' || label.includes('english'))) val = eng;
            group.innerHTML = `<label class="form-label-premium">${allLangNames[code] || code.toUpperCase()}</label><input type="text" name="lang_${code}" value="${val.replace(/"/g, '&quot;')}" class="form-input-premium" />`;
            container.appendChild(group);
        });

        document.getElementById('inputWordRu').value = ru || '';
        document.getElementById('inputWordMeaning').value = meaning || '';
        document.getElementById('editWordModal').style.display = 'flex';
    }

    window.closeEditModal = function () {
        document.getElementById('editWordModal').style.display = 'none';
    };

    window.showAddCategory = function () { document.getElementById('addCategoryForm').style.display = 'block'; };
    window.hideAddCategory = function () { document.getElementById('addCategoryForm').style.display = 'none'; };

    // ===== Recurrence Logic =====
    const recurrenceToggle = document.getElementById('recurrenceToggle');
    const recurrenceMenu = document.getElementById('recurrenceMenu');
    const repeatSelect = document.getElementById('repeatSelect');
    const repeatHidden = document.getElementById('repeatHidden');
    const repeatEnd = document.getElementById('repeatEnd');
    const repeatCount = document.getElementById('repeatCount');
    const repeatEndFromCount = document.getElementById('repeatEndFromCount');
    const endDateBlock = document.getElementById('endDateBlock');
    const endCountBlock = document.getElementById('endCountBlock');
    const weekdayRow = document.getElementById('weekdayRow');

    document.querySelectorAll('input[name="rec_end_mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const isCount = document.getElementById('recEndCount').checked;
            if (endDateBlock) endDateBlock.style.display = isCount ? 'none' : 'block';
            if (endCountBlock) endCountBlock.style.display = isCount ? 'block' : 'none';
            if (repeatEnd) repeatEnd.disabled = isCount;
            if (repeatEndFromCount) repeatEndFromCount.disabled = !isCount;
        });
    });

    if (repeatEnd) repeatEnd.disabled = false;
    if (repeatEndFromCount) repeatEndFromCount.disabled = true;

    function calcEndDateFromCount() {
        if (!repeatSelect || !repeatCount || !repeatEndFromCount) return;
        const freq = repeatSelect.value;
        const n = parseInt(repeatCount.value) || 1;
        const startStr = document.getElementById('common_date')?.value;
        const weekdays = weekdayRow ? [...weekdayRow.querySelectorAll('input:checked')].map(cb => cb.value) : [];
        
        const res = calculateEndDate(freq, n, startStr, weekdays);
        repeatEndFromCount.value = res.hidden;
    }

    if (repeatCount) repeatCount.addEventListener('input', calcEndDateFromCount);
    if (repeatSelect) repeatSelect.addEventListener('change', calcEndDateFromCount);
    const commonDateEl = document.getElementById('common_date');
    if (commonDateEl) commonDateEl.addEventListener('change', calcEndDateFromCount);

    if (recurrenceToggle && recurrenceMenu) {
        recurrenceToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            recurrenceMenu.classList.toggle('show');
        });
    }

    function buildRepeatValue() {
        if (!repeatSelect) return 'none';
        const freq = repeatSelect.value;
        if (freq === 'none') return 'none';
        const checked = weekdayRow ? [...weekdayRow.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value) : [];
        if (freq === 'weekly' && checked.length > 0) return 'weekly:' + checked.join(',');
        return freq;
    }

    window.closeRecurrence = function () {
        if (repeatHidden) repeatHidden.value = buildRepeatValue();
        if (recurrenceMenu) recurrenceMenu.classList.remove('show');
        updateRecurrenceBtnStyle();
    };

    function updateRecurrenceBtnStyle() {
        if (!repeatHidden || !recurrenceToggle) return;
        const val = repeatHidden.value;
        recurrenceToggle.classList.toggle('active', val && val !== 'none');
    }

    if (repeatSelect && weekdayRow) {
        repeatSelect.addEventListener('change', () => {
            const isWeekly = repeatSelect.value === 'weekly';
            weekdayRow.style.display = isWeekly ? 'flex' : 'none';
            if (!isWeekly) weekdayRow.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
        });
    }

    document.addEventListener('click', (e) => {
        if (recurrenceMenu && recurrenceToggle) {
            if (!recurrenceMenu.contains(e.target) && e.target !== recurrenceToggle) {
                if (recurrenceMenu.classList.contains('show')) window.closeRecurrence();
            }
        }
    });

    // ===== Sticky Thoughts (Quick Add) =====
    let selectedStickerColor = '#fff9c4';
    const stickerColorPicker = document.getElementById('stickerColorPicker');
    if (stickerColorPicker) {
        stickerColorPicker.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                stickerColorPicker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                selectedStickerColor = dot.dataset.color;
            });
        });
    }

    let stickerType = 'text';
    const stInput = document.getElementById('stickerInput');
    if (stInput) {
        stInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        stInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.ctrlKey || e.metaKey || stickerType === 'text') {
                    e.preventDefault();
                    addSticker();
                }
            }
        });
    }

    window.toggleStickerMode = function () {
        const btn = document.getElementById('stickerTypeBtn');
        if (stickerType === 'text') {
            stickerType = 'list';
            btn.textContent = '📋';
            btn.classList.add('active');
            if (stInput) stInput.placeholder = 'Add items (Enter each item, or use commas)...';
        } else {
            stickerType = 'text';
            btn.textContent = '📝';
            btn.classList.remove('active');
            if (stInput) stInput.placeholder = 'Thought on your mind... (Enter to add)';
        }
    };

    async function addSticker() {
        if (!stInput) return;
        const rawText = stInput.value.trim();
        const rawTitle = document.getElementById('stickerTitleInput')?.value.trim() || '';
        if (!rawText) return;

        let finalText = rawText;
        let finalType = stickerType;

        if (rawText.startsWith('- ') || rawText.includes('\n')) finalType = 'list';

        if (finalType === 'list') {
            const items = rawText.split(/[,\n]/).map(i => i.trim().replace(/^- /, '')).filter(i => i);
            if (items.length === 0) return;
            finalText = JSON.stringify({ items: items.map(t => ({ text: t, done: false })) });
        }
        try {
            const response = await fetch('/api/stickers/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: finalText, title: rawTitle || null, color: selectedStickerColor, type: finalType })
            });

            if (response.ok) {
                const note = await response.json();
                const corkboard = document.getElementById('corkboard');
                if (corkboard) {
                    const noteDiv = createStickerElement(note, { isWidget: true });
                    corkboard.appendChild(noteDiv);
                }

                // SUCCESS: Clear inputs
                stInput.value = '';
                stInput.style.height = 'auto';
                const titleInput = document.getElementById('stickerTitleInput');
                if (titleInput) titleInput.value = '';

                showToast('Sticker added!', 'success');
            } else {
                const errText = await response.text();
                console.error(`Failed to add sticker. Status: ${response.status}`, errText);
                showToast(`Failed to save sticker (Error ${response.status})`, 'error');
            }
        } catch (e) {
            console.error('Sticker fetch error:', e);
            showToast('Network error while adding sticker', 'error');
        }
    }
    window.addSticker = addSticker;


    // ===== Initial Load =====
    const initialCorkboard = document.getElementById('corkboard');
    if (initialCorkboard) {
        (async () => {
            try {
                const res = await fetch('/api/stickers/');
                if (res.ok) {
                    const stickers = await res.json();
                    initialCorkboard.innerHTML = '';
                    stickers.forEach(s => {
                        const noteDiv = createStickerElement(s, { isWidget: true });
                        initialCorkboard.appendChild(noteDiv);
                    });
                }
            } catch (e) {
                console.error("Failed to load initial stickers", e);
            }
        })();
    }

    window.openHeaderStickerModal = function () {
        const text = document.getElementById('headerStickerText')?.value || '';
        const title = document.getElementById('headerStickerTitle')?.value || '';
        const color = document.getElementById('headerStickerColor')?.value || '#fff9c4';
        const type = document.getElementById('headerStickerType')?.value || 'text';

        openStickerModal({
            source: 'header',
            color: color,
            type: type
        });
    };

    window.updateHeaderStickerUI = function (attached) {
        const btn = document.getElementById('headerStickerBtn');
        if (!btn) return;
        if (attached) {
            btn.classList.add('attached');
            btn.title = 'Sticker Attached (Click to Edit)';
        } else {
            btn.classList.remove('attached');
            btn.title = 'Add Sticker';
        }
    };

    window.syncCategoryStickerVisibility = function () {
        const cat = document.querySelector('select[name="common_category"]')?.value;
        const btn = document.getElementById('headerStickerBtn');
        if (!btn) return;
        btn.style.display = (cat === 'event' || cat === 'important') ? 'flex' : 'none';
    };

    // saveStickerModal is now handled globally in stickers.js

    // Init Sortable for stickers corkboard
    const cork = document.getElementById('corkboard');
    if (cork) {
        new Sortable(cork, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async function () {
                const ids = [...cork.querySelectorAll('.sticker-thought')].map(s => parseInt(s.dataset.id));
                await fetch('/api/stickers/reorder/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ids)
                });
            }
        });
    }

    // ===== Chrono Expand Modal =====
    window.openChronoExpandModal = function (id = null, text = '', date = '') {
        const widgetText = text || document.querySelector('textarea[name="chrono_text"]')?.value || '';
        const widgetDate = date || document.querySelector('input[name="chrono_date"]')?.value || '';

        document.getElementById('expandChronoId').value = id || '';
        document.getElementById('expandChronoText').value = widgetText;
        document.getElementById('expandChronoDate').value = widgetDate;
        document.getElementById('chronoModalHeader').innerText = id ? 'Edit Chronology Entry' : 'Add Chronology Entry';
        document.getElementById('expandChronoError').innerText = '';
        document.getElementById('chronoExpandModal').style.display = 'flex';
    };

    window.closeChronoExpandModal = function (sync = true) {
        if (sync === true) {
            const id = document.getElementById('expandChronoId').value;
            if (!id) {
                const modalText = document.getElementById('expandChronoText').value;
                const t = document.querySelector('textarea[name="chrono_text"]');
                if (t) t.value = modalText;
            }
        }
        document.getElementById('chronoExpandModal').style.display = 'none';
    };

    window.saveChronoFromModal = async function () {
        const id = document.getElementById('expandChronoId').value;
        const text = document.getElementById('expandChronoText').value.trim();
        const date = document.getElementById('expandChronoDate').value;
        const errEl = document.getElementById('expandChronoError');

        if (!text) { errEl.innerText = 'Text cannot be empty'; return; }

        try {
            let resp;
            if (id) {
                resp = await fetch('/edit_chrono_json', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, text, date })
                });
            } else {
                const formData = new FormData();
                formData.append('chrono_text', text);
                formData.append('chrono_date', date);
                resp = await fetch('/submit_chrono_json', { method: 'POST', body: formData });
            }

            const data = await resp.json();
            if (data.status === 'success') {
                showToast('✓ ' + (data.message || 'Saved'), 'success');
                window.closeChronoExpandModal(false);
                const t = document.querySelector('textarea[name="chrono_text"]');
                if (t) t.value = '';
                const d = document.querySelector('input[name="chrono_date"]');
                if (d) d.value = window.P_CHRONO_DATE || '';
                setTimeout(() => location.reload(), 500);
            } else {
                errEl.innerText = data.message || 'Error saving.';
            }
        } catch (e) {
            errEl.innerText = 'Network error.';
            console.error(e);
        }
    };

    // ===== Notes Expand Modal (textarea-based, no Quill) =====
    window.openNoteExpandModal = function (id = null, note = '', category = '') {
        const widgetNote = note || document.getElementById('note_textarea')?.value || '';
        const widgetCatSelector = document.querySelector('.note-section select[name="category"]');
        const widgetCategory = category || (widgetCatSelector ? widgetCatSelector.value : '');

        document.getElementById('expandNoteId').value = id || '';
        const input = document.getElementById('expandNoteText');
        input.value = widgetNote;
        document.getElementById('expandNoteCategory').value = widgetCategory;
        document.getElementById('noteModalHeader').innerText = id ? 'Edit Note' : 'Add Note';
        document.getElementById('expandNoteError').innerText = '';
        document.getElementById('noteExpandModal').style.display = 'flex';

        // Reset sticker fields for new note
        if (!id) {
            document.getElementById('expandNoteStickerText').value = '';
            document.getElementById('expandNoteStickerTitle').value = '';
            document.getElementById('expandNoteStickerColor').value = '#fff9c4';
            document.getElementById('expandNoteStickerType').value = 'text';
            updateNoteStickerUI(false, 'expand');
        } else {
            // If editing, we could fetch if it has a sticker, but for now just reset icon
            updateNoteStickerUI(false, 'expand');
        }

        setTimeout(() => {
            input.style.height = 'auto';
            input.style.height = (input.scrollHeight) + 'px';
            if (parseInt(input.style.height) < 300) input.style.height = '350px';
        }, 10);
    };

    window.openNoteStickerModal = function (source) {
        let id = null;
        if (source === 'expand') id = document.getElementById('expandNoteId')?.value;
        else if (source === 'smart') id = window.app?.state?.currentNoteId;

        if (id) {
            // Existing note: open sticker modal directly linked to note
            openStickerModal({ parentType: 'note', parentId: id });
        } else {
            // New note: open sticker modal in buffering mode
            let prefix = 'widgetNote';
            if (source === 'expand') prefix = 'expandNote';
            else if (source === 'smart') prefix = 'smartNote';

            const textId = prefix + 'StickerText';
            const titleId = prefix + 'StickerTitle';
            const colorId = prefix + 'StickerColor';
            const typeId = prefix + 'StickerType';

            openStickerModal({
                source: 'note_modal',
                noteSource: source, // 'widget', 'expand', or 'smart'
                text: document.getElementById(textId)?.value || '',
                title: document.getElementById(titleId)?.value || '',
                color: document.getElementById(colorId)?.value || '#fff9c4',
                type: document.getElementById(typeId)?.value || 'text'
            });
        }
    };

    window.updateNoteStickerUI = function (attached, source) {
        let btnId = 'widgetNoteStickerBtn';
        if (source === 'expand') btnId = 'expandNoteStickerBtn';
        else if (source === 'smart') btnId = 'smartNoteStickerBtn';

        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (attached) {
            btn.classList.add('attached');
            btn.title = 'Sticker Attached (Click to Edit)';
        } else {
            btn.classList.remove('attached');
            btn.title = 'Add Sticker';
        }
    };

    window.closeNoteExpandModal = function (sync = true) {
        if (sync === true) {
            const id = document.getElementById('expandNoteId').value;
            if (!id) {
                const modalText = document.getElementById('expandNoteText').value;
                const t = document.getElementById('note_textarea');
                if (t) t.value = modalText;
            }
        }
        document.getElementById('noteExpandModal').style.display = 'none';
    };

    window.saveNoteFromModal = async function () {
        const id = document.getElementById('expandNoteId').value;
        const text = document.getElementById('expandNoteText').value.trim();
        const category = document.getElementById('expandNoteCategory').value;
        const errEl = document.getElementById('expandNoteError');

        if (!text) { errEl.innerText = 'Note text cannot be empty'; return; }

        try {
            const formData = new FormData();
            formData.append('note', text);
            formData.append('category', category);
            if (id) formData.append('id', id);

            // Add sticker data if creating a new note
            if (!id) {
                const sText = document.getElementById('expandNoteStickerText').value;
                const sTitle = document.getElementById('expandNoteStickerTitle').value;
                if (sText || sTitle) {
                    formData.append('sticker_text', sText);
                    formData.append('sticker_title', sTitle);
                    formData.append('sticker_color', document.getElementById('expandNoteStickerColor').value);
                    formData.append('sticker_type', document.getElementById('expandNoteStickerType').value);
                }
            }

            const resp = await fetch('/add_note', { method: 'POST', body: formData });
            const data = await resp.json();
            if (data.status === 'success') {
                showToast('✓ Note saved', 'success');
                window.closeNoteExpandModal(false);
                
                if (window.noteCreationCallback) {
                    window.noteCreationCallback(data.id, text);
                    window.noteCreationCallback = null;
                    return;
                }

                const t = document.getElementById('note_textarea');
                if (t) { t.value = ''; t.style.height = '80px'; }
                setTimeout(() => location.reload(), 500);
            } else {
                errEl.innerText = data.message || 'Error saving note';
            }
        } catch (e) {
            errEl.innerText = 'Network error';
            console.error(e);
        }
    };

    // ===== Language Rules Widget =====
    window.toggleRule = function () {
        const ru = document.getElementById('rule-ru');
        const en = document.getElementById('rule-en');
        if (!ru || !en) return;
        const showRu = ru.style.display === 'none';
        ru.style.display = showRu ? 'block' : 'none';
        en.style.display = showRu ? 'none' : 'block';
    };

    window.refreshRule = async function () {
        try {
            const response = await fetch('/get_random_rule');
            const data = await response.json();
            const langEl = document.getElementById('rule-lang');
            const ruEl = document.getElementById('rule-ru');
            const enEl = document.getElementById('rule-en');
            if (langEl) langEl.innerText = data.language;
            if (ruEl) ruEl.innerText = data.rule_ru;
            if (enEl) enEl.innerText = data.rule_en;
            if (ruEl && enEl) {
                if (ruEl.style.display === 'none') { enEl.style.display = 'block'; }
                else { ruEl.style.display = 'block'; }
            }
        } catch (e) { console.error('Rule refresh failed', e); }
    };

    // ===== Words Widget =====
    window.markTripletLearned = async function (eng, btn) {
        const confirmed = await customConfirm({
            title: 'Mark as Learned',
            message: `Mark "${eng}" and its translations as fully learned?`,
            buttons: [
                { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                { label: 'Mark Learned', value: true, class: 'confirm-btn-primary' }
            ]
        });
        if (!confirmed) return;
        try {
            const resp = await fetch('/mark_triplet_learned', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eng, is_learned: true })
            });
            const data = await resp.json();
            if (data.status === 'success') {
                const extraRow = btn.closest('tr');
                const mainRow = extraRow?.previousElementSibling;
                if (extraRow) extraRow.style.opacity = '0.3';
                if (mainRow) mainRow.style.opacity = '0.3';
                btn.style.display = 'none';
                showToast(`"${eng}" marked as learned!`);
            } else {
                showToast('Error: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (e) { showToast('Network error', 'error'); }
    };

    window.refreshWords = async function () {
        try {
            const response = await fetch('/get_new_words');
            const data = await response.json();
            const tbody = document.getElementById('words-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
            data.words.forEach(word => {
                const tr1 = document.createElement('tr');
                let colsHtml = '';
                activeLangs.forEach(code => {
                    colsHtml += `<td>${(word.translations && word.translations[code]) || ''}</td>`;
                });
                tr1.innerHTML = colsHtml;

                const tr2 = document.createElement('tr');
                tr2.className = 'word-extra-row';
                const meaningSpan = word.meaning ? `<span class="meaning-divider"></span><span style="font-style:italic;color:#888;">${word.meaning}</span>` : '';
                const transJson = JSON.stringify(word.translations || {}).replace(/"/g, '&quot;');
                tr2.innerHTML = `
                    <td colspan="${activeLangs.length}" style="padding:4px 10px;">
                        ${word.ru} ${meaningSpan}
                        <span class="edit-btn" data-eng="${word.eng.replace(/"/g, '&quot;')}" data-translations="${transJson}" data-ru="${(word.ru || '').replace(/"/g, '&quot;')}" data-meaning="${(word.meaning || '').replace(/"/g, '&quot;')}" onclick="openEditModalFromData(this)">✎</span>
                        <span class="edit-btn" title="Mark as fully learned" style="margin-left:10px;color:#27ae60;" onclick="markTripletLearned('${word.eng.replace(/'/g, "\\'")}', this)">✓</span>
                    </td>`;
                tbody.appendChild(tr1);
                tbody.appendChild(tr2);
            });

            const volEl = document.getElementById('volume-count');
            const covEl = document.getElementById('coverage-count');
            const imwEl = document.getElementById('imw-count');
            if (volEl) volEl.innerText = data.count;
            if (covEl) covEl.innerText = data.coverage + '%';
            if (imwEl) imwEl.innerText = data.imw + '%';

            const winkValue = document.querySelector('#wink-display .info-widget-value-purple');
            if (winkValue) winkValue.innerText = data.wink;

        } catch (e) { console.error('Word refresh failed', e); }
    };

    window.resetWordStats = async function () {
        const confirmed = await customConfirm({
            title: 'Reset Statistics',
            message: 'Reset all word learning statistics to zero? This cannot be undone.',
            buttons: [
                { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                { label: 'Reset All', value: true, class: 'confirm-btn-danger' }
            ]
        });
        if (!confirmed) return;
        try {
            const response = await fetch('/reset_word_stats', { method: 'POST' });
            const result = await response.json();
            if (result.status === 'success') {
                await window.refreshWords();
            } else {
                alert('Reset failed: ' + result.message);
            }
        } catch (e) { console.error('Word reset failed', e); }
    };

    // ===== GridStack Initialization =====
    let grid = null;
    try {
        grid = window.grid = GridStack.init({
            cellHeight: 45,
            margin: 10,
            handle: '.drag-handle',
            minRow: 1,
            animate: false
        });

        const savedLayout = window.P_DASHBOARD_LAYOUT;
        if (grid && savedLayout && Object.keys(savedLayout).length > 0) {
            Object.values(savedLayout).forEach(item => {
                const el = document.querySelector(`.grid-stack-item[gs-id="${item.id}"]`);
                if (el) grid.update(el, { x: item.x, y: item.y, w: item.w, h: item.h });
            });
        }
    } catch (e) {
        console.error('GridStack initialization failed:', e);
    }

    // Make grid visible after layout is applied
    const gridStackEl = document.querySelector('.grid-stack');
    if (gridStackEl) gridStackEl.style.visibility = 'visible';

    // Apply saved collapsed states now that grid is ready
    applyCollapsedState();

    // Save layout on every grid change
    if (grid) {
        grid.on('change', saveLayout);
    }

    // --- Header Color Picker Logic ---
    window.toggleHeaderColorPicker = function (e) {
        if (e) e.stopPropagation();
        const popup = document.getElementById('headerColorPickerPopup');
        if (!popup) return;
        const isShown = popup.style.display === 'flex';

        // Position relative to btn
        const btn = document.getElementById('headerColorBtn');
        const rect = btn.getBoundingClientRect();
        popup.style.left = (rect.left + window.scrollX - 50) + 'px';
        popup.style.top = (rect.bottom + window.scrollY + 5) + 'px';

        popup.style.display = isShown ? 'none' : 'flex';
    };

    window.setHeaderColor = function (color, el) {
        const input = document.getElementById('headerCommonColor');
        const indicator = document.getElementById('headerColorIndicator');
        if (input) input.value = color;
        if (indicator) {
            indicator.style.background = color || '#e0e0e0';
        }

        // Highlight active dot in popup
        document.querySelectorAll('#headerColorPickerPopup .color-dot').forEach(d => d.classList.remove('active'));
        if (el) el.classList.add('active');

        // Hide picker
        const popup = document.getElementById('headerColorPickerPopup');
        if (popup) popup.style.display = 'none';
    };

    // Close header color picker on outside click
    window.addEventListener('click', function (e) {
        const popup = document.getElementById('headerColorPickerPopup');
        const btn = document.getElementById('headerColorBtn');
        if (popup && popup.style.display === 'flex') {
            if (!popup.contains(e.target) && !btn.contains(e.target)) {
                popup.style.display = 'none';
            }
        }
    });

    // ===== AJAX Form Handlers =====
    window.submitCommonForm = async function (e) {
        if (e) e.preventDefault();
        const form = document.getElementById('common_form');
        if (!form) return;
        try {
            const response = await fetch('/submit_form_json', { method: 'POST', body: new FormData(form) });
            const data = await response.json();
            if (data.status === 'success') {
                showToast('✓ ' + (data.message || 'Saved'), 'success');
                form.reset();
                window.updateHeaderStickerUI(false);
                window.syncCategoryStickerVisibility();

                // Reset color indicator
                setHeaderColor('', document.querySelector('.bg-none'));

                setTimeout(() => location.reload(), 500);
            } else {
                showToast('⚠ ' + (data.message || 'Error saving'), 'error');
            }
        } catch (error) {
            console.error('Submit form error:', error);
            showToast('⚠ Network error', 'error');
        }
    };

    window.saveQuickChrono = async function (e) {
        if (e) e.preventDefault();
        const form = e.target;
        try {
            const response = await fetch('/submit_chrono_json', { method: 'POST', body: new FormData(form) });
            const data = await response.json();
            if (data.status === 'success') {
                showToast('✓ ' + (data.message || 'Chrono saved'), 'success');
                form.reset();
                setTimeout(() => location.reload(), 500);
            } else {
                showToast('⚠ ' + (data.message || 'Error saving'), 'error');
            }
        } catch (error) {
            console.error('Chrono save error:', error);
            showToast('⚠ Network error', 'error');
        }
    };

    window.saveQuickNote = async function (e) {
        if (e) e.preventDefault();
        const form = e.target;
        try {
            const response = await fetch('/add_note', { method: 'POST', body: new FormData(form) });
            const data = await response.json();
            if (data.status === 'success') {
                showToast('✓ ' + (data.message || 'Note saved'), 'success');
                const textarea = form.querySelector('textarea');
                if (textarea) { textarea.value = ''; textarea.style.height = '80px'; }
                setTimeout(() => location.reload(), 500);
            } else {
                showToast('⚠ ' + (data.message || 'Error saving'), 'error');
            }
        } catch (error) {
            console.error('Note save error:', error);
            showToast('⚠ Network error', 'error');
        }
    };

    // Attach form listeners (only for forms without inline onsubmit)
    const mainFormElem = document.getElementById('common_form');
    if (mainFormElem) mainFormElem.addEventListener('submit', window.submitCommonForm);

    document.querySelectorAll('.chrono-form').forEach(f => {
        if (!f.getAttribute('onsubmit')) f.addEventListener('submit', window.saveQuickChrono);
    });
    document.querySelectorAll('form[action="/add_note"]').forEach(f => {
        if (!f.getAttribute('onsubmit')) f.addEventListener('submit', window.saveQuickNote);
    });

    // ===== Note Category Sync =====
    (function syncNoteCategory() {
        const select = document.querySelector('.note-section select[name="category"]');
        const hidden = document.getElementById('note_category_hidden');
        if (!select || !hidden) return;
        if (select.value) hidden.value = select.value;
        select.addEventListener('change', function () { hidden.value = this.value; });
    })();

    // ===== Drag and Drop for Tasks / Events =====
    const taskList = document.querySelector('.task-list');
    if (taskList) {
        Sortable.create(taskList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function () {
                const ids = Array.from(taskList.querySelectorAll('.task-item')).map(el => el.dataset.id);
                fetch('/api/dnd/reorder_tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ids.map(id => parseInt(id)))
                });
            }
        });
    }

    const todayList = document.querySelector('.events-today ul');
    const tomorrowList = document.querySelector('.events-tomorrow ul');
    if (todayList && tomorrowList) {
        const sortableOptions = {
            group: 'events',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: async function (evt) {
                const { item, to, from } = evt;
                const eventId = item.dataset.id;
                if (to === from) {
                    const ids = Array.from(to.querySelectorAll('li')).map(el => el.dataset.id);
                    fetch('/api/dnd/reorder_events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(ids.map(id => parseInt(id)))
                    });
                } else {
                    const newDate = to.closest('.events-today') ? 'today' : 'tomorrow';
                    const response = await fetch('/api/dnd/move_event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event_id: parseInt(eventId), new_date: newDate })
                    });
                    if (response.ok) showToast(`✓ Moved to ${newDate}`, 'success');
                }
            }
        };
        Sortable.create(todayList, sortableOptions);
        Sortable.create(tomorrowList, sortableOptions);
    }

    const corkboard = document.getElementById('corkboard');
    if (corkboard) {
        Sortable.create(corkboard, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function () {
                const ids = Array.from(corkboard.querySelectorAll('.sticker-thought')).map(el => el.dataset.id);
                fetch('/api/stickers/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ids.map(id => parseInt(id)))
                }).then(res => {
                    if (res.ok) showToast('Order saved', 'success');
                }).catch(e => console.error('Failed to save order:', e));
            }
        });
    }

    // ===== Header Sticker Category Init =====
    const catSelect = document.querySelector('select[name="common_category"]');
    if (catSelect) {
        catSelect.addEventListener('change', window.syncCategoryStickerVisibility);
        setTimeout(window.syncCategoryStickerVisibility, 100);
    }

    // ===== Modal Close on Backdrop Click =====
    window.addEventListener('click', (e) => {
        const evModal = document.getElementById('editEventModal');
        const wordModal = document.getElementById('editWordModal');
        const chronoModal = document.getElementById('chronoExpandModal');
        const noteModal = document.getElementById('noteExpandModal');
        if (e.target === evModal) window.closeEventEditModal();
        if (e.target === wordModal) window.closeEditModal();
        if (e.target === chronoModal) window.closeChronoExpandModal(false);
        if (e.target === noteModal) window.closeNoteExpandModal(false);
    });

    // ===== Notes Textarea Editor (toolbar buttons + auto-height + auto-bullets) =====
    window.insertNoteFormat = function (type, targetId = 'note_textarea') {
        const textarea = document.getElementById(targetId);
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        let insertion = '';
        let cursorOffset = 0;

        if (type === 'bullet') {
            insertion = '\n- ';
            cursorOffset = 3;
        } else if (type === 'number') {
            insertion = '\n1. ';
            cursorOffset = 4;
        } else if (type === 'bold') {
            insertion = '****';
            cursorOffset = 2;
        }

        textarea.value = text.substring(0, start) + insertion + text.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    };

    const setupNotesEditor = function (id) {
        const textarea = document.getElementById(id);
        if (!textarea) return;

        textarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const start = this.selectionStart;
                const text = this.value;
                const lineStart = text.lastIndexOf('\n', start - 1) + 1;
                const currentLine = text.substring(lineStart, start);
                const match = currentLine.match(/^(\s*([-*]|\d+\.))\s+/);
                if (match) {
                    e.preventDefault();
                    const prefix = match[1] + ' ';
                    this.value = text.substring(0, start) + '\n' + prefix + text.substring(start);
                    this.setSelectionRange(start + prefix.length + 1, start + prefix.length + 1);
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                }
            }
        });
    };

    (function initNotesTextarea() {
        setupNotesEditor('note_textarea');
        setupNotesEditor('expandNoteText');
    })();

    // Update saveQuickNote to include sticker data
    window.saveQuickNote = async function (e) {
        e.preventDefault();
        const form = e.target;
        const note = form.note.value.trim();
        const category = form.category.value;
        const sText = document.getElementById('widgetNoteStickerText').value;
        const sTitle = document.getElementById('widgetNoteStickerTitle').value;

        if (!note) return;

        try {
            const formData = new FormData();
            formData.append('note', note);
            formData.append('category', category);
            
            if (sText || sTitle) {
                formData.append('sticker_text', sText);
                formData.append('sticker_title', sTitle);
                formData.append('sticker_color', document.getElementById('widgetNoteStickerColor').value);
                formData.append('sticker_type', document.getElementById('widgetNoteStickerType').value);
            }

            const resp = await fetch('/add_note', { method: 'POST', body: formData });
            if (resp.ok) {
                showToast('✓ Note added', 'success');
                form.note.value = '';
                form.note.style.height = '80px';
                // Reset sticker
                document.getElementById('widgetNoteStickerText').value = '';
                document.getElementById('widgetNoteStickerTitle').value = '';
                updateNoteStickerUI(false, 'widget');
                setTimeout(() => location.reload(), 500);
            }
        } catch (e) { console.error(e); }
    };

    // ===== Pinning Logic =====
    window.pinSmartNote = async function(id) {
        try {
            const resp = await fetch(`/api/smart_notes/${id}/pin`, { method: 'POST' });
            if (resp.ok) {
                showToast('✓ Note pinned to Dashboard', 'success');
                setTimeout(() => location.reload(), 500);
            }
        } catch (e) { console.error(e); }
    };

    window.unpinSmartNote = async function(id) {
        try {
            const resp = await fetch(`/api/smart_notes/${id}/unpin`, { method: 'POST' });
            if (resp.ok) {
                showToast('✓ Note unpinned', 'success');
                setTimeout(() => location.reload(), 500);
            }
        } catch (e) { console.error(e); }
    };
});
