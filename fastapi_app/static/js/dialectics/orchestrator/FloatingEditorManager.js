/**
 * FloatingEditorManager.js - Управление плавающими окнами редакторов конспектов (.dialectics-floating-editor)
 */
import { BlockManager } from '../BlockManager.js';
import { customConfirm } from '../../modal_controller.js';
import { DialecticsUI } from '../ui_utils.js';
import { DialecticsLogger } from '../DialecticsLogger.js';
import { OrchestratorState } from './OrchestratorState.js';

export const FloatingEditorManager = {
    open(engine, content = '') {
        const appEngine = window.app || engine;
        const state = OrchestratorState.getState(appEngine);
        const uiLog = window.logDebugWindow || (typeof DialecticsUI !== 'undefined' && DialecticsUI.logDebugWindow ? DialecticsUI.logDebugWindow.bind(DialecticsUI) : null);
        if (uiLog) {
            uiLog('2. Открыт плавающий редактор (open)', { editingBlock: state.editingBlock?.dataset?.id || null, pendingSide: state.pendingSide, pendingRole: state.pendingRole, insertAfterIndex: state.insertAfterIndex });
        }
        DialecticsLogger.info('FloatingEditorManager', 'Открытие плавающего редактора', {
            hasEditingBlock: !!state.editingBlock,
            pendingSide: state.pendingSide,
            pendingRole: state.pendingRole
        });

        if (state.editingBlock) {
            const block = state.editingBlock;
            const titleText = state.originalTitle || block.dataset.title || "";
            const win = this.createFloatingEditor(appEngine, block, content, titleText, state.isExpanded);
            return win;
        } else {
            const blockId = 'new_block_' + (state.pendingSide || 'left');
            const dummyBlock = {
                dataset: {
                    id: blockId,
                    blockId: blockId,
                    side: state.pendingSide || 'left',
                    role: state.pendingRole || 'thesis',
                    status: 'none'
                },
                classList: { contains: () => false, add: () => {}, remove: () => {} }
            };
            const titleText = state.originalTitle || "";
            const win = this.createFloatingEditor(appEngine, dummyBlock, content, titleText, state.isExpanded);
            if (win && win.dataset) {
                win.dataset.targetSide = state.pendingSide || 'left';
                win.dataset.targetRole = state.pendingRole || '';
                if (state.insertAfterIndex !== null && state.insertAfterIndex !== undefined) {
                    win.dataset.insertAfterIndex = String(state.insertAfterIndex);
                } else {
                    delete win.dataset.insertAfterIndex;
                }
            }
            return win;
        }
    },

    createFloatingEditor(engine, block, content, title, fullscreen = false) {
        const state = OrchestratorState.getState(engine);
        const template = document.getElementById('inlineEditor');
        if (template) {
            template.style.display = 'none';
        }

        const blockId = block.dataset ? (block.dataset.id || block.dataset.blockId) : (block.id || 'new_block');
        DialecticsLogger.debug('FloatingEditorManager', `createFloatingEditor для блока ${blockId}`);

        let win = document.querySelector(`.dialectics-floating-editor[data-block-id="${blockId}"]`);
        if (win) {
            this.bringToFront(win);
            if (win._tiptapEditor) {
                win._tiptapEditor.commands.setContent(content);
            }
            return win;
        }

        win = template ? template.cloneNode(true) : document.createElement('div');
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
            DialecticsUI.setupDraggable(win, dragHandle, state);
        }
        const resizeHandle = win.querySelector('#editorResizeHandle') || win.querySelector('.editor-resize-handle');
        if (resizeHandle) {
            resizeHandle.removeAttribute('id');
            DialecticsUI.setupResizable(win, resizeHandle);
        }

        const formatToolbarEl = win.querySelector('#editorFormattingToolbar') || win.querySelector('.editor-formatting-toolbar');
        if (formatToolbarEl) {
            formatToolbarEl.removeAttribute('id');
            formatToolbarEl.classList.add('editor-formatting-toolbar');
            formatToolbarEl.style.marginLeft = '20px';
            formatToolbarEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            formatToolbarEl.style.border = '1px solid #e2e8f0';
            formatToolbarEl.style.padding = '2px 8px';
            formatToolbarEl.style.display = 'flex';
        }

        const tiptapEl = win.querySelector('#tiptap-editor') || win.querySelector('.tiptap-editor');
        if (tiptapEl) {
            tiptapEl.removeAttribute('id');
            tiptapEl.classList.add('tiptap-editor');
            tiptapEl.innerHTML = ''; // Обязательно очищаем клонированный DOM старого редактора перед инициализацией TipTap!
        }

        win.querySelectorAll('.tab-content').forEach(el => {
            if (el.id && el.id.startsWith('editor-')) {
                const tabName = el.id.replace('editor-', '');
                el.dataset.tabContent = tabName;
                el.classList.add(`tab-content-${tabName}`);
            }
        });
        const aiHelpContentEl = win.querySelector('#aiHelpContent');
        if (aiHelpContentEl) aiHelpContentEl.classList.add('ai-help-content');
        const btnCopyAiEl = win.querySelector('#btnCopyAiToText');
        if (btnCopyAiEl) btnCopyAiEl.classList.add('btn-copy-ai-to-text');

        const titleInput = win.querySelector('#editorBlockTitleInput');
        if (titleInput) {
            titleInput.removeAttribute('id');
            titleInput.classList.add('editor-block-title-input');
            titleInput.value = title || "";
            titleInput.addEventListener('input', () => {
                OrchestratorState.markDirty(engine, true);
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
                await this.closeFloatingEditor(engine, blockId);
            };
        }

        // Используем event delegation на win — надёжнее чем поиск по id (id может быть уже убран)
        win.addEventListener('click', async (e) => {
            const saveTgt = e.target.closest('.editor-btn-save, #btnEditorSave');
            if (!saveTgt) return;
            e.stopPropagation();
            const uiLogSave = window.logDebugWindow || null;
            if (uiLogSave) uiLogSave('[OK clicked] blockId=' + blockId);
            try {
                await this.saveFloatingEditor(engine, blockId);
            } catch(err) {
                console.error('[saveBtn] Ошибка:', err);
                if (uiLogSave) uiLogSave('[OK clicked] ОШИБКА: ' + err.message);
            }
        });
        // Убираем id чтобы не дублировать в DOM
        const saveBtnEl = win.querySelector('#btnEditorSave');
        if (saveBtnEl) saveBtnEl.removeAttribute('id');


        this.setupWindowTabs(win);

        const appEngine = window.app || engine;
        const uiLog = window.logDebugWindow || (typeof DialecticsUI !== 'undefined' && DialecticsUI.logDebugWindow ? DialecticsUI.logDebugWindow.bind(DialecticsUI) : null);
        if (uiLog) {
            uiLog('=== СОЗДАНИЕ ПЛАВАЮЩЕГО РЕДАКТОРА ===', { blockId, hasEditor: !!appEngine?.editor, hasCreateEditor: !!(appEngine?.editor && appEngine.editor.createEditor) });
        }

        if (appEngine && appEngine.editor && typeof appEngine.editor.createEditor === 'function') {
            try {
                const editorInstance = appEngine.editor.createEditor(
                    tiptapEl,
                    content,
                    () => {
                        appEngine.editor.tiptap = editorInstance;
                        const live = appEngine.resolveLiveBlock(blockId) || block;
                        if (blockId && blockId.startsWith && blockId.startsWith('new_block')) {
                            OrchestratorState.setEditingBlock(appEngine, null);
                        } else {
                            OrchestratorState.setEditingBlock(appEngine, live);
                        }
                        DialecticsLogger.debug('FloatingEditorManager', `Фокус в окне редактора блока ${blockId}`);
                        if (uiLog) uiLog('=== ФОКУС В ПЛАВАЮЩЕМ РЕДАКТОРЕ ===', { blockId });
                    },
                    () => {
                        OrchestratorState.markDirty(appEngine, true);
                        this.saveAllEditorsState();
                    }
                );

                win._tiptapEditor = editorInstance;
                const liveBlock = appEngine.resolveLiveBlock(blockId) || block;
                if (liveBlock) {
                    liveBlock._floatingEditorWindow = win;
                }
                if (editorInstance) {
                    editorInstance._ownerBlock = liveBlock || block;
                }

                if (formatToolbarEl && appEngine.editor.bindFormattingButtons) {
                    appEngine.editor.bindFormattingButtons(formatToolbarEl, () => editorInstance);
                }
                if (uiLog) uiLog('✅ Плавающий редактор успешно инициализирован', { blockId });
            } catch (err) {
                console.error("Ошибка при создании TipTap в плавающем окне:", err);
                if (uiLog) uiLog('❌ Ошибка catch при создании TipTap в плавающем окне: ' + err.message, { stack: err.stack });
            }
        } else {
            if (uiLog) {
                uiLog('❌ Ошибка плавающего редактора: appEngine.editor.createEditor не найден!', { hasApp: !!window.app, hasEngine: !!engine, hasEditor: !!(appEngine && appEngine.editor) });
            }
        }

        this.saveAllEditorsState();
        return win;
    },

    bringToFront(win) {
        if (!win) return;
        win.style.zIndex = String(this.getNextZIndex());
    },

    getNextZIndex() {
        const windows = document.querySelectorAll('.dialectics-floating-editor');
        let maxZ = 1000;
        windows.forEach(w => {
            const z = parseInt(window.getComputedStyle(w).zIndex || 1000, 10);
            if (!isNaN(z) && z > maxZ) maxZ = z;
        });
        return maxZ + 1;
    },

    setupWindowTabs(win) {
        const tabBtns = win.querySelectorAll('.editor-tab, .editor-tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const targetTab = btn.dataset.tab;
                if (targetTab && window.app && window.app.editor && window.app.editor.switchTab) {
                    window.app.editor.switchTab(targetTab, win);
                } else if (targetTab) {
                    this.switchWindowTab(win, targetTab);
                }
            };
        });
    },

    async switchWindowTab(win, tabId) {
        if (!win) return;
        const tabBtns = win.querySelectorAll('.editor-tab, .editor-tab-btn');
        const tabContents = win.querySelectorAll('.tab-content, .editor-tab-content');

        tabBtns.forEach(b => {
            if (b.dataset.tab === tabId) b.classList.add('active');
            else b.classList.remove('active');
        });

        tabContents.forEach(c => {
            const tabName = c.dataset.tabContent || (c.id ? c.id.replace('editor-', '').replace('tab-', '') : '');
            const isTarget = tabName === tabId || c.id === `tab-${tabId}` || c.id === `editor-${tabId}` || c.classList.contains(`tab-content-${tabId}`) || c.classList.contains(`editor-${tabId}`);
            if (isTarget) {
                c.style.display = 'flex';
                c.classList.add('active');
            } else {
                c.style.display = 'none';
                c.classList.remove('active');
            }
        });

        if (tabId === 'preview') {
            const previewEl = win.querySelector('#editorPreviewContent') || win.querySelector('.editor-preview-content');
            if (previewEl) {
                let html = win._tiptapEditor ? win._tiptapEditor.getHTML() : "";
                const pmEl = win.querySelector('.ProseMirror') || win.querySelector('.tiptap-editor');
                if ((!html || html.trim() === '' || html === '<p></p>') && pmEl) {
                    html = pmEl.innerHTML;
                }
                previewEl.innerHTML = html;
                if (typeof BlockManager.renderMath === 'function') BlockManager.renderMath(previewEl);
            }
        } else if (tabId === 'source') {
            const sourceEl = win.querySelector('#editorSourceCode') || win.querySelector('.editor-source-code');
            if (sourceEl) {
                let html = win._tiptapEditor ? win._tiptapEditor.getHTML() : "";
                const pmEl = win.querySelector('.ProseMirror') || win.querySelector('.tiptap-editor');
                if ((!html || html.trim() === '' || html === '<p></p>') && pmEl) {
                    html = pmEl.innerHTML;
                }
                sourceEl.value = html;
            }
        } else if (tabId === 'visual') {
            const sourceEl = win.querySelector('#editorSourceCode') || win.querySelector('.editor-source-code');
            if (sourceEl && win._tiptapEditor && sourceEl.value !== win._tiptapEditor.getHTML()) {
                win._tiptapEditor.commands.setContent(sourceEl.value);
            }
        }
    },

    async closeFloatingEditor(engine, block) {
        const state = OrchestratorState.getState(engine);
        const blockId = (typeof block === 'string') ? block : (block?.dataset ? (block.dataset.id || block.dataset.blockId) : (block?.id || 'new_block'));
        const win = document.querySelector(`.dialectics-floating-editor[data-block-id="${blockId}"]`);
        if (!win) return;

        // Проверяем isDirty только если редактор реально грязный и есть что терять
        const isNewBlock = blockId && blockId.startsWith('new_block');
        if (state.isDirty) {
            // Для нового блока — просто сбрасываем isDirty и закрываем без подтверждения
            // (контент ещё не сохранён на сервере в любом случае)
            // Для существующего блока — спрашиваем
            if (!isNewBlock) {
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
        }

        this.destroyFloatingEditorWindow(engine, win, blockId);
    },

    destroyFloatingEditorWindow(engine, win, blockOrId) {
        const liveBlock = engine.resolveLiveBlock(blockOrId || win?.dataset?.blockId);
        if (win._tiptapEditor) {
            try {
                win._tiptapEditor.destroy();
            } catch(e) {}
        }
        win.remove();

        if (liveBlock) {
            delete liveBlock._floatingEditorWindow;
            delete liveBlock._tiptapEditor;
            liveBlock.classList.remove('is-editing');
        }
        this.saveAllEditorsState();
    },

    async saveFloatingEditor(engine, block) {
        const state = OrchestratorState.getState(engine);
        const blockId = (typeof block === 'string') ? block : (block?.dataset ? (block.dataset.id || block.dataset.blockId) : (block?.id || 'new_block'));
        const win = document.querySelector(`.dialectics-floating-editor[data-block-id="${blockId}"]`);
        if (!win) return;

        const titleInput = win.querySelector('.editor-block-title-input');
        const customTitle = titleInput ? titleInput.value.trim() : "";

        let html = win._tiptapEditor ? win._tiptapEditor.getHTML() : "";
        const pmEl = win.querySelector('.ProseMirror') || win.querySelector('.tiptap-editor');
        const pmHtml = pmEl ? pmEl.innerHTML : "";
        let activeHtml = "";
        if (engine.editor && engine.editor.tiptap && win.contains(engine.editor.tiptap.options.element)) {
            activeHtml = engine.editor.tiptap.getHTML();
        }

        if ((!html || html.trim() === '' || html === '<p></p>' || html === '\n\n') && pmHtml && pmHtml.trim() !== '' && pmHtml !== '<p><br></p>' && pmHtml !== '<p></p>') {
            html = pmHtml;
        }
        if ((!html || html.trim() === '' || html === '<p></p>' || html === '\n\n') && activeHtml && activeHtml.trim() !== '' && activeHtml !== '<p></p>' && activeHtml !== '\n\n') {
            html = activeHtml;
        }

        const liveBlock = engine.resolveLiveBlock(blockId);
        if (!blockId.startsWith('new_block') && liveBlock && liveBlock.dataset) {
            DialecticsLogger.info('FloatingEditorManager', `Обновление существующего блока ${blockId}`);
            if (customTitle) liveBlock.dataset.title = customTitle;
            else delete liveBlock.dataset.title;

            const inner = liveBlock.querySelector('.dialectics-content-inner');
            if (inner) {
                liveBlock._rawHtml = html;
                inner.innerHTML = html;
                if (typeof BlockManager.renderMath === 'function') BlockManager.renderMath(liveBlock);
            }
            const titleEl = liveBlock.querySelector('.block-title-text');
            if (titleEl) {
                titleEl.innerText = customTitle || (liveBlock.classList.contains('block-section') ? 'Раздел' : (liveBlock.dataset.side === 'center' ? 'Связующий блок' : 'Блок'));
            }

            OrchestratorState.setEditingBlock(engine, liveBlock);
            const globalTitleInput = document.getElementById('editorBlockTitleInput');
            if (globalTitleInput) globalTitleInput.value = customTitle;
            if (engine.editor && engine.editor.tiptap && engine.editor.tiptap === engine.editor.mainTiptap && engine.dom.editor && engine.dom.editor.style.display !== 'none') {
                engine.editor.tiptap.commands.setContent(html);
            }

            if (engine.saveGlobal) await engine.saveGlobal(false, "toast.dialectics_updated");
            OrchestratorState.markDirty(engine, false);
            OrchestratorState.setEditingBlock(engine, null);
        } else {
            DialecticsLogger.info('FloatingEditorManager', `Создание нового блока из плавающего окна`);
            const uiLog2 = window.logDebugWindow || null;
            if (uiLog2) uiLog2('[saveFloatingEditor] html длина=' + html?.length + ' title=' + customTitle + ' html=' + (html || '').substring(0, 80));
            if ((html && html !== '<p></p>' && html.trim() !== '') || customTitle) {
                const currentBlocks = BlockManager.getBlocks(engine.dom.canvas);
                const targetSide = win.dataset.targetSide || (block.dataset && block.dataset.side) || state.pendingSide || 'left';
                const targetRole = win.dataset.targetRole || (block.dataset && block.dataset.role) || state.pendingRole || null;

                let targetIndex = null;
                if (win.dataset.insertAfterIndex !== undefined && win.dataset.insertAfterIndex !== "") {
                    targetIndex = parseInt(win.dataset.insertAfterIndex, 10);
                } else if (state.insertAfterIndex !== null && state.insertAfterIndex !== undefined) {
                    targetIndex = state.insertAfterIndex;
                }

                const newBlock = {
                    id: state.pendingBlockId || ('block_' + Math.random().toString(36).substring(2, 9)),
                    side: targetSide,
                    html: html || '<p></p>',
                    title: customTitle || undefined
                };
                if (targetRole) newBlock.role = targetRole;

                let newBlocks;
                if (targetIndex !== null && !isNaN(targetIndex) && targetIndex >= -1 && targetIndex < currentBlocks.length) {
                    if (targetIndex === -1) newBlocks = [newBlock, ...currentBlocks];
                    else newBlocks = [...currentBlocks.slice(0, targetIndex + 1), newBlock, ...currentBlocks.slice(targetIndex + 1)];
                } else {
                    newBlocks = [...currentBlocks, newBlock];
                }
                state.insertAfterIndex = null;
                state.pendingRole = null;

                if (uiLog2) uiLog2('[saveFloatingEditor] newBlocks.length=' + newBlocks.length + ' newBlock.id=' + newBlock.id + ' newBlock.html=' + (newBlock.html || '').substring(0, 80));
                BlockManager.render(engine.dom.canvas, newBlocks, typeof engine._blockCallbacks === 'function' ? engine._blockCallbacks() : {});
                const blocksAfterRender = BlockManager.getBlocks(engine.dom.canvas);
                if (uiLog2) uiLog2('[saveFloatingEditor] blocksAfterRender.length=' + blocksAfterRender.length + ' ids=' + blocksAfterRender.map(b => b.id).join(','));
                const saveResult = engine.saveGlobal ? await engine.saveGlobal(false) : null;
                if (uiLog2) uiLog2('[saveFloatingEditor] saveResult id=' + saveResult);
            }
            OrchestratorState.markDirty(engine, false);
        }
        this.destroyFloatingEditorWindow(engine, win, block);
    },

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
};
