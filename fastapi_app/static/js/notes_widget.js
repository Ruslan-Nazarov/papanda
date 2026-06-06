/**
 * notes_widget.js - AJAX Controller for Regular Notes
 */

class NotesWidget {
    constructor() {
        this.currentNoteId = null;
        this.init();
    }

    init() {
        console.log("NotesWidget: Initializing...");
        this.setupEventListeners();
        this.loadNotes(); // Load pinned notes immediately
        
        // Safety run for local time
        setTimeout(() => {
            if (window.applyLocalTimeGlobally) window.applyLocalTimeGlobally();
        }, 500);
    }


    setupEventListeners() {
        // Global listeners for outside clicks on modals if needed
    }

    async loadNotes() {
        const container = document.getElementById('pinned-notes-list');
        if (!container) return;

        try {
            const res = await fetch('/api/notes/pinned');
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const notes = await res.json();
            this.renderNotes(notes);
        } catch (e) { 
            console.error("[Notes] Failed to load pinned notes:", e);
        }
    }

    async refreshPinnedNotes() {
        const container = document.getElementById('pinned-notes-list');
        if (!container) return;

        try {
            const res = await fetch('/api/notes/pinned');
            const notes = await res.json();
            
            container.innerHTML = '';
            if (notes.length === 0) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px; font-style: italic;">No pinned notes yet</div>';
                return;
            }

            notes.forEach(n => container.appendChild(this.renderNoteCard(n)));
        } catch (e) {
            console.error("Failed to refresh notes:", e);
        }
    }

    renderNoteCard(n) {
        // Returns DOM element to preserve onclick handlers (outerHTML loses them)
        const card = document.createElement('div');
        card.className = 'pinned-note-card';
        card.dataset.id = n.id;

        const header = document.createElement('div');
        header.className = 'note-card-header';
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';

        const badge = document.createElement('span');
        badge.className = 'premium-badge';
        badge.textContent = n.category || 'General';

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px;';

        const pinBtn = document.createElement('button');
        pinBtn.className = 'btn-row-action pin-btn active';
        pinBtn.title = 'Unpin from dashboard';
        pinBtn.textContent = '\uD83D\uDCCC';
        pinBtn.onclick = () => this.togglePin(n.id, true);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-row-action del-btn';
        delBtn.title = 'Delete';
        delBtn.textContent = '\u00D7';
        delBtn.onclick = () => this.deleteNote(n.id);

        actions.appendChild(pinBtn);
        actions.appendChild(delBtn);
        header.appendChild(badge);
        header.appendChild(actions);

        const textEl = document.createElement('div');
        textEl.className = 'premium-note-text';
        textEl.style.cssText = 'cursor:pointer;font-weight:400;font-size:0.9rem;line-height:1.4;color:var(--color-text-dark);max-height:120px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;';
        textEl.textContent = n.note; // safe — textContent, no XSS
        textEl.onclick = () => this.viewNote(n.id);

        card.appendChild(header);
        card.appendChild(textEl);
        return card; // DOM element, not outerHTML
    }

    async saveNote(isExpanded = false, shouldClose = true) {
        const prefix = isExpanded ? 'expanded' : 'regular';
        
        const ta = document.getElementById(`${prefix}NoteTextarea`);
        const cat = document.getElementById(`${prefix}NoteCategory`);
        const pin = document.getElementById(`${prefix}NotePin`);
        const idInput = document.getElementById(`${prefix}NoteId`);
        const noteId = idInput ? idInput.value : null;

        if (!ta || !ta.value.trim()) {
            if (typeof window.showToast === 'function') window.showToast("Note cannot be empty", "error");
            return null;
        }

        const formData = new FormData();
        formData.append('note', ta.value);
        formData.append('category', cat ? cat.value : 'General');
        formData.append('is_pinned', pin ? pin.checked : false);

        const url = (noteId && noteId !== 'NEW' && noteId !== '') ? `/api/notes/${noteId}/update` : '/add_note';

        try {
            const res = await fetch(url, { method: 'POST', body: formData });
            
            if (!res.ok) {
                if (window.showToast) window.showToast("Save failed", "error");
                return null;
            }

            const result = await res.json();
            
            if (result.status === 'success') {
                if (typeof window.showToast === 'function') {
                    window.showToast("✓ Note saved successfully", "success");
                }
                
                if (shouldClose) {
                    ta.value = '';
                    if (pin) pin.checked = false;
                    if (idInput) idInput.value = '';
                    
                    if (isExpanded) {
                        const modal = document.getElementById('expandedNoteEditorModal');
                        if (modal) modal.style.display = 'none';
                    }
                }

                this.refreshPinnedNotes();
                return result.id || noteId; 
            } else {
                if (typeof window.showToast === 'function') window.showToast("Error: " + result.message, "error");
            }
        } catch (e) {
            console.error("Save failed:", e);
        }
        return null;
    }

    async editNote(id, noteData = null) {
        try {
            let note = noteData;
            if (!note) {
                const res = await fetch(`/api/notes/${id}`);
                if (!res.ok) throw new Error("Note not found");
                note = await res.json();
            }

            // Populate Expanded Editor
            const modal = document.getElementById('expandedNoteEditorModal');
            const expTa = document.getElementById('expandedNoteTextarea');
            const expCat = document.getElementById('expandedNoteCategory');
            const expPin = document.getElementById('expandedNotePin');
            const expId = document.getElementById('expandedNoteId') || (()=>{
                let input = document.createElement('input');
                input.type = 'hidden';
                input.id = 'expandedNoteId';
                modal.appendChild(input);
                return input;
            })();

            if (modal && expTa) {
                expTa.value = note.note;
                if (expCat) expCat.value = note.category;
                if (expPin) expPin.checked = note.is_pinned;
                expId.value = note.id;
                this.currentNoteId = note.id;
                
                // Show existing stickers
                this.renderStickersInEditor('expanded', note.stickers);

                modal.style.display = 'flex';
                setTimeout(() => expTa.focus(), 100);
            }
        } catch (e) {
            console.error("Edit failed:", e);
            if (typeof window.showToast === 'function') window.showToast("Could not load note data", "error");
        }
    }

    renderStickersInEditor(prefix, stickers, retryCount = 0) {
        const list = document.getElementById(`${prefix}NoteStickersList`);
        const section = document.getElementById(`${prefix}NoteStickersSection`);
        if (!list || !section) return;

        // If renderer isn't ready yet, wait a bit and try again (up to 10 times)
        if (typeof window.createStickerElement !== 'function') {
            if (retryCount < 10) {
                setTimeout(() => this.renderStickersInEditor(prefix, stickers, retryCount + 1), 150);
                return;
            }
        }

        list.innerHTML = '';
        if (stickers && stickers.length > 0) {
            section.style.display = 'block';
            stickers.forEach((s, idx) => {
                if (typeof window.createStickerElement === 'function') {
                    try {
                        const noteDiv = window.createStickerElement(s, { 
                            isWidget: true, 
                            onClick: () => {
                                if (window.openStickerModal) window.openStickerModal({ id: s.id });
                            }
                        });
                        
                        const wrapper = document.createElement('div');
                        wrapper.className = 'editor-mini-sticker-wrapper';
                        wrapper.appendChild(noteDiv);
                        list.appendChild(wrapper);
                    } catch (err) {
                        console.error("[NotesWidget] Render crash:", err);
                    }
                } else {
                    const fb = document.createElement('div');
                    fb.className = 'mini-sticker-preview';
                    fb.style.background = s.color || '#fff9c4';
                    fb.textContent = s.title || `Sticker ${s.id}`;
                    list.appendChild(fb);
                }
            });
        } else {
            section.style.display = (prefix === 'expanded') ? 'block' : 'none';
            list.innerHTML = (prefix === 'expanded') ? '<span style="color:var(--color-text-faint);font-size:0.8rem;">No stickers yet</span>' : '';
        }
    }

    async manageStickersForNewNote(retryCount = 0) {
        try {
            // Ensure bridge is ready
            const bridgeReady = typeof window.openParentStickers === 'function';

            if (!bridgeReady) {
                if (retryCount < 10) {
                    setTimeout(() => this.manageStickersForNewNote(retryCount + 1), 100);
                    return;
                }
                if (window.showToast) window.showToast("Stickers module not loaded yet", "error");
                return;
            }

            const ta = document.getElementById('expandedNoteTextarea');
            if (!ta || !ta.value.trim()) {
                if (window.showToast) window.showToast("Write something first!", "info");
                return;
            }

            // 1. If we already have an ID, just open modal
            if (this.currentNoteId) {
                window.openParentStickers('note', this.currentNoteId);
                return;
            }

            // 2. If no ID, we MUST save first
            const savedId = await this.saveNote(true, false); 

            if (savedId) {
                this.currentNoteId = savedId;
                const idInput = document.getElementById('expandedNoteId');
                if (idInput) idInput.value = savedId;
                
                window.openParentStickers('note', savedId);
            }
        } catch (e) {
            console.error("Sticker flow failed:", e);
        }
    }

    formatLocalTime(utcString) {
        if (!utcString) return '';
        const d = new Date(utcString + 'Z'); // Force UTC interpretation
        return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    async deleteNote(id) {
        const confirmed = await window.NotificationService.confirm("Delete this note permanently?", { isDanger: true, okText: 'Delete' });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (typeof window.showToast === 'function') window.showToast("✓ Note deleted", "success");
                this.refreshPinnedNotes();
            }
        } catch (e) {
            console.error("Delete failed:", e);
        }
    }

    // --- All Notes Modal Logic ---

    showAllNotesModal() {
        const modal = document.getElementById('allNotesModal');
        if (!modal) return;
        
        modal.style.display = 'flex';
        const input = document.getElementById('allNotesSearchInput');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
        
        // Initial load
        this.searchInModal('');
    }

    async searchInModal(query) {
        const grid = document.getElementById('allNotesGrid');
        const debug = document.getElementById('notesCountDebug');
        if (!grid) return;

        if (debug) debug.innerText = '(loading...)';

        try {
            const res = await fetch(`/api/notes/search?query=${encodeURIComponent(query)}`);
            if (res.ok) {
                const notes = await res.json();
                if (debug) debug.innerText = `(${notes.length} found)`;
                this.renderModalCards(notes);
            } else {
                if (debug) debug.innerText = '(error loading)';
            }
        } catch (e) {
            console.error("Failed to search notes in modal:", e);
            if (debug) debug.innerText = '(fetch failed)';
        }
    }

    renderNotes(notes) {
        const container = document.getElementById('pinned-notes-list');
        if (!container) return;

        if (!notes || notes.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px 20px; font-style: italic;">No pinned notes on dashboard</div>';
            return;
        }

        container.innerHTML = '';
        notes.forEach(n => {
            const card = document.createElement('div');
            card.className = 'pinned-note-card'; // Back to correct style
            card.dataset.id = n.id;
            
            card.innerHTML = `
                <div class="note-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span class="premium-badge">${n.category || 'General'}</span>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-row-action pin-btn active" 
                                onclick="notesWidget.togglePin(${n.id}, true)" 
                                title="Unpin from dashboard">
                            📌
                        </button>
                        <button class="btn-row-action del-btn" 
                                onclick="notesWidget.deleteNote(${n.id})" 
                                title="Delete">
                            ×
                        </button>
                    </div>
                </div>
                <div class="premium-note-text" style="cursor: pointer; font-size: 0.9rem; line-height: 1.5; color: var(--color-text-dark); max-height: 120px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical;"></div>
            `;
            
            const textEl = card.querySelector('.premium-note-text');
            textEl.textContent = n.note;
            textEl.onclick = () => this.viewNote(n.id);
            
            container.appendChild(card);
        });
    }

    renderModalCards(notes) {
        const container = document.getElementById('allNotesGrid');
        if (!container) return;

        if (!notes || notes.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--color-text-faint); padding: 60px 20px;">
                    <div style="font-size: 3rem; margin-bottom: 16px;">🔍</div>
                    <p style="font-size: 1.1rem; font-weight: 500;">No notes matching your search</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        notes.forEach(n => {
            const card = document.createElement('div');
            card.className = 'pinned-note-card search-result-card';
            card.dataset.id = n.id;
            card.style.cssText = 'background: var(--color-bg-white); border: 2px solid var(--color-border-light); cursor: default; transition: all 0.2s ease;';
            
            card.innerHTML = `
                <div class="note-card-header">
                    <span class="note-card-category">${n.category || 'General'}</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="note-card-action pin-btn ${n.is_pinned ? 'active' : ''}" 
                                onclick="notesWidget.togglePin(${n.id}, ${n.is_pinned})" 
                                title="${n.is_pinned ? 'Unpin from dashboard' : 'Pin to dashboard'}">
                            ${n.is_pinned ? '📌' : '📍'}
                        </button>
                        <button class="note-card-action del-btn" onclick="notesWidget.deleteNote(${n.id})" title="Delete">×</button>
                    </div>
                </div>
                <div class="premium-note-text" style="cursor: pointer; font-size: 0.95rem; line-height: 1.5; color: var(--color-text-dark); max-height: 120px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical;"></div>
            `;
            
            const textEl = card.querySelector('.premium-note-text');
            textEl.textContent = n.note;
            textEl.onclick = () => this.viewNote(n.id);
            
            container.appendChild(card);
        });
    }

    async viewNote(id) {
        try {
            const res = await fetch(`/api/notes/${id}`);
            if (!res.ok) {
                console.error(`[Notes] Failed to fetch note ${id}`);
                return;
            }

            const note = await res.json();
            
            if (typeof window.openDbCardDetail === 'function') {
                window.openDbCardDetail({
                    title: "Note",
                    date: note.created_at ? window.notesWidget.formatLocalTime(note.created_at) : "",
                    category: note.category || "General",
                    body: note.note,
                    onEdit: () => window.notesWidget.editNote(note.id, note),
                    onDelete: () => { window.notesWidget.deleteNote(note.id); },
                    onRenderExtra: (board, list) => {
                        if (note.stickers && note.stickers.length > 0) {
                            board.style.display = 'block';
                            note.stickers.forEach(s => {
                                if (typeof window.createStickerElement === 'function') {
                                    const sEl = window.createStickerElement(s, { isWidget: false });
                                    list.appendChild(sEl);
                                } else {
                                    const sDiv = document.createElement('div');
                                    sDiv.className = 'sticker-mini-preview';
                                    sDiv.style.background = s.color || '#fff9c4';
                                    sDiv.innerText = s.title || s.text.substring(0, 20) + '...';
                                    list.appendChild(sDiv);
                                }
                            });
                        }
                    }
                });
            } else {
                console.warn("[Notes] Centralized openDbCardDetail is missing");
            }
        } catch (e) { 
            console.error("[Notes] Exception in viewNote:", e);
        }
    }

    showExpandedEditor() {
        const modal = document.getElementById('expandedNoteEditorModal');
        const mainTa = document.getElementById('regularNoteTextarea');
        const expTa = document.getElementById('expandedNoteTextarea');
        const mainCat = document.getElementById('regularNoteCategory');
        const expCat = document.getElementById('expandedNoteCategory');
        const expId = document.getElementById('expandedNoteId');
        const expPin = document.getElementById('expandedNotePin');
        
        if (modal && mainTa && expTa) {
            expTa.value = mainTa.value;
            if (mainCat && expCat) expCat.value = mainCat.value;
            if (expId) expId.value = ''; // New note from widget
            if (expPin) expPin.checked = false; // Default: not pinned
            this.currentNoteId = null;
            modal.style.display = 'flex';
            setTimeout(() => expTa.focus(), 100);
        }
    }

    _hasUnsavedChanges() {
        const expTa = document.getElementById('expandedNoteTextarea');
        const expId = document.getElementById('expandedNoteId');
        // Unsaved if textarea has text and it's a new note (no id)
        return expTa && expTa.value.trim() && (!expId || !expId.value);
    }

    closeExpandedEditor() {
        if (this._hasUnsavedChanges()) {
            if (!confirm('Close without saving? Your note will be lost.')) return;
        }
        const modal = document.getElementById('expandedNoteEditorModal');
        if (modal) modal.style.display = 'none';
        const expTa = document.getElementById('expandedNoteTextarea');
        if (expTa) expTa.value = '';
        this.currentNoteId = null;
    }


    showAddCategoryModal() {
        const modal = document.getElementById('addCategoryModal');
        const input = document.getElementById('newCategoryName');
        if (modal) {
            modal.style.display = 'flex';
            if (input) {
                input.value = '';
                setTimeout(() => input.focus(), 100);
            }
        }
    }
    
    async saveNewCategory() {
        const input = document.getElementById('newCategoryName');
        if (!input || !input.value.trim()) {
            if (typeof window.showToast === 'function') window.showToast("Category name cannot be empty", "error");
            return;
        }

        const name = input.value.trim();
        try {
            const res = await fetch('/api/notes/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name })
            });

            if (res.ok) {
                if (typeof window.showToast === 'function') window.showToast(`✓ Category "${name}" added`, "success");
                document.getElementById('addCategoryModal').style.display = 'none';
                this.updateCategorySelects(name);
            } else {
                const err = await res.json();
                if (typeof window.showToast === 'function') window.showToast(err.detail || "Error adding category", "error");
            }
        } catch (e) {
            console.error("[Notes] Failed to add category:", e);
        }
    }

    updateCategorySelects(newName) {
        const selects = ['regularNoteCategory', 'expandedNoteCategory', 'editNoteCategory'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const opt = document.createElement('option');
                opt.value = newName;
                opt.textContent = newName;
                el.appendChild(opt);
                el.value = newName;
            }
        });
    }

    async togglePin(id, currentStatus) {
        try {
            const res = await fetch(`/api/notes/${id}/toggle-pin`, { method: 'POST' });
            if (!res.ok) return;
            const data = await res.json();
            if (typeof window.showToast === 'function') {
                window.showToast(data.message || 'Note pin status updated', 'success');
            }
            this.loadNotes();
            // Refresh allNotesModal if open
            const allModal = document.getElementById('allNotesModal');
            if (allModal && allModal.style.display === 'flex') {
                const query = document.getElementById('allNotesSearchInput')?.value || '';
                this.searchInModal(query);
            }
        } catch (e) {
            console.error('[Notes] Failed to toggle pin:', e);
        }
    }
}

window.notesWidget = new NotesWidget();

window.closeNoteViewModal = function() {
    if (window.ModalManager) window.ModalManager.close('noteViewModal');
    else document.getElementById('noteViewModal').style.display = 'none';
};

window.noteViewEditNote = function() {
    const id = document.getElementById('noteViewNoteId')?.value;
    if (!id) return;
    window.closeNoteViewModal();
    // Small delay so close animation finishes before edit modal opens
    setTimeout(() => window.notesWidget.editNote(parseInt(id)), 150);
};
