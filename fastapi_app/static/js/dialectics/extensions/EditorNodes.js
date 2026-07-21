/**
 * EditorNodes.js - Кастомные узлы TipTap (MathNode, QuoteBlock)
 */
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import katex from 'katex';
import { customPrompt, customLatexPrompt } from '../../modal_controller.js';

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
            { tag: 'span[data-type="mathNode"]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'mathNode', 'class': 'math-node' })];
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const dom = document.createElement('span');
            dom.classList.add('math-node');
            dom.setAttribute('data-type', 'mathNode');
            if (node.attrs.latex) {
                dom.setAttribute('latex', node.attrs.latex);
            }
            
            try {
                const cleanLatex = (node.attrs.latex || "").replace(/\\softmax\b/g, '\\operatorname{softmax}');
                if (window.katex && typeof window.katex.render === 'function') {
                    window.katex.render(cleanLatex, dom, { throwOnError: false, displayMode: false });
                } else if (typeof katex !== 'undefined' && typeof katex.render === 'function') {
                    katex.render(cleanLatex, dom, { throwOnError: false, displayMode: false });
                } else {
                    dom.textContent = node.attrs.latex;
                }
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
            
            return { dom };
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
                contentElement: (node) => {
                    const content = node.querySelector('.quote-content');
                    if (content) return content;
                    const clone = node.cloneNode(true);
                    clone.querySelectorAll('.quote-author-line').forEach(el => el.remove());
                    return clone;
                }
            },
            {
                tag: 'blockquote.modern-blockquote',
                contentElement: (node) => {
                    const content = node.querySelector('.quote-content');
                    if (content) return content;
                    const clone = node.cloneNode(true);
                    clone.querySelectorAll('.quote-author-line').forEach(el => el.remove());
                    return clone;
                }
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const author = HTMLAttributes['data-author'] || '';
        if (author) {
            return [
                'blockquote',
                mergeAttributes(HTMLAttributes, { 'data-type': 'quoteBlock', class: 'modern-blockquote' }),
                ['div', { class: 'quote-content' }, 0],
                ['div', { class: 'quote-author-line', contenteditable: 'false' }, ['span', { class: 'quote-author-text' }, `— ${author}`]]
            ];
        }
        return [
            'blockquote',
            mergeAttributes(HTMLAttributes, { 'data-type': 'quoteBlock', class: 'modern-blockquote' }),
            ['div', { class: 'quote-content' }, 0]
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
            Enter: ({ editor }) => {
                const { state } = editor;
                const { $from, empty } = state.selection;

                if (!empty) return false;
                if ($from.parent.content.size > 0) return false;

                let quoteDepth = -1;
                for (let d = $from.depth; d > 0; d--) {
                    if ($from.node(d).type.name === 'quoteBlock') {
                        quoteDepth = d;
                        break;
                    }
                }
                if (quoteDepth === -1) return false;

                const quoteNode = $from.node(quoteDepth);
                if (quoteNode.lastChild !== $from.parent) return false;

                const quoteEnd = $from.after(quoteDepth);

                if (quoteNode.childCount > 1) {
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
