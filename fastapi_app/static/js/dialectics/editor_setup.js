/**
 * editor_setup.js - Настройка TipTap и кастомных узлов
 */
import { Node, Mark, Extension, mergeAttributes, InputRule } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import katex from 'katex';
import { customPrompt, customLatexPrompt } from '../modal_controller.js';

export const QuestionMark = Mark.create({
    name: 'questionMark',
    inclusive: false,

    addAttributes() {
        return {
            title: {
                default: 'Есть вопрос, непонятно',
                parseHTML: element => element.getAttribute('title'),
                renderHTML: attributes => {
                    return {
                        title: attributes.title,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-question="true"]',
            },
            {
                tag: 'span.dialectics-question-highlight',
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                class: 'dialectics-question-highlight',
                'data-question': 'true',
            }),
            0,
        ];
    },

    addCommands() {
        return {
            toggleQuestionMark:
                (attributes) =>
                ({ commands }) => {
                    return commands.toggleMark(this.name, attributes);
                },
        };
    },
});

export const HiddenPhraseMark = Mark.create({
    name: 'hiddenPhrase',
    inclusive: false,

    addAttributes() {
        return {
            note: {
                default: 'Пояснение',
                parseHTML: element => element.getAttribute('data-note') || 'Пояснение',
                renderHTML: attributes => {
                    return {
                        'data-note': attributes.note,
                    };
                },
            },
            expanded: {
                default: 'false',
                parseHTML: element => element.getAttribute('data-expanded') || 'false',
                renderHTML: attributes => {
                    return {
                        'data-expanded': attributes.expanded,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-hidden-phrase="true"]',
            },
            {
                tag: 'span.dialectics-hidden-phrase',
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                class: 'dialectics-hidden-phrase',
                'data-hidden-phrase': 'true',
            }),
            0,
        ];
    },

    addCommands() {
        return {
            toggleHiddenPhrase:
                (attributes) =>
                ({ commands }) => {
                    return commands.toggleMark(this.name, attributes);
                },
        };
    },
});

export const BlockLinkMark = Mark.create({
    name: 'blockLink',
    inclusive: false,

    addAttributes() {
        return {
            targetId: {
                default: '',
                parseHTML: element => element.getAttribute('data-target-id') || '',
                renderHTML: attributes => {
                    return { 'data-target-id': attributes.targetId };
                },
            },
            targetTitle: {
                default: '',
                parseHTML: element => element.getAttribute('data-target-title') || '',
                renderHTML: attributes => {
                    return { 'data-target-title': attributes.targetTitle };
                },
            },
            targetNoteId: {
                default: '',
                parseHTML: element => element.getAttribute('data-target-note-id') || '',
                renderHTML: attributes => {
                    if (!attributes.targetNoteId) return {};
                    return { 'data-target-note-id': attributes.targetNoteId };
                },
            },
            targetNoteTitle: {
                default: '',
                parseHTML: element => element.getAttribute('data-target-note-title') || '',
                renderHTML: attributes => {
                    if (!attributes.targetNoteTitle) return {};
                    return { 'data-target-note-title': attributes.targetNoteTitle };
                },
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'span[data-block-link="true"]' },
            { tag: 'span.dialectics-block-link' }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                class: 'dialectics-block-link',
                'data-block-link': 'true',
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setBlockLink:
                (attributes) =>
                ({ commands }) => {
                    return commands.setMark(this.name, attributes);
                },
            unsetBlockLink:
                () =>
                ({ commands }) => {
                    return commands.unsetMark(this.name);
                },
            toggleBlockLink:
                (attributes) =>
                ({ commands }) => {
                    return commands.toggleMark(this.name, attributes);
                },
        };
    },
});

export const ResizableImage = Image.extend({
    draggable: true,
    inline: false,
    group: 'block',
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '400px',
                parseHTML: element => element.style.width || element.getAttribute('width') || '400px',
                renderHTML: attributes => ({
                    width: attributes.width,
                    style: `width: ${attributes.width}; height: auto; cursor: pointer;`,
                }),
            },
            fabricData: {
                default: null,
                parseHTML: element => element.getAttribute('data-fabric'),
                renderHTML: attributes => {
                    if (!attributes.fabricData) return {};
                    return { 'data-fabric': attributes.fabricData };
                }
            }
        };
    },
    addNodeView() {
        return ({ node, getPos, editor }) => {
            const container = document.createElement('div');
            container.className = 'resizable-image-container';
            container.contentEditable = 'false';
            container.style.display = 'block';
            container.draggable = true;
            container.setAttribute('data-drag-handle', '');

            const img = document.createElement('img');
            img.src = node.attrs.src;
            img.style.width = node.attrs.width;

            const handle = document.createElement('div');
            handle.className = 'resize-handle';

            container.appendChild(img);
            container.appendChild(handle);

            img.ondblclick = () => {
                if (node.attrs.fabricData && window.app && window.app.editor) {
                    window.app.editor.switchTab('shapes');
                    const c = window.app.editor.fabricCanvas;
                    if (c) {
                        try {
                            const jsonStr = decodeURIComponent(atob(node.attrs.fabricData));
                            c.loadFromJSON(jsonStr, () => {
                                c.renderAll();
                            });
                        } catch (e) {
                            console.error("Failed to parse fabricData", e);
                        }
                    }
                }
            };

            let isResizing = false;
            let startX, startWidth;

            handle.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                isResizing = true;
                startX = e.clientX;
                startWidth = img.offsetWidth;
                container.classList.add('resizing');

                const onMouseMove = (ev) => {
                    if (!isResizing) return;
                    const newWidth = Math.max(50, startWidth + (ev.clientX - startX));
                    img.style.width = `${newWidth}px`;
                };

                const onMouseUp = () => {
                    isResizing = false;
                    container.classList.remove('resizing');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    if (typeof getPos === 'function') {
                        editor.view.dispatch(
                            editor.view.state.tr.setNodeMarkup(getPos(), null, {
                                ...node.attrs,
                                width: img.style.width,
                            })
                        );
                    }
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            return {
                dom: container,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== node.type.name) return false;

                    if (updatedNode.attrs.src !== node.attrs.src) {
                        img.src = updatedNode.attrs.src;
                    }
                    if (updatedNode.attrs.width !== node.attrs.width) {
                        img.style.width = updatedNode.attrs.width;
                    }
                    return true;
                },
                ignoreMutation: () => true,
                stopEvent: (event) => {
                    // Разрешаем события внутри контейнера для ручки изменения размера
                    return handle.contains(event.target);
                }
            };
        };
    },
});

export const MathNode = Node.create({
    name: 'mathNode',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            latex: {
                default: ''
            }
        };
    },

    addInputRules() {
        return [
            new InputRule({
                find: /\$([^$]+)\$$/,
                handler: ({ state, range, match }) => {
                    const { tr } = state;
                    const start = range.from;
                    const end = range.to;
                    tr.replaceWith(start, end, this.type.create({ latex: match[1] }));
                },
            }),
        ];
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="mathNode"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'mathNode' })];
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const dom = document.createElement('span');
            dom.classList.add('math-node');
            dom.setAttribute('data-type', 'mathNode');
            
            try {
                const cleanLatex = (node.attrs.latex || "").replace(/\\softmax\b/g, '\\operatorname{softmax}');
                katex.render(cleanLatex, dom, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (err) {
                dom.textContent = node.attrs.latex;
                dom.style.color = 'red';
            }
            
            dom.ondblclick = async (e) => {
                e.stopPropagation();
                const newLatex = await customLatexPrompt({
                    title: '✍ Редактор формулы (LaTeX)',
                    value: node.attrs.latex,
                    okLabel: 'Сохранить',
                    cancelLabel: 'Отмена'
                });
                
                if (newLatex !== null && typeof getPos === 'function') {
                    editor.view.dispatch(
                        editor.view.state.tr.setNodeMarkup(getPos(), null, {
                            ...node.attrs,
                            latex: newLatex,
                        })
                    );
                }
            };
            
            return {
                dom,
            };
        };
    },
});

export const QuoteBlock = Node.create({
    name: 'quoteBlock',
    group: 'block',
    content: 'block+',

    addAttributes() {
        return {
            author: {
                default: '',
                parseHTML: element => element.getAttribute('data-author') || '',
                renderHTML: attributes => {
                    if (!attributes.author) return {};
                    return { 'data-author': attributes.author };
                }
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'blockquote[data-type="quoteBlock"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'blockquote',
            mergeAttributes(HTMLAttributes, { 'data-type': 'quoteBlock', class: 'modern-blockquote' }),
            0
        ];
    },

    addCommands() {
        return {
            toggleQuoteBlock:
                () =>
                ({ commands }) => {
                    return commands.toggleWrap(this.name);
                },
        };
    },

    addKeyboardShortcuts() {
        return {
            // Enter в пустом параграфе в конце цитаты → выйти из блока
            Enter: ({ editor }) => {
                const { state } = editor;
                const { $from, empty } = state.selection;

                if (!empty) return false;
                // Текущий параграф должен быть пустым
                if ($from.parent.content.size > 0) return false;

                // Найти quoteBlock среди предков
                let quoteDepth = -1;
                for (let d = $from.depth; d > 0; d--) {
                    if ($from.node(d).type.name === 'quoteBlock') {
                        quoteDepth = d;
                        break;
                    }
                }
                if (quoteDepth === -1) return false;

                const quoteNode = $from.node(quoteDepth);
                // Только если это последний ребёнок в цитате
                if (quoteNode.lastChild !== $from.parent) return false;

                const quoteEnd = $from.after(quoteDepth); // позиция после </blockquote>

                if (quoteNode.childCount > 1) {
                    // Удалить пустой параграф, добавить параграф снаружи цитаты
                    const emptyFrom = $from.before($from.depth);
                    const emptyTo   = $from.after($from.depth);
                    const deletedSize = emptyTo - emptyFrom;
                    const newParaPos = quoteEnd - deletedSize;

                    return editor.chain()
                        .deleteRange({ from: emptyFrom, to: emptyTo })
                        .insertContentAt(newParaPos, { type: 'paragraph' })
                        .setTextSelection(newParaPos + 1)
                        .run();
                } else {
                    // Единственный параграф — просто добавить снаружи и перейти туда
                    return editor.chain()
                        .insertContentAt(quoteEnd, { type: 'paragraph' })
                        .setTextSelection(quoteEnd + 1)
                        .run();
                }
            },
        };
    },

    addNodeView() {
        return ({ node: initNode, getPos, editor }) => {
            let currentNode = initNode;

            const dom = document.createElement('blockquote');
            dom.className = 'modern-blockquote';
            dom.setAttribute('data-type', 'quoteBlock');
            if (currentNode.attrs.author) {
                dom.setAttribute('data-author', currentNode.attrs.author);
            }

            const contentDOM = document.createElement('div');
            contentDOM.className = 'quote-content';
            dom.appendChild(contentDOM);

            const authorDiv = document.createElement('div');
            authorDiv.className = 'quote-author-line';
            authorDiv.contentEditable = 'false';

            const authorSpan = document.createElement('span');
            authorSpan.className = 'quote-author-text';

            const refreshAuthor = (author) => {
                authorSpan.textContent = author ? `— ${author}` : '— Указать автора/источник...';
                authorSpan.classList.toggle('empty', !author);
                if (author) {
                    dom.setAttribute('data-author', author);
                } else {
                    dom.removeAttribute('data-author');
                }
            };

            refreshAuthor(currentNode.attrs.author);

            authorSpan.onclick = async (e) => {
                e.stopPropagation();
                const newAuthor = await customPrompt({
                    title: '✍ Автор или источник цитаты',
                    placeholder: 'Например: И. Кант, «Критика чистого разума»',
                    value: currentNode.attrs.author
                });
                if (newAuthor !== null && typeof getPos === 'function') {
                    editor.view.dispatch(
                        editor.view.state.tr.setNodeMarkup(getPos(), null, {
                            ...currentNode.attrs,
                            author: newAuthor.trim()
                        })
                    );
                }
            };

            authorDiv.appendChild(authorSpan);
            dom.appendChild(authorDiv);

            return {
                dom,
                contentDOM,
                // update() возвращает true → ProseMirror переиспользует этот NodeView
                // вместо пересоздания (предотвращает дублирование authorDiv)
                update(updatedNode) {
                    if (updatedNode.type.name !== 'quoteBlock') return false;
                    currentNode = updatedNode;
                    refreshAuthor(updatedNode.attrs.author);
                    return true;
                },
            };
        };
    }
});

// Глобальный обработчик для интерактивных скрытых фраз (инлайн-сносок)
if (typeof window !== 'undefined' && !window._hiddenPhraseHandlerInitialized) {
    window._hiddenPhraseHandlerInitialized = true;

    document.addEventListener('click', (e) => {
        const hiddenPhraseEl = e.target.closest('.dialectics-hidden-phrase');
        if (hiddenPhraseEl) {
            if (hiddenPhraseEl.closest('[contenteditable="true"]')) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            const current = hiddenPhraseEl.getAttribute('data-expanded') === 'true';
            const nextState = !current ? 'true' : 'false';
            hiddenPhraseEl.setAttribute('data-expanded', nextState);

            if (window.app && window.app.editor && window.app.editor.tiptap) {
                const editor = window.app.editor.tiptap;
                const pos = editor.view.posAtDOM(hiddenPhraseEl, 0);
                if (pos >= 0) {
                    const { doc } = editor.state;
                    let tr = editor.state.tr;
                    let found = false;
                    doc.nodesBetween(Math.max(0, pos - 2), Math.min(doc.content.size, pos + 2), (node, nPos) => {
                        if (node.isInline) {
                            node.marks.forEach(mark => {
                                if (mark.type.name === 'hiddenPhrase') {
                                    tr = tr.removeMark(nPos, nPos + node.nodeSize, mark.type);
                                    tr = tr.addMark(nPos, nPos + node.nodeSize, mark.type.create({ ...mark.attrs, expanded: nextState }));
                                    found = true;
                                }
                            });
                        }
                    });
                    if (found) {
                        editor.view.dispatch(tr);
                    }
                }
            }
        }
    });

    window.toggleAllHiddenPhrases = function() {
        const allPhrases = document.querySelectorAll('.dialectics-hidden-phrase');
        if (!allPhrases.length) return;
        let anyCollapsed = false;
        allPhrases.forEach(el => {
            if (el.getAttribute('data-expanded') !== 'true') anyCollapsed = true;
        });
        const targetState = anyCollapsed ? 'true' : 'false';
        allPhrases.forEach(el => {
            el.setAttribute('data-expanded', targetState);
        });

        if (window.app && window.app.editor && window.app.editor.tiptap) {
            const editor = window.app.editor.tiptap;
            const { doc } = editor.state;
            let tr = editor.state.tr;
            let modified = false;
            doc.descendants((node, pos) => {
                if (node.isInline) {
                    node.marks.forEach(mark => {
                        if (mark.type.name === 'hiddenPhrase' && mark.attrs.expanded !== targetState) {
                            tr = tr.removeMark(pos, pos + node.nodeSize, mark.type);
                            tr = tr.addMark(pos, pos + node.nodeSize, mark.type.create({ ...mark.attrs, expanded: targetState }));
                            modified = true;
                        }
                    });
                }
            });
            if (modified) {
                editor.view.dispatch(tr);
            }
        }
    };
}

// Глобальный обработчик для интерактивных ссылок между блоками (смарт-чипы)
if (typeof window !== 'undefined' && !window._blockLinkHandlerInitialized) {
    window._blockLinkHandlerInitialized = true;

    document.addEventListener('click', async (e) => {
        const linkEl = e.target.closest('.dialectics-block-link');
        if (linkEl) {
            e.preventDefault();
            e.stopPropagation();
            const targetId = linkEl.getAttribute('data-target-id');
            const targetNoteId = linkEl.getAttribute('data-target-note-id');
            if (!targetId) return;

            const scrollAndHighlight = (blockId) => {
                const targetBlock = document.querySelector(`.dialectics-block[data-block-id="${blockId}"], .dialectics-block[data-id="${blockId}"]`);
                if (targetBlock) {
                    targetBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetBlock.style.transition = 'box-shadow 0.5s ease';
                    const origBoxShadow = targetBlock.style.boxShadow;
                    targetBlock.style.boxShadow = '0 0 0 4px #3b82f6, 0 0 25px rgba(59, 130, 246, 0.5)';
                    setTimeout(() => { targetBlock.style.boxShadow = origBoxShadow; }, 2000);
                    return true;
                }
                return false;
            };

            if (targetNoteId) {
                if (window.app && typeof window.app.loadNoteToEditor === 'function') {
                    await window.app.loadNoteToEditor(targetNoteId);
                    // Wait a bit for rendering
                    setTimeout(() => {
                        if (!scrollAndHighlight(targetId)) {
                            if (window.showToast) window.showToast('Целевой блок не найден в загруженном конспекте', 'warning');
                        }
                    }, 300);
                } else {
                    if (window.showToast) window.showToast('Не удалось загрузить целевой конспект', 'warning');
                }
            } else {
                if (!scrollAndHighlight(targetId)) {
                    if (window.showToast) {
                        window.showToast('Целевой блок не найден на холсте', 'warning');
                    }
                }
            }
        }
    });

    let hoverTimeout = null;
    let previewPopover = null;

    function removePreview() {
        if (previewPopover) {
            previewPopover.remove();
            previewPopover = null;
        }
    }

    document.addEventListener('mouseover', (e) => {
        const linkEl = e.target.closest('.dialectics-block-link');
        if (linkEl) {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            removePreview();

            const targetId = linkEl.getAttribute('data-target-id');
            const targetNoteId = linkEl.getAttribute('data-target-note-id');
            const targetNoteTitle = linkEl.getAttribute('data-target-note-title');
            let targetTitle = linkEl.getAttribute('data-target-title') || 'Связанный блок';
            
            if (targetNoteTitle) {
                targetTitle += ` (в "${targetNoteTitle}")`;
            }

            const targetBlock = document.querySelector(`.dialectics-block[data-block-id="${targetId}"], .dialectics-block[data-id="${targetId}"]`);

            let previewText = 'Текст блока отсутствует или блок удалён';
            
            if (targetNoteId) {
                previewText = 'Загрузка превью...';
                // Asynchronously fetch block preview from external note content
                fetch(`/api/dialectics/${targetNoteId}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(n => {
                        if (!n) return;
                        const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;
                        if (Array.isArray(blocks)) {
                            const b = blocks.find(x => x.id === targetId);
                            if (b) {
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = b.html || '';
                                let text = tempDiv.innerText.trim();
                                if (text.length > 180) text = text.substring(0, 180) + '...';
                                previewText = text || 'Пустой блок';
                                
                                if (previewPopover) {
                                    const bodyTextEl = previewPopover.querySelector('.preview-body-text');
                                    if (bodyTextEl) bodyTextEl.innerText = previewText;
                                }
                            }
                        }
                    })
                    .catch(err => console.error("Preview load error:", err));
            } else if (targetBlock) {
                const inner = targetBlock.querySelector('.dialectics-content-inner');
                if (inner) {
                    previewText = inner.innerText.trim();
                    if (previewText.length > 180) previewText = previewText.substring(0, 180) + '...';
                }
            }

            previewPopover = document.createElement('div');
            previewPopover.className = 'dialectics-link-preview-popover';
            previewPopover.style.cssText = `
                position: absolute; z-index: 10000; width: 300px; background: white;
                border: 1px solid #93c5fd; border-radius: 12px; padding: 14px;
                box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.25);
                font-size: 0.85rem; pointer-events: none; opacity: 0;
                transition: opacity 0.15s ease, transform 0.15s ease;
                transform: translateY(4px); font-family: inherit;
            `;
            previewPopover.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-weight: 700; color: #1d4ed8; font-size: 0.9rem; border-bottom: 1px solid #eff6ff; padding-bottom: 6px;">
                    <span>🔗</span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${targetTitle}</span>
                </div>
                <div class="preview-body-text" style="color: #475569; line-height: 1.45; font-size: 0.82rem; max-height: 90px; overflow: hidden; text-overflow: ellipsis;">
                    ${previewText}
                </div>
            `;
            document.body.appendChild(previewPopover);

            const rect = linkEl.getBoundingClientRect();
            let left = Math.max(10, rect.left + window.scrollX);
            if (left + 300 > window.innerWidth) {
                left = window.innerWidth - 310;
            }
            previewPopover.style.left = `${left}px`;
            previewPopover.style.top = `${rect.bottom + window.scrollY + 6}px`;

            requestAnimationFrame(() => {
                if (previewPopover) {
                    previewPopover.style.opacity = '1';
                    previewPopover.style.transform = 'translateY(0)';
                }
            });
        }
    });

    document.addEventListener('mouseout', (e) => {
        const linkEl = e.target.closest('.dialectics-block-link');
        if (linkEl) {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                removePreview();
            }, 200);
        }
    });
}

export function renderAlternativesWidget(containerDom, optionsList = [], onUpdateOptions = null, onSelectOption = null) {
    containerDom.innerHTML = '';
    containerDom.style.cssText = 'border: 2px dashed #cbd5e1; border-radius: 12px; padding: 12px; margin: 14px 0; background: #f8fafc; font-family: inherit;';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; flex-wrap: wrap; gap: 8px;';
    
    const title = document.createElement('span');
    title.style.cssText = 'font-weight: 600; font-size: 0.9rem; color: #334155; display: flex; align-items: center; gap: 6px;';
    title.innerHTML = '🔀 <span>Альтернативные формулировки <small style="color: #64748b; font-weight: normal;">(выберите финальный вариант)</small></span>';

    header.appendChild(title);

    if (onUpdateOptions) {
        const btnAdd = document.createElement('button');
        btnAdd.type = 'button';
        btnAdd.innerHTML = '+ Добавить вариант';
        btnAdd.style.cssText = 'background: #e2e8f0; border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.8rem; font-weight: 600; color: #334155; cursor: pointer; transition: background 0.2s;';
        btnAdd.onmouseover = () => btnAdd.style.background = '#cbd5e1';
        btnAdd.onmouseout = () => btnAdd.style.background = '#e2e8f0';
        btnAdd.onclick = async (e) => {
            e.stopPropagation();
            const newOptText = await customPrompt({
                title: '➕ Новый вариант формулировки',
                value: '',
                placeholder: 'Введите текст альтернативного варианта...',
                okLabel: 'Добавить',
                cancelLabel: 'Отмена',
                multiline: true
            });
            if (newOptText !== null && newOptText.trim() !== '') {
                const newOpts = [...optionsList, newOptText.trim()];
                onUpdateOptions(newOpts);
            }
        };
        header.appendChild(btnAdd);
    }
    containerDom.appendChild(header);

    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = 'display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px;';

    optionsList.forEach((optText, idx) => {
        const card = document.createElement('div');
        card.style.cssText = 'flex: 1; min-width: 260px; max-width: 450px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: white; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05);';

        const cardHeader = document.createElement('div');
        cardHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;';
        
        const cardTitle = document.createElement('span');
        cardTitle.style.cssText = 'font-weight: 600; font-size: 0.85rem; color: #475569;';
        cardTitle.innerText = `Вариант #${idx + 1}`;
        cardHeader.appendChild(cardTitle);

        if (onUpdateOptions) {
            const actionsDiv = document.createElement('div');
            actionsDiv.style.cssText = 'display: flex; gap: 4px;';

            const btnEdit = document.createElement('button');
            btnEdit.type = 'button';
            btnEdit.title = 'Редактировать';
            btnEdit.innerHTML = '✎';
            btnEdit.style.cssText = 'background: transparent; border: none; cursor: pointer; font-size: 0.95rem; color: #64748b; padding: 2px 6px; border-radius: 4px; transition: background 0.2s;';
            btnEdit.onmouseover = () => btnEdit.style.background = '#f1f5f9';
            btnEdit.onmouseout = () => btnEdit.style.background = 'transparent';
            btnEdit.onclick = async (e) => {
                e.stopPropagation();
                const updated = await customPrompt({
                    title: `✎ Редактировать Вариант #${idx + 1}`,
                    value: optText,
                    placeholder: 'Текст формулировки...',
                    okLabel: 'Сохранить',
                    cancelLabel: 'Отмена',
                    multiline: true
                });
                if (updated !== null && updated.trim() !== '') {
                    const newOpts = [...optionsList];
                    newOpts[idx] = updated.trim();
                    onUpdateOptions(newOpts);
                }
            };

            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.title = 'Удалить вариант';
            btnDel.innerHTML = '✕';
            btnDel.style.cssText = 'background: transparent; border: none; cursor: pointer; font-size: 0.95rem; color: #ef4444; padding: 2px 6px; border-radius: 4px; transition: background 0.2s;';
            btnDel.onmouseover = () => btnDel.style.background = '#fee2e2';
            btnDel.onmouseout = () => btnDel.style.background = 'transparent';
            btnDel.onclick = (e) => {
                e.stopPropagation();
                if (optionsList.length <= 1) {
                    if (window.showToast) window.showToast('Должен остаться хотя бы один вариант', 'warning');
                    return;
                }
                const newOpts = optionsList.filter((_, i) => i !== idx);
                onUpdateOptions(newOpts);
            };

            actionsDiv.appendChild(btnEdit);
            actionsDiv.appendChild(btnDel);
            cardHeader.appendChild(actionsDiv);
        }
        card.appendChild(cardHeader);

        const cardBody = document.createElement('div');
        cardBody.style.cssText = 'font-size: 0.9rem; color: #1e293b; margin-bottom: 14px; white-space: pre-wrap; line-height: 1.45; word-break: break-word; flex: 1;';
        if (optText.includes('<') && optText.includes('>')) {
            cardBody.innerHTML = optText;
            cardBody.querySelectorAll('span[data-type="mathNode"]').forEach(node => {
                const latex = node.getAttribute('latex');
                if (latex && typeof katex !== 'undefined') {
                    try { katex.render(latex, node, { throwOnError: false }); } catch(e) {}
                }
            });
        } else {
            cardBody.innerText = optText;
        }
        card.appendChild(cardBody);

        if (onSelectOption) {
            const btnSelect = document.createElement('button');
            btnSelect.type = 'button';
            btnSelect.innerHTML = '✅ Выбрать этот вариант';
            btnSelect.style.cssText = 'width: 100%; background: #22c55e; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: background 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.1);';
            btnSelect.onmouseover = () => btnSelect.style.background = '#16a34a';
            btnSelect.onmouseout = () => btnSelect.style.background = '#22c55e';
            btnSelect.onclick = (e) => {
                e.stopPropagation();
                onSelectOption(optText);
                if (window.showToast) window.showToast('Выбран финальный вариант формулировки! ✨', 'success');
            };
            card.appendChild(btnSelect);
        }

        cardsContainer.appendChild(card);
    });

    containerDom.appendChild(cardsContainer);
}

export const AlternativesBlock = Node.create({
    name: 'alternativesBlock',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            options: {
                default: ['Вариант 1: Напишите первую формулировку...', 'Вариант 2: Напишите альтернативную формулировку...'],
                parseHTML: element => {
                    try {
                        const parsed = JSON.parse(element.getAttribute('data-options'));
                        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                    } catch (e) {}
                    return ['Вариант 1: Напишите первую формулировку...', 'Вариант 2: Напишите альтернативную формулировку...'];
                },
                renderHTML: attributes => {
                    return {
                        'data-options': JSON.stringify(attributes.options || ['Вариант 1: Напишите первую формулировку...', 'Вариант 2: Напишите альтернативную формулировку...']),
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="alternativesBlock"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'alternativesBlock', class: 'modern-alternatives-block' })];
    },

    addCommands() {
        return {
            insertAlternativesBlock: (options) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        options: options || ['Вариант 1: Напишите первую формулировку...', 'Вариант 2: Напишите альтернативную формулировку...']
                    }
                });
            },
        };
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const dom = document.createElement('div');
            dom.className = 'modern-alternatives-block';
            dom.setAttribute('data-type', 'alternativesBlock');
            dom.setAttribute('data-options', JSON.stringify(node.attrs.options));
            dom.contentEditable = 'false';

            const refresh = (optionsList) => {
                dom.setAttribute('data-options', JSON.stringify(optionsList));
                renderAlternativesWidget(
                    dom,
                    optionsList,
                    (newOptions) => {
                        if (typeof getPos === 'function') {
                            editor.view.dispatch(
                                editor.view.state.tr.setNodeMarkup(getPos(), null, {
                                    ...node.attrs,
                                    options: newOptions
                                })
                            );
                        }
                    },
                    (selectedText) => {
                        if (typeof getPos === 'function') {
                            const pos = getPos();
                            const contentToInsert = (selectedText.includes('<') && selectedText.includes('>')) ? selectedText : `<p>${selectedText}</p>`;
                            editor.chain()
                                .deleteRange({ from: pos, to: pos + node.nodeSize })
                                .insertContentAt(pos, contentToInsert)
                                .run();
                        }
                    }
                );
            };

            refresh(node.attrs.options);

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'alternativesBlock') return false;
                    refresh(updatedNode.attrs.options);
                    return true;
                },
                ignoreMutation() {
                    return true;
                }
            };
        };
    }
});

export const ClearMarksOnEnter = Extension.create({
    name: 'clearMarksOnEnter',
    addKeyboardShortcuts() {
        return {
            Enter: ({ editor }) => {
                if (!editor.state.selection.empty) {
                    return false;
                }
                const split = editor.commands.splitBlock();
                if (split) {
                    editor.view.dispatch(editor.state.tr.setStoredMarks([]));
                    return true;
                }
                return false;
            }
        };
    }
});

