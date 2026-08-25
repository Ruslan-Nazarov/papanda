import { Mark, mergeAttributes } from '@tiptap/core';

export default Mark.create({
    name: 'questionMark',

    addAttributes() {
        return {
            text: {
                default: null,
                parseHTML: element => element.getAttribute('data-question'),
                renderHTML: attributes => {
                    if (!attributes.text) return {};
                    return {
                        'data-question': attributes.text,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span.question-mark-text',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'question-mark-text' }), 0]
    },

    addCommands() {
        return {
            setQuestionMark: attributes => ({ commands }) => {
                return commands.setMark(this.name, attributes)
            },
            toggleQuestionMark: attributes => ({ commands }) => {
                return commands.toggleMark(this.name, attributes)
            },
            unsetQuestionMark: () => ({ commands }) => {
                return commands.unsetMark(this.name)
            },
        }
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
