/**
 * editor_setup.js - Настройка TipTap и кастомных узлов
 */
import { Node, Mark, mergeAttributes, InputRule } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import katex from 'katex';
import { customPrompt, customLatexPrompt } from '../modal_controller.js';

export const QuestionMark = Mark.create({
    name: 'questionMark',

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
