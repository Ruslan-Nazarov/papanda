import { Mark, mergeAttributes } from '@tiptap/core';

export default Mark.create({
    name: 'hiddenPhrase',

    addAttributes() {
        return {
            hint: {
                default: '',
                parseHTML: element => element.getAttribute('data-hint') || '',
                renderHTML: attributes => {
                    if (!attributes.hint) {
                        return {};
                    }
                    return {
                        'data-hint': attributes.hint,
                    };
                },
            },
            expanded: {
                default: false,
                parseHTML: element => element.getAttribute('data-expanded') === 'true',
                renderHTML: attributes => {
                    if (!attributes.expanded) {
                        return {};
                    }
                    return {
                        'data-expanded': 'true',
                    };
                },
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="hidden-phrase"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'hidden-phrase',
                class: 'hidden-phrase-mark'
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setHiddenPhrase: attributes => ({ commands }) => {
                return commands.setMark(this.name, attributes);
            },
            toggleHiddenPhrase: attributes => ({ commands }) => {
                return commands.toggleMark(this.name, attributes);
            },
            unsetHiddenPhrase: () => ({ commands }) => {
                return commands.unsetMark(this.name);
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            Space: () => {
                const { state } = this.editor.view;
                const { selection } = state;
                const { $from, empty } = selection;
                
                if (!empty || !this.editor.isActive(this.name)) {
                    return false;
                }

                const pos = $from.pos;
                const textBefore = state.doc.textBetween(Math.max(0, pos - 1), pos, '\n', '\ufffc');
                
                if (textBefore === ' ') {
                    this.editor.chain().unsetMark(this.name).run();
                }
                return false;
            },
            Enter: () => {
                const { state } = this.editor.view;
                const { selection } = state;
                const { $from, empty } = selection;
                
                if (!empty || !this.editor.isActive(this.name)) {
                    return false;
                }
                
                if ($from.parent.textContent.length === 0) {
                    this.editor.chain().unsetMark(this.name).run();
                }
                return false;
            }
        };
    }
});
