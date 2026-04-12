/**
             * Beautiful Custom Confirmation Modal
             * @param {Object} options - { title, message, buttons: [{label, value, class}] }
             * @returns {Promise} - Resolves with the value of the clicked button
             */
            function customConfirm({ title = 'Confirmation', message = 'Are you sure?', buttons = [] }) {
                return new Promise((resolve) => {
                    const modal = document.getElementById('customConfirmModal');
                    const titleEl = document.getElementById('confirmModalTitle');
                    const messageEl = document.getElementById('confirmModalMessage');
                    const footerEl = document.getElementById('confirmModalFooter');

                    titleEl.innerText = title;
                    messageEl.innerHTML = message;
                    footerEl.innerHTML = '';

                    // Default buttons if none provided
                    if (buttons.length === 0) {
                        buttons = [
                            { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                            { label: 'OK', value: true, class: 'confirm-btn-primary' }
                        ];
                    }

                    buttons.forEach(btn => {
                        const button = document.createElement('button');
                        button.innerText = btn.label;
                        button.className = 'confirm-btn ' + (btn.class || 'confirm-btn-secondary');
                        button.onclick = () => {
                            modal.style.setProperty('display', 'none', 'important');
                            resolve(btn.value);
                        };
                        footerEl.appendChild(button);
                    });

                    modal.style.setProperty('display', 'flex', 'important');
                });
            }

            // Choice modal with radio list; returns selected value or null (Cancel)
            function customChoice({ title = 'Select Option', messageHTML = '', options = [], okLabel = 'Confirm', cancelLabel = 'Cancel' }) {
                return new Promise((resolve) => {
                    const modal = document.getElementById('customConfirmModal');
                    const titleEl = document.getElementById('confirmModalTitle');
                    const messageEl = document.getElementById('confirmModalMessage');
                    const footerEl = document.getElementById('confirmModalFooter');

                    titleEl.innerText = title;
                    
                    const container = document.createElement('div');
                    container.className = 'choice-container';
                    
                    if (messageHTML) {
                        const msg = document.createElement('div');
                        msg.style.marginBottom = '15px';
                        msg.style.color = '#666';
                        msg.innerHTML = messageHTML;
                        container.appendChild(msg);
                    }

                    const list = document.createElement('div');
                    list.className = 'choice-list';

                    options.forEach((opt, idx) => {
                        const item = document.createElement('label');
                        item.className = 'choice-item' + (opt.checked ? ' selected' : '');

                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = 'customChoiceRadio';
                        radio.value = opt.value;
                        radio.checked = !!opt.checked;

                        // Toggle 'selected' class on change
                        radio.addEventListener('change', () => {
                            document.querySelectorAll('.choice-item').forEach(el => el.classList.remove('selected'));
                            item.classList.add('selected');
                        });

                        const text = document.createElement('span');
                        text.textContent = opt.label;

                        item.appendChild(radio);
                        item.appendChild(text);
                        list.appendChild(item);
                    });

                    container.appendChild(list);
                    messageEl.innerHTML = '';
                    messageEl.appendChild(container);

                    footerEl.innerHTML = '';
                    const btnCancel = document.createElement('button');
                    btnCancel.className = 'confirm-btn confirm-btn-secondary';
                    btnCancel.innerText = cancelLabel;
                    btnCancel.onclick = () => {
                        modal.style.setProperty('display', 'none', 'important');
                        resolve(null);
                    };

                    const btnOk = document.createElement('button');
                    btnOk.className = 'confirm-btn confirm-btn-primary';
                    btnOk.innerText = okLabel;
                    btnOk.onclick = () => {
                        const selected = document.querySelector('input[name="customChoiceRadio"]:checked');
                        modal.style.setProperty('display', 'none', 'important');
                        resolve(selected ? selected.value : null);
                    };

                    footerEl.appendChild(btnCancel);
                    footerEl.appendChild(btnOk);

                    modal.style.setProperty('display', 'flex', 'important');
                });
            }

            // ===== Widget collapse logic =====
            const COLLAPSE_KEY = 'papanda_collapsed_widgets';

            function getCollapsedSet() {
                try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')); }
                catch(e) { return new Set(); }
            }

            function saveCollapsedSet(set) {
                localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set]));
            }

            function getWidgetItem(btn) {
                return btn.closest('.grid-stack-item');
            }

            function collapseWidget(item) {
                // Сохраняем оригинальную высоту: сначала из gridstackNode, иначе из атрибута gs-h
                if (!item.dataset.origH) {
                    const nodeH = item.gridstackNode ? item.gridstackNode.h : null;
                    const attrH = parseInt(item.getAttribute('gs-h'));
                    let val = nodeH || attrH || 5;
                    if (val <= 1) val = 5; // Если в базе уже была 1, берем дефолт 5
                    item.dataset.origH = val;
                }
                item.classList.add('collapsed');
                const btn = item.querySelector('.collapse-btn-toggle');
                if (btn) btn.textContent = '▸';
                grid.update(item, { h: 1, minH: 1 });
                grid.resizable(item, false);
            }

            function expandWidget(item) {
                let origH = parseInt(item.dataset.origH) || 5;
                if (origH <= 1) origH = 5; // На всякий случай
                // Сначала снимаем класс и сбрасываем minH, потом восстанавливаем высоту
                item.classList.remove('collapsed');
                const btn = item.querySelector('.collapse-btn-toggle');
                if (btn) btn.textContent = '▾';
                grid.update(item, { h: origH, minH: 2 });
                grid.resizable(item, true);
                // Сбрасываем сохранённую высоту чтобы при следующем сворачивании взялась актуальная
                delete item.dataset.origH;
            }

            function toggleWidget(btn) {
                const item = getWidgetItem(btn);
                if (!item) return;
                const id = item.getAttribute('gs-id');
                const collapsed = getCollapsedSet();

                if (item.classList.contains('collapsed')) {
                    expandWidget(item);
                    collapsed.delete(id);
                } else {
                    collapseWidget(item);
                    collapsed.add(id);
                }
                saveCollapsedSet(collapsed);
            }

            function applyCollapsedState() {
                const collapsed = getCollapsedSet();
                if (collapsed.size === 0) return;
                document.querySelectorAll('.grid-stack-item[gs-id]').forEach(item => {
                    const id = item.getAttribute('gs-id');
                    if (collapsed.has(id)) {
                        collapseWidget(item);
                    }
                });
            }
            // ===== End widget collapse logic =====

            // ===== Event Edit Modal =====
            function handleEventEditClick(e, btn) {
                e.stopPropagation();
                e.preventDefault();
                const id      = btn.dataset.eventId;
                const title   = btn.dataset.eventTitle;
                const dateStr = btn.dataset.eventDate;
                const recRule = btn.dataset.eventRule;
                const recEnd  = btn.dataset.eventEnd;
                const recId   = btn.dataset.eventRecId;
                openEventEditModal(id, title, dateStr, recRule, recEnd, recId);
            }

            function toggleEditEventWeekdays() {
                const rule = document.getElementById('editEventRecRule').value;
                const row = document.getElementById('editEventWeekdaysRow');
                row.style.display = (rule === 'weekly') ? 'block' : 'none';
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
                const endLabel = document.getElementById('editEventRecEndFromCountLabel');
                const endHidden = document.getElementById('editEventRecEndFromCount');
                
                if (!startStr || freq === 'none') { 
                    endLabel.innerText = ''; 
                    endHidden.value = '';
                    return; 
                }
                
                const start = new Date(startStr);
                let end = new Date(start);

                if (freq === 'daily') {
                    end.setDate(start.getDate() + n);
                } else if (freq === 'weekly') {
                    const checked = [...document.querySelectorAll('#editEventWeekdaysRow input:checked')];
                    const daysPerWeek = checked.length > 0 ? checked.length : 1;
                    const totalDays = Math.ceil(n / daysPerWeek) * 7;
                    end.setDate(start.getDate() + totalDays);
                } else if (freq === 'weekdays') {
                    const totalDays = Math.ceil(n / 5) * 7;
                    end.setDate(start.getDate() + totalDays);
                } else if (freq === 'monthly') {
                    end.setMonth(start.getMonth() + n);
                } else if (freq === 'yearly') {
                    end.setFullYear(start.getFullYear() + n);
                }

                const dateStr = end.toISOString().split('T')[0];
                endLabel.innerText = 'Calculated end date: ' + dateStr;
                endHidden.value = dateStr;
            }

            function openEventEditModal(id, title, dateStr, recRule, recEnd, recId) {
                document.getElementById('editEventId').value = id;
                document.getElementById('editEventRecId').value = recId || '';
                document.getElementById('editEventTitle').value = title || '';
                document.getElementById('editEventDate').value = dateStr || '';
                document.getElementById('editEventRecEnd').value = recEnd || '';
                document.getElementById('editEventError').innerText = '';
                
                // Reset end mode to date
                document.getElementById('editEventEndDateMode').checked = true;
                toggleEditEventEndMode();
                
                // Reset checkboxes
                const checkboxes = document.querySelectorAll('#editEventWeekdaysRow input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = false);

                // Set select value
                const select = document.getElementById('editEventRecRule');
                if (!recRule || recRule === 'none') {
                    select.value = 'none';
                } else if (recRule.startsWith('weekly:')) {
                    select.value = 'weekly';
                    const days = recRule.split(':')[1].split(',');
                    checkboxes.forEach(cb => {
                        if (days.includes(cb.value)) cb.checked = true;
                    });
                } else {
                    select.value = recRule;
                }

                // Show recurrence mode options if it's a recurring event
                const recRow = document.getElementById('editEventRecurrenceModeRow');
                if (recId) {
                    recRow.style.display = 'block';
                    // Default to 'only'
                    document.querySelector('input[name="edit_event_mode"][value="only"]').checked = true;
                } else {
                    recRow.style.display = 'none';
                }
                
                toggleEditEventWeekdays();
                document.getElementById('editEventModal').style.display = 'flex';
            }

            function closeEventEditModal() {
                document.getElementById('editEventModal').style.display = 'none';
            }

            async function deleteEvent(eventId, isRecurring) {
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
                        okLabel: 'Delete',
                        cancelLabel: 'Cancel'
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

                const formData = new FormData();
                formData.append('delete_mode', deleteMode);

                try {
                    const resp = await fetch(`/delete_event/${eventId}`, {
                        method: 'POST',
                        body: formData
                    });
                    if (resp.ok) {
                        location.reload();
                    }
                } catch (e) {
                    console.error('Error deleting event:', e);
                }
            }

            async function saveEventEdit() {
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
                    if (checked.length > 0) {
                        recRule = 'weekly:' + checked.join(',');
                    }
                }

                const editMode = document.querySelector('input[name="edit_event_mode"]:checked')?.value || 'only';

                if (!title) { errEl.innerText = 'Title cannot be empty.'; return; }
                if (!date)  { errEl.innerText = 'Date cannot be empty.'; return; }

                try {
                    const resp = await fetch('/edit_event_inline', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            id, title, date, 
                            recurrence_rule: recRule === 'none' ? null : recRule, 
                            recurrence_end: recEnd || null,
                            edit_mode: editMode,
                            recurrence_id: recId
                        })
                    });
                    const data = await resp.json();
                    if (data.status === 'success') {
                        closeEventEditModal();
                        showToast('✓ Event updated', 'success');
                        setTimeout(() => location.reload(), 400);
                    } else {
                        errEl.innerText = data.message || 'Error saving event.';
                    }
                } catch (e) {
                    errEl.innerText = 'Network error.';
                }
            }

            window.addEventListener('click', (e) => {
                const evModal = document.getElementById('editEventModal');
                const wordModal = document.getElementById('editWordModal');
                const chronoModal = document.getElementById('chronoExpandModal');
                if (e.target === evModal) closeEventEditModal();
                if (e.target === wordModal) closeEditModal();
                if (e.target === chronoModal) closeChronoExpandModal();
            });
            // ===== End Event Edit Modal =====

            function openEditModal(eng, it, de, ru, meaning) {
                document.getElementById('modalWordEng').innerText = 'Edit: ' + eng;
                document.getElementById('inputWordEng').value = eng;
                document.getElementById('inputWordIt').value = it || '';
                document.getElementById('inputWordDe').value = de || '';
                document.getElementById('inputWordRu').value = ru || '';
                document.getElementById('inputWordMeaning').value = meaning || '';
                document.getElementById('editWordModal').style.display = 'flex';
            }
            function openEditModalFromData(btn) {
                const d = btn.dataset;
                openEditModal(d.eng, d.it, d.de, d.ru, d.meaning);
            }
            function closeEditModal() { document.getElementById('editWordModal').style.display = 'none'; }
            window.addEventListener('click', (e) => {
                if (e.target === document.getElementById('editWordModal')) closeEditModal();
            });

            function showAddCategory() { document.getElementById('addCategoryForm').style.display = 'block'; }
            function hideAddCategory() { document.getElementById('addCategoryForm').style.display = 'none'; }

            // Recurrence logic
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

            // Переключение режима Date / Count
            document.querySelectorAll('input[name="rec_end_mode"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    const isCount = document.getElementById('recEndCount').checked;
                    endDateBlock.style.display = isCount ? 'none' : 'block';
                    endCountBlock.style.display = isCount ? 'block' : 'none';
                    // Disable the inactive hidden/visible field so only one repeat_end is submitted
                    repeatEnd.disabled = isCount;
                    repeatEndFromCount.disabled = !isCount;
                });
            });
            // Инициализация: date-режим активен
            repeatEnd.disabled = false;
            repeatEndFromCount.disabled = true;

            // Пересчёт даты окончания из количества повторений
            function calcEndDateFromCount() {
                const freq = repeatSelect.value;
                const n = parseInt(repeatCount.value) || 1;
                const startStr = document.getElementById('common_date').value;
                if (!startStr || freq === 'none') { repeatEndFromCount.value = ''; return; }
                const start = new Date(startStr);
                let end = new Date(start);

                if (freq === 'daily') {
                    end.setDate(start.getDate() + n);
                } else if (freq === 'weekly' || freq.startsWith('weekly:')) {
                    // Для кастомных дней недели считаем приблизительно
                    const checked = [...weekdayRow.querySelectorAll('input:checked')];
                    const daysPerWeek = checked.length > 0 ? checked.length : 1;
                    const totalDays = Math.ceil(n / daysPerWeek) * 7;
                    end.setDate(start.getDate() + totalDays);
                } else if (freq === 'weekdays') {
                    // 5 дней в неделю
                    const totalDays = Math.ceil(n / 5) * 7;
                    end.setDate(start.getDate() + totalDays);
                } else if (freq === 'biweekly') {
                    end.setDate(start.getDate() + n * 14);
                } else if (freq === 'monthly') {
                    end.setMonth(start.getMonth() + n);
                } else if (freq === 'yearly') {
                    end.setFullYear(start.getFullYear() + n);
                }

                repeatEndFromCount.value = end.toISOString().split('T')[0];
            }

            // Sticky Thoughts JS
            let selectedStickerColor = "#fff9c4";
            document.querySelectorAll('.color-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                    dot.classList.add('active');
                    selectedStickerColor = dot.dataset.color;
                });
            });

            let stickerType = 'text'; // 'text' or 'list'

            const stInput = document.getElementById('stickerInput');
            if (stInput) {
                // Auto-expand textarea
                stInput.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                });

                stInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            addSticker();
                        } else if (stickerType === 'text') {
                            e.preventDefault();
                            addSticker();
                        }
                        // Default behavior for Enter in 'list' mode is a new line, which is what we want!
                    }
                });
            }

            function toggleStickerMode() {
                const btn = document.getElementById('stickerTypeBtn');
                if (stickerType === 'text') {
                    stickerType = 'list';
                    btn.textContent = '📋';
                    btn.classList.add('active');
                    stInput.placeholder = 'Add items (Enter each item, or use commas)...';
                } else {
                    stickerType = 'text';
                    btn.textContent = '📝';
                    btn.classList.remove('active');
                    stInput.placeholder = 'Thought on your mind... (Enter to add)';
                }
            }

            async function addSticker() {
                const rawText = stInput.value.trim();
                const rawTitle = document.getElementById('stickerTitleInput').value.trim();
                if (!rawText) return;
                
                let finalText = rawText;
                let finalType = stickerType;

                // Auto-detect list if starts with "- " or contains newlines
                if (rawText.startsWith('- ') || rawText.includes('\n')) {
                    finalType = 'list';
                }

                if (finalType === 'list') {
                    // Split by comma or newline, remove leading "- " if present
                    const items = rawText.split(/[,\n]/).map(i => i.trim().replace(/^- /, '')).filter(i => i);
                    if (items.length === 0) return;
                    finalText = JSON.stringify({ items: items.map(t => ({ text: t, done: false })) });
                }

                try {
                    const response = await fetch('/api/stickers/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            text: finalText, 
                            title: rawTitle || null,
                            color: selectedStickerColor, 
                            type: finalType 
                        })
                    });
                    if (response.ok) {
                        location.reload();
                    }
                } catch (e) { console.error(e); }
            }

            async function deleteStickerFromData(btn) {
                const sticker = btn.closest('.sticker-thought');
                const id = sticker.dataset.id;
                
                const confirmed = await customConfirm({
                    title: 'Remove Sticker',
                    message: 'Are you sure you want to remove this sticker?',
                    buttons: [
                        { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                        { label: 'Remove', value: true, class: 'confirm-btn-danger' }
                    ]
                });
                if (!confirmed) return;
                
                try {
                    const res = await fetch(`/api/stickers/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        sticker.remove();
                        showToast('✓ Removed', 'success');
                    }
                } catch (e) { console.error(e); }
            }

            // Modal Editing logic
            let currentStickerId = null;
            let currentStickerColor = "#fff9c4";
            let currentStickerType = "text";

            async function openStickerModal(id) {
                currentStickerId = id;
                const el = document.querySelector(`.sticker-thought[data-id="${id}"]`);
                if (!el) return;

                currentStickerColor = el.dataset.color || "#fff9c4";
                currentStickerType = el.dataset.type || "text";
                
                // Set initial visual color and placeholder title
                document.getElementById('modalStickerWindow').style.backgroundColor = currentStickerColor;
                document.getElementById('modalStickerDate').innerText = el.querySelector('.sticker-meta').innerText;
                document.getElementById('modalStickerTitle').value = el.dataset.title || "";
                
                // Always fetch fresh data to avoid encoding issues with data-attributes
                try {
                    const res = await fetch(`/api/stickers/`); // We can fetch all and find, or add a single GET
                    const allStickers = await res.json();
                    const sticker = allStickers.find(s => s.id === id);
                    if (sticker) {
                        document.getElementById('modalStickerTitle').value = sticker.title || "";
                        if (sticker.type === 'list') {
                            renderStickerListInModal(sticker.text);
                        } else {
                            document.getElementById('modalStickerTextArea').value = sticker.text;
                            switchStickerTypeInModal('text');
                        }
                    }
                } catch(e) { 
                    console.error("Error fetching sticker details:", e);
                    // Fallback to dataset if API fails
                    if (currentStickerType === 'text') {
                        document.getElementById('modalStickerTextArea').value = el.querySelector('.sticker-text').innerText;
                        switchStickerTypeInModal('text');
                    }
                }
                
                document.getElementById('stickerDetailModal').style.display = 'flex';
                
                // Set active color dot in modal
                document.querySelectorAll('#modalStickerColorPicker .color-dot').forEach(dot => {
                    dot.classList.toggle('active', dot.dataset.color === currentStickerColor);
                });
            }

            function renderStickerListInModal(jsonText) {
                let data = { items: [] };
                try { data = JSON.parse(jsonText); } catch(e) {}
                const container = document.getElementById('modalStickerListItems');
                container.innerHTML = '';
                data.items.forEach((item, idx) => {
                    const row = document.createElement('div');
                    row.className = 'modal-list-row';
                    row.innerHTML = `
                        <input type="checkbox" ${item.done ? 'checked' : ''} onchange="syncStickerDataFromModal()">
                        <input type="text" class="modal-list-input" value="${item.text.replace(/"/g, '&quot;')}" oninput="syncStickerDataFromModal()">
                        <button class="modal-list-del" onclick="this.parentElement.remove(); syncStickerDataFromModal()">×</button>
                    `;
                    container.appendChild(row);
                });
                switchStickerTypeInModal('list');
            }

            function addStickerItemInModal() {
                const container = document.getElementById('modalStickerListItems');
                const row = document.createElement('div');
                row.className = 'modal-list-row';
                row.innerHTML = `
                    <input type="checkbox" onchange="syncStickerDataFromModal()">
                    <input type="text" class="modal-list-input" placeholder="New item..." oninput="syncStickerDataFromModal()">
                    <button class="modal-list-del" onclick="this.parentElement.remove(); syncStickerDataFromModal()">×</button>
                `;
                container.appendChild(row);
                row.querySelector('input[type="text"]').focus();
            }

            function switchStickerTypeInModal(type) {
                currentStickerType = type;
                document.getElementById('modalStickerTextContainer').style.display = (type === 'text') ? 'block' : 'none';
                document.getElementById('modalStickerListContainer').style.display = (type === 'list') ? 'block' : 'none';
            }

            function setStickerColorInModal(color, btn) {
                currentStickerColor = color;
                document.getElementById('modalStickerWindow').style.backgroundColor = color;
                if (btn) {
                    document.querySelectorAll('#modalStickerColorPicker .color-dot').forEach(d => d.classList.remove('active'));
                    btn.classList.add('active');
                }
            }

            function closeStickerModal() {
                document.getElementById('stickerDetailModal').style.display = 'none';
                currentStickerId = null;
            }


            function openChronoExpandModal(id = null, text = "", date = "") {
                const widgetText = text || document.querySelector('textarea[name="chrono_text"]').value;
                const widgetDate = date || document.querySelector('input[name="chrono_date"]').value;
                
                document.getElementById('expandChronoId').value = id || "";
                document.getElementById('expandChronoText').value = widgetText;
                document.getElementById('expandChronoDate').value = widgetDate;
                document.getElementById('chronoModalHeader').innerText = id ? "Edit Chronology Entry" : "Add Chronology Entry";
                document.getElementById('expandChronoError').innerText = "";
                document.getElementById('chronoExpandModal').style.display = 'flex';
            }

            function closeChronoExpandModal(sync = true) {
                if (sync === true) {
                    const id = document.getElementById('expandChronoId').value;
                    const modalText = document.getElementById('expandChronoText').value;
                    // Sync back to widget only if adding a new entry (id is empty)
                    if (!id) {
                        document.querySelector('textarea[name="chrono_text"]').value = modalText;
                    }
                }
                document.getElementById('chronoExpandModal').style.display = 'none';
            }



            function openNoteExpandModal(id = null, note = "", category = "") {
                const widgetNote = note || document.querySelector('textarea[name="note"]').value;
                const widgetCatSelector = document.querySelector('.note-section select[name="category"]');
                const widgetCategory = category || (widgetCatSelector ? widgetCatSelector.value : "");
                
                document.getElementById('expandNoteId').value = id || "";
                document.getElementById('expandNoteText').value = widgetNote;
                document.getElementById('expandNoteCategory').value = widgetCategory;
                document.getElementById('noteModalHeader').innerText = id ? "Edit Note" : "Add Note";
                document.getElementById('expandNoteError').innerText = "";
                document.getElementById('noteExpandModal').style.display = 'flex';
            }

            function closeNoteExpandModal(sync = true) {
                if (sync === true) {
                    const id = document.getElementById('expandNoteId').value;
                    const modalText = document.getElementById('expandNoteText').value;
                    // Sync back to widget only if adding a new note
                    if (!id) {
                        const widgetTextArea = document.querySelector('textarea[name="note"]');
                        if (widgetTextArea) widgetTextArea.value = modalText;
                    }
                }
                document.getElementById('noteExpandModal').style.display = 'none';
            }

            async function saveChronoFromModal() {
                const id = document.getElementById('expandChronoId').value;
                const text = document.getElementById('expandChronoText').value.trim();
                const date = document.getElementById('expandChronoDate').value;
                const errEl = document.getElementById('expandChronoError');

                if (!text) { errEl.innerText = "Text cannot be empty"; return; }

                try {
                    let resp;
                    let url;
                    let method;
                    let body;

                    if (id) {
                        // EDIT mode
                        url = '/edit_chrono_json';
                        method = 'POST';
                        body = JSON.stringify({ id, text, date });
                    } else {
                        // ADD mode
                        url = '/submit_chrono_json'; // Use JSON endpoint for AJAX
                        method = 'POST';
                        const formData = new FormData();
                        formData.append('chrono_text', text);
                        formData.append('chrono_date', date);
                        body = formData; // FormData for submit_chrono_json
                    }

                    resp = await fetch(url, {
                        method: method,
                        headers: id ? { 'Content-Type': 'application/json' } : {}, // Only set content-type for JSON body
                        body: body
                    });

                    const data = await resp.json();

                    if (data.status === 'success') {
                        showToast('✓ ' + (data.message || 'Хронология сохранена'), 'success');
                        // Close WITHOUT syncing back to widget
                        closeChronoExpandModal(false);
                        // Clear the widget's input field after successful save
                        document.querySelector('textarea[name="chrono_text"]').value = '';
                        document.querySelector('input[name="chrono_date"]').value = window.P_CHRONO_DATE;
                        // Reload page to see changes
                        setTimeout(() => location.reload(), 500);
                    } else {
                        errEl.innerText = data.message || "Error saving.";
                    }
                } catch (e) {
                    errEl.innerText = "Network error.";
                    console.error('Error saving chrono from modal:', e);
                }
            }

            async function saveNoteFromModal() {
                const id = document.getElementById('expandNoteId').value;
                const text = document.getElementById('expandNoteText').value.trim();
                const category = document.getElementById('expandNoteCategory').value;
                const errEl = document.getElementById('expandNoteError');

                if (!text) { errEl.innerText = "Note text cannot be empty"; return; }

                try {
                    const formData = new FormData();
                    formData.append('note', text);
                    formData.append('category', category);
                    if (id) formData.append('id', id);

                    const resp = await fetch('/add_note', { // Use existing /add_note which returns JSON
                        method: 'POST',
                        body: formData
                    });

                    const data = await resp.json();
                    if (data.status === 'success') {
                        showToast('✓ Заметка сохранена', 'success');
                        // Close WITHOUT syncing back to widget
                        closeNoteExpandModal(false);
                        // Clear the widget's input field
                        const widgetTextArea = document.querySelector('textarea[name="note"]');
                        if (widgetTextArea) widgetTextArea.value = '';
                        // Reload page to see changes
                        setTimeout(() => location.reload(), 500);
                    } else {
                        errEl.innerText = data.message || "Error saving note";
                    }
                } catch (e) {
                    errEl.innerText = "Network error";
                    console.error('Error saving note from modal:', e);
                }
            }

            async function saveStickerInModal() {
                if (!currentStickerId) return;
                
                const finalTitle = document.getElementById('modalStickerTitle').value.trim();
                let finalText = "";
                if (currentStickerType === 'list') {
                    const items = [];
                    document.querySelectorAll('#modalStickerListItems .modal-list-row').forEach(row => {
                        const txt = row.querySelector('input[type="text"]').value.trim();
                        if (txt) {
                            items.push({ text: txt, done: row.querySelector('input[type="checkbox"]').checked });
                        }
                    });
                    finalText = JSON.stringify({ items });
                } else {
                    finalText = document.getElementById('modalStickerTextArea').value.trim();
                }

                try {
                    const res = await fetch(`/api/stickers/${currentStickerId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            text: finalText, 
                            title: finalTitle || null,
                            color: currentStickerColor, 
                            type: currentStickerType 
                        })
                    });
                    if (res.ok) {
                        location.reload();
                    }
                } catch(e) { console.error(e); }
            }

            function syncStickerDataFromModal() {
                // Placeholder if we want real-time preview, currently saveStickerInModal handles final state
            }

            // Init Sortable for stickers
            const cork = document.getElementById('corkboard');
            if (cork) {
                new Sortable(cork, {
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: async function() {
                        const ids = [...cork.querySelectorAll('.sticker-thought')].map(s => parseInt(s.dataset.id));
                        await fetch('/api/stickers/reorder', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(ids)
                        });
                    }
                });
            }

            repeatCount.addEventListener('input', calcEndDateFromCount);
            repeatSelect.addEventListener('change', calcEndDateFromCount);
            document.getElementById('common_date').addEventListener('change', calcEndDateFromCount);

            recurrenceToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                recurrenceMenu.classList.toggle('show');
            });

            function buildRepeatValue() {
                const freq = repeatSelect.value;
                if (freq === 'none') return 'none';
                // Собираем выбранные дни недели
                const checked = [...weekdayRow.querySelectorAll('input[type=checkbox]:checked')]
                    .map(cb => cb.value);
                if ((freq === 'weekly') && checked.length > 0) {
                    return 'weekly:' + checked.join(',');
                }
                return freq;
            }

            function closeRecurrence() {
                // Записываем итоговое правило в скрытое поле перед закрытием
                repeatHidden.value = buildRepeatValue();
                recurrenceMenu.classList.remove('show');
                updateRecurrenceBtnStyle();
            }

            function updateRecurrenceBtnStyle() {
                const val = repeatHidden.value;
                if (val && val !== 'none') {
                    recurrenceToggle.classList.add('active');
                } else {
                    recurrenceToggle.classList.remove('active');
                }
            }

            // Показываем/скрываем строку дней недели
            repeatSelect.addEventListener('change', () => {
                const isWeekly = repeatSelect.value === 'weekly';
                weekdayRow.style.display = isWeekly ? 'flex' : 'none';
                // Сбрасываем галочки при смене типа
                if (!isWeekly) {
                    weekdayRow.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
                }
            });

            // Закрываем при клике вне меню
            document.addEventListener('click', (e) => {
                if (!recurrenceMenu.contains(e.target) && e.target !== recurrenceToggle) {
                    if (recurrenceMenu.classList.contains('show')) {
                        closeRecurrence();
                    }
                }
            });

            // Keep hidden category in sync with the visible selector for notes form.
            (function syncNoteCategory() {
                const select = document.querySelector('select[name="category"]');
                const hidden = document.getElementById('note_category_hidden');
                if (!select || !hidden) return;
                // Синхронизируем сразу — select уже содержит первый вариант
                if (select.value) hidden.value = select.value;
                select.addEventListener('change', function () {
                    hidden.value = select.value || '';
                });
            })();

            function toggleRule() {
                var ru = document.getElementById('rule-ru');
                var en = document.getElementById('rule-en');
                if (ru.style.display==='none') { ru.style.display='block'; en.style.display='none'; }
                else { ru.style.display='none'; en.style.display='block'; }
            }

            async function refreshRule() {
                try {
                    const response = await fetch('/get_random_rule');
                    const data = await response.json();
                    document.getElementById('rule-lang').innerText = data.language;
                    document.getElementById('rule-ru').innerText = data.rule_ru;
                    document.getElementById('rule-en').innerText = data.rule_en;
                    // Respect current toggle state
                    const ru = document.getElementById('rule-ru');
                    const en = document.getElementById('rule-en');
                    if (ru.style.display === 'none') {
                        en.style.display = 'block';
                    } else {
                        ru.style.display = 'block';
                    }
                } catch (e) { console.error("Rule refresh failed", e); }
            }
            async function markTripletLearned(eng, btn) {
                const confirmed = await customConfirm({
                    title: 'Mark as Learned',
                    message: `Mark "${eng}" and its translations as fully learned? It will no longer appear in this widget.`,
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
                        body: JSON.stringify({ eng: eng, is_learned: true })
                    });
                    const data = await resp.json();
                    if (data.status === 'success') {
                        // Hide the row group
                        const extraRow = btn.closest('tr');
                        const mainRow = extraRow.previousElementSibling;
                        if (extraRow) extraRow.style.opacity = '0.3';
                        if (mainRow) mainRow.style.opacity = '0.3';
                        btn.style.display = 'none';
                        showToast(`"${eng}" marked as learned!`);
                    } else {
                        showToast("Error: " + (data.message || "Unknown error"), "error");
                    }
                } catch (e) {
                    showToast("Network error", "error");
                }
            }

            async function refreshWords() {
                try {
                    const response = await fetch('/get_new_words');
                    const data = await response.json();
                    const tbody = document.getElementById('words-tbody');
                    tbody.innerHTML = '';
                    data.words.forEach(word => {
                        const tr1 = document.createElement('tr');
                        tr1.innerHTML = `<td>${word.eng}</td><td>${word.it}</td><td>${word.de}</td>`;
                        const tr2 = document.createElement('tr');
                        tr2.className = 'word-extra-row';
                        let meaningSpan = word.meaning ? `<span class="meaning-divider"></span><span style="font-style: italic; color: #888;">${word.meaning}</span>` : '';
                        const engVal = JSON.stringify(word.eng);
                        const itVal = JSON.stringify(word.it);
                        const deVal = JSON.stringify(word.de);
                        const ruVal = JSON.stringify(word.ru);
                        const meanVal = JSON.stringify(word.meaning);
                        tr2.innerHTML = `
                            <td colspan="3" style="padding: 4px 10px;">
                                ${word.ru}
                                ${meaningSpan}
                                <span class="edit-btn" 
                                    data-eng="${word.eng.replace(/"/g, '&quot;')}" 
                                    data-it="${(word.it || '').replace(/"/g, '&quot;')}" 
                                    data-de="${(word.de || '').replace(/"/g, '&quot;')}" 
                                    data-ru="${(word.ru || '').replace(/"/g, '&quot;')}" 
                                    data-meaning="${(word.meaning || '').replace(/"/g, '&quot;')}" 
                                    onclick="openEditModalFromData(this)">✎</span>
                                <span class="edit-btn" title="Mark as fully learned" 
                                    style="margin-left: 10px; color: #27ae60;"
                                    onclick="markTripletLearned('${word.eng.replace(/'/g, "\\'")}', this)">✓</span>
                            </td>
                        `;
                        tbody.appendChild(tr1);
                        tbody.appendChild(tr2);
                    });
                    document.getElementById('volume-count').innerText = data.count;
                    document.getElementById('coverage-count').innerText = data.coverage + '%';
                    document.getElementById('imw-count').innerText = data.imw + '%';
                    document.getElementById('wink-display').innerText = data.wink;
                } catch (e) { console.error("Word refresh failed", e); }
            }

            async function resetWordStats() {
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
                    const response = await fetch('/reset_word_stats', {
                        method: 'POST',
                    });
                    const result = await response.json();
                    if (result.status === 'success') {
                        await refreshWords();
                    } else {
                        alert("Reset failed: " + result.message);
                    }
                } catch (e) { console.error("Word reset failed", e); }
            }

            let grid = GridStack.init({
                cellHeight: 45,
                margin: 10,
                handle: '.drag-handle',
                minRow: 1,
                animate: false  // Отключаем анимацию GridStack
            });

            const savedLayout = window.P_DASHBOARD_LAYOUT;
            if (savedLayout && Object.keys(savedLayout).length > 0) {
                // Instead of grid.load (which removes items not in JSON),
                // we update existing items and let new ones (like stickers) stay.
                Object.values(savedLayout).forEach(item => {
                    const el = document.querySelector(`.grid-stack-item[gs-id="${item.id}"]`);
                    if (el) {
                        grid.update(el, { x: item.x, y: item.y, w: item.w, h: item.h });
                    }
                });
            }
            // Показываем грид только после применения макета — без видимых "прыжков"
            document.querySelector('.grid-stack').style.visibility = 'visible';

            // Применяем свёрнутые виджеты после инициализации грида
            applyCollapsedState();

            // ========== НОВАЯ ЛОГИКА: Toast + AJAX для форм ==========

            /**
             * Показывает toast уведомление с гарантией сохранения
             * @param {string} message - Текст сообщения
             * @param {string} type - Тип: 'success' (зелёный) или 'error' (красный)
             * @param {number} duration - Время отображения в мс (по умолчанию 3000)
             */
            function showToast(message, type = 'success', duration = 3000) {
                const toast = document.getElementById("toast");
                if (!toast) {
                    console.warn("Toast element not found. Message:", message);
                    if (type === 'error') alert(message);
                    return;
                }
                toast.textContent = message;
                toast.className = `${type} show`;

                setTimeout(function() {
                    toast.className = toast.className.replace("show", "").trim();
                }, duration);
            }

            /**
             * Отправляет форму календаря (события, задачи, привычки, wink) через AJAX
             */
            async function submitCommonForm(e) {
                e.preventDefault();
                const form = document.getElementById("common_form");
                const formData = new FormData(form);

                try {
                    const response = await fetch('/submit_form_json', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (data.status === 'success') {
                        showToast('✓ ' + (data.message || 'Сохранено'), 'success');
                        form.reset();
                        // Опционально: перезагрузить страницу чтобы видеть новые данные
                        setTimeout(() => location.reload(), 500);
                    } else {
                        showToast('⚠ ' + (data.message || 'Ошибка при сохранении'), 'error');
                    }
                } catch (error) {
                    console.error('Error submitting form:', error);
                    showToast('⚠ Ошибка сети', 'error');
                }
            }

            /**
             * Отправляет форму хронологии через AJAX
             */
            async function submitChronoForm(e) {
                e.preventDefault();
                const form = e.target;
                const formData = new FormData(form);

                try {
                    const response = await fetch('/submit_chrono_json', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (data.status === 'success') {
                        showToast('✓ ' + (data.message || 'Хронология сохранена'), 'success');
                        form.reset();
                        // Reload page to see changes
                        setTimeout(() => location.reload(), 500);
                    } else {
                        showToast('⚠ ' + (data.message || 'Ошибка при сохранении'), 'error');
                    }
                } catch (error) {
                    console.error('Error submitting chrono:', error);
                    // Provide more detailed error info in console, but keep generic toast or specific if reference error
                    const errorMsg = error.name === 'ReferenceError' ? `JS Error: ${error.message}` : 'Ошибка сети';
                    showToast('⚠ ' + errorMsg, 'error');
                }
            }

            /**
             * Отправляет форму заметки через AJAX
             */
            async function submitNoteForm(e) {
                e.preventDefault();
                const form = e.target;
                const formData = new FormData(form);

                try {
                    const response = await fetch('/add_note', { // Changed to existing endpoint which returns JSON
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (data.status === 'success') {
                        showToast('✓ Заметка сохранена', 'success');
                        form.reset();
                        // Reload page to see changes
                        setTimeout(() => location.reload(), 500);
                    } else {
                        showToast('⚠ ' + (data.message || 'Ошибка при сохранении'), 'error');
                    }
                } catch (error) {
                    console.error('Error submitting note:', error);
                    showToast('⚠ Ошибка сети', 'error');
                }
            }

            // === Привязываем обработчики к формам ===
            const commonFormEl = document.getElementById("common_form");
            if (commonFormEl) {
                commonFormEl.addEventListener('submit', submitCommonForm);
            }

            // Привязываем хронологию и заметки ко всем подходящим формам
            document.querySelectorAll('.chrono-form').forEach(form => {
                form.addEventListener('submit', submitChronoForm);
            });

            document.querySelectorAll('form[action="/add_note"]').forEach(form => {
                form.addEventListener('submit', submitNoteForm);
            });

            // Toast Notification logic - СТАРАЯ ЛОГИКА ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
            (function checkSaved() {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('saved')) {
                    showToast('✓ Сохранено', 'success');
                    // Clean up URL without reload
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            })();



            // === Drag-and-Drop for Tasks and Today/Tomorrow ===
            const taskList = document.querySelector('.task-list');
            if (taskList) {
                Sortable.create(taskList, {
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: function (evt) {
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
                        
                        // Если порядок изменился внутри того же списка
                        if (to === from) {
                            const ids = Array.from(to.querySelectorAll('li')).map(el => el.dataset.id);
                            fetch('/api/dnd/reorder_events', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(ids.map(id => parseInt(id)))
                            });
                        } else {
                            // Если перенесли в другой список (Сегодня <-> Завтра)
                            const newDate = to.closest('.events-today') ? 'today' : 'tomorrow';
                            const response = await fetch('/api/dnd/move_event', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ event_id: parseInt(eventId), new_date: newDate })
                            });
                            if (response.ok) {
                                showToast(`✓ Перенесено на ${newDate === 'today' ? 'сегодня' : 'завтра'}`, 'success');
                            }
                        }
                    }
                };
                Sortable.create(todayList, sortableOptions);
                Sortable.create(tomorrowList, sortableOptions);
            }

            grid.on('change', function() {
                let layout = {};
                grid.getGridItems().forEach(el => {
                    let n = el.gridstackNode;
                    if (!n) return;
                    // Если виджет свернут, сохраняем его полную высоту, чтобы после перезагрузки
                    // мы знали, до каких размеров его разворачивать.
                    let h = el.classList.contains('collapsed') ? (parseInt(el.dataset.origH) || n.h) : n.h;
                    if (h <= 1 && !el.classList.contains('collapsed')) h = 2; // Минимум для развернутого
                    layout[n.id] = { id: n.id, x: n.x, y: n.y, w: n.w, h: h };
                });
                fetch('/save_dashboard_layout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({layout: JSON.stringify(layout)})
                });
            });