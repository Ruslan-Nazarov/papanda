/**
 * notes_widget.js - AJAX Controller for Regular Notes
 */

class NotesWidget {
    constructor() {
        this.init();
    }

    init() {
        console.log("NotesWidget: Initializing...");
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Global listeners for outside clicks on modals if needed
    }

    async refreshPinnedNotes() {
        const container = document.getElementById('pinned-notes-list');
        if (!container) return;

        try {
            const res = await fetch('/api/notes/pinned');
            const notes = await res.json();
            
            if (notes.length === 0) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px; font-style: italic;">No pinned notes yet</div>';
                return;
            }

            container.innerHTML = notes.map(n => this.renderNoteCard(n)).join('');
        } catch (e) {
            console.error("Failed to refresh notes:", e);
        }
    }

    renderNoteCard(n) {
        const stickersHtml = (n.stickers || []).map(s => `
            <div class="mini-sticker-indicator" style="background: ${s.color || '#fff9c4'};" title="${s.text}"></div>
        `).join('');

        return `
            <div class="pinned-note-card premium-glass" data-id="${n.id}">
                <div class="card-pin-status active" onclick="notesWidget.togglePin(${n.id}, true)">★</div>
                <div class="card-header">
                    <span class="card-category">${n.category || 'General'}</span>
                    <div class="card-actions">
                        <button class="action-btn" onclick="notesWidget.editNote(${n.id})" title="Edit">✎</button>
                        <button class="action-btn delete" onclick="notesWidget.deleteNote(${n.id})" title="Delete">×</button>
                    </div>
                </div>
                <div class="card-body" onclick="notesWidget.viewNote(${n.id})">
                    <p>${n.preview}</p>
                </div>
                <div class="card-footer">
                    <div class="card-stickers">${stickersHtml}</div>
                    <small>#${n.id}</small>
                </div>
            </div>
        `;
    }

    async saveNote(isExpanded = false) {
        const prefix = isExpanded ? 'expanded' : 'regular';
        const ta = document.getElementById(`${prefix}NoteTextarea`);
        const cat = document.getElementById(`${prefix}NoteCategory`);
        const pin = document.getElementById(`${prefix}NotePin`);
        const noteId = document.getElementById(`${prefix}NoteId`)?.value;

        if (!ta || !ta.value.trim()) {
            if (typeof window.showToast === 'function') window.showToast("Note cannot be empty", "error");
            return;
        }

        const formData = new FormData();
        formData.append('note', ta.value);
        formData.append('category', cat ? cat.value : 'General');
        formData.append('is_pinned', pin ? pin.checked : true);

        const url = noteId ? `/api/notes/${noteId}/update` : '/add_note';
        
        try {
            const res = await fetch(url, { method: 'POST', body: formData });
            const result = await res.json();
            
            if (result.status === 'success') {
                if (typeof window.showToast === 'function') window.showToast(`✓ Note ${noteId ? 'updated' : 'saved'}`, "success");
                
                // Clear input
                ta.value = '';
                if (pin) pin.checked = false;
                if (document.getElementById(`${prefix}NoteId`)) document.getElementById(`${prefix}NoteId`).value = '';

                // Close modal if expanded
                if (isExpanded) {
                    document.getElementById('expandedNoteEditorModal').style.display = 'none';
                }

                this.refreshPinnedNotes();
            } else {
                if (typeof window.showToast === 'function') window.showToast("Error: " + result.message, "error");
            }
        } catch (e) {
            console.error("Save failed:", e);
        }
    }

    async editNote(id) {
        try {
            const res = await fetch(`/api/notes/${id}`);
            if (!res.ok) throw new Error("Note not found");
            const note = await res.json();

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
                
                modal.style.display = 'flex';
                setTimeout(() => expTa.focus(), 100);
            }
        } catch (e) {
            console.error("Edit failed:", e);
            if (typeof window.showToast === 'function') window.showToast("Could not load note data", "error");
        }
    }

    async deleteNote(id) {
        if (!confirm("Delete this note permanently?")) return;

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

    async togglePin(id, currentPinned) {
        const action = currentPinned ? 'unpin' : 'pin';
        try {
            const res = await fetch(`/api/notes/${id}/${action}`, { method: 'POST' });
            if (res.ok) {
                if (typeof window.showToast === 'function') window.showToast(`Note ${currentPinned ? 'unpinned' : 'pinned'}`, "success");
                this.refreshPinnedNotes();
                
                // If search modal is open, refresh it too
                if (document.getElementById('noteSearchModal').style.display === 'flex') {
                    this.searchAllNotes(document.getElementById('noteGlobalSearchInput').value);
                }
            }
        } catch (e) {
            console.error("Toggle pin failed:", e);
        }
    }

    async viewNote(id) {
        try {
            const res = await fetch(`/api/notes/${id}`);
            const note = await res.json();
            
            // We can reuse the viewRegularNoteDetails if it still exists or implement here
            if (window.app && typeof window.app.viewRegularNoteDetails === 'function') {
                window.app.viewRegularNoteDetails(note.id, note.category, note.note, note.stickers);
            } else {
                // Fallback implementation
                const modal = document.getElementById('regularNoteViewModal');
                if (modal) {
                    document.getElementById('regViewModalCategory').innerText = note.category;
                    document.getElementById('regViewModalBody').innerText = note.note;
                    modal.style.display = 'flex';
                }
            }
        } catch (e) { console.error(e); }
    }

    showExpandedEditor() {
        const modal = document.getElementById('expandedNoteEditorModal');
        const mainTa = document.getElementById('regularNoteTextarea');
        const expTa = document.getElementById('expandedNoteTextarea');
        const mainCat = document.getElementById('regularNoteCategory');
        const expCat = document.getElementById('expandedNoteCategory');
        const expId = document.getElementById('expandedNoteId');
        
        if (modal && mainTa && expTa) {
            expTa.value = mainTa.value;
            if (mainCat && expCat) expCat.value = mainCat.value;
            if (expId) expId.value = ''; // New note from widget
            modal.style.display = 'flex';
            setTimeout(() => expTa.focus(), 100);
        }
    }

    showSearchModal() {
        document.getElementById('noteSearchModal').style.display = 'flex';
        this.searchAllNotes('');
    }

    async searchAllNotes(query) {
        const resultsEl = document.getElementById('noteGlobalSearchResults');
        if (!resultsEl) return;

        try {
            const res = await fetch(`/api/stickers/notes_search?query=${encodeURIComponent(query)}`);
            if (res.ok) {
                const notes = await res.json();
                this.renderSearchResults(notes);
            }
        } catch (e) {
            console.error("Search failed:", e);
        }
    }

    renderSearchResults(notes) {
        const container = document.getElementById('noteGlobalSearchResults');
        if (notes.length === 0) {
            container.innerHTML = '<div style="grid-column: span 2; text-align: center; color: #94a3b8; padding: 20px;">No notes found</div>';
            return;
        }
        
        container.innerHTML = notes.map(n => `
            <div class="search-note-card" onclick="notesWidget.viewNote(${n.id})" title="Click to view">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="note-pin-btn ${n.is_pinned?'active':''}" 
                              onclick="event.stopPropagation(); notesWidget.togglePin(${n.id}, ${n.is_pinned})"
                              style="font-size: 1.2em; color: ${n.is_pinned ? '#f59e0b' : '#cbd5e1'}; cursor: pointer;">
                            ${n.is_pinned ? '★' : '☆'}
                        </span>
                        <span class="card-category-tag">${n.category || 'General'}</span>
                    </div>
                    <button class="action-btn" onclick="event.stopPropagation(); notesWidget.editNote(${n.id})">✎</button>
                </div>
                <div class="search-note-preview">${n.note}</div>
            </div>
        `).join('');
    }
}

window.notesWidget = new NotesWidget();
