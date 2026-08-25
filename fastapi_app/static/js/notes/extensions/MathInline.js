import { Node, mergeAttributes } from '@tiptap/core';

export default Node.create({
    name: 'mathInline',

    group: 'inline',

    inline: true,

    atom: true,

    addAttributes() {
        return {
            formula: {
                default: '',
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span.math-inline',
                getAttrs: element => ({
                    formula: element.getAttribute('formula'),
                }),
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { class: 'math-inline', formula: HTMLAttributes.formula }), HTMLAttributes.formula]
    },

    addCommands() {
        return {
            insertMathInline: options => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                })
            },
        }
    },
});
