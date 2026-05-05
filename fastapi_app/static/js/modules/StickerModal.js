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
        this.state.noteSource = options.noteSource || null;
        this.state.noteId = null;

        const titleEl = document.getElementById('stickerDetailTitle');
        const ta = document.getElementById('stickerDetailText');
        
        // Reset Modal
        if (titleEl) titleEl.value = '';
        if (ta) ta.value = '';
        
        this.state.type = 'text';
        this.state.color = '#fff9c4';
        
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
        
        // If it's an existing sticker, start in View Mode
        if (this.state.id) {
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
                
                // Add Hint
                const hint = document.createElement('div');
                hint.className = 'sticker-interaction-hint';
                hint.innerText = 'Click items to toggle status';
                container.appendChild(hint);
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
        if (container && contentEl && note) {
            contentEl.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 0.8rem; color: var(--color-text-dark);">${note.category || 'General'}</div>
                    <div style="font-size: 0.8rem; color: var(--color-text-body);">${note.note.substring(0, 80)}...</div>
                </div>
            `;
            container.style.display = 'block';
        } else if (container) {
            container.style.display = 'none';
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
                    location.reload();
                }
                if (typeof window.showToast === 'function') window.showToast('✓ Sticker updated', 'success');
            } else {
                if (this.state.parentType && this.state.parentId) {
                    payload[`${this.state.parentType}_id`] = this.state.parentId;
                }
                const created = await StickerService.save(null, payload);
                
                // If we are in a parent context (like creating a note), 
                // DON'T reload. Just refresh the parent UI if possible.
                if (this.state.parentType === 'note' && window.notesWidget) {
                    console.log("[StickerModal] Refreshing parent note:", this.state.parentId);
                    window.notesWidget.editNote(this.state.parentId); 
                } else {
                    location.reload();
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
    }
}
