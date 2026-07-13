import { DialecticsAPI } from './api.js';
import { BlockManager, COLOR_PRESETS } from './BlockManager.js';
import { customConfirm, customChoice, customPrompt } from '../modal_controller.js';
import { DialecticsUI } from './ui_utils.js';

class BlocksOrchestratorClass {
    // --- Core Logic ---
    open(content = '') {
        if (this.state.editingBlock) {
            const block = this.state.editingBlock;
            const titleText = this.state.originalTitle || block.dataset.title || "";
            this.createFloatingEditor(block, content, titleText, this.state.isExpanded);
        } else {
            const blockId = 'new_block_' + (this.state.pendingSide || 'left');
            const dummyBlock = {
                dataset: {
                    id: blockId,
                    side: this.state.pendingSide || 'left',
                    role: this.state.pendingRole || undefined
                }
            };
            const titleText = this.state.originalTitle || "";
            this.createFloatingEditor(dummyBlock, content, titleText, this.state.isExpanded);
        }
    }

    createFloatingEditor(block, content, title, fullscreen = false) {
        const template = document.getElementById('inlineEditor');
        if (template) {
            template.style.display = 'none';
        }

        const blockId = block.dataset ? (block.dataset.id || block.dataset.blockId) : (block.id || 'new_block');

        let win = document.querySelector(`.dialectics-floating-editor[data-block-id="${blockId}"]`);
        if (win) {
            this.bringToFront(win);
            if (win._tiptapEditor) {
                win._tiptapEditor.commands.setContent(content);
            }
            return win;
        }

        win = template.cloneNode(true);
        win.removeAttribute('id');
        win.classList.add('dialectics-floating-editor');
        win.dataset.blockId = blockId;

        const openCount = document.querySelectorAll('.dialectics-floating-editor').length;
        const offsetX = 40 + (openCount * 30);
        const offsetY = 120 + (openCount * 25);
        win.style.left = `${offsetX}px`;
        win.style.top = `${offsetY}px`;
        win.style.position = 'fixed';
        win.style.display = 'flex';
        win.style.zIndex = String(this.getNextZIndex());

        document.body.appendChild(win);

        const dragHandle = win.querySelector('.editor-drag-handle');
        if (dragHandle) {
            dragHandle.removeAttribute('id');
            DialecticsUI.setupDraggable(win, dragHandle, this.state);
        }
        const resizeHandle = win.querySelector('#editorResizeHandle') || win.querySelector('.editor-resize-handle');
        if (resizeHandle) {
            resizeHandle.removeAttribute('id');
            DialecticsUI.setupResizable(win, resizeHandle);
        }

        const tiptapEl = win.querySelector('#tiptap-editor');
        if (tiptapEl) {
            tiptapEl.removeAttribute('id');
            tiptapEl.classList.add('tiptap-editor');
        }

        const titleInput = win.querySelector('#editorBlockTitleInput');
        if (titleInput) {
            titleInput.removeAttribute('id');
            titleInput.classList.add('editor-block-title-input');
            titleInput.value = title || "";
            titleInput.addEventListener('input', () => {
                this.state.isDirty = true;
                this.saveAllEditorsState();
            });
        }

        const stickerBtn = win.querySelector('#dialecticsStickerBtn');
        if (stickerBtn) {
            stickerBtn.removeAttribute('id');
            stickerBtn.onclick = (e) => {
                e.stopPropagation();
                if (window.app) window.app.openStickersForCurrent(blockId);
            };
        }

        const expandBtn = win.querySelector('#btnEditorExpand');
        if (expandBtn) {
            expandBtn.removeAttribute('id');
            expandBtn.onclick = () => {
                win.classList.toggle('expanded');
                this.saveAllEditorsState();
            };
        }

        const closeBtn = win.querySelector('#btnEditorClose');
        if (closeBtn) {
            closeBtn.removeAttribute('id');
            closeBtn.onclick = async () => {
                await this.closeFloatingEditor(block);
            };
        }

        const saveBtn = win.querySelector('#btnEditorSave') || win.querySelector('.btn-primary');
        if (saveBtn) {
            saveBtn.removeAttribute('id');
            saveBtn.onclick = async () => {
                await this.saveFloatingEditor(block);
            };
        }

        this.setupWindowTabs(win);

        const editorInstance = this.editor.createEditor(
            tiptapEl,
            content,
            // onFocus:
            () => {
                this.editor.tiptap = editorInstance;
                if (blockId.startsWith('new_block')) {
                    this.state.editingBlock = null;
                } else {
                    this.state.editingBlock = block;
                }
                this.bringToFront(win);

                const formatToolbarEl = document.getElementById('editorFormattingToolbar');
                if (formatToolbarEl) {
                    const dragHandleControls = win.querySelector('.editor-header-controls');
                    if (dragHandleControls && !dragHandleControls.contains(formatToolbarEl)) {
                        dragHandleControls.parentNode.insertBefore(formatToolbarEl, dragHandleControls);
                        formatToolbarEl.style.marginLeft = '20px';
                        formatToolbarEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        formatToolbarEl.style.border = '1px solid #e2e8f0';
                        formatToolbarEl.style.padding = '2px 8px';
                        formatToolbarEl.style.display = 'flex';
                    }
                }
            },
            // onUpdate:
            () => {
                this.state.isDirty = true;
                this.saveAllEditorsState();
            }
        );

        win._tiptapEditor = editorInstance;
        block._floatingEditorWindow = win;
        block._tiptapEditor = editorInstance; // Bind it to block element as well

        this.switchWindowTab(win, 'text');

        if (fullscreen) {
            win.classList.add('expanded');
        }

        this.saveAllEditorsState();
        return win;
    }

    setupWindowTabs(win) {
        const tabsContainer = win.querySelector('.editor-tabs');
        if (!tabsContainer) return;
        
        tabsContainer.removeAttribute('id');
        const tabs = tabsContainer.querySelectorAll('.editor-tab');
        tabs.forEach(tab => {
            tab.removeAttribute('id');
            tab.onclick = () => {
                this.switchWindowTab(win, tab.dataset.tab);
            };
        });
    }

    async switchWindowTab(win, tabId) {
        win.querySelectorAll('.editor-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tabId));
        win.querySelectorAll('.tab-content').forEach(el => {
            const isTarget = el.id === `editor-${tabId}` || el.classList.contains(`editor-${tabId}`) || el.classList.contains(`tab-content-${tabId}`);
            if (el.id === `editor-${tabId}`) {
                el.removeAttribute('id');
                el.classList.add(`tab-content-${tabId}`);
            }
            el.classList.toggle('active', isTarget);
            el.style.display = isTarget ? 'flex' : 'none';
        });

        if (tabId === 'text') {
            if (this.editor) {
                await this.editor.init();
            }
        }
    }

    bringToFront(win) {
        const activeEditors = Array.from(document.querySelectorAll('.dialectics-floating-editor'));
        if (activeEditors.length <= 1) return;
        
        let maxZ = 10000;
        activeEditors.forEach(el => {
            const z = parseInt(el.style.zIndex) || 10000;
            if (z > maxZ) maxZ = z;
        });
        
        if (parseInt(win.style.zIndex) < maxZ) {
            win.style.zIndex = String(maxZ + 1);
        }
    }

    getNextZIndex() {
        const activeEditors = Array.from(document.querySelectorAll('.dialectics-floating-editor'));
        let maxZ = 10000;
        activeEditors.forEach(el => {
            const z = parseInt(el.style.zIndex) || 10000;
            if (z > maxZ) maxZ = z;
        });
        return maxZ + 1;
    }

    async closeFloatingEditor(block) {
        const blockId = block.dataset ? (block.dataset.id || block.dataset.blockId) : (block.id || 'new_block');
        const win = document.querySelector(`.dialectics-floating-editor[data-block-id="${blockId}"]`);
        if (!win) return;

        if (this.state.isDirty) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title', 'Внимание') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_msg', 'Есть несохранённые изменения. Продолжить?') : "Есть несохранённые изменения. Продолжить?",
                icon: '',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel', 'Отмена') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.continue_btn', 'Продолжить') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (!confirmed) return;
        }

        this.destroyFloatingEditorWindow(win, block);
    }

    destroyFloatingEditorWindow(win, block) {
        if (win._tiptapEditor) {
            try {
                win._tiptapEditor.destroy();
            } catch(e) {}
        }

        const formatToolbarEl = document.getElementById('editorFormattingToolbar');
        const originalToolbarParent = document.getElementById('editorDragHandle');
        if (formatToolbarEl && win.contains(formatToolbarEl) && originalToolbarParent) {
            originalToolbarParent.appendChild(formatToolbarEl);
            formatToolbarEl.style.marginLeft = '20px';
            formatToolbarEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            formatToolbarEl.style.border = '1px solid #e2e8f0';
            formatToolbarEl.style.padding = '2px 8px';
            formatToolbarEl.style.display = 'none';
        }

        win.remove();

        if (block) {
            delete block._floatingEditorWindow;
            delete block._tiptapEditor;
        }

        this.saveAllEditorsState();
    }

    async saveFloatingEditor(block) {
        const blockId = block.dataset ? (block.dataset.id || block.dataset.blockId) : (block.id || 'new_block');
        const win = document.querySelector(`.dialectics-floating-editor[data-block-id="${blockId}"]`);
        if (!win) return;

        const titleInput = win.querySelector('.editor-block-title-input');
        const customTitle = titleInput ? titleInput.value.trim() : "";
        const html = win._tiptapEditor ? win._tiptapEditor.getHTML() : "";

        if (!blockId.startsWith('new_block') && block.dataset) {
            if (customTitle) {
                block.dataset.title = customTitle;
            } else {
                delete block.dataset.title;
            }
            const inner = block.querySelector('.dialectics-content-inner');
            if (inner) {
                inner.innerHTML = html;
            }

            this.state.editingBlock = block;
            const globalTitleInput = document.getElementById('editorBlockTitleInput');
            if (globalTitleInput) {
                globalTitleInput.value = customTitle;
            }
            if (this.editor && this.editor.tiptap) {
                this.editor.tiptap.commands.setContent(html);
            }

            await this.saveGlobal(false);
            this.state.editingBlock = null;

            // Re-render blocks to update title in DOM
            const blocks = BlockManager.getBlocks(this.dom.canvas);
            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
        } else {
            if (html !== '<p></p>' && html.trim() !== '') {
                const currentBlocks = BlockManager.getBlocks(this.dom.canvas);
                const newBlock = { 
                    id: this.state.pendingBlockId || ('block_' + Math.random().toString(36).substring(2, 9)), 
                    side: this.state.pendingSide || 'left', 
                    html,
                    title: customTitle || undefined
                };
                if (this.state.pendingRole) {
                    newBlock.role = this.state.pendingRole;
                }
                let newBlocks;
                if (this.state.insertAfterIndex !== null) {
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
                await this.saveGlobal(false);
            }
        }

        this.destroyFloatingEditorWindow(win, block);
    }

    saveAllEditorsState() {
        try {
            const states = [];
            const floatingWins = Array.from(document.querySelectorAll('.dialectics-floating-editor'));
            floatingWins.forEach(win => {
                const blockId = win.dataset.blockId;
                const titleInput = win.querySelector('.editor-block-title-input');
                const title = titleInput ? titleInput.value : "";
                const content = win._tiptapEditor ? win._tiptapEditor.getHTML() : "";
                
                states.push({
                    blockId: blockId,
                    title: title,
                    content: content,
                    isExpanded: win.classList.contains('expanded'),
                    styleLeft: win.style.left,
                    styleTop: win.style.top,
                    styleWidth: win.style.width,
                    styleHeight: win.style.height
                });
            });
            localStorage.setItem('papanda_multiple_editors_state', JSON.stringify(states));
        } catch(e) {}
    }

    cleanUpInlineEdit() {
        this.cleanUpAllInlineEditors();
    }

    cleanUpAllInlineEditors() {
        if (this.dom.canvas) {
            const editingBlocks = Array.from(this.dom.canvas.querySelectorAll('.dialectics-block.is-editing'));
            editingBlocks.forEach(block => {
                this.cleanUpInlineEditForBlock(block);
            });
        }
    }

    cleanUpInlineEditForBlock(block) {
        if (!block) return;
        
        if (block._tiptapEditor) {
            try {
                block._tiptapEditor.destroy();
            } catch(e) {}
            block._tiptapEditor = null;
        }

        // Return formatting toolbar to its default global parent if it was inside this block
        const formatToolbarEl = document.getElementById('editorFormattingToolbar');
        const originalToolbarParent = document.getElementById('editorDragHandle');
        const inlineContainer = block.querySelector('.dialectics-inline-editor-container');
        if (formatToolbarEl && inlineContainer && inlineContainer.contains(formatToolbarEl) && originalToolbarParent) {
            originalToolbarParent.appendChild(formatToolbarEl);
            formatToolbarEl.style.marginLeft = '20px';
            formatToolbarEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            formatToolbarEl.style.border = '1px solid #e2e8f0';
            formatToolbarEl.style.padding = '2px 8px';
            formatToolbarEl.style.display = 'none';
        }

        block.classList.remove('is-editing');
        if (inlineContainer) {
            inlineContainer.remove();
        }

        if (this.state.editingBlock === block) {
            this.state.editingBlock = null;
        }
    }

    async saveInlineEdit() {
        if (this.state.editingBlock) {
            await this.saveInlineEditForBlock(this.state.editingBlock);
        }
    }

    async saveInlineEditForBlock(block) {
        if (!block) return;

        const inlineContainer = block.querySelector('.dialectics-inline-editor-container');
        let newTitle = block._originalTitle;
        if (inlineContainer) {
            const inlineTitleInput = inlineContainer.querySelector('.inline-title-input');
            if (inlineTitleInput) {
                newTitle = inlineTitleInput.value.trim();
            }
        }

        const newHtml = block._tiptapEditor ? block._tiptapEditor.getHTML() : (block._originalHtml || "");

        this.cleanUpInlineEditForBlock(block);

        // Update block title and content directly in DOM
        if (newTitle) {
            block.dataset.title = newTitle;
        } else {
            delete block.dataset.title;
        }
        const inner = block.querySelector('.dialectics-content-inner');
        if (inner) {
            inner.innerHTML = newHtml;
        }

        // Temporarily set editingBlock for saveGlobal
        this.state.editingBlock = block;
        await this.saveGlobal(false);
        this.state.editingBlock = null;

        // Re-render blocks
        const blocks = BlockManager.getBlocks(this.dom.canvas);
        BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
    }

    cancelInlineEdit() {
        if (this.state.editingBlock) {
            this.cancelInlineEditForBlock(this.state.editingBlock);
        }
    }

    cancelInlineEditForBlock(block) {
        if (!block) return;

        const inner = block.querySelector('.dialectics-content-inner');
        if (inner && block._originalHtml !== undefined) {
            inner.innerHTML = block._originalHtml;
        }
        if (block._originalTitle !== undefined) {
            block.dataset.title = block._originalTitle;
        }

        this.cleanUpInlineEditForBlock(block);

        // Re-render blocks
        const blocks = BlockManager.getBlocks(this.dom.canvas);
        BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
    }

    detachInlineEdit(fullscreen = false) {
        if (this.state.editingBlock) {
            this.detachInlineEditForBlock(this.state.editingBlock, fullscreen);
        }
    }

    detachInlineEditForBlock(block, fullscreen = false) {
        if (!block) return;

        const currentHtml = block._tiptapEditor ? block._tiptapEditor.getHTML() : (block._originalHtml || "");
        const inlineContainer = block.querySelector('.dialectics-inline-editor-container');
        let currentTitle = block._originalTitle || "";
        if (inlineContainer) {
            const inlineTitleInput = inlineContainer.querySelector('.inline-title-input');
            if (inlineTitleInput) {
                currentTitle = inlineTitleInput.value;
            }
        }

        this.cleanUpInlineEditForBlock(block);

        this.createFloatingEditor(block, currentHtml, currentTitle, fullscreen);
    }

    async openEdit(block) {
        // Guard: if this block is already open in the editor, do nothing
        if (block.classList.contains('is-editing')) {
            return;
        }

        // Close modal editor if open
        if (this.dom.editor) {
            this.dom.editor.style.display = 'none';
        }
        if (this.dom.backdrop) {
            this.dom.backdrop.style.display = 'none';
        }

        this.state.isDirty = false;
        
        block.classList.add('is-editing');
        
        let inlineContainer = block.querySelector('.dialectics-inline-editor-container');
        if (!inlineContainer) {
            inlineContainer = document.createElement('div');
            inlineContainer.className = 'dialectics-inline-editor-container';
            const contentInner = block.querySelector('.dialectics-content-inner');
            if (contentInner) {
                contentInner.after(inlineContainer);
            } else {
                block.appendChild(inlineContainer);
            }
        }

        const titleText = block.dataset.title || "";
        const html = block.querySelector('.dialectics-content-inner')?.innerHTML || "<p></p>";

        block._originalHtml = html;
        block._originalTitle = titleText;

        inlineContainer.innerHTML = `
            <div class="inline-edit-toolbar" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 12px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; border-top-left-radius:12px; border-top-right-radius:12px; gap:8px;">
                <div class="inline-format-placeholder" style="display:flex; align-items:center; gap:4px;"></div>
                <div style="display:flex; align-items:center; gap:6px; margin-left:auto;">
                    <button type="button" class="btn-inline-action btn-inline-detach" title="Открыть в отдельном окне" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px 6px; border-radius:6px; transition:background 0.15s; display:flex; align-items:center; justify-content:center;">↗️</button>
                    <button type="button" class="btn-inline-action btn-inline-fullscreen" title="Во весь экран" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px 6px; border-radius:6px; transition:background 0.15s; display:flex; align-items:center; justify-content:center;">⛶</button>
                    <span style="width:1px; height:16px; background:#cbd5e1; margin:0 2px;"></span>
                    <button type="button" class="btn-inline-action btn-inline-save" title="Сохранить" style="background:#10b981; border:none; color:white; font-weight:600; cursor:pointer; font-size:0.85rem; padding:6px 12px; border-radius:8px; transition:opacity 0.15s;">OK</button>
                    <button type="button" class="btn-inline-action btn-inline-cancel" title="Отмена" style="background:#ef4444; border:none; color:white; font-weight:600; cursor:pointer; font-size:0.85rem; padding:6px 12px; border-radius:8px; transition:opacity 0.15s;">Отмена</button>
                </div>
            </div>
            <div class="inline-edit-title-row" style="padding: 10px 14px; display:flex; align-items:center; gap:8px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                <span style="font-size:0.85rem; font-weight:600; color:#475569;">Заголовок:</span>
                <input type="text" class="inline-title-input" value="${titleText}" placeholder="Введите заголовок блока..." style="flex-grow:1; padding:6px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; font-family:inherit; outline:none; transition:border 0.15s;">
            </div>
            <div class="inline-tiptap-wrapper">
                <div class="block-tiptap-editor"></div>
            </div>
        `;

        const detachBtn = inlineContainer.querySelector('.btn-inline-detach');
        const fullscreenBtn = inlineContainer.querySelector('.btn-inline-fullscreen');
        [detachBtn, fullscreenBtn].forEach(btn => {
            if (btn) {
                btn.onmouseenter = () => btn.style.background = '#e2e8f0';
                btn.onmouseleave = () => btn.style.background = 'none';
            }
        });

        const blockTiptapEl = inlineContainer.querySelector('.block-tiptap-editor');

        const editorInstance = this.editor.createEditor(
            blockTiptapEl,
            html,
            // onFocus:
            () => {
                const formatToolbarEl = document.getElementById('editorFormattingToolbar');
                if (formatToolbarEl) {
                    const placeholder = inlineContainer.querySelector('.inline-format-placeholder');
                    if (placeholder && !placeholder.contains(formatToolbarEl)) {
                        placeholder.appendChild(formatToolbarEl);
                        formatToolbarEl.style.marginLeft = '0';
                        formatToolbarEl.style.boxShadow = 'none';
                        formatToolbarEl.style.border = 'none';
                        formatToolbarEl.style.padding = '0';
                        formatToolbarEl.style.display = 'flex';
                    }
                }
                this.state.editingBlock = block;
            },
            // onUpdate:
            () => {
                this.state.isDirty = true;
            }
        );

        block._tiptapEditor = editorInstance;

        const inlineTitleInput = inlineContainer.querySelector('.inline-title-input');
        inlineTitleInput.addEventListener('input', (e) => {
            this.state.isDirty = true;
        });

        inlineContainer.querySelector('.btn-inline-save').onclick = async (e) => {
            e.stopPropagation();
            await this.saveInlineEditForBlock(block);
        };
        inlineContainer.querySelector('.btn-inline-cancel').onclick = (e) => {
            e.stopPropagation();
            this.cancelInlineEditForBlock(block);
        };
        inlineContainer.querySelector('.btn-inline-detach').onclick = (e) => {
            e.stopPropagation();
            this.detachInlineEditForBlock(block, false);
        };
        inlineContainer.querySelector('.btn-inline-fullscreen').onclick = (e) => {
            e.stopPropagation();
            this.detachInlineEditForBlock(block, true);
        };
    }

    async openEditAltCard(altCardEl, blockEl) {
        if (this.state.isDirty && (this.state.editingBlock !== blockEl || this.state.editingAltCard !== altCardEl)) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title', 'Внимание') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_msg', 'Есть несохранённые изменения. Продолжить?') : "Есть несохранённые изменения. Продолжить?",
                icon: '',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel', 'Отмена') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.continue_btn', 'Продолжить') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (!confirmed) return;
        }
        this.state.isDirty = false;
        this.state.editingBlock = blockEl;
        this.state.editingAltCard = altCardEl;
        const html = altCardEl.querySelector('.dialectics-content-inner')?.innerHTML || "";
        const titleInput = document.getElementById('editorBlockTitleInput');
        if (titleInput) {
            const titleSpan = altCardEl.querySelector('.alt-title');
            titleInput.value = titleSpan ? titleSpan.innerText : "";
        }
        this.open(html);
    }

    async close(confirmIfDirty = true) {
        // Prevent re-entrant calls while confirm dialog is open
        if (this._isClosing) return;
        this._isClosing = true;

        if (confirmIfDirty && this.state.isDirty) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title', 'Внимание') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_msg', 'Есть несохранённые изменения. Продолжить?') : "Есть несохранённые изменения. Продолжить?",
                icon: '',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel', 'Отмена') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.continue_btn', 'Продолжить') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (!confirmed) {
                this._isClosing = false;
                return;
            }
        }

        // Clean up inline editing UI just in case
        if (typeof this.cleanUpInlineEdit === 'function') {
            this.cleanUpInlineEdit();
        }

        // Reset isDirty BEFORE setContent('') to prevent TipTap's onUpdate
        // from re-flagging dirty=true after we've already cleared it
        this.state.isDirty = false;
        this.state.editingBlock = null;
        this.state.editingAltCard = null;
        this.state.pendingSide = null;
        this.state.pendingRole = null;
        this.state.pendingBlockId = null;
        this.state.insertAfterIndex = null;

        // Reset expanded mode
        this.state.isExpanded = false;

        // Clear content before hiding to avoid stale TipTap state
        this.editor.setContent('');

        if (this.dom.editor) {
            this.dom.editor.classList.remove('expanded');
            this.dom.editor.style.display = 'none';
        }
        if (this.dom.backdrop) {
            this.dom.backdrop.style.display = 'none';
        }

        try { localStorage.setItem('papanda_editor_open_state', JSON.stringify({ isOpen: false })); } catch(e) {}
        this._isClosing = false;
    }

    save() {
        this.saveGlobal(false, "toast.dialectics_saved");
    }

    createBlock(side, role, html, id, stickers = [], sources = [], insertAfterIndex = null) {
        const container = side === 'left' ? this.dom.leftCol : this.dom.rightCol;
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'dialectics-block';
        el.dataset.id = id;
        el.dataset.side = side;
        el.dataset.role = role;
        if (stickers.length > 0) el.dataset.stickers = JSON.stringify(stickers);
        if (sources.length > 0) el.dataset.sources = JSON.stringify(sources);

        const badgeText = window._('dialectics.roles.' + role) || role;

        el.innerHTML = `
            <div class="dialectics-block-header">
                <span class="dialectics-block-badge">${badgeText}</span>
                <div class="dialectics-block-actions">
                    <button type="button" class="btn-block-action btn-block-sources" title="Источники">🔗</button>
                    <button type="button" class="btn-block-action btn-block-stickers" title="Стикеры">🏷️</button>
                    <button type="button" class="btn-block-action btn-block-edit" title="Редактировать">✏️</button>
                    <button type="button" class="btn-block-action btn-block-del" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="dialectics-content-inner">${html}</div>
            <div class="dialectics-stickers-container" style="display:none; margin-top:10px; border-top:1px dashed #e2e8f0; padding-top:8px;"></div>
        `;

        this.attachBlockEvents(el);

        if (insertAfterIndex !== null && insertAfterIndex !== undefined) {
            const allBlocks = Array.from(container.querySelectorAll('.dialectics-block'));
            if (insertAfterIndex < allBlocks.length) {
                allBlocks[insertAfterIndex].after(el);
            } else {
                container.appendChild(el);
            }
        } else {
            container.appendChild(el);
        }

        if (stickers.length > 0) {
            this.renderStickersForBlock(el);
        }
    }

    attachBlockEvents(el) {
        const editBtn = el.querySelector('.btn-block-edit');
        const delBtn = el.querySelector('.btn-block-del');
        const stickersBtn = el.querySelector('.btn-block-stickers');
        const sourcesBtn = el.querySelector('.btn-block-sources');

        if (editBtn) editBtn.onclick = () => {
            this.openEdit(el);
        };

        if (delBtn) delBtn.onclick = () => {
            el.remove();
            if (window.showToast) window.showToast(window._("toast.dialectics_updated", "Обновлено"), "success");
        };

        if (stickersBtn) stickersBtn.onclick = () => {
            this.openStickersForCurrent(el.dataset.id);
        };

        if (sourcesBtn) sourcesBtn.onclick = () => {
            this.openSourcesModal(el);
        };
    }

    initStickersModal() {
        const modal = document.getElementById('blockStickersModal');
        const addBtn = document.getElementById('btnAddStickerModal');
        const listEl = document.getElementById('modalStickersList');

        if (!modal || !addBtn) return;

        addBtn.onclick = () => {
            const blockId = modal.dataset.currentBlockId;
            if (!blockId) return;

            const textInput = document.getElementById('modalStickerText');
            const titleInput = document.getElementById('modalStickerTitle');
            const colorInput = document.getElementById('modalStickerColor');

            const text = textInput?.value?.trim();
            if (!text) {
                if (window.showToast) window.showToast("Введите текст стикера", "warning");
                return;
            }

            const block = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
            if (block) {
                let existing = [];
                try { existing = JSON.parse(block.dataset.stickers || "[]"); } catch(e){}
                existing.push({
                    text: text,
                    title: titleInput?.value?.trim() || "Важное примечание",
                    color: colorInput?.value || "#fff9c4",
                    type: "text"
                });
                block.dataset.stickers = JSON.stringify(existing);
                this.renderStickersForBlock(block);
                this.renderStickersListInModal(blockId);
                this.saveGlobal(false, "toast.dialectics_updated");
            }

            if (textInput) textInput.value = '';
            if (titleInput) titleInput.value = '';
        };
    }

    renderStickersListInModal(blockId) {
        const listEl = document.getElementById('modalStickersList');
        if (!listEl) return;
        listEl.innerHTML = '';

        const block = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
        if (!block) return;

        let stickers = [];
        try { stickers = JSON.parse(block.dataset.stickers || "[]"); } catch(e){}

        if (stickers.length === 0) {
            listEl.innerHTML = '<div style="color:#94a3b8; font-size:0.9rem; font-style:italic;">Стикеры пока не добавлены.</div>';
            return;
        }

        stickers.forEach((st, idx) => {
            const item = document.createElement('div');
            item.style.cssText = `background:${st.color || '#fff9c4'}; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; box-shadow:0 1px 2px rgba(0,0,0,0.05);`;
            item.innerHTML = `
                <div>
                    <div style="font-weight:bold; font-size:0.85rem; margin-bottom:4px; color:#334155;">${st.title || 'Примечание'}</div>
                    <div style="font-size:0.9rem; color:#1e293b; white-space:pre-wrap;">${st.text}</div>
                </div>
                <button type="button" class="btn-del-st" style="background:none; border:none; cursor:pointer; color:#ef4444; font-weight:bold; padding:0 4px;" title="Удалить">&times;</button>
            `;
            item.querySelector('.btn-del-st').onclick = () => {
                stickers.splice(idx, 1);
                block.dataset.stickers = JSON.stringify(stickers);
                this.renderStickersForBlock(block);
                this.renderStickersListInModal(blockId);
                this.saveGlobal(false, "toast.dialectics_updated");
            };
            listEl.appendChild(item);
        });
    }

    renderStickersForBlock(blockEl) {
        let stickers = [];
        try { stickers = JSON.parse(blockEl.dataset.stickers || "[]"); } catch(e){}

        const container = blockEl.querySelector('.dialectics-stickers-container');
        const btn = blockEl.querySelector('.btn-block-stickers');

        if (btn) {
            const countHtml = stickers.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${stickers.length}</span>` : '';
            btn.innerHTML = `🏷️${countHtml}`;
        }

        if (!container) return;
        container.innerHTML = '';

        if (stickers.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '8px';

        stickers.forEach(st => {
            const pill = document.createElement('div');
            pill.style.cssText = `background:${st.color || '#fff9c4'}; padding:6px 10px; border-radius:6px; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.05); max-width:100%;`;
            pill.innerHTML = `<strong style="display:block; font-size:0.75rem; color:#64748b; margin-bottom:2px;">${st.title || 'Примечание'}:</strong><span style="color:#1e293b; white-space:pre-wrap;">${st.text}</span>`;
            container.appendChild(pill);
        });
    }

    initHintEvents() {
        const hints = document.querySelectorAll('.dialectics-hint-block');
        hints.forEach(hintEl => {
            const btnAI = hintEl.querySelector('.btn-hint-ai');
            if (btnAI) {
                btnAI.onclick = (e) => {
                    e.stopPropagation();
                    this.runHintAI({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                };
            }

            hintEl.onclick = () => {
                this.openHintEditor({
                    id: hintEl.dataset.stepId || hintEl.dataset.id,
                    side: hintEl.dataset.side
                });
            };
        });
    }

    bindEvents() {
        if (this.dom.btnSave) this.dom.btnSave.onclick = () => this.save();
        if (this.dom.btnCancel) this.dom.btnCancel.onclick = async () => await this.close();
        if (this.dom.btnClose) this.dom.btnClose.onclick = async () => await this.close();

        // Global delegator for dynamically added blocks or hints
        document.addEventListener('click', (e) => {
            const badge = e.target.closest('.dialectics-hint-badge');
            if (badge) {
                e.preventDefault();
                e.stopPropagation();
                const hintEl = badge.closest('.dialectics-hint-block');
                if (hintEl) {
                    this.openHintEditor({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                }
                return;
            }

            const aiBtn = e.target.closest('.btn-hint-ai');
            if (aiBtn) {
                e.preventDefault();
                e.stopPropagation();
                const hintEl = aiBtn.closest('.dialectics-hint-block');
                if (hintEl) {
                    this.runHintAI({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                }
                return;
            }
        });

        // Setup callbacks for BlockManager
        if (window.BlockManager) {
            window.BlockManager.setCallbacks({
                onEdit: (block) => this.openEdit(block),
                onEditAltCard: (altCardEl, blockEl) => this.openEditAltCard(altCardEl, blockEl),
                onDelete: async (deletedBlockId) => {
                    if (deletedBlockId) {
                        await this.deleteStickersForBlock(deletedBlockId);
                    }
                    await this.saveGlobal(false, "toast.dialectics_updated");
                    const blocks = BlockManager.getBlocks(this.dom.canvas);
                    BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
                },
                onHintClick: (hint) => this.openHintEditor(hint),
                onHintAI: (hint) => (hint && hint.id === 'step3' ? this.runAI(this.dom.canvas) : this.runHintAI(hint)),
                onHacks: (block) => this.openHacksPopover(block)
            });
        }
    }

    async openHintEditor(hint, content = '', aiHtml = null) {
        if (this.state.isDirty) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title', 'Внимание') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_msg', 'Есть несохранённые изменения. Продолжить?') : "Есть несохранённые изменения. Продолжить?",
                icon: '',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel', 'Отмена') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.continue_btn', 'Продолжить') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (!confirmed) return;
        }
        this.state.isDirty = false;
        this.state.editingBlock = null;
        this.state.pendingSide = hint.side;
        this.state.pendingRole = hint.id;
        this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        this.state.insertAfterIndex = null;
        const titleInput = document.getElementById('editorBlockTitleInput');
        if (titleInput) {
            titleInput.value = "";
        }
        this.open(content);

        const aiTab = document.getElementById('tab-ai');
        if (aiHtml) {
            if (aiTab) aiTab.style.display = 'flex';
            const aiContainer = document.getElementById('aiHelpContent');
            if (aiContainer) aiContainer.innerHTML = aiHtml;
            const copyBtn = document.getElementById('btnCopyAiToText');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    this.editor.setContent(aiHtml);
                    this.editor.switchTab('text');
                    if (window.showToast) window.showToast(window._("dialectics.ai_transferred", "Текст от ИИ перенесен в редактор"), "success");
                };
            }
            this.editor.switchTab('ai');
        } else {
            if (aiTab) aiTab.style.display = 'none';
        }
    }

    toggleExpand() {
        this.state.isExpanded = !this.state.isExpanded;
        if (this.dom.editor) {
            this.dom.editor.classList.toggle('expanded', this.state.isExpanded);
            if (this.dom.backdrop) this.dom.backdrop.style.display = this.state.isExpanded ? 'block' : 'none';
        }
        // Resize Fabric.js canvas to match new wrapper dimensions after transition
        setTimeout(() => {
            const wrapper = document.getElementById('shapesCanvasWrapper');
            const fabricCanvas = this.editor && this.editor.fabricCanvas;
            if (wrapper && fabricCanvas) {
                const newW = wrapper.clientWidth;
                const newH = wrapper.clientHeight;
                if (newW > 10 && newH > 10) {
                    fabricCanvas.setWidth(newW);
                    fabricCanvas.setHeight(newH);
                    fabricCanvas.calcOffset();
                    fabricCanvas.renderAll();
                }
            }
        }, 320); // wait for CSS transition to finish
    }

    dismissHint(hintId) {
        if (!this.state.dismissedHints) {
            this.state.dismissedHints = [];
        }
        if (!this.state.dismissedHints.includes(hintId)) {
            this.state.dismissedHints.push(hintId);
            try {
                const key = this.state.currentNoteId ? ('dialectics_dismissed_hints_' + this.state.currentNoteId) : 'dialectics_dismissed_hints_temp';
                localStorage.setItem(key, JSON.stringify(this.state.dismissedHints));
            } catch(e) {}
        }
        const blocks = BlockManager.getBlocks(this.dom.canvas);
        BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
    }

    toggleShowHiddenHints(checked) {
        try {
            localStorage.setItem('dialectics_show_hidden_hints', checked ? 'true' : 'false');
        } catch(e) {}
        const blocks = BlockManager.getBlocks(this.dom.canvas);
        BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
    }

    // Returns the standard callbacks object for BlockManager.render
    _blockCallbacks() {
        return {
            onEdit: (b) => { 
                if (b.classList.contains('block-section') || b.dataset.isSection === 'true') {
                    this.openSectionTitleModal(null, b);
                    return;
                }
                const blockStatus = b.dataset.status || 'none';
                if (blockStatus === 'ready') {
                    if (window.showToast) window.showToast('Этот блок заблокирован. Смените статус на «В работе», чтобы изменить его.', 'warning');
                    return;
                }
                this.openEdit(b); 
            },
            onEditAltCard: (altCardEl, blockEl) => { this.openEditAltCard(altCardEl, blockEl); },
            onInsertAfter: (side, index) => { this.openInsertAfter(side, index); },
            onDelete: async (deletedBlockId) => {
                if (deletedBlockId) {
                    await this.deleteStickersForBlock(deletedBlockId);
                }
                await this.saveGlobal(false, "toast.dialectics_updated");
                const blocks = BlockManager.getBlocks(this.dom.canvas);
                BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
            },
            onAI: (b) => { this.runAI(b); },
            onCheckAI: (b) => { this.checkAI(b); },
            onSources: (b) => { this.openSourcesModal(b); },
            onWords: (b) => { this.openWordsModal(b); },
            onColor: (b) => { this.openColorModal(b); },
            onHintClick: (hint) => { this.openHintEditor(hint); },
            onHintAI: (hint) => { if (hint && hint.id === 'step3') { this.runAI(this.dom.canvas); } else { this.runHintAI(hint); } },
            onHintDismiss: (hintId) => { this.dismissHint(hintId); },
            onFoldToggle: () => { this.saveGlobal(false, null); },
            onHacks: (b) => { this.openHacksPopover(b); },
            onStatusToggle: async (blockEl) => {
                const currentStatus = blockEl.dataset.status || 'none';
                let nextStatus = 'none';
                if (currentStatus === 'none') nextStatus = 'in_progress';
                else if (currentStatus === 'in_progress') nextStatus = 'ready';
                else if (currentStatus === 'ready') nextStatus = 'none';

                blockEl.dataset.status = nextStatus;

                if (window.showToast) {
                    let msg = 'Статус блока: Не указан';
                    if (nextStatus === 'in_progress') msg = 'Статус блока: В работе';
                    if (nextStatus === 'ready') msg = 'Статус блока: Готово (Заблокировано)';
                    window.showToast(msg, 'info');
                }

                // Re-render to show lock icon and update button listeners
                const blocks = BlockManager.getBlocks(this.dom.canvas);
                BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());

                // Save to server
                await this.saveGlobal(false, null);
            }
        };
    }

    openSourcesModal(blockEl) {
        const modal = document.getElementById('blockSourcesModal');
        const listEl = document.getElementById('sourcesList');
        const urlInput = document.getElementById('sourceUrl');
        const titleInput = document.getElementById('sourceTitle');
        const quoteInput = document.getElementById('sourceQuote');
        const addBtn = document.getElementById('btnAddSource');

        if (!modal || !listEl) return;

        let sources = [];
        try {
            if (blockEl.dataset.sources) {
                sources = JSON.parse(blockEl.dataset.sources);
            }
        } catch(e) {}

        const renderList = () => {
            listEl.innerHTML = '';
            if (sources.length === 0) {
                listEl.innerHTML = `<div style="color:#94a3b8; font-size:0.9rem; font-style:italic;">Источники пока не добавлены.</div>`;
                return;
            }
            sources.forEach((s, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px;';
                
                let linkHtml = s.title || s.url;
                if (s.url) {
                    let safeUrl = s.url.startsWith('http') ? s.url : 'https://' + s.url;
                    linkHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:600; text-decoration:none;">${s.title || s.url}</a>`;
                } else {
                    linkHtml = `<span style="font-weight:600; color:#1e293b;">${s.title}</span>`;
                }

                let quoteHtml = '';
                if (s.quote) {
                    quoteHtml = `<div style="font-size:0.85rem; color:#475569; margin-top:4px; white-space:pre-wrap;">${s.quote}</div>`;
                }

                item.innerHTML = `
                    <div style="flex-grow:1; overflow:hidden;">
                        ${linkHtml}
                        ${quoteHtml}
                    </div>
                    <button type="button" class="btn-del-src" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:1.2rem; padding:0 4px; line-height:1;" title="Удалить">&times;</button>
                `;

                item.querySelector('.btn-del-src').onclick = () => {
                    sources.splice(idx, 1);
                    updateBlockData();
                    renderList();
                };

                listEl.appendChild(item);
            });
        };

        const updateBlockData = () => {
            blockEl.dataset.sources = JSON.stringify(sources);
            const btn = blockEl.querySelector('.btn-block-sources');
            if (btn) {
                const countHtml = sources.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${sources.length}</span>` : '';
                btn.innerHTML = `🔗${countHtml}`;
            }
            this.saveGlobal(false, "toast.dialectics_updated");
        };

        addBtn.onclick = () => {
            const url = urlInput ? urlInput.value.trim() : '';
            const title = titleInput ? titleInput.value.trim() : '';
            const quote = quoteInput ? quoteInput.value.trim() : '';

            if (!url && !title && !quote) {
                if (window.showToast) window.showToast("Введите информацию об источнике", "warning");
                return;
            }

            sources.push({ url, title, quote });
            if (urlInput) urlInput.value = '';
            if (titleInput) titleInput.value = '';
            if (quoteInput) quoteInput.value = '';

            updateBlockData();
            renderList();
        };

        renderList();
        modal.style.display = 'flex';
    }

    openWordsModal(blockEl) {
        const modal = document.getElementById('blockWordsModal');
        const listEl = document.getElementById('wordsList');
        const termInput = document.getElementById('wordTerm');
        const definitionInput = document.getElementById('wordDefinition');
        const connectionsInput = document.getElementById('wordConnections');
        const addBtn = document.getElementById('btnAddWord');

        if (!modal || !listEl) return;

        let words = [];
        try {
            if (blockEl.dataset.words) {
                words = JSON.parse(blockEl.dataset.words);
            }
        } catch(e) {}

        const renderList = () => {
            listEl.innerHTML = '';
            if (words.length === 0) {
                listEl.innerHTML = `<div style="color:#94a3b8; font-size:0.9rem; font-style:italic;">Словарь блока пуст.</div>`;
                return;
            }
            words.forEach((w, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom: 8px;';
                
                let connHtml = '';
                if (w.connections) {
                    connHtml = `<div style="font-size:0.8rem; color:#64748b; margin-top:4px;"><b>Связи:</b> ${w.connections}</div>`;
                }

                item.innerHTML = `
                    <div style="flex-grow:1; overflow:hidden;">
                        <span style="font-weight:600; color:#1e40af;">📖 ${w.word}</span>
                        <div style="font-size:0.85rem; color:#475569; margin-top:4px; white-space:pre-wrap;">${w.definition}</div>
                        ${connHtml}
                    </div>
                    <button type="button" class="btn-del-word" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:1.2rem; padding:0 4px; line-height:1;" title="Удалить">&times;</button>
                `;

                item.querySelector('.btn-del-word').onclick = () => {
                    words.splice(idx, 1);
                    updateBlockData();
                    renderList();
                };

                listEl.appendChild(item);
            });
        };

        const updateBlockData = () => {
            blockEl.dataset.words = JSON.stringify(words);
            const btn = blockEl.querySelector('.btn-block-words');
            if (btn) {
                const countHtml = words.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${words.length}</span>` : '';
                btn.innerHTML = `📖${countHtml}`;
            }
            this.saveGlobal(false, "toast.dialectics_updated");
            
            // Re-render blocks to update the displayed badges
            const allBlocks = BlockManager.getBlocks(this.dom.canvas);
            BlockManager.render(this.dom.canvas, allBlocks, this._blockCallbacks());
        };

        addBtn.onclick = () => {
            const word = termInput ? termInput.value.trim() : '';
            const definition = definitionInput ? definitionInput.value.trim() : '';
            const connections = connectionsInput ? connectionsInput.value.trim() : '';

            if (!word || !definition) {
                if (window.showToast) window.showToast("Введите понятие и его объяснение", "warning");
                return;
            }

            // Check duplicate word in current block
            if (words.some(x => x.word.toLowerCase() === word.toLowerCase())) {
                if (window.showToast) window.showToast("Это слово уже есть в словаре блока", "warning");
                return;
            }

            words.push({ word, definition, connections });
            if (termInput) termInput.value = '';
            if (definitionInput) definitionInput.value = '';
            if (connectionsInput) connectionsInput.value = '';

            updateBlockData();
            renderList();
        };

        renderList();
        modal.style.display = 'flex';
    }

    async openColorModal(blockEl) {
        const currentColor = blockEl.dataset.color || '';
        const choice = await customChoice({
            title: 'Цвет блока',
            options: [
                { label: '⚪ По умолчанию', value: 'default', checked: !currentColor },
                { label: '🔵 Синий', value: 'blue', checked: currentColor === 'blue' },
                { label: '🟢 Зеленый', value: 'green', checked: currentColor === 'green' },
                { label: '🔴 Красный', value: 'red', checked: currentColor === 'red' },
                { label: '🟡 Желтый', value: 'yellow', checked: currentColor === 'yellow' },
                { label: '🟣 Фиолетовый', value: 'purple', checked: currentColor === 'purple' }
            ],
            okLabel: 'Выбрать',
            cancelLabel: 'Отмена'
        });

        if (choice !== null && choice !== undefined) {
            const selectedColor = choice === 'default' ? '' : choice;
            if (selectedColor) {
                blockEl.dataset.color = selectedColor;
                const preset = COLOR_PRESETS[selectedColor];
                if (preset) {
                    blockEl.style.setProperty('--block-custom-bg', preset.bg);
                    blockEl.style.setProperty('--block-custom-accent', preset.accent);
                }
            } else {
                delete blockEl.dataset.color;
                blockEl.style.removeProperty('--block-custom-bg');
                blockEl.style.removeProperty('--block-custom-accent');
            }
            await this.saveGlobal(false, "toast.dialectics_updated");
            
            // Re-render blocks to apply change everywhere
            const allBlocks = BlockManager.getBlocks(this.dom.canvas);
            BlockManager.render(this.dom.canvas, allBlocks, this._blockCallbacks());
        }
    }

    addSectionBlock() {
        this.openSectionTitleModal(-1);
    }

    openSectionTitleModal(index = null, existingBlock = null) {
        this.state.pendingSectionIndex = index;
        this.state.editingSectionBlock = existingBlock;
        const modal = document.getElementById('sectionTitleModal');
        const input = document.getElementById('sectionTitleInputField');
        if (!modal || !input) return;
        
        if (existingBlock) {
            let title = existingBlock.dataset.title;
            if (!title) {
                const span = existingBlock.querySelector('.dialectics-block-header span:nth-child(2)');
                title = span ? span.innerText : 'Раздел';
            }
            input.value = title || '';
        } else {
            input.value = '';
        }
        
        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 50);
    }

    closeSectionTitleModal() {
        const modal = document.getElementById('sectionTitleModal');
        if (modal) modal.style.display = 'none';
        this.state.pendingSectionIndex = null;
        this.state.editingSectionBlock = null;
    }

    saveSectionTitle() {
        const input = document.getElementById('sectionTitleInputField');
        if (!input || !this.dom.canvas) return;
        
        const title = input.value.trim() || 'Раздел';
        
        if (this.state.editingSectionBlock) {
            this.state.editingSectionBlock.dataset.title = title;
            const span = this.state.editingSectionBlock.querySelector('.block-title-text');
            if (span) span.innerText = title;
            const inner = this.state.editingSectionBlock.querySelector('.dialectics-content-inner');
            if (inner) inner.innerHTML = `<p>${title}</p>`;
            
            const blocks = BlockManager.getBlocks(this.dom.canvas);
            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
            this.saveGlobal(false, "toast.dialectics_updated");
        } else {
            const blocks = BlockManager.getBlocks(this.dom.canvas);
            const newSection = {
                id: 'block_' + Math.random().toString(36).substr(2, 9),
                side: 'section',
                isSection: true,
                title: title,
                html: `<p>${title}</p>`
            };
            
            if (this.state.pendingSectionIndex !== null && this.state.pendingSectionIndex !== undefined && this.state.pendingSectionIndex >= 0) {
                if (this.state.pendingSectionIndex < blocks.length) {
                    blocks.splice(this.state.pendingSectionIndex + 1, 0, newSection);
                } else {
                    blocks.push(newSection);
                }
            } else if (this.state.pendingSectionIndex === -1) {
                blocks.unshift(newSection);
            } else {
                blocks.push(newSection);
            }
            
            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
            this.saveGlobal(false, "toast.dialectics_updated");
        }
        
        this.closeSectionTitleModal();
    }

    toggleTableOfContents(e) {
        if (e) e.stopPropagation();
        let menu = document.getElementById('tableOfContentsMenu');
        if (!menu) return;
        if (menu.style.display === 'none' || !menu.style.display) {
            this.updateTableOfContents();
            menu.style.display = 'block';
            const closeHandler = (evt) => {
                if (!menu.contains(evt.target) && evt.target.id !== 'btnToggleTOC') {
                    menu.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 10);
        } else {
            menu.style.display = 'none';
        }
    }

    updateTableOfContents() {
        const listEl = document.getElementById('tableOfContentsList');
        if (!listEl || !this.dom.canvas) return;
        
        const blocks = Array.from(this.dom.canvas.querySelectorAll('.dialectics-block'));
        listEl.innerHTML = '';
        
        if (blocks.length === 0) {
            listEl.innerHTML = '<div style="padding: 12px; color: #94a3b8; font-size: 0.85rem; text-align: center;">В конспекте пока нет блоков и разделов.</div>';
            return;
        }
        
        blocks.forEach((b, idx) => {
            const isSection = b.classList.contains('block-section') || b.dataset.isSection === 'true';
            let title = b.dataset.title;
            if (!title) {
                const headerSpan = b.querySelector('.dialectics-block-header span:first-child');
                title = headerSpan ? headerSpan.innerText : (isSection ? 'Раздел' : `Блок ${idx + 1}`);
            }
            
            const item = document.createElement('div');
            item.setAttribute('draggable', 'true');
            item.dataset.index = idx;
            item.style.cssText = `
                display: flex; align-items: center; gap: 8px; padding: 8px 12px; 
                border-radius: 8px; cursor: grab; transition: background 0.15s;
                font-size: ${isSection ? '0.9rem' : '0.8rem'};
                font-weight: ${isSection ? '700' : '500'};
                color: ${isSection ? '#ea580c' : '#334155'};
                background: ${isSection ? '#fff7ed' : 'transparent'};
                border-left: ${isSection ? '4px solid #ea580c' : '2px solid transparent'};
            `;
            item.onmouseover = () => item.style.background = isSection ? '#ffedd5' : '#f8fafc';
            item.onmouseout = () => item.style.background = isSection ? '#fff7ed' : 'transparent';
            
            const icon = isSection ? '📑' : (b.classList.contains('block-left') ? '▫️' : '▪️');
            item.innerHTML = `<span style="opacity: 0.3; cursor: grab; font-size: 0.8rem;" title="Перетащите для изменения порядка">⋮⋮</span><span>${icon}</span><span style="flex-grow:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${title}</span>`;
            
            item.onclick = () => {
                if (this._wasDragging) { this._wasDragging = false; return; }
                document.getElementById('tableOfContentsMenu').style.display = 'none';
                b.scrollIntoView({ behavior: 'smooth', block: 'center' });
                b.style.transition = 'box-shadow 0.5s ease';
                const origBoxShadow = b.style.boxShadow;
                b.style.boxShadow = '0 0 0 4px #ea580c';
                setTimeout(() => { b.style.boxShadow = origBoxShadow; }, 1500);
            };

            item.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                this._wasDragging = true;
                this._draggedTocIndex = idx;
                e.dataTransfer.effectAllowed = 'move';
                item.style.opacity = '0.5';
            });

            item.addEventListener('dragend', (e) => {
                e.stopPropagation();
                item.style.opacity = '1';
                setTimeout(() => { this._wasDragging = false; }, 100);
                listEl.querySelectorAll('div').forEach(el => {
                    el.style.borderTop = '';
                    el.style.borderBottom = '';
                });
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                
                listEl.querySelectorAll('div').forEach(el => {
                    if (el !== item) {
                        el.style.borderTop = '';
                        el.style.borderBottom = '';
                    }
                });

                const bounding = item.getBoundingClientRect();
                const offset = e.clientY - bounding.top;
                const isAfter = offset > bounding.height / 2;
                if (isAfter) {
                    item.style.borderBottom = '2px solid #ea580c';
                    item.style.borderTop = '';
                } else {
                    item.style.borderTop = '2px solid #ea580c';
                    item.style.borderBottom = '';
                }
            });

            item.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                item.style.borderTop = '';
                item.style.borderBottom = '';
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.style.borderTop = '';
                item.style.borderBottom = '';
                setTimeout(() => { this._wasDragging = false; }, 100);
                
                const fromIdx = this._draggedTocIndex;
                const toIdx = idx;
                if (fromIdx === undefined || fromIdx === null || fromIdx === toIdx) return;
                
                const bounding = item.getBoundingClientRect();
                const offset = e.clientY - bounding.top;
                const isAfter = offset > bounding.height / 2;
                
                const allBlocks = BlockManager.getBlocks(this.dom.canvas);
                if (!allBlocks || !allBlocks[fromIdx] || !allBlocks[toIdx]) return;

                const isSectionDrag = allBlocks[fromIdx].isSection;
                let count = 1;
                if (isSectionDrag) {
                    for (let i = fromIdx + 1; i < allBlocks.length; i++) {
                        if (allBlocks[i].isSection) break;
                        count++;
                    }
                }

                let insertIdx = toIdx;
                if (isAfter) {
                    if (isSectionDrag && allBlocks[toIdx].isSection) {
                        let j = toIdx + 1;
                        while (j < allBlocks.length && !allBlocks[j].isSection) {
                            j++;
                        }
                        insertIdx = j;
                    } else {
                        insertIdx = toIdx + 1;
                    }
                }

                const chunk = allBlocks.splice(fromIdx, count);
                if (insertIdx > fromIdx) {
                    insertIdx -= count;
                }
                
                allBlocks.splice(insertIdx, 0, ...chunk);
                
                BlockManager.render(this.dom.canvas, allBlocks, this._blockCallbacks());
                this.saveGlobal(false, "toast.dialectics_updated");
                this.updateTableOfContents();
            });
            
            listEl.appendChild(item);
        });
    }

    openHacksPopover(blockEl) {
        const existing = document.getElementById('dialecticsHacksPopover');
        if (existing) {
            const isSame = existing.dataset.blockId === (blockEl.dataset.blockId || '');
            existing.remove();
            if (isSame) return;
        }

        const popover = document.createElement('div');
        popover.id = 'dialecticsHacksPopover';
        popover.dataset.blockId = blockEl.dataset.blockId || '';
        popover.style.cssText = `
            position: fixed;
            z-index: 999999;
            width: 350px;
            max-height: 440px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            box-shadow: 0 14px 30px -5px rgba(15, 23, 42, 0.15), 0 8px 15px -6px rgba(15, 23, 42, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: hacksPopoverFadeIn 0.18s ease-out;
        `;

        if (!document.getElementById('hacksPopoverStyles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'hacksPopoverStyles';
            styleEl.textContent = `
                @keyframes hacksPopoverFadeIn {
                    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `;
            document.head.appendChild(styleEl);
        }

        const btnEl = blockEl.querySelector('.btn-block-hacks');
        const rect = btnEl ? btnEl.getBoundingClientRect() : blockEl.getBoundingClientRect();

        let left = rect.right - 350;
        if (left < 10) left = rect.left;
        let top = rect.bottom + 8;
        if (top + 440 > window.innerHeight) {
            top = Math.max(10, rect.top - 448);
        }
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;

        const hacksTitle = window._ ? window._('dialectics.hacks_title', 'Хаки понимания') : 'Хаки понимания';
        const copyHint = window._ ? window._('dialectics.hack_copy_hint', 'Нажмите на карточку, чтобы скопировать совет') : 'Нажмите на карточку, чтобы скопировать совет';
        const copiedMsg = window._ ? window._('dialectics.hack_copied', 'Совет скопирован в буфер обмена') : 'Совет скопирован в буфер обмена';

        const hacks = [
            {
                title: window._ ? window._('dialectics.hack_1_title', 'Количественный подход к формуле') : 'Количественный подход к формуле',
                text: window._ ? window._('dialectics.hack_1_text', 'Если сразу сложно понять формулу, то сначала изучите ее количественно, сведите к суммированию, а затем уже изучите качественно.') : 'Если сразу сложно понять формулу, то сначала изучите ее количественно, сведите к суммированию, а затем уже изучите качественно.',
                tag: '📊 Базовый'
            }
        ];

        let listHtml = '';
        hacks.forEach((h, idx) => {
            listHtml += `
                <div class="hack-card-item" data-idx="${idx}" style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 3.5px solid #3b82f6; border-radius: 10px; padding: 12px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.15s, box-shadow 0.15s;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-weight: 600; font-size: 0.88rem; color: #0f172a;">${h.title}</span>
                        <span style="font-size: 0.72rem; font-weight: 600; background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 6px;">${h.tag}</span>
                    </div>
                    <div style="font-size: 0.82rem; color: #475569; line-height: 1.45;">
                        ${h.text}
                    </div>
                </div>
            `;
        });

        popover.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.92rem; color: #1e293b;">
                    <span>💡</span>
                    <span>${hacksTitle}</span>
                </div>
                <button class="hacks-popover-close" style="background: transparent; border: none; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 2px 6px; border-radius: 6px;">✕</button>
            </div>
            <div style="padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
                ${listHtml}
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; text-align:center; padding: 6px 12px 10px 12px; border-top: 1px solid #f1f5f9; background: #f8fafc;">
                ${copyHint}
            </div>
        `;

        document.body.appendChild(popover);

        popover.querySelectorAll('.hack-card-item').forEach(cardEl => {
            cardEl.onmouseenter = () => {
                cardEl.style.transform = 'translateY(-1px)';
                cardEl.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
            };
            cardEl.onmouseleave = () => {
                cardEl.style.transform = 'none';
                cardEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            };
            cardEl.onclick = (e) => {
                e.stopPropagation();
                const idx = parseInt(cardEl.dataset.idx);
                const h = hacks[idx];
                navigator.clipboard.writeText(h.title + ': ' + h.text);
                if (window.showToast) window.showToast(copiedMsg, "success");
            };
        });

        setTimeout(() => {
            const closeHandler = (e) => {
                if (!popover.contains(e.target) && e.target !== btnEl && !(btnEl && btnEl.contains(e.target))) {
                    popover.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
            const closeBtn = popover.querySelector('.hacks-popover-close');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    popover.remove();
                    document.removeEventListener('click', closeHandler);
                };
            }
        }, 10);
    }

    toggleSearchInNote(e) {
        if (e) e.stopPropagation();
        let menu = document.getElementById('searchInNoteMenu');
        if (!menu) return;
        if (menu.style.display === 'none' || !menu.style.display) {
            const tocMenu = document.getElementById('tableOfContentsMenu');
            if (tocMenu) tocMenu.style.display = 'none';
            const verMenu = document.getElementById('versionsMenu');
            if (verMenu) verMenu.style.display = 'none';

            menu.style.display = 'block';
            const inputEl = document.getElementById('searchInNoteInput');
            if (inputEl) {
                inputEl.value = '';
                inputEl.focus();
            }
            const resultsEl = document.getElementById('searchInNoteResults');
            if (resultsEl) {
                resultsEl.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.85rem; padding: 10px 0;">Введите текст для начала поиска</div>';
            }

            const closeHandler = (evt) => {
                if (!menu.contains(evt.target) && evt.target.id !== 'btnToggleSearch') {
                    menu.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 10);
        } else {
            menu.style.display = 'none';
        }
    }

    performSearchInNote(query) {
        const resultsEl = document.getElementById('searchInNoteResults');
        if (!resultsEl || !this.dom.canvas) return;

        query = (query || '').trim().toLowerCase();
        if (!query) {
            resultsEl.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.85rem; padding: 10px 0;">Введите текст для начала поиска</div>';
            return;
        }

        const blocks = Array.from(this.dom.canvas.querySelectorAll('.dialectics-block'));
        resultsEl.innerHTML = '';

        let matchCount = 0;

        blocks.forEach((b, idx) => {
            const isSection = b.classList.contains('block-section') || b.dataset.isSection === 'true';
            
            let title = b.dataset.title || '';
            if (!title) {
                const titleEl = b.querySelector('.block-title-text');
                title = titleEl ? titleEl.innerText : '';
            }
            if (!title) {
                const headerSpan = b.querySelector('.dialectics-block-header span:first-child');
                title = headerSpan ? headerSpan.innerText : (isSection ? 'Раздел' : `Блок ${idx + 1}`);
            }

            const inner = b.querySelector('.dialectics-content-inner');
            const content = inner ? (inner.innerText || inner.textContent || '') : '';

            const titleMatch = title.toLowerCase().includes(query);
            const contentMatch = content.toLowerCase().includes(query);

            if (titleMatch || contentMatch) {
                matchCount++;

                const item = document.createElement('div');
                item.style.cssText = `
                    display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; 
                    border-radius: 8px; cursor: pointer; transition: background 0.15s;
                    border: 1px solid #e2e8f0; background: #fff; text-align: left;
                `;
                item.onmouseover = () => item.style.background = '#f8fafc';
                item.onmouseout = () => item.style.background = '#fff';

                const icon = isSection ? '📑' : (b.classList.contains('block-left') ? '▫️' : '▪️');
                
                let snippet = '';
                if (contentMatch) {
                    const index = content.toLowerCase().indexOf(query);
                    const start = Math.max(0, index - 30);
                    const end = Math.min(content.length, index + query.length + 30);
                    snippet = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
                    snippet = snippet.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    snippet = snippet.replace(new RegExp(`(${escapedQuery})`, 'gi'), '<mark style="background: #fef08a; padding: 0 2px; border-radius: 2px;">$1</mark>');
                } else {
                    snippet = content.substring(0, 60) + (content.length > 60 ? '...' : '');
                }

                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.85rem; color: ${isSection ? '#ea580c' : '#1e293b'};">
                        <span>${icon}</span>
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${title}</span>
                    </div>
                    ${snippet ? `<div style="font-size: 0.75rem; color: #64748b; line-height: 1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${snippet}</div>` : ''}
                `;

                item.onclick = () => {
                    document.getElementById('searchInNoteMenu').style.display = 'none';
                    b.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    b.style.transition = 'box-shadow 0.5s ease';
                    const origBoxShadow = b.style.boxShadow;
                    b.style.boxShadow = '0 0 0 4px #3b82f6';
                    setTimeout(() => {
                        b.style.boxShadow = origBoxShadow;
                    }, 2000);
                };

                resultsEl.appendChild(item);
            }
        });

        if (matchCount === 0) {
            resultsEl.innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 20px 0;">Ничего не найдено</div>';
        }
    }

}

export const BlocksOrchestratorMixin = {};
Object.getOwnPropertyNames(BlocksOrchestratorClass.prototype).forEach(key => {
    if (key !== 'constructor') BlocksOrchestratorMixin[key] = BlocksOrchestratorClass.prototype[key];
});
