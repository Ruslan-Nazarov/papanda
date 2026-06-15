/**
 * StickerModal.js - Modal orchestration for stickers
 */
import { StickerService } from './StickerService.js';
import { StickerRenderer } from './StickerRenderer.js';
import { ModalManager } from './ModalManager.js';

export class StickerModal {
    static state = {
        id: null,
        color: 'var(--color-sticker-default)',
        type: 'text',
        source: 'global',
        element: null,
        parentType: null,
        parentId: null,
        noteId: null,
        noteSource: null
    };

    static async open(options = {}) {
        this.state.id = options.id || null;
        this.state.element = options.element || (this.state.id ? document.querySelector(`.sticker-thought[data-id="${this.state.id}"]`) : null);
        this.state.source = options.source || (this.state.id ? 'global' : 'parent');
        this.state.parentType = options.parentType || null;
        this.state.parentId = options.parentId || null;
        this.state.secondaryId = options.secondaryId || null;
        this.state.noteSource = options.noteSource || null;
        this.state.noteId = null;
        this.updateAttachedNoteUI(null);

        const titleEl = document.getElementById('stickerDetailTitle');
        const ta = document.getElementById('stickerDetailText');
        
        // Reset Modal
        if (titleEl) titleEl.value = '';
        if (ta) ta.value = '';
        
        this.state.type = 'text';
        this.state.color = '#fff9c4';

        // If drafting for an event, check if there's already a draft sticker and attached note
        if (this.state.source === 'event_editor') {
            const draftText = document.getElementById('editEventStickerText')?.value;
            const draftTitle = document.getElementById('editEventStickerTitle')?.value;
            this.state.type = document.getElementById('editEventStickerType')?.value || 'text';
            this.state.color = document.getElementById('editEventStickerColor')?.value || '#fff9c4';
            
            if (titleEl) titleEl.value = draftTitle || '';
            if (ta) ta.value = draftText || '';

            const draftNoteId = document.getElementById('editEventStickerNoteId')?.value;
            if (draftNoteId) {
                this.state.noteId = parseInt(draftNoteId);
                try {
                    const notes = await StickerService.searchNotes();
                    const note = notes.find(n => n.id === this.state.noteId);
                    if (note) this.updateAttachedNoteUI(note);
                } catch (e) { console.error(e); }
            }
        }
        
        if (this.state.id) {
            try {
                const sticker = await StickerService.getById(this.state.id);
                this.state.rawText = sticker.text || ''; // SOURCE OF TRUTH
                if (titleEl) titleEl.value = sticker.title || '';
                
                // Handle JSON to List Text
                this.state.type = sticker.type || 'text';
                if (ta) ta.value = this.deserializeContent(sticker.text || '', this.state.type);
                
                this.state.color = sticker.color || '#fff9c4';
                
                if (sticker.note_id) {
                    this.state.noteId = sticker.note_id;
                    this.updateAttachedNoteUI(sticker.note);
                }
            } catch(e) {
                console.error('Error fetching sticker:', e);
            }
        }

        this.switchType(this.state.type);
        this.setColor(this.state.color);
        
        // Respect explicit mode, or default based on existence
        if (options.mode) {
            this.setMode(options.mode);
        } else if (this.state.id) {
            this.setMode('view');
        } else {
            this.setMode('edit');
        }
        
        this.updatePreview();
        ModalManager.open('stickerDetailModal');
    }

    static deserializeContent(text, type) {
        if (type !== 'list') return text;
        try {
            const data = JSON.parse(text);
            if (data && data.items) {
                return data.items.map(i => (i.done ? '✓ ' : '') + i.text).join('\n');
            }
        } catch (e) {}
        return text;
    }

    static serializeContent(text, type) {
        if (type !== 'list' || !text) return text;
        const trimmed = text.trim();
        // PROTECTION: If it's already JSON, don't re-serialize it!
        if (trimmed.startsWith('{') && trimmed.includes('"items"')) return trimmed;
        
        const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
        const items = lines.map(line => {
            const trimmed = line.trim();
            // Handle both marks
            const isDone = trimmed.startsWith('✓') || trimmed.startsWith('[x]');
            let content = trimmed;
            if (trimmed.startsWith('✓')) content = trimmed.substring(1).trim();
            else if (trimmed.startsWith('[x]')) content = trimmed.substring(3).trim();
            
            return { text: content, done: isDone };
        });
        return JSON.stringify({ items });
    }

    static setMode(mode) {
        const editor = document.getElementById('stickerModalEditor');
        const viewer = document.getElementById('stickerModalViewer');
        const editBtn = document.getElementById('stickerEditBtn');
        const saveBtn = document.getElementById('stickerSaveBtn');
        const modalTitle = document.getElementById('modalStickerActionTitle');

        if (mode === 'view') {
            if (editor) editor.style.display = 'none';
            if (viewer) viewer.style.display = 'block';
            if (editBtn) editBtn.style.display = 'block';
            if (saveBtn) saveBtn.style.display = 'none';
            if (modalTitle) modalTitle.innerText = 'View Sticker';
        } else {
            if (editor) editor.style.display = 'block';
            if (viewer) viewer.style.display = 'none';
            if (editBtn) editBtn.style.display = 'none';
            if (saveBtn) saveBtn.style.display = 'block';
            if (modalTitle) modalTitle.innerText = this.state.id ? 'Edit Sticker' : 'Create Sticker';
        }
    }

    static updatePreview() {
        const previewContainer = document.getElementById('stickerPreviewContent');
        const previewContainerEdit = document.getElementById('stickerPreviewContentEdit');
        const titleInput = document.getElementById('stickerDetailTitle');
        const textInput = document.getElementById('stickerDetailText');

        const mockSticker = {
            title: titleInput ? titleInput.value.trim() : '',
            text: this.serializeContent(textInput ? textInput.value.trim() : '', this.state.type),
            type: this.state.type,
            color: this.state.color,
            isWidget: false
        };

        const renderPreview = (container, isLarge = false) => {
            if (!container) return;
            const rendered = StickerRenderer.createStickerElement(mockSticker, { 
                isWidget: false, // PREVIEW IS ALWAYS FULL
                onClick: (e) => e.stopPropagation(),
                additionalClasses: isLarge ? ['large', 'modal-preview'] : ['modal-preview']
            });
            
            container.innerHTML = '';
            container.appendChild(rendered);

            // Allow interactions in Viewer (isLarge)
            if (isLarge) {
                rendered.classList.add('interactive-preview');
                rendered.onclick = (e) => this.handlePreviewClick(e);
            } else {
                rendered.style.pointerEvents = 'none';
            }
        };

        renderPreview(previewContainer, true); // Large for viewer
        renderPreview(previewContainerEdit, false); // Normal for editor
    }

    static switchType(type) {
        this.state.type = type;
        document.querySelectorAll('.type-segment').forEach(s => s.classList.remove('active'));
        if (type === 'text') document.getElementById('type-text')?.classList.add('active');
        if (type === 'list') document.getElementById('type-list')?.classList.add('active');
        this.updatePreview();
    }

    static async handlePreviewClick(e) {
        if (this.state.type !== 'list') return;
        const item = e.target.closest('.sticker-list-item');
        if (!item) return;

        const index = parseInt(item.dataset.index);
        if (isNaN(index)) return;

        // Use state.rawText directly (it should already be JSON or raw text)
        let data;
        try {
            data = JSON.parse(this.state.rawText);
        } catch (e) {
            // If not JSON, convert to JSON structure first
            data = JSON.parse(this.serializeContent(this.state.rawText, 'list'));
        }

        if (data && data.items && data.items[index]) {
            data.items[index].done = !data.items[index].done;
            
            const newJson = JSON.stringify(data);
            this.state.rawText = newJson; // Update local state
            
            // Sync editor field
            const textInput = document.getElementById('stickerDetailText');
            if (textInput) textInput.value = this.deserializeContent(newJson, 'list');
            
            this.updatePreview();
            
            // Background save - it's safe now because we use state.rawText
            if (this.state.id) {
                await this.save({ close: false, overrideText: newJson });
            }
        }
    }

    static setColor(color, btn) {
        this.state.color = color;
        this.updatePreview();
        
        document.querySelectorAll('.color-swatch').forEach(sw => {
            sw.classList.toggle('active', sw.dataset.color === color);
        });
    }

    static updateAttachedNoteUI(note) {
        const container = document.getElementById('stickerNoteSection');
        const contentEl = document.getElementById('attachedNoteContent');
        const attachBtnGroup = document.getElementById('stickerAttachNoteBtnGroup');
        if (container && contentEl && note) {
            contentEl.innerHTML = `
                <div style="flex: 1; text-align: left;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--color-primary);">${note.category || 'General'}</div>
                    <div style="font-size: 0.8rem; color: var(--color-text-body); line-height: 1.4;">${note.note.substring(0, 80)}...</div>
                </div>
                <button type="button" class="btn-close" style="background: none; border: none; font-size: 1.2em; cursor: pointer; color: var(--color-error); padding: 4px; display: flex; align-items: center; justify-content: center;" onclick="removeNoteFromSticker()" title="Detach Note">&times;</button>
            `;
            container.style.display = 'block';
            if (attachBtnGroup) attachBtnGroup.style.display = 'none';
        } else {
            if (container) container.style.display = 'none';
            if (attachBtnGroup) attachBtnGroup.style.display = 'block';
        }
    }

    static async save(options = {}) {
        const shouldClose = options.close !== false;
        const titleEl = document.getElementById('stickerDetailTitle');
        const textEl = document.getElementById('stickerDetailText');
        const finalTitle = titleEl ? titleEl.value.trim() : '';
        
        let finalText;
        if (options.overrideText) {
            finalText = options.overrideText;
        } else {
            const rawText = textEl ? textEl.value.trim() : '';
            finalText = this.serializeContent(rawText, this.state.type);
        }

        // Header Sticker Bridge
        if (this.state.source === 'header') {
            const hText = document.getElementById('headerStickerText');
            const hTitle = document.getElementById('headerStickerTitle');
            const hColor = document.getElementById('headerStickerColor');
            const hType = document.getElementById('headerStickerType');
            
            if (hText) hText.value = finalText;
            if (hTitle) hTitle.value = finalTitle;
            if (hColor) hColor.value = this.state.color;
            if (hType) hType.value = this.state.type;
            
            if (typeof window.updateHeaderStickerUI === 'function') {
                window.updateHeaderStickerUI(finalText.length > 0 || finalTitle.length > 0);
            }
            this.close();
            return;
        }

        // Event Editor Bridge
        if (this.state.source === 'event_editor') {
            const eText = document.getElementById('editEventStickerText');
            const eTitle = document.getElementById('editEventStickerTitle');
            const eColor = document.getElementById('editEventStickerColor');
            const eType = document.getElementById('editEventStickerType');
            const eNoteId = document.getElementById('editEventStickerNoteId');

            if (eText) eText.value = finalText;
            if (eTitle) eTitle.value = finalTitle;
            if (eColor) eColor.value = this.state.color;
            if (eType) eType.value = this.state.type;
            if (eNoteId) eNoteId.value = this.state.noteId || '';

            if (window.EventService && window.EventService.updateDraftStickerUI) {
                const hasDraft = (finalText.length > 0 || finalTitle.length > 0 || (this.state.noteId !== null && this.state.noteId !== undefined));
                window.EventService.updateDraftStickerUI(hasDraft);
            }
            this.close();
            return;
        }

        // Note Modal Bridge
        if (this.state.source === 'note_modal') {
            const source = this.state.noteSource;
            let prefix = 'widgetNote';
            if (source === 'expand') prefix = 'expandNote';
            else if (source === 'dialectics') prefix = 'dialectics';
            
            const textEl = document.getElementById(prefix + 'StickerText');
            const titleEl = document.getElementById(prefix + 'StickerTitle');
            const colorEl = document.getElementById(prefix + 'StickerColor');
            const typeEl = document.getElementById(prefix + 'StickerType');

            if (textEl) textEl.value = finalText;
            if (titleEl) titleEl.value = finalTitle;
            if (colorEl) colorEl.value = this.state.color;
            if (typeEl) typeEl.value = this.state.type;
            
            if (typeof window.updateNoteStickerUI === 'function') {
                window.updateNoteStickerUI(finalText.length > 0 || finalTitle.length > 0, source);
            }
            this.close();
            return;
        }

        const payload = {
            text: finalText,
            title: finalTitle || null,
            color: this.state.color,
            type: this.state.type,
            note_id: this.state.noteId
        };

        try {
                if (this.state.id) {
                    const updated = await StickerService.save(this.state.id, payload);
                    if (this.state.element) {
                        const isWidget = !!document.getElementById('corkboard')?.contains(this.state.element);
                        const newEl = StickerRenderer.createStickerElement(updated, { isWidget: isWidget });
                        this.state.element.parentNode.replaceChild(newEl, this.state.element);
                        
                        // Update state to point to the new element
                        this.state.element = newEl;
                    } else {
                        if (typeof window.refreshDashboardStickers === 'function') window.refreshDashboardStickers();
                        else if (!this.state.parentType) location.reload();
                    }
                    
                    window.dispatchEvent(new CustomEvent('stickersUpdated', { 
                        detail: { parentType: this.state.parentType, parentId: this.state.parentId } 
                    }));
                    
                if (typeof window.showToast === 'function') window.showToast('✓ Sticker updated', 'success');
            } else {
                if (this.state.parentType && this.state.parentId) {
                    const parsedId = parseInt(this.state.parentId, 10);
                    if (!isNaN(parsedId)) {
                        payload[`${this.state.parentType}_id`] = parsedId;
                    } else {
                        payload[`${this.state.parentType}_id`] = this.state.parentId; // fallback for non-integer IDs if any
                    }
                    if (this.state.parentType === 'event' && this.state.secondaryId) {
                        payload.recurrence_id = this.state.secondaryId;
                    }
                    if (this.state.parentType === 'dialectics' && this.state.secondaryId) {
                        payload.dialectics_block_id = String(this.state.secondaryId);
                    }
                } else {
                    // Fallback: If state was somehow lost, try to detect open parent modals in the DOM
                    const detailEventId = document.getElementById('detailEventId')?.value;
                    const editEventId = document.getElementById('editEventId')?.value;
                    const fallbackEventId = detailEventId || editEventId;

                    const editTaskId = document.getElementById('editTaskId')?.value;
                    const editHabitId = document.getElementById('editHabitId')?.value;
                    const editNoteId = document.getElementById('editNoteId')?.value;

                    if (fallbackEventId) {
                        payload['event_id'] = parseInt(fallbackEventId, 10);
                        const detailRecId = document.getElementById('detailEventRecId')?.value;
                        const editRecId = document.getElementById('editEventRecId')?.value;
                        const fallbackRecId = detailRecId || editRecId;
                        if (fallbackRecId) {
                            payload['recurrence_id'] = fallbackRecId;
                        }
                    } else if (editTaskId) {
                        payload['task_id'] = parseInt(editTaskId, 10);
                    } else if (editHabitId) {
                        payload['habit_id'] = parseInt(editHabitId, 10);
                    } else if (editNoteId) {
                        payload['note_id'] = parseInt(editNoteId, 10);
                    }
                }
                
                console.log("[StickerModal] Saving new sticker with payload:", payload);
                const created = await StickerService.save(null, payload);
                
                // Dispatch event so any listening page can update its UI
                window.dispatchEvent(new CustomEvent('stickersUpdated', { 
                    detail: { parentType: this.state.parentType, parentId: this.state.parentId } 
                }));
                
                // If we are in a parent context (like creating a note), 
                // DON'T reload. Just refresh the parent UI if possible.
                if (this.state.parentType === 'note' && window.notesWidget) {
                    console.log("[StickerModal] Refreshing parent note:", this.state.parentId);
                    window.notesWidget.editNote(this.state.parentId); 
                } else {
                    if (typeof window.refreshDashboardStickers === 'function') window.refreshDashboardStickers();
                    else if (!this.state.parentType) location.reload();
                }
            }
            if (shouldClose) this.close();
        } catch (e) {
            console.error(e);
            if (typeof window.showToast === 'function') window.showToast('⚠ Error: ' + e.message, 'error');
        }
    }

    static close() {
        ModalManager.close('stickerDetailModal');
        this.state.id = null;
        this.state.element = null;
        this.state.parentType = null;
        this.state.parentId = null;
        this.state.secondaryId = null;
    }
}
