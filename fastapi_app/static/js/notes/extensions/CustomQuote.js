import { Node, mergeAttributes } from '@tiptap/core';
import { t } from '../../i18n.js';

export default Node.create({
    name: 'customQuote',

    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
        return {
            author: {
                default: '',
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'blockquote.custom-quote' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const author = HTMLAttributes.author;
        if (!author) {
            return ['blockquote', mergeAttributes({ class: 'custom-quote' }, HTMLAttributes), 
                ['div', { class: 'quote-content' }, 0]
            ];
        }
        return ['blockquote', mergeAttributes({ class: 'custom-quote' }, HTMLAttributes), 
            ['div', { class: 'quote-content' }, 0],
            ['div', { class: 'quote-author-wrap' }, 
                ['span', { class: 'quote-dash' }, '— '],
                ['span', { class: 'quote-author' }, author]
            ]
        ];
    },

    addNodeView() {
        return ({ node, HTMLAttributes, getPos, editor }) => {
            const dom = document.createElement('blockquote');
            dom.classList.add('custom-quote');
            
            const contentDOM = document.createElement('div');
            contentDOM.classList.add('quote-content');

            const authorWrap = document.createElement('div');
            authorWrap.classList.add('quote-author-wrap');
            authorWrap.contentEditable = false;

            const dash = document.createElement('span');
            dash.classList.add('quote-dash');
            dash.textContent = '— ';

            const authorInput = document.createElement('input');
            authorInput.type = 'text';
            authorInput.classList.add('quote-author-input');
            authorInput.placeholder = 'Указать автора/источник...';
            authorInput.value = node.attrs.author;

            authorInput.addEventListener('input', (e) => {
                if (typeof getPos === 'function') {
                    editor.commands.command(({ tr }) => {
                        tr.setNodeMarkup(getPos(), undefined, {
                            ...node.attrs,
                            author: e.target.value
                        });
                        return true;
                    });
                }
            });
            
            authorInput.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });

            authorWrap.append(dash, authorInput);
            
            const escapeIcon = document.createElement('div');
            escapeIcon.classList.add('block-escape-icon');
            escapeIcon.textContent = '?';
            escapeIcon.contentEditable = false;
            
            const escapeTooltip = document.createElement('div');
            escapeTooltip.classList.add('block-escape-tooltip');
            escapeTooltip.innerHTML = `<b>${t('escape_hint_title')}</b><br>• ${t('escape_hint_step1')}<br>• ${t('escape_hint_step2')}<br>• ${t('escape_hint_step3')}`;
            escapeIcon.appendChild(escapeTooltip);

            dom.append(contentDOM, authorWrap, escapeIcon);

            return {
                dom,
                contentDOM,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== this.name) {
                        return false;
                    }
                    authorInput.value = updatedNode.attrs.author;
                    return true;
                }
            };
        };
    },

    addCommands() {
        return {
            setCustomQuote: () => ({ commands }) => {
                return commands.wrapIn(this.name);
            },
            toggleCustomQuote: () => ({ commands }) => {
                return commands.toggleWrap(this.name);
            },
            unsetCustomQuote: () => ({ commands }) => {
                return commands.lift(this.name);
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Shift-9': () => this.editor.commands.toggleCustomQuote(),
        };
    },
});
