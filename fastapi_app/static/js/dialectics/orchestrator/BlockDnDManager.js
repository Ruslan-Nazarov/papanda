/**
 * BlockDnDManager.js - Управление событиями холста, подсказками, колбэками блоков и разворачиванием
 */
import { BlockManager } from '../BlockManager.js';
import { customConfirm } from '../../modal_controller.js';
import { DialecticsLogger } from '../DialecticsLogger.js';
import { OrchestratorState } from './OrchestratorState.js';

export const BlockDnDManager = {
    bindEvents(engine) {
        if (engine.dom.btnSave) engine.dom.btnSave.onclick = () => engine.save();
        if (engine.dom.btnCancel) engine.dom.btnCancel.onclick = async () => await engine.close();
        if (engine.dom.btnClose) engine.dom.btnClose.onclick = async () => await engine.close();

        document.addEventListener('click', (e) => {
            const badge = e.target.closest('.dialectics-hint-badge');
            if (badge) {
                e.preventDefault();
                e.stopPropagation();
                const hintEl = badge.closest('.dialectics-hint-block');
                if (hintEl && engine.openHintEditor) {
                    engine.openHintEditor({
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
                if (hintEl && engine.runHintAI) {
                    engine.runHintAI({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                }
                return;
            }
        });

        if (window.BlockManager) {
            window.BlockManager.setCallbacks({
                onEdit: (block) => engine.openEdit(block),
                onEditAltCard: (altCardEl, blockEl) => engine.openEditAltCard(altCardEl, blockEl),
                onDelete: async (deletedBlockId) => {
                    if (deletedBlockId && engine.deleteStickersForBlock) {
                        await engine.deleteStickersForBlock(deletedBlockId);
                    }
                    if (engine.saveGlobal) await engine.saveGlobal(false, "toast.dialectics_updated");
                    const blocks = BlockManager.getBlocks(engine.dom.canvas);
                    BlockManager.render(engine.dom.canvas, blocks, engine._blockCallbacks());
                },
                onHintClick: (hint) => engine.openHintEditor(hint),
                onHintAI: (hint) => (hint && hint.id === 'step3' ? engine.runAI(engine.dom.canvas) : engine.runHintAI(hint)),
                onHacks: (block) => engine.openHacksPopover(block)
            });
        }
        DialecticsLogger.debug('BlockDnDManager', 'Глобальные события холста и колбэки привязаны');
    },

    initHintEvents(engine) {
        const hints = document.querySelectorAll('.dialectics-hint-block');
        hints.forEach(hintEl => {
            const btnAI = hintEl.querySelector('.btn-hint-ai');
            if (btnAI) {
                btnAI.onclick = (e) => {
                    e.stopPropagation();
                    if (engine.runHintAI) {
                        engine.runHintAI({
                            id: hintEl.dataset.stepId || hintEl.dataset.id,
                            side: hintEl.dataset.side
                        });
                    }
                };
            }

            hintEl.onclick = () => {
                if (engine.openHintEditor) {
                    engine.openHintEditor({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                }
            };
        });
    },

    async openHintEditor(engine, hint, content = '', aiHtml = null) {
        const state = OrchestratorState.getState(engine);
        if (state.isDirty) {
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
        OrchestratorState.setEditingBlock(engine, null, {
            pendingSide: hint.side,
            pendingRole: hint.id
        });
        state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        state.insertAfterIndex = null;
        const win = engine.open ? engine.open(content) : null;
        const activeWin = win || document.querySelector('.dialectics-floating-editor:not([style*="display: none"])') || document;
        const titleInput = activeWin.querySelector('#editorBlockTitleInput, .editor-block-title-input') || document.getElementById('editorBlockTitleInput');
        if (titleInput) titleInput.value = "";

        const aiTab = activeWin.querySelector('#tab-ai, [data-tab="ai"], .editor-tab[data-tab="ai"]') || document.getElementById('tab-ai');
        if (aiHtml) {
            if (aiTab) aiTab.style.display = 'flex';
            const aiContainer = activeWin.querySelector('#aiHelpContent, .ai-help-content') || document.getElementById('aiHelpContent');
            if (aiContainer) aiContainer.innerHTML = aiHtml;
            const copyBtn = activeWin.querySelector('#btnCopyAiToText, .btn-copy-ai-to-text') || document.getElementById('btnCopyAiToText');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    if (engine.editor && engine.editor.setContent) engine.editor.setContent(aiHtml);
                    else if (activeWin && activeWin._tiptapEditor) activeWin._tiptapEditor.commands.setContent(aiHtml);
                    if (engine.editor && engine.editor.switchTab) engine.editor.switchTab('text', activeWin);
                    if (window.showToast) window.showToast(window._("dialectics.ai_transferred", "Текст от ИИ перенесен в редактор"), "success");
                };
            }
            if (engine.editor && engine.editor.switchTab) engine.editor.switchTab('ai', activeWin);
        } else {
            if (aiTab) aiTab.style.display = 'none';
        }
    },

    toggleExpand(engine) {
        const state = OrchestratorState.getState(engine);
        state.isExpanded = !state.isExpanded;
        if (engine.dom && engine.dom.editor) {
            engine.dom.editor.classList.toggle('expanded', state.isExpanded);
            if (engine.dom.backdrop) engine.dom.backdrop.style.display = state.isExpanded ? 'block' : 'none';
        }
        setTimeout(() => {
            const wrapper = document.getElementById('shapesCanvasWrapper');
            const fabricCanvas = engine.editor && engine.editor.fabricCanvas;
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
        }, 320);
    },

    dismissHint(engine, hintId) {
        const state = OrchestratorState.getState(engine);
        if (!state.dismissedHints) state.dismissedHints = [];
        if (!state.dismissedHints.includes(hintId)) {
            state.dismissedHints.push(hintId);
            try {
                const key = state.currentNoteId ? ('dialectics_dismissed_hints_' + state.currentNoteId) : 'dialectics_dismissed_hints_temp';
                localStorage.setItem(key, JSON.stringify(state.dismissedHints));
            } catch(e) {}
        }
        const blocks = BlockManager.getBlocks(engine.dom.canvas);
        BlockManager.render(engine.dom.canvas, blocks, engine._blockCallbacks());
    },

    toggleShowHiddenHints(engine, checked) {
        try {
            localStorage.setItem('dialectics_show_hidden_hints', checked ? 'true' : 'false');
        } catch(e) {}
        const blocks = BlockManager.getBlocks(engine.dom.canvas);
        BlockManager.render(engine.dom.canvas, blocks, engine._blockCallbacks());
    },

    getBlockCallbacks(engine) {
        const callMethod = (name, ...args) => {
            if (engine && typeof engine[name] === 'function') return engine[name](...args);
            if (window.app && typeof window.app[name] === 'function') return window.app[name](...args);
        };
        return {
            onEdit: (b) => {
                if (b.classList.contains('block-section') || b.dataset.isSection === 'true') {
                    callMethod('openSectionTitleModal', null, b);
                    return;
                }
                const blockStatus = b.dataset.status || 'none';
                if (blockStatus === 'ready') {
                    if (window.showToast) window.showToast('Этот блок заблокирован. Смените статус на «В работе», чтобы изменить его.', 'warning');
                    return;
                }
                callMethod('openEdit', b);
            },
            onEditAltCard: (altCardEl, blockEl) => callMethod('openEditAltCard', altCardEl, blockEl),
            onInsertAfter: (side, index) => callMethod('openInsertAfter', side, index),
            onDelete: async (deletedBlockId) => {
                if (deletedBlockId) {
                    await callMethod('deleteStickersForBlock', deletedBlockId);
                }
                await callMethod('saveGlobal', false, "toast.dialectics_updated");
                const blocks = BlockManager.getBlocks(engine.dom.canvas);
                BlockManager.render(engine.dom.canvas, blocks, engine._blockCallbacks());
            },
            onAI: (b) => callMethod('runAI', b),
            onCheckAI: (b) => callMethod('checkAI', b),
            onSources: (b) => callMethod('openSourcesModal', b),
            onWords: (b) => callMethod('openWordsModal', b),
            onColor: (b) => callMethod('openColorModal', b),
            onHintClick: (hint) => callMethod('openHintEditor', hint),
            onHintAI: (hint) => {
                if (hint && hint.id === 'step3') {
                    callMethod('runAI', engine.dom.canvas);
                } else {
                    callMethod('runHintAI', hint);
                }
            },
            onHintDismiss: (hintId) => callMethod('dismissHint', hintId),
            onFoldToggle: () => callMethod('saveGlobal', false, null),
            onHacks: (b) => callMethod('openHacksPopover', b),
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

                const blocks = BlockManager.getBlocks(engine.dom.canvas);
                BlockManager.render(engine.dom.canvas, blocks, engine._blockCallbacks());
                if (engine.saveGlobal) await engine.saveGlobal(false, null);
            }
        };
    }
};
