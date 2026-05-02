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

        const modalWindow = document.getElementById('modalStickerWindow');
        const titleEl = document.getElementById('modalStickerTitle');
        const ta = document.getElementById('modalStickerTextArea');
        const dateEl = document.getElementById('modalStickerDate');
        const listContainer = document.getElementById('modalStickerListItems');
        const delBtn = document.getElementById('modalStickerDelBtn');
        const addAnotherBtn = document.getElementById('modalStickerAddAnotherBtn');

        // Reset Modal
        if (titleEl) titleEl.value = '';
        if (ta) ta.value = '';
        if (dateEl) dateEl.innerText = this.state.id ? '' : 'New Sticker';
        if (listContainer) listContainer.innerHTML = '';
        
        this.state.type = 'text';
        this.state.color = 'var(--color-sticker-default)';
        
        if (delBtn) delBtn.style.display = this.state.id ? 'block' : 'none';

        if (this.state.id) {
            const el = this.state.element;
            this.state.color = el ? (el.dataset.color || 'var(--color-sticker-default)') : 'var(--color-sticker-default)';
            this.state.type = el ? (el.dataset.type || 'text') : 'text';

            this.switchType(this.state.type);

            try {
                const sticker = await StickerService.getById(this.state.id);
                if (titleEl) titleEl.value = sticker.title || '';
                this.state.color = sticker.color || 'var(--color-sticker-default)';
                this.state.type = sticker.type || 'text';
                
                if (!this.state.parentType) {
                    if (sticker.task_id) { this.state.parentType = 'task'; this.state.parentId = sticker.task_id; }
                    else if (sticker.habit_id) { this.state.parentType = 'habit'; this.state.parentId = sticker.habit_id; }
                    else if (sticker.event_id) { this.state.parentType = 'event'; this.state.parentId = sticker.event_id; }
                    else if (sticker.note_id && sticker.type !== 'note_link') { this.state.parentType = 'note'; this.state.parentId = sticker.note_id; }
                }

                if (sticker.note_id && this.state.parentType !== 'note') {
                    this.state.noteId = sticker.note_id;
                    this.updateAttachedNoteUI(sticker.note);
                } else {
                    const attachedContainer = document.getElementById('modalStickerAttachedNoteContainer');
                    if (attachedContainer) attachedContainer.style.display = 'none';
                }

                if (sticker.type === 'list') {
                    this.renderListItems(sticker.text);
                } else {
                    if (ta) ta.value = sticker.text;
                    this.switchType('text');
                }
            } catch(e) {
                console.error('Error fetching sticker:', e);
            }
        } else {
            this.state.color = options.color || 'var(--color-sticker-default)';
            this.state.type = options.type || 'text';
            
            if (this.state.source === 'header') {
                const hText = document.getElementById('headerStickerText')?.value || '';
                const hTitle = document.getElementById('headerStickerTitle')?.value || '';
                if (titleEl) titleEl.value = hTitle;
                if (this.state.type === 'list' && hText) {
                    this.renderListItems(hText);
                } else {
                    if (ta) ta.value = hText;
                    this.switchType(this.state.type);
                }
            } else {
                this.switchType(this.state.type);
            }
        }

        if (addAnotherBtn) {
            addAnotherBtn.style.display = (this.state.id && this.state.parentId) ? 'block' : 'none';
        }

        if (modalWindow) modalWindow.style.backgroundColor = this.state.color;
        ModalManager.open('stickerDetailModal');
        
        this.updateColorPickerUI();
    }

    static close() {
        ModalManager.close('stickerDetailModal');
        this.state.id = null;
        this.state.element = null;
        this.state.parentType = null;
        this.state.parentId = null;
    }

    static switchType(type) {
        this.state.type = type;
        const txtContainer = document.getElementById('modalStickerTextContainer');
        const lstContainer = document.getElementById('modalStickerListContainer');
        
        if (type === 'text') {
            if (txtContainer) txtContainer.style.display = 'block';
            if (lstContainer) lstContainer.style.display = 'none';
        } else {
            if (txtContainer) txtContainer.style.display = 'none';
            if (lstContainer) lstContainer.style.display = 'block';
        }

        document.querySelectorAll('.type-segment').forEach(s => s.classList.remove('active'));
        if (type === 'text') document.getElementById('btnStickerToText')?.classList.add('active');
        if (type === 'list') document.getElementById('btnStickerToList')?.classList.add('active');
    }

    static renderListItems(jsonText) {
        let data = { items: [] };
        try { data = JSON.parse(jsonText); } catch(e) {}
        const container = document.getElementById('modalStickerListItems');
        if (!container) return;
        
        container.innerHTML = '';
        data.items.forEach((item) => {
            this.addStickerItemInModal(item);
        });
        this.switchType('list');
    }

    static addStickerItemInModal(item = { text: '', done: false }) {
        const container = document.getElementById('modalStickerListItems');
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'modal-list-row';
        row.innerHTML = `
            <input type="checkbox" ${item.done ? 'checked' : ''}>
            <input type="text" class="modal-list-input" value="${item.text.replace(/"/g, '&quot;')}" placeholder="New item...">
            <button class="modal-list-del" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(row);
        if (!item.text) row.querySelector('input[type="text"]').focus();
    }

    static setColor(color, btn) {
        this.state.color = color;
        const modalWindow = document.getElementById('modalStickerWindow');
        if (modalWindow) modalWindow.style.backgroundColor = color;
        if (btn) {
            document.querySelectorAll('#modalStickerColorPicker .color-dot').forEach(d => d.classList.remove('active'));
            btn.classList.add('active');
        }
    }

    static updateColorPickerUI() {
        document.querySelectorAll('#modalStickerColorPicker .color-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.color === this.state.color);
        });
    }

    static updateAttachedNoteUI(note) {
        const container = document.getElementById('modalStickerAttachedNoteContainer');
        const textEl = document.getElementById('attachedNoteText');
        if (container && textEl && note) {
            textEl.innerText = note.note.substring(0, 100) + (note.note.length > 100 ? '...' : '');
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }

    static async save() {
        if (typeof window.showToast === 'function') window.showToast('Saving sticker...', 'info');
        
        let finalText = '';
        if (this.state.type === 'text') {
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
                } else {
                    location.reload();
                }
                if (typeof window.showToast === 'function') window.showToast('✓ Sticker updated', 'success');
            } else {
                if (this.state.parentType === 'note' && this.state.parentId) {
                    payload.note_id = this.state.parentId;
                } else if (this.state.parentType && this.state.parentId) {
                    payload[`${this.state.parentType}_id`] = this.state.parentId;
                }
                
                await StickerService.save(null, payload);
                if (this.state.source === 'parent' && typeof window.refreshParentStickers === 'function') {
                    window.refreshParentStickers(this.state.parentType, this.state.parentId);
                } else {
                    location.reload();
                }
                if (typeof window.showToast === 'function') window.showToast('✓ Sticker created', 'success');
            }
            this.close();
        } catch (e) {
            console.error(e);
            if (typeof window.showToast === 'function') window.showToast('⚠ Error: ' + e.message, 'error');
        }
    }
}
