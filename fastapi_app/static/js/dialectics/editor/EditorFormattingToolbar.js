/**
 * EditorFormattingToolbar.js - Обработка панели форматирования TipTap (жирный, курсив, вопросы, скрытые фразы, ссылки на блоки)
 */
import { customConfirm, customPrompt, customSelectBlockPrompt } from '../../modal_controller.js';

export const EditorFormattingToolbar = {
    bindFormattingButtons(editorManager, toolbarEl, getEditorFunc) {
        if (!toolbarEl) return;
        toolbarEl.querySelectorAll('.format-btn').forEach(btn => {
            btn.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };
            btn.ontouchstart = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };
            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const format = btn.dataset.format;
                const targetEditor = typeof getEditorFunc === 'function' ? getEditorFunc() : (editorManager.tiptap || editorManager.mainTiptap);
                if (!format || !targetEditor) return;

                editorManager.tiptap = targetEditor;
                editorManager._syncOwnerBlock(targetEditor);
                const uiLog = window.logDebugWindow || (typeof DialecticsUI !== 'undefined' && DialecticsUI.logDebugWindow ? DialecticsUI.logDebugWindow.bind(DialecticsUI) : null);
                if (uiLog) {
                    const bId = targetEditor._ownerBlock ? (targetEditor._ownerBlock.dataset?.blockId || targetEditor._ownerBlock.dataset?.id || 'block') : (targetEditor.options.element ? (targetEditor.options.element.closest('.dialectics-floating-editor')?.dataset?.blockId || 'new_block') : 'unknown');
                    uiLog('Нажата кнопка форматирования верхнего меню', { format, targetBlockId: bId });
                }

                let chain = targetEditor.chain().focus();
                if (format === 'bold') chain.toggleBold().run();
                else if (format === 'italic') chain.toggleItalic().run();
                else if (format === 'underline') chain.toggleUnderline().run();
                else if (format === 'strike') chain.toggleStrike().run();
                else if (format === 'code') chain.toggleCode().run();
                else if (format === 'question') {
                    const { from, to } = targetEditor.state.selection;
                    const getMarkRangeAtPos = (state, markName) => {
                        const { $from } = state.selection;
                        const markType = state.schema.marks[markName];
                        if (!markType || !markType.isInSet($from.marks())) return null;
                        let start = $from.pos;
                        let end = $from.pos;
                        while (start > 0 && markType.isInSet(state.doc.resolve(start - 1).marks())) start--;
                        while (end < state.doc.content.size && markType.isInSet(state.doc.resolve(end + 1).marks())) end++;
                        return { from: start, to: end };
                    };

                    const hasMarkInRange = (state, markName, f, t) => {
                        const markType = state.schema.marks[markName];
                        if (!markType) return false;
                        let found = false;
                        state.doc.nodesBetween(f, t, (node) => {
                            if (node.isInline && node.marks && markType.isInSet(node.marks)) {
                                found = true;
                                return false;
                            }
                        });
                        return found;
                    };

                    const hasQuestion = hasMarkInRange(targetEditor.state, 'questionMark', from, to);

                    if (hasQuestion) {
                        const action = await customConfirm({
                            title: 'Вопрос к тексту',
                            message: 'Выберите действие для вопроса в выделенной области:',
                            buttons: [
                                { label: 'Отмена', value: 'cancel', class: 'confirm-btn-secondary' },
                                { label: 'Удалить свойство', value: 'remove', class: 'confirm-btn-danger' },
                                { label: 'Изменить вопрос', value: 'edit', class: 'confirm-btn-primary' }
                            ]
                        });
                        if (action === 'remove') {
                            targetEditor.chain().focus().setTextSelection({ from, to }).unsetMark('questionMark').run();
                            return;
                        } else if (action !== 'edit') {
                            return;
                        }
                    }

                    const range = getMarkRangeAtPos(targetEditor.state, 'questionMark') || { from, to };
                    const attrs = targetEditor.getAttributes('questionMark');
                    const currentTitle = attrs.title || '';

                    if (from === to && !hasQuestion) {
                        if (window.showToast) window.showToast('Сначала выделите текст для отметки вопроса', 'warning');
                        return;
                    }

                    const qText = await customPrompt({
                        title: 'Вопрос к выделенному тексту',
                        message: 'В чём заключается вопрос или неясность? (оставьте пустым для удаления):',
                        placeholder: 'Например: Не совсем ясен вывод формулы...',
                        value: currentTitle,
                        okLabel: 'Сохранить',
                        cancelLabel: 'Отмена'
                    });
                    if (qText === null) {
                        // Cancel
                    } else if (qText.trim() === '') {
                        targetEditor.chain().focus().setTextSelection(range).unsetMark('questionMark').run();
                    } else {
                        targetEditor.chain().focus().setTextSelection(range).setMark('questionMark', { title: qText.trim() }).setTextSelection(range.to).run();
                    }
                }
                else if (format === 'hiddenPhrase') {
                    const { from, to } = targetEditor.state.selection;
                    const getMarkRangeAtPos = (state, markName) => {
                        const { $from } = state.selection;
                        const markType = state.schema.marks[markName];
                        if (!markType || !markType.isInSet($from.marks())) return null;
                        let start = $from.pos;
                        let end = $from.pos;
                        while (start > 0 && markType.isInSet(state.doc.resolve(start - 1).marks())) start--;
                        while (end < state.doc.content.size && markType.isInSet(state.doc.resolve(end + 1).marks())) end++;
                        return { from: start, to: end };
                    };

                    const hasMarkInRange = (state, markName, f, t) => {
                        const markType = state.schema.marks[markName];
                        if (!markType) return false;
                        let found = false;
                        state.doc.nodesBetween(f, t, (node) => {
                            if (node.isInline && node.marks && markType.isInSet(node.marks)) {
                                found = true;
                                return false;
                            }
                        });
                        return found;
                    };

                    const hasHidden = hasMarkInRange(targetEditor.state, 'hiddenPhrase', from, to);

                    if (hasHidden) {
                        const action = await customConfirm({
                            title: 'Скрытый текст',
                            message: 'Выберите действие для скрытого текста в выделенной области:',
                            buttons: [
                                { label: 'Отмена', value: 'cancel', class: 'confirm-btn-secondary' },
                                { label: 'Удалить свойство', value: 'remove', class: 'confirm-btn-danger' },
                                { label: 'Изменить пояснение', value: 'edit', class: 'confirm-btn-primary' }
                            ]
                        });
                        if (action === 'remove') {
                            targetEditor.chain().focus().setTextSelection({ from, to }).unsetMark('hiddenPhrase').run();
                            return;
                        } else if (action !== 'edit') {
                            return;
                        }
                    }

                    const range = getMarkRangeAtPos(targetEditor.state, 'hiddenPhrase') || { from, to };
                    const attrs = targetEditor.getAttributes('hiddenPhrase');
                    const currentNote = attrs.note || '';

                    if (from === to && !hasHidden) {
                        if (window.showToast) window.showToast('Сначала выделите текст для скрытой фразы', 'warning');
                        return;
                    }

                    const noteText = await customPrompt({
                        title: window._ ? window._('dialectics.add_hidden_phrase', '👁 Добавить скрытую фразу') : '👁 Добавить скрытую фразу',
                        message: window._ ? window._('dialectics.hidden_phrase_prompt', 'Введите текст пояснения или сноски (оставьте пустым для удаления):') : 'Введите текст пояснения или сноски (оставьте пустым для удаления):',
                        placeholder: 'Например: наука о всеобщих законах развития...',
                        value: currentNote,
                        okLabel: window._ ? window._('ok', 'Сохранить') : 'Сохранить',
                        cancelLabel: window._ ? window._('cancel', 'Отмена') : 'Отмена'
                    });
                    if (noteText === null) {
                        // Cancel
                    } else if (noteText.trim() === '') {
                        targetEditor.chain().focus().setTextSelection(range).unsetMark('hiddenPhrase').run();
                    } else {
                        targetEditor.chain().focus().setTextSelection(range).setMark('hiddenPhrase', { note: noteText.trim(), expanded: 'false' }).setTextSelection(range.to).run();
                    }
                }
                else if (format === 'blockLink') {
                    if (targetEditor.isActive('blockLink')) {
                        targetEditor.chain().focus().unsetMark('blockLink').run();
                    } else {
                        const { from, to } = targetEditor.state.selection;

                        const blocks = [];
                        const currentBlock = targetEditor._ownerBlock || (editorManager.engine && editorManager.engine.state ? editorManager.engine.state.editingBlock : null);
                        const currentId = currentBlock ? (currentBlock.dataset.blockId || currentBlock.dataset.id) : null;
                        if (editorManager.engine && editorManager.engine.dom && editorManager.engine.dom.canvas) {
                            const allEls = editorManager.engine.dom.canvas.querySelectorAll('.dialectics-block');
                            allEls.forEach((b, idx) => {
                                const id = b.dataset.blockId || b.dataset.id;
                                const isSection = b.classList.contains('block-section') || b.dataset.isSection === 'true';
                                let title = b.dataset.title;
                                if (!title) {
                                    const headerSpan = b.querySelector('.dialectics-block-header span:first-child');
                                    title = headerSpan ? headerSpan.innerText : (isSection ? 'Раздел' : `Блок ${idx + 1}`);
                                }
                                if (id && id !== currentId) {
                                    blocks.push({ id, title: title.trim(), icon: isSection ? '📑' : '▪️' });
                                }
                            });
                        }


                        const selected = await customSelectBlockPrompt({
                            title: '🔗 Выберите блок для ссылки',
                            blocks: blocks
                        });
                        if (selected) {
                            if (from === to) {
                                const linkText = selected.title || 'Ссылка';
                                targetEditor.chain().focus().insertContent(linkText)
                                    .setTextSelection({ from, to: from + linkText.length })
                                    .setMark('blockLink', { 
                                        targetId: selected.id, 
                                        targetTitle: selected.title,
                                        targetNoteId: selected.noteId || '',
                                        targetNoteTitle: selected.noteTitle || ''
                                    })
                                    .setTextSelection(from + linkText.length)
                                    .run();
                            } else {
                                targetEditor.chain().focus().setTextSelection({ from, to }).setMark('blockLink', { 
                                    targetId: selected.id, 
                                    targetTitle: selected.title,
                                    targetNoteId: selected.noteId || '',
                                    targetNoteTitle: selected.noteTitle || ''
                                }).setTextSelection(to).run();
                            }
                        }
                    }
                }
                else if (format === 'quote') chain.toggleQuoteBlock().run();
                else if (format === 'clear') chain.unsetAllMarks().clearNodes().run();

                editorManager.updateFormattingToolbarStates(targetEditor);
            };
        });
    },

    updateFormattingToolbarStates(editorManager, editorInstance = null) {
        const currentEditor = editorInstance || editorManager.tiptap;
        if (!currentEditor) return;

        const windowEl = currentEditor.options.element ? currentEditor.options.element.closest('.dialectics-floating-editor, .dialectics-inline-editor-container') : null;
        const toolbars = windowEl ? 
            windowEl.querySelectorAll('.editor-formatting-toolbar, #editorFormattingToolbar') : 
            document.querySelectorAll('.editor-formatting-toolbar, #editorFormattingToolbar');

        const context = windowEl || document;
        const activeTabEl = context.querySelector('.editor-tab.active');
        const activeTab = activeTabEl ? activeTabEl.dataset.tab : 'text';
        const shouldShow = (activeTab === 'text');

        toolbars.forEach(toolbar => {
            if (shouldShow) {
                toolbar.style.display = 'inline-flex';
                toolbar.querySelectorAll('.format-btn').forEach(btn => {
                    const format = btn.dataset.format;
                    const isActive = format === 'question' ? currentEditor.isActive('questionMark') : 
                                     format === 'hiddenPhrase' ? currentEditor.isActive('hiddenPhrase') :
                                     format === 'blockLink' ? currentEditor.isActive('blockLink') :
                                     format === 'quote' ? currentEditor.isActive('quoteBlock') :
                                     currentEditor.isActive(format);
                    btn.classList.toggle('active', isActive);
                });
            } else {
                toolbar.style.display = 'none';
            }
        });
    }
};
