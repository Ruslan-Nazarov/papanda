/**
 * InlineEditorManager.js - Управление инлайн-редакторами блоков прямо на холсте
 */
import { BlockManager } from '../BlockManager.js';
import { customConfirm } from '../../modal_controller.js';
import { DialecticsUI } from '../ui_utils.js';
import { DialecticsLogger } from '../DialecticsLogger.js';
import { OrchestratorState } from './OrchestratorState.js';

export const InlineEditorManager = {
    cleanUpInlineEdit(engine) {
        this.cleanUpAllInlineEditors(engine);
    },

    cleanUpAllInlineEditors(engine) {
        const appEngine = window.app || engine;
        if (appEngine.dom && appEngine.dom.canvas) {
            const editingBlocks = Array.from(appEngine.dom.canvas.querySelectorAll('.dialectics-block.is-editing'));
            editingBlocks.forEach(block => {
                this.cleanUpInlineEditForBlock(appEngine, block);
            });
        }
    },

    cleanUpInlineEditForBlock(engine, block) {
        const appEngine = window.app || engine;
        const liveBlock = appEngine.resolveLiveBlock(block) || block;
        if (!liveBlock) return;

        if (liveBlock._tiptapEditor) {
            try {
                liveBlock._tiptapEditor.destroy();
            } catch(e) {}
            liveBlock._tiptapEditor = null;
        }

        liveBlock.classList.remove('is-editing');
        const inlineContainer = liveBlock.querySelector('.dialectics-inline-editor-container');
        if (inlineContainer) {
            inlineContainer.remove();
        }

        const state = OrchestratorState.getState(appEngine);
        if (state.editingBlock === liveBlock || state.editingBlock === block) {
            OrchestratorState.setEditingBlock(appEngine, null);
        }
    },

    async saveInlineEdit(engine) {
        const appEngine = window.app || engine;
        const state = OrchestratorState.getState(appEngine);
        if (state.editingBlock) {
            await this.saveInlineEditForBlock(appEngine, state.editingBlock);
        }
    },

    async saveInlineEditForBlock(engine, block) {
        const appEngine = window.app || engine;
        const liveBlock = appEngine.resolveLiveBlock(block) || block;
        if (!liveBlock) return;

        const inlineContainer = liveBlock.querySelector('.dialectics-inline-editor-container');
        let newTitle = liveBlock._originalTitle;
        if (inlineContainer) {
            const inlineTitleInput = inlineContainer.querySelector('.inline-title-input');
            if (inlineTitleInput) {
                newTitle = inlineTitleInput.value.trim();
            }
        }

        let newHtml = liveBlock._tiptapEditor ? liveBlock._tiptapEditor.getHTML() : "";
        const pmEl = liveBlock.querySelector('.ProseMirror') || liveBlock.querySelector('.block-tiptap-editor');
        if (pmEl && (!newHtml || newHtml.trim() === '' || newHtml === '<p></p>' || newHtml === '\n\n')) {
            const pmHtml = pmEl.innerHTML || "";
            if (pmHtml && pmHtml.trim() !== '' && pmHtml !== '<p><br></p>' && pmHtml !== '<p></p>') {
                newHtml = pmHtml;
            }
        }
        if (!newHtml || newHtml.trim() === '' || newHtml === '<p></p>' || newHtml === '\n\n') {
            newHtml = liveBlock._originalHtml || "";
        }

        DialecticsLogger.info('InlineEditorManager', `Сохранение инлайн-редактора для блока ${liveBlock.dataset?.id || liveBlock.id}`);
        OrchestratorState.markDirty(appEngine, false);
        this.cleanUpInlineEditForBlock(engine, liveBlock);

        if (newTitle) liveBlock.dataset.title = newTitle;
        else delete liveBlock.dataset.title;

        const titleEl = liveBlock.querySelector('.block-title-text');
        if (titleEl) {
            titleEl.innerText = newTitle || (liveBlock.classList.contains('block-section') ? 'Раздел' : (liveBlock.dataset.side === 'center' ? 'Связующий блок' : 'Блок'));
        }
        const inner = liveBlock.querySelector('.dialectics-content-inner');
        if (inner) {
            liveBlock._rawHtml = newHtml;
            inner.innerHTML = newHtml;
            if (typeof BlockManager.renderMath === 'function') {
                BlockManager.renderMath(liveBlock);
            }
        }

        if (engine.saveGlobal) await engine.saveGlobal(false, "toast.dialectics_updated");
    },

    cancelInlineEdit(engine) {
        const state = OrchestratorState.getState(engine);
        if (state.editingBlock) {
            this.cancelInlineEditForBlock(engine, state.editingBlock);
        }
    },

    cancelInlineEditForBlock(engine, block) {
        const liveBlock = engine.resolveLiveBlock(block) || block;
        if (!liveBlock) return;

        DialecticsLogger.debug('InlineEditorManager', `Отмена инлайн-редактора для блока ${liveBlock.dataset?.id || liveBlock.id}`);
        const inner = liveBlock.querySelector('.dialectics-content-inner');
        if (inner && liveBlock._originalHtml !== undefined) {
            inner.innerHTML = liveBlock._originalHtml;
            if (typeof BlockManager.renderMath === 'function') BlockManager.renderMath(liveBlock);
        }
        if (liveBlock._originalTitle !== undefined) {
            liveBlock.dataset.title = liveBlock._originalTitle;
        } else {
            delete liveBlock.dataset.title;
        }
        const titleEl = liveBlock.querySelector('.block-title-text');
        if (titleEl) {
            titleEl.innerText = liveBlock.dataset.title || (liveBlock.classList.contains('block-section') ? 'Раздел' : (liveBlock.dataset.side === 'center' ? 'Связующий блок' : 'Блок'));
        }

        this.cleanUpInlineEditForBlock(engine, liveBlock);
    },

    detachInlineEdit(engine, fullscreen = false) {
        const state = OrchestratorState.getState(engine);
        if (state.editingBlock) {
            this.detachInlineEditForBlock(engine, state.editingBlock, fullscreen);
        }
    },

    detachInlineEditForBlock(engine, block, fullscreen = false) {
        if (!block) return;

        const currentHtml = block._tiptapEditor ? block._tiptapEditor.getHTML() : (block._originalHtml || "");
        const inlineContainer = block.querySelector('.dialectics-inline-editor-container');
        let currentTitle = block._originalTitle || "";
        if (inlineContainer) {
            const inlineTitleInput = inlineContainer.querySelector('.inline-title-input');
            if (inlineTitleInput) currentTitle = inlineTitleInput.value;
        }

        DialecticsLogger.info('InlineEditorManager', `Открепление инлайн-редактора в плавающее окно (fullscreen=${fullscreen})`);
        this.cleanUpInlineEditForBlock(engine, block);
        if (engine.createFloatingEditor) {
            engine.createFloatingEditor(block, currentHtml, currentTitle, fullscreen);
        }
    },

    async openEdit(engine, block) {
        const appEngine = window.app || engine;
        const uiLog = window.logDebugWindow || (typeof DialecticsUI !== 'undefined' && DialecticsUI.logDebugWindow ? DialecticsUI.logDebugWindow.bind(DialecticsUI) : null);
        if (uiLog) {
            uiLog('=== ВЫЗОВ РЕДАКТОРА (openEdit) ===', { blockId: block?.dataset?.id || block?.id || 'id неизвестен', hasEditor: !!appEngine?.editor, hasCreateEditor: !!(appEngine?.editor && appEngine.editor.createEditor) });
        }
        if (block.classList.contains('is-editing')) return;

        if (appEngine.dom && appEngine.dom.editor) appEngine.dom.editor.style.display = 'none';
        if (appEngine.dom && appEngine.dom.backdrop) appEngine.dom.backdrop.style.display = 'none';

        OrchestratorState.markDirty(appEngine, false);
        block.classList.add('is-editing');

        let inlineContainer = block.querySelector('.dialectics-inline-editor-container');
        if (!inlineContainer) {
            inlineContainer = document.createElement('div');
            inlineContainer.className = 'dialectics-inline-editor-container';
            const contentInner = block.querySelector('.dialectics-content-inner');
            if (contentInner) contentInner.after(inlineContainer);
            else block.appendChild(inlineContainer);
        }

        const titleText = block.dataset.title || "";
        const html = block.querySelector('.dialectics-content-inner')?.innerHTML || "<p></p>";

        block._originalHtml = html;
        block._originalTitle = titleText;

        inlineContainer.innerHTML = `
            <div class="inline-edit-title-row" style="padding: 10px 14px; display:flex; align-items:center; gap:8px; background:#f8fafc; border-bottom:1px solid #e2e8f0; border-top-left-radius:12px; border-top-right-radius:12px;">
                <span style="font-size:0.85rem; font-weight:600; color:#475569;">Заголовок:</span>
                <input type="text" class="inline-title-input" value="${titleText}" placeholder="Введите заголовок блока..." style="flex-grow:1; padding:6px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem; font-family:inherit; outline:none; transition:border 0.15s;">
                <div style="display:flex; align-items:center; gap:6px; margin-left:auto;">
                    <button type="button" class="btn-inline-action btn-inline-detach" title="Открыть в отдельном окне" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px 6px; border-radius:6px; transition:background 0.15s; display:flex; align-items:center; justify-content:center;">↗️</button>
                    <button type="button" class="btn-inline-action btn-inline-fullscreen" title="Во весь экран" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px 6px; border-radius:6px; transition:background 0.15s; display:flex; align-items:center; justify-content:center;">⛶</button>
                    <span style="width:1px; height:16px; background:#cbd5e1; margin:0 2px;"></span>
                    <button type="button" class="btn-inline-action btn-inline-save" title="Сохранить" style="background:#10b981; border:none; color:white; font-weight:600; cursor:pointer; font-size:0.85rem; padding:6px 12px; border-radius:8px; transition:opacity 0.15s;">OK</button>
                    <button type="button" class="btn-inline-action btn-inline-cancel" title="Отмена" style="background:#ef4444; border:none; color:white; font-weight:600; cursor:pointer; font-size:0.85rem; padding:6px 12px; border-radius:8px; transition:opacity 0.15s;">Отмена</button>
                </div>
            </div>
            <div class="inline-edit-toolbar" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 12px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; gap:8px; min-height: 38px;">
                <div class="inline-format-placeholder" style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;"></div>
            </div>
            <div class="inline-tiptap-wrapper" style="min-height: 140px;">
                <div class="block-tiptap-editor" style="min-height: 140px;"></div>
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
        if (blockTiptapEl) blockTiptapEl.innerHTML = '';
        const globalToolbar = document.getElementById('editorFormattingToolbar');
        const placeholder = inlineContainer.querySelector('.inline-format-placeholder');
        if (globalToolbar && placeholder && !placeholder.querySelector('.editor-formatting-toolbar')) {
            const inlineToolbar = globalToolbar.cloneNode(true);
            inlineToolbar.removeAttribute('id');
            inlineToolbar.classList.add('editor-formatting-toolbar');
            inlineToolbar.style.marginLeft = '0';
            inlineToolbar.style.boxShadow = 'none';
            inlineToolbar.style.border = 'none';
            inlineToolbar.style.padding = '0';
            inlineToolbar.style.display = 'flex';
            placeholder.appendChild(inlineToolbar);
        }

        if (appEngine && appEngine.editor && typeof appEngine.editor.createEditor === 'function') {
            try {
                const editorInstance = appEngine.editor.createEditor(
                    blockTiptapEl,
                    html,
                    () => {
                        appEngine.editor.tiptap = editorInstance;
                        OrchestratorState.setEditingBlock(appEngine, block);
                        if (uiLog) uiLog('=== ФОКУС В ИНЛАЙН-РЕДАКТОРЕ ===', { blockId: block?.dataset?.id });
                    },
                    () => {
                        OrchestratorState.markDirty(appEngine, true);
                    }
                );

                block._tiptapEditor = editorInstance;
                editorInstance._ownerBlock = block;
                const inlineToolbar = inlineContainer.querySelector('.editor-formatting-toolbar');
                if (inlineToolbar && appEngine.editor && typeof appEngine.editor.bindFormattingButtons === 'function') {
                    appEngine.editor.bindFormattingButtons(inlineToolbar, () => editorInstance);
                }
                if (uiLog) uiLog('✅ Инлайн-редактор открыт в блоке', { blockId: block?.dataset?.id });
            } catch (err) {
                console.error("Ошибка при открытии инлайн-редактора TipTap:", err);
                if (uiLog) uiLog('❌ Ошибка catch при открытии инлайн-редактора: ' + err.message, { stack: err.stack });
            }
        } else {
            if (uiLog) {
                uiLog('❌ Ошибка: appEngine.editor.createEditor не найден!', { hasApp: !!window.app, hasEditor: !!appEngine?.editor });
            }
        }

        const inlineTitleInput = inlineContainer.querySelector('.inline-title-input');
        inlineTitleInput.addEventListener('input', () => OrchestratorState.markDirty(appEngine, true));

        inlineContainer.querySelector('.btn-inline-save').onclick = async (e) => {
            e.stopPropagation();
            await this.saveInlineEditForBlock(engine, block);
        };
        inlineContainer.querySelector('.btn-inline-cancel').onclick = (e) => {
            e.stopPropagation();
            this.cancelInlineEditForBlock(engine, block);
        };
        inlineContainer.querySelector('.btn-inline-detach').onclick = (e) => {
            e.stopPropagation();
            this.detachInlineEditForBlock(engine, block, false);
        };
        inlineContainer.querySelector('.btn-inline-fullscreen').onclick = (e) => {
            e.stopPropagation();
            this.detachInlineEditForBlock(engine, block, true);
        };
    },

    async openEditAltCard(engine, altCardEl, blockEl) {
        const state = OrchestratorState.getState(engine);
        if (state.isDirty && (state.editingBlock !== blockEl || state.editingAltCard !== altCardEl)) {
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
        OrchestratorState.markDirty(engine, false);
        OrchestratorState.setEditingBlock(engine, blockEl);
        state.editingAltCard = altCardEl;
        const html = altCardEl.querySelector('.dialectics-content-inner')?.innerHTML || "";
        const titleInput = document.getElementById('editorBlockTitleInput');
        if (titleInput) {
            const titleSpan = altCardEl.querySelector('.alt-title');
            titleInput.value = titleSpan ? titleSpan.innerText : "";
        }
        if (engine.open) engine.open(html);
    },

    async close(engine, confirmIfDirty = true) {
        if (engine._isClosing) return;
        engine._isClosing = true;

        const state = OrchestratorState.getState(engine);
        if (confirmIfDirty && state.isDirty) {
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
                engine._isClosing = false;
                return;
            }
        }

        this.cleanUpInlineEdit(engine);
        OrchestratorState.markDirty(engine, false);
        OrchestratorState.setEditingBlock(engine, null);
        state.editingAltCard = null;
        state.pendingSide = null;
        state.pendingRole = null;
        state.pendingBlockId = null;
        state.insertAfterIndex = null;
        state.isExpanded = false;

        if (engine.editor && engine.editor.setContent) engine.editor.setContent('');
        if (engine.dom && engine.dom.editor) {
            engine.dom.editor.classList.remove('expanded');
            engine.dom.editor.style.display = 'none';
        }
        if (engine.dom && engine.dom.backdrop) engine.dom.backdrop.style.display = 'none';

        try { localStorage.setItem('papanda_editor_open_state', JSON.stringify({ isOpen: false })); } catch(e) {}
        engine._isClosing = false;
    }
};
