import Link from '@tiptap/extension-link';

export default Link.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            targets: {
                default: null,
                parseHTML: element => {
                    try {
                        const value = JSON.parse(element.getAttribute('data-internal-links') || 'null');
                        return Array.isArray(value) ? value : null;
                    } catch { return null; }
                },
                renderHTML: attributes => attributes.targets?.length > 1
                    ? {'data-internal-links': JSON.stringify(attributes.targets)} : {},
            },
        };
    },
    addKeyboardShortcuts() {
        const parentShortcuts = this.parent?.() || {};
        return {
            ...parentShortcuts,
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
