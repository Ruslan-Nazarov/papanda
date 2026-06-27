import { DialecticsAPI } from './api.js';
import { DialecticsUI } from './ui_utils.js';
import { BlockManager } from './BlockManager.js';
import { CanvasManager } from './CanvasManager.js';

class NoteControllerClass {
    async saveGlobal(shouldClose = true, toastKey = "toast.dialectics_saved") {
        const title = this.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        const html = this.editor.getHTML();
        console.log("TipTap HTML Output -> length:", html.length);
        if (this.state.editingBlock) {
            const inner = this.state.editingBlock.querySelector('.dialectics-content-inner');
            if (inner) {
                inner.innerHTML = html;
                BlockManager.renderMath(inner);
            }
        } else if (this.state.pendingSide) {
            if (html !== '<p></p>' && html.trim() !== '') {
                const currentBlocks = BlockManager.getBlocks(this.dom.canvas);
                const newBlock = { id: this.state.pendingBlockId, side: this.state.pendingSide, html };
                if (this.state.pendingRole) {
                    newBlock.role = this.state.pendingRole;
                }
                let newBlocks;
                if (this.state.insertAfterIndex !== null) {
                    // Insert after the specified index
                    newBlocks = [
                        ...currentBlocks.slice(0, this.state.insertAfterIndex + 1),
                        newBlock,
                        ...currentBlocks.slice(this.state.insertAfterIndex + 1)
                    ];
                } else {
                    newBlocks = [...currentBlocks, newBlock];
                }
                this.state.insertAfterIndex = null;
                this.state.pendingRole = null;
                BlockManager.render(this.dom.canvas, newBlocks, this._blockCallbacks());
            }
        }

        const blocks = BlockManager.getBlocks(this.dom.canvas);
        const categoryId = this.dom.categorySelect ? this.dom.categorySelect.value : null;

        const payload = {
            title,
            blocks: blocks.map(b => ({
                id: b.id,
                side: b.side,
                html: b.html,
                role: b.role
            })),
            is_pinned: this.state.isPinned || false,
            category_id: categoryId ? parseInt(categoryId) : null,
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        if (this.state.currentNoteId) {
            payload.id = Number(this.state.currentNoteId);
        }

        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            this.state.currentNoteId = res.id;
            localStorage.setItem('dialectics_last_note_id', res.id);
            
            // Sync URL query parameter
            const url = new URL(window.location);
            if (url.searchParams.get('id') !== String(res.id)) {
                url.searchParams.set('id', res.id);
                window.history.pushState({}, '', url);
            }

            window.showToast(window._(toastKey) || window._("toast.dialectics_saved"), "success");
            if (shouldClose) {
                this.close();
            }
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'block';
            return res.id;
        }
        return null;
    }

    async openStickersForCurrent(forceBlockId = null) {
        if (!this.state.currentNoteId) {
            if (window.showToast) window.showToast(window._("toast.saving_note_to_attach_sticker"), "info");
            const savedId = await this.saveGlobal(false);
            if (!savedId) {
                if (window.showToast) window.showToast(window._("toast.failed_to_save_note"), "error");
                return;
            }
        }
        
        let blockId = forceBlockId;
        if (!blockId) {
            if (this.state.editingBlock) {
                blockId = this.state.editingBlock.dataset.blockId;
            } else if (this.state.pendingBlockId) {
                blockId = this.state.pendingBlockId;
            }
        }

        if (window.openParentStickers) {
            window.openParentStickers('dialectics', this.state.currentNoteId, blockId);
        }
    }

    async saveAndPin() {
        const title = this.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        let html = this.editor.getHTML() || (this.dom.dashboardTextarea?.value.replace(/\n/g, '<br>') || "");

        const payload = {
            title,
            blocks: [{ side: 'left', html }],
            is_pinned: true,
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        if (this.state.currentNoteId) {
            payload.id = this.state.currentNoteId;
        }

        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            window.showToast(window._("toast.saved_and_pinned"), "success");
            this.close();
            setTimeout(() => location.reload(), 500);
        }
    }

    async loadNoteToEditor(id, addToHistory = true) {
        const n = await DialecticsAPI.get(id);
        if (n) {
            if (addToHistory && this.state.currentNoteId && this.state.currentNoteId !== n.id) {
                const history = this.getNoteHistory();
                if (history.length === 0 || history[history.length - 1] !== this.state.currentNoteId) {
                    history.push(this.state.currentNoteId);
                    this.saveNoteHistory(history);
                }
            }
            this.state.currentNoteId = n.id;
            localStorage.setItem('dialectics_last_note_id', n.id);
            this.dom.title.value = n.title;
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;

            if (this.dom.categorySelect) {
                this.dom.categorySelect.value = n.category_id || "";
            }

            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());

            this._revealInterface();
            this.hideLoadModal();
            if (this.dom.deleteBtn) {
                this.dom.deleteBtn.style.display = (n.title === "Example Note" || n.title === "Пример конспекта" || n.title === "Конспект мысалы") ? 'none' : 'block';
            }

            // Sync URL query parameter
            const url = new URL(window.location);
            if (url.searchParams.get('id') !== String(n.id)) {
                url.searchParams.set('id', n.id);
                window.history.pushState({}, '', url);
            }
        } else {
            // Note not found (e.g. deleted), clear stored id and show empty
            localStorage.removeItem('dialectics_last_note_id');
            this._revealInterface();
        }
    }

    async loadExample() {
        DialecticsUI.setLoading(this.dom.canvas);
        try {
            const response = await fetch('/api/dialectics/example/get_or_create_id');
            if (response.ok) {
                const data = await response.json();
                if (data && data.id) {
                    await this.loadNoteToEditor(data.id);
                    window.showToast(window._("toast.opened_existing_example_note") || "Example Note loaded", "info");
                }
            } else {
                console.error("Failed to load example note ID.");
                DialecticsUI.clearLoading(this.dom.canvas);
            }
        } catch (e) {
            console.error(e);
            DialecticsUI.clearLoading(this.dom.canvas);
        }
    }

    async createNewNote() {
        if (this.state.isDirty) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_new_msg') : "Есть несохранённые изменения. Создать новый конспект?",
                icon: '⚠️',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.create_btn') : 'Создать', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (confirmed) {
                this.state.isDirty = false;
                this._resetToNewNote();
            }
        } else {
            this._resetToNewNote();
        }
    }

    _resetToNewNote() {
        if (this.state.currentNoteId) {
            const history = this.getNoteHistory();
            if (history.length === 0 || history[history.length - 1] !== this.state.currentNoteId) {
                history.push(this.state.currentNoteId);
                this.saveNoteHistory(history);
            }
        }
        this.state.currentNoteId = null;
        localStorage.removeItem('dialectics_last_note_id');
        if (this.dom.title) this.dom.title.value = "";
        if (this.dom.categorySelect) this.dom.categorySelect.value = "";
        if (this.dom.canvas) BlockManager.render(this.dom.canvas, [], this._blockCallbacks());
        if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'none';
        
        // Remove ?id=... query parameter from the URL
        const url = new URL(window.location);
        url.searchParams.delete('id');
        window.history.pushState({}, '', url);
        
        window.showToast(window._("toast.created_a_new_blank_note"), "success");
    }

    getNoteHistory() {
        try {
            const data = sessionStorage.getItem('dialectics_note_history');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveNoteHistory(history) {
        try {
            sessionStorage.setItem('dialectics_note_history', JSON.stringify(history));
        } catch (e) {}
    }

    loadPreviousNote() {
        const history = this.getNoteHistory();
        if (history.length > 0) {
            const prevId = history.pop();
            this.saveNoteHistory(history);
            this.loadNoteToEditor(prevId, false);
            window.showToast(window._("toast.loaded_previous_note"), "info");
        } else {
            window.location.href = '/';
        }
    }
}

export const NoteControllerMixin = {};
Object.getOwnPropertyNames(NoteControllerClass.prototype).forEach(key => {
    if (key !== 'constructor') NoteControllerMixin[key] = NoteControllerClass.prototype[key];
});
