/**
 * Global Sticker Logic (stickers.js) v3
 */

// Global State for Modal
let currentStickerId = null;
let currentStickerColor = 'var(--color-sticker-default)';
let currentStickerType = 'text';
let currentStickerSource = 'global'; // 'global', 'header', 'parent'
let currentStickerElement = null; // Reference to the element being edited
let currentStickerParentType = null; // 'task', 'habit', 'note', 'event'
let currentStickerParentId = null;
let currentStickerNoteId = null;
let currentStickerNoteSource = null; // 'widget', 'expand' or 'dialectics'

/**
 * Format sticker content (handles text, math, checklists)
 */
function formatStickerContent(s) {
    if (!s.text) return '';

    let text = s.text;
    
    // Check if it's a list sticker
    if (s.type === 'list' || (text.startsWith('{') && text.includes('"items"'))) {
        try {
            const data = JSON.parse(text);
            if (data && data.items && Array.isArray(data.items)) {
                let html = '<ul class="sticker-list">';
                // If we are in the widget (small preview), limit items
                const items = (s.isWidget) ? data.items.slice(0, 2) : data.items;
                
                items.forEach(item => {
                    const isDone = item.done === true || item.done === 'true';
                    let itemText = item.text || '';
                    itemText = renderStickerMath(itemText);
                    
                    html += `
                        <li class="sticker-list-item ${isDone ? 'done' : ''}">
                            <span class="sticker-check-icon">${isDone ? '✓' : '○'}</span>
                            <span>${itemText}</span>
                        </li>`;
                });
                html += '</ul>';
                if (s.isWidget && data.items.length > 2) {
                    html += `<button class="sticker-more-btn">+${data.items.length - 2} more</button>`;
                }
                return html;
            }
        } catch (e) {
            console.error("Error parsing sticker JSON:", e);
        }
    }
    
    return `<div class="sticker-text">${renderStickerMath(text).replace(/\n/g, '<br>')}</div>`;
}

function renderStickerMath(text) {
    if (typeof katex === 'undefined') return text;
    
    const mathRegex = /(\$\$[\s\S]+?\$$|\$[\s\S]+?\$)/g;
    return text.replace(mathRegex, (match) => {
        const isBlock = match.startsWith('$$');
        const latex = match.replace(/\$/g, '');
        try {
            return katex.renderToString(latex, { throwOnError: false, displayMode: isBlock });
        } catch(e) { return match; }
    });
}

/**
 * Create a standardized DOM element for a sticker
 */
function createStickerElement(note, options = {}) {
    const noteDiv = document.createElement('div');
    const isWidget = options.isWidget || false;
    
    // Add base class and list class if needed
    let classes = ['sticker-thought'];
    if (note.type === 'list') classes.push('sticker-list-note');
    if (options.additionalClasses) classes = classes.concat(options.additionalClasses);
    noteDiv.className = classes.join(' ');
    
    noteDiv.dataset.id = note.id || '';
    noteDiv.dataset.type = note.type || 'text';
    noteDiv.dataset.color = note.color || 'var(--color-sticker-default)';
    noteDiv.dataset.title = note.title || '';
    
    noteDiv.style.backgroundColor = note.color || 'var(--color-sticker-default)';
    noteDiv.style.setProperty('background-color', note.color || 'var(--color-sticker-default)', 'important');
    
    noteDiv.onclick = (e) => {
        if (options.onClick) {
            options.onClick(e, note);
        } else {
            openStickerModal({ id: note.id, element: noteDiv });
        }
    };

    let html = '';
    
    // Delete button
    if (options.onDelete) {
        html += `<button class="sticker-del-btn" title="Archive">×</button>`;
    } else {
        html += `<button class="sticker-del-btn" onclick="event.stopPropagation(); archiveStickerGlobal(this, '${note.id}')" title="Archive">×</button>`;
    }

    if (note.title) html += `<div class="sticker-title">${note.title}</div>`;

    html += formatStickerContent({ ...note, isWidget: isWidget });

    if (note.created_at || isWidget) {
        const dateObj = note.created_at ? new Date(note.created_at) : new Date();
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yy = String(dateObj.getFullYear()).slice(-2);
        html += `<div class="sticker-meta">${dd}.${mm}.${yy}</div>`;
    }

    // Add Linked Note Card
    if (note.note_id && note.note) {
        const noteText = note.note.note || '';
        const shortNote = noteText.length > 60 ? noteText.substring(0, 57) + '...' : noteText;
        const escapedNoteText = noteText.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');
        html += `
            <div class="sticker-note-card" onclick="event.stopPropagation(); expandNoteOnSticker(${note.note_id}, this, '${escapedNoteText}')">
                <div class="note-card-icon">📄</div>
                <div class="note-card-content">
                    <div class="note-card-label">Linked Note</div>
                    <div class="note-card-preview">${shortNote}</div>
                </div>
            </div>
        `;
    }

    noteDiv.innerHTML = html;
    
    if (options.onDelete) {
        const delBtn = noteDiv.querySelector('.sticker-del-btn');
        if (delBtn) delBtn.onclick = (e) => {
            e.stopPropagation();
            options.onDelete(e, note);
        };
    }

    return noteDiv;
}

/**
 * Open Sticker Modal for Creating or Editing
 * options: { id, element, parentType, parentId, source }
 */
async function openStickerModal(options = {}) {
    const id = options.id || null;
    const element = options.element || null;
    
    currentStickerId = id;
    currentStickerElement = element || (id ? document.querySelector(`.sticker-thought[data-id="${id}"]`) : null);
    currentStickerSource = options.source || (id ? 'global' : 'parent');
    currentStickerParentType = options.parentType || null;
    currentStickerParentId = options.parentId || null;
    currentStickerNoteSource = options.noteSource || null; // 'widget' or 'expand'
    currentStickerNoteId = null; // Reset note attachment

    const modalWindow = document.getElementById('modalStickerWindow');
    const titleEl = document.getElementById('modalStickerTitle');
    const ta = document.getElementById('modalStickerTextArea');
    const dateEl = document.getElementById('modalStickerDate');

    // Reset Modal
    if (titleEl) titleEl.value = '';
    if (ta) ta.value = '';
    if (dateEl) dateEl.innerText = id ? '' : 'New Sticker';
    
    // Clear list items container
    const listContainer = document.getElementById('modalStickerListItems');
    if (listContainer) listContainer.innerHTML = '';
    
    // Default type and color for new stickers
    currentStickerType = 'text';
    currentStickerColor = 'var(--color-sticker-default)';
    
    const delBtn = document.getElementById('modalStickerDelBtn');
    if (delBtn) delBtn.style.display = id ? 'block' : 'none';

    const addAnotherBtn = document.getElementById('modalStickerAddAnotherBtn');
    
    if (id) {
        // Mode: Edit Existing
        const el = currentStickerElement;
        currentStickerColor = el ? (el.dataset.color || 'var(--color-sticker-default)') : 'var(--color-sticker-default)';
        currentStickerType = el ? (el.dataset.type || 'text') : 'text';

        // Initial UI state before fetch
        switchStickerTypeInModal(currentStickerType);

        try {
            const res = await fetch(`/api/stickers/${id}/`);
            if (res.ok) {
                const sticker = await res.json();
                if (titleEl) titleEl.value = sticker.title || '';
                currentStickerColor = sticker.color || 'var(--color-sticker-default)';
                currentStickerType = sticker.type || 'text';
                
                // Extract parent context from fetched sticker if not provided
                if (!currentStickerParentType) {
                    if (sticker.task_id) { currentStickerParentType = 'task'; currentStickerParentId = sticker.task_id; }
                    else if (sticker.habit_id) { currentStickerParentType = 'habit'; currentStickerParentId = sticker.habit_id; }
                    else if (sticker.event_id) { currentStickerParentType = 'event'; currentStickerParentId = sticker.event_id; }
                    else if (sticker.note_id && sticker.type !== 'note_link') { currentStickerParentType = 'note'; currentStickerParentId = sticker.note_id; }
                }

                // Handle attached note
                // Only show as "attached" if it's NOT the parent context
                if (sticker.note_id && currentStickerParentType !== 'note') {
                    currentStickerNoteId = sticker.note_id;
                    updateAttachedNoteUI(sticker.note);
                } else {
                    const attachedContainer = document.getElementById('modalStickerAttachedNoteContainer');
                    if (attachedContainer) attachedContainer.style.display = 'none';
                }

                if (sticker.type === 'list') {
                    renderStickerListInModal(sticker.text);
                } else {
                    if (ta) ta.value = sticker.text;
                    switchStickerTypeInModal('text');
                }
            }
        } catch(e) {
            console.error('Error fetching sticker:', e);
        }
    } else {
        // Mode: Create New
        currentStickerColor = options.color || 'var(--color-sticker-default)';
        currentStickerType = options.type || 'text';
        
        if (currentStickerSource === 'header') {
            const hText = document.getElementById('headerStickerText')?.value || '';
            const hTitle = document.getElementById('headerStickerTitle')?.value || '';
            if (titleEl) titleEl.value = hTitle;
            if (currentStickerType === 'list' && hText) {
                renderStickerListInModal(hText);
            } else {
                if (ta) ta.value = hText;
                switchStickerTypeInModal(currentStickerType);
            }
        } else {
            // Standard new sticker (e.g. from Task or Event in DB)
            switchStickerTypeInModal(currentStickerType);
        }
    }

    // Show "Add Another" button if we have a parent context and we are viewing an EXISTING sticker
    if (addAnotherBtn) {
        addAnotherBtn.style.display = (id && currentStickerParentId) ? 'block' : 'none';
    }

    if (modalWindow) modalWindow.style.backgroundColor = currentStickerColor;
    
    const modal = document.getElementById('stickerDetailModal');
    if (modal) modal.style.display = 'flex';
    
    document.querySelectorAll('#modalStickerColorPicker .color-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.color === currentStickerColor);
    });
}

function closeStickerModal() {
    const modal = document.getElementById('stickerDetailModal');
    if (modal) modal.style.display = 'none';
    currentStickerId = null;
    currentStickerElement = null;
    currentStickerParentType = null;
    currentStickerParentId = null;
}

function switchStickerTypeInModal(type) {
    currentStickerType = type;
    const txtContainer = document.getElementById('modalStickerTextContainer');
    const lstContainer = document.getElementById('modalStickerListContainer');
    
    if (type === 'text') {
        if (txtContainer) txtContainer.style.display = 'block';
        if (lstContainer) lstContainer.style.display = 'none';
    } else {
        if (txtContainer) txtContainer.style.display = 'none';
        if (lstContainer) lstContainer.style.display = 'block';
    }

    // Update active state in segmented control
    document.querySelectorAll('.type-segment').forEach(s => s.classList.remove('active'));
    if (type === 'text') document.getElementById('btnStickerToText')?.classList.add('active');
    if (type === 'list') document.getElementById('btnStickerToList')?.classList.add('active');
}

function renderStickerListInModal(jsonText) {
    let data = { items: [] };
    try { data = JSON.parse(jsonText); } catch(e) {}
    const container = document.getElementById('modalStickerListItems');
    if (!container) return;
    
    container.innerHTML = '';
    data.items.forEach((item) => {
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
    if (!container) return;
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

function setStickerColorInModal(color, btn) {
    currentStickerColor = color;
    const modalWindow = document.getElementById('modalStickerWindow');
    if (modalWindow) modalWindow.style.backgroundColor = color;
    if (btn) {
        document.querySelectorAll('#modalStickerColorPicker .color-dot').forEach(d => d.classList.remove('active'));
        btn.classList.add('active');
    }
}

function syncStickerDataFromModal() {}

async function saveStickerModal() {
    showToast('Saving sticker...', 'info');
    let finalText = '';
    if (currentStickerType === 'text') {
        const ta = document.getElementById('modalStickerTextArea');
        if (ta) finalText = ta.value.trim();
    } else {
        const items = [];
        document.querySelectorAll('#modalStickerListItems .modal-list-row').forEach(row => {
            const text = row.querySelector('.modal-list-input').value.trim();
            const done = row.querySelector('input[type="checkbox"]').checked;
            if (text) items.push({ text, done });
        });
        finalText = JSON.stringify({ items });
    }

    const titleEl = document.getElementById('modalStickerTitle');
    const finalTitle = titleEl ? titleEl.value.trim() : '';

    // Specialized Logic for Header Sticker (Creation of Event)
    if (currentStickerSource === 'header') {
        const hText = document.getElementById('headerStickerText');
        const hTitle = document.getElementById('headerStickerTitle');
        const hColor = document.getElementById('headerStickerColor');
        const hType = document.getElementById('headerStickerType');
        
        if (hText) hText.value = finalText;
        if (hTitle) hTitle.value = finalTitle;
        if (hColor) hColor.value = currentStickerColor;
        if (hType) hType.value = currentStickerType;
        
        if (typeof window.updateHeaderStickerUI === 'function') {
            window.updateHeaderStickerUI(finalText.length > 0 || finalTitle.length > 0);
        }
        closeStickerModal();
        return;
    }

    // Standard Save (Create or Update)
    // Mode: Buffering for Note Modal (New Note)
    if (currentStickerSource === 'note_modal') {
        const source = currentStickerNoteSource; // 'widget', 'expand', or 'smart'
        let prefix = 'widgetNote';
        if (source === 'expand') prefix = 'expandNote';
        else if (source === 'dialectics') prefix = 'dialectics';
        
        const textEl = document.getElementById(prefix + 'StickerText');
        const titleEl = document.getElementById(prefix + 'StickerTitle');
        const colorEl = document.getElementById(prefix + 'StickerColor');
        const typeEl = document.getElementById(prefix + 'StickerType');

        if (textEl) textEl.value = finalText;
        if (titleEl) titleEl.value = finalTitle;
        if (colorEl) colorEl.value = currentStickerColor;
        if (typeEl) typeEl.value = currentStickerType;
        
        if (typeof updateNoteStickerUI === 'function') {
            updateNoteStickerUI(finalText.length > 0 || finalTitle.length > 0, source);
        }
        
        showToast('Sticker prepared for Note', 'success');
        closeStickerModal();
        return;
    }

    const payload = {
        text: finalText,
        title: finalTitle || null,
        color: currentStickerColor,
        type: currentStickerType,
        note_id: currentStickerNoteId
    };

    if (currentStickerId) {
        // UPDATE
        try {
            const res = await fetch(`/api/stickers/${currentStickerId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const updated = await res.json();
                if (currentStickerElement) {
                    const isWidget = !!document.getElementById('corkboard')?.contains(currentStickerElement);
                    const newEl = createStickerElement(updated, { isWidget: isWidget });
                    currentStickerElement.parentNode.replaceChild(newEl, currentStickerElement);
                } else {
                    location.reload();
                }
                showToast('✓ Sticker updated', 'success');
                closeStickerModal();
            }
        } catch (e) { 
            console.error(e);
            showToast('⚠ Network error', 'error');
        }
    } else {
        // CREATE for Parent or Global
        if (currentStickerParentType === 'note' && currentStickerParentId) {
            payload.note_id = currentStickerParentId;
        } else if (currentStickerParentType && currentStickerParentId) {
            payload[`${currentStickerParentType}_id`] = currentStickerParentId;
        }
        
        try {
            const res = await fetch('/api/stickers/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const created = await res.json();
                if (currentStickerSource === 'parent') {
                    if (typeof window.refreshParentStickers === 'function') {
                        window.refreshParentStickers(currentStickerParentType, currentStickerParentId);
                    } else {
                        location.reload();
                    }
                } else {
                    location.reload();
                }
                showToast('✓ Sticker created', 'success');
                closeStickerModal();
            } else {
                const errData = await res.json();
                showToast('⚠ Error: ' + (errData.detail || 'Failed to create'), 'error');
            }
        } catch (e) { 
            console.error(e);
            showToast('⚠ Network error', 'error');
        }
    }
}

/**
 * Archive sticker (Soft delete) - used in widgets and general views
 */
async function archiveStickerGlobal(btn, id) {
    if (!confirm('Archive this thought? (It will be hidden from the dashboard)')) return;
    try {
        const res = await fetch(`/api/stickers/${id}/archive/`, { method: 'POST' });
        if (res.ok) {
            const el = btn.closest('.sticker-thought') || btn.closest('.note-card');
            if (el) {
                el.style.opacity = '0.5';
                el.style.transform = 'scale(0.9)';
                setTimeout(() => el.remove(), 300);
            } else {
                location.reload();
            }
        }
    } catch(e) {
        console.error('Failed to archive sticker:', e);
    }
}

/**
 * Permanent Delete sticker (Hard delete) - used in DB View
 */
async function hardDeleteStickerGlobal(btn, id) {
    if (!confirm('PERMANENTLY DELETE this sticker from the database? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/stickers/${id}/`, { method: 'DELETE' });
        if (res.ok) {
            const el = btn.closest('.note-card') || btn.closest('.sticker-thought');
            if (el) {
                el.style.backgroundColor = 'var(--color-error-light)';
                el.style.opacity = '0.5';
                setTimeout(() => el.remove(), 300);
            } else {
                location.reload();
            }
        }
    } catch(e) {
        console.error('Failed to hard delete sticker:', e);
    }
}

// Keep old name as alias for compatibility if needed, but point to archive
async function deleteStickerGlobal(btn, id) {
    return archiveStickerGlobal(btn, id);
}

/**
 * Open stickers attached to a parent (task, habit, event, note)
 * 0 stickers -> Open creation modal
 * 1+ stickers -> Open Overview Modal
 */
async function openParentStickers(parentType, parentId) {
    try {
        const res = await fetch(`/api/stickers/${parentType}/${parentId}/`);
        if (res.ok) {
            const stickers = await res.json();
            
            // Set global context for this parent
            currentStickerParentType = parentType;
            currentStickerParentId = parentId;

            if (stickers.length === 0) {
                // No stickers -> Open creation directly
                openStickerModal({ parentType: parentType, parentId: parentId });
            } else {
                // Have stickers -> Open Overview
                openParentStickersOverview(parentType, parentId, stickers);
            }
        } else {
            openStickerModal({ parentType: parentType, parentId: parentId });
        }
    } catch (e) {
        console.error('Error fetching parent stickers:', e);
        openStickerModal({ parentType: parentType, parentId: parentId });
    }
}

/**
 * Renders and opens the Overview Modal with a grid of mini-stickers
 */
function openParentStickersOverview(type, id, stickers) {
    const modal = document.getElementById('parentStickersOverviewModal');
    const list = document.getElementById('parentStickersList');
    const emptyMsg = document.getElementById('noParentStickersMessage');
    
    if (!modal || !list) return;

    // Reset UI
    list.innerHTML = '';
    emptyMsg.style.display = 'none';

    stickers.forEach(s => {
        const card = document.createElement('div');
        card.className = 'mini-sticker-card';
        card.style.backgroundColor = s.color || 'var(--color-sticker-default)';
        
        let textPreview = s.text;
        if (s.type === 'list') {
            try {
                const data = JSON.parse(s.text);
                textPreview = data.items.map(it => (it.done ? '✓ ' : '○ ') + it.text).join('\n');
            } catch(e) {}
        }

        const dateObj = new Date(s.created_at);
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getFullYear()).slice(-2)}`;

        card.innerHTML = `
            <div class="mini-sticker-del" onclick="event.stopPropagation(); archiveStickerInOverview(this, '${s.id}')" title="Archive">×</div>
            ${s.title ? `<div class="mini-sticker-title">${s.title}</div>` : ''}
            <div class="mini-sticker-text">${textPreview.replace(/\n/g, '<br>')}</div>
            <div class="mini-sticker-date">${dateStr}</div>
        `;
        
        card.onclick = () => {
            closeParentStickersOverview();
            openStickerModal({ id: s.id });
        };
        
        list.appendChild(card);
    });

    modal.style.display = 'flex';
}

function closeParentStickersOverview() {
    const modal = document.getElementById('parentStickersOverviewModal');
    if (modal) modal.style.display = 'none';
}

function createNewStickerForCurrentParent() {
    closeParentStickersOverview();
    openStickerModal({ parentType: currentStickerParentType, parentId: currentStickerParentId });
}

async function archiveStickerInOverview(btn, id) {
    if (!confirm('Archive this thought?')) return;
    try {
        const res = await fetch(`/api/stickers/${id}/archive/`, { method: 'POST' });
        if (res.ok) {
            btn.parentElement.remove();
            const list = document.getElementById('parentStickersList');
            if (list && list.children.length === 0) {
                document.getElementById('noParentStickersMessage').style.display = 'block';
            }
        }
    } catch(e) { console.error(e); }
}

/**
 * Note Selection Modal Logic
 */
async function openNoteSelectionModal() {
    const modal = document.getElementById('noteSelectionModal');
    if (modal) modal.style.display = 'flex';
    document.getElementById('noteSearchInput').value = '';
    searchNotesForSticker('', true); // Initial load of recent notes (immediate)
}

function closeNoteSelectionModal() {
    const modal = document.getElementById('noteSelectionModal');
    if (modal) modal.style.display = 'none';
}

function createNewNoteFromSticker() {
    closeNoteSelectionModal();
    // Setup callback to attach the new note to the sticker after it's created
    window.noteCreationCallback = (noteId, noteText) => {
        attachNoteToSticker(noteId, noteText);
    };
    if (typeof window.openNoteExpandModal === 'function') {
        window.openNoteExpandModal();
    } else {
        console.error('openNoteExpandModal not found');
        showToast('Error: Note editor not found', 'error');
    }
}

let noteSearchTimeout = null;
function searchNotesForSticker(query, immediate = false) {
    clearTimeout(noteSearchTimeout);
    const performSearch = async () => {
        const resultsEl = document.getElementById('noteSearchResults');
        if (!resultsEl) return;
        
        try {
            const url = query ? `/api/stickers/notes_search?query=${encodeURIComponent(query)}` : '/api/stickers/notes_search';
            const res = await fetch(url);
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server returned ${res.status}: ${errText.substring(0, 50)}`);
            }
            
            const notes = await res.json();
            renderNoteSearchResults(notes);
        } catch (e) {
            console.error('Search failed:', e);
            resultsEl.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff5252;">Search failed: ${e.message}</div>`;
        }
    };

    if (immediate) performSearch();
    else noteSearchTimeout = setTimeout(performSearch, 300);
}

function renderNoteSearchResults(notes) {
    const container = document.getElementById('noteSearchResults');
    if (notes.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No notes found</div>';
        return;
    }
    container.innerHTML = notes.map(n => {
        const escapedNote = n.note
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/\n/g, ' ') // Replace newlines for onclick safety
            .substring(0, 200);
            
        return `
            <div class="note-search-item" onclick="attachNoteToSticker(${n.id}, '${escapedNote}')">
                <span class="note-category">${n.category || 'General'}</span>
                <div class="note-text">${n.note}</div>
            </div>
        `;
    }).join('');
}

function attachNoteToSticker(noteId, noteText) {
    currentStickerNoteId = noteId;
    updateAttachedNoteUI({ id: noteId, note: noteText });
    closeNoteSelectionModal();
}

function removeNoteFromSticker() {
    currentStickerNoteId = -1; // Flag to remove in backend (or 0)
    document.getElementById('modalStickerAttachedNoteContainer').style.display = 'none';
}

function updateAttachedNoteUI(note) {
    const container = document.getElementById('modalStickerAttachedNoteContainer');
    const textEl = document.getElementById('attachedNoteText');
    if (container && textEl && note) {
        textEl.innerText = note.note.substring(0, 100) + (note.note.length > 100 ? '...' : '');
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// Global exports
window.openNoteSelectionModal = openNoteSelectionModal;
window.closeNoteSelectionModal = closeNoteSelectionModal;
window.searchNotesForSticker = searchNotesForSticker;
window.attachNoteToSticker = attachNoteToSticker;
window.removeNoteFromSticker = removeNoteFromSticker;

/**
 * Expand Note on Sticker (Accordion style)
 */
async function expandNoteOnSticker(noteId, cardEl, fullText = null) {
    let fullTextEl = cardEl.querySelector('.note-card-full-text');
    
    if (fullTextEl) {
        const isExpanded = fullTextEl.style.display !== 'none';
        fullTextEl.style.display = isExpanded ? 'none' : 'block';
        cardEl.classList.toggle('expanded', !isExpanded);
        return;
    }

    if (!fullText) {
        try {
            const res = await fetch(`/api/stickers/notes_search?query=`); 
            const notes = await res.json();
            const found = notes.find(n => n.id === noteId);
            if (found) fullText = found.note;
        } catch(e) { console.error(e); }
    }

    if (fullText) {
        fullTextEl = document.createElement('div');
        fullTextEl.className = 'note-card-full-text';
        fullTextEl.innerHTML = fullText.replace(/\n/g, '<br>');
        cardEl.appendChild(fullTextEl);
        cardEl.classList.add('expanded');
    }
}

window.expandNoteOnSticker = expandNoteOnSticker;

// Ensure functions are global
window.openParentStickers = openParentStickers;
window.openParentStickersOverview = openParentStickersOverview;
window.closeParentStickersOverview = closeParentStickersOverview;
window.createNewStickerForCurrentParent = createNewStickerForCurrentParent;
window.archiveStickerInOverview = archiveStickerInOverview;
window.openStickerModal = openStickerModal;
window.createStickerElement = createStickerElement;

// Named exports for hybrid compatibility
export { openStickerModal, createStickerElement };

// Global initialization for hydration
document.addEventListener('DOMContentLoaded', () => {
    const placeholders = document.querySelectorAll('.sticker-thought-placeholder');
    placeholders.forEach(el => {
        const id = el.dataset.id;
        const text = el.dataset.text || '';
        const title = el.dataset.title || '';
        const color = el.dataset.color || '#fff9c4';
        const type = el.dataset.type || 'text';
        
        if (id) {
            const noteDiv = createStickerElement({
                id: id,
                text: text,
                title: title,
                color: color,
                type: type
            }, { isWidget: false });
            el.parentNode.replaceChild(noteDiv, el);
        }
    });
});

