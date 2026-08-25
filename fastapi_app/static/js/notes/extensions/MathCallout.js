import { Node, mergeAttributes } from '@tiptap/core';
import { t } from '../../i18n.js';

export default Node.create({
    name: 'mathCallout',

    group: 'block',
    content: 'block+',
    defining: true,

    parseHTML() {
        return [
            { tag: 'div.math-callout' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'math-callout' }), 
            ['div', { class: 'math-content' }, 0]
        ];
    },

    addNodeView() {
        return ({ HTMLAttributes }) => {
            const dom = document.createElement('div');
            dom.classList.add('math-callout');
            
            const contentDOM = document.createElement('div');
            contentDOM.classList.add('math-content');
            
            const escapeIcon = document.createElement('div');
            escapeIcon.classList.add('block-escape-icon');
            escapeIcon.textContent = '?';
            escapeIcon.contentEditable = false;
            
            const escapeTooltip = document.createElement('div');
            escapeTooltip.classList.add('block-escape-tooltip');
            escapeTooltip.innerHTML = `<b>${t('escape_hint_title')}</b><br>• ${t('escape_hint_step1')}<br>• ${t('escape_hint_step2')}<br>• ${t('escape_hint_step3')}`;
            escapeIcon.appendChild(escapeTooltip);

            dom.append(contentDOM, escapeIcon);
            
            return {
                dom,
                contentDOM,
            };
        };
    },

    addCommands() {
        return {
            setMathCallout: () => ({ commands }) => {
                return commands.wrapIn(this.name);
            },
            toggleMathCallout: () => ({ commands }) => {
                return commands.toggleWrap(this.name);
            },
            unsetMathCallout: () => ({ commands }) => {
                return commands.lift(this.name);
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Shift-m': () => this.editor.commands.toggleMathCallout(),
        };
    },
});
