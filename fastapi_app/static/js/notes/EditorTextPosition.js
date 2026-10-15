// Reading mode adds KaTeX and hint decorations that are absent from the editor.
const DECORATIONS = '.hp-arrow, .hp-content';
const TEXTBLOCKS = 'p, h1, h2, h3, h4, h5, h6, pre, li, td, th';

export default class EditorTextPosition {
    static clean(fragment, atoms = '') {
        const copy = fragment.cloneNode(true);
        copy.querySelectorAll(DECORATIONS).forEach(el => el.remove());
        copy.querySelectorAll('.math-inline, .katex, img').forEach(el => el.replaceWith(atoms));
        copy.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
        return copy.textContent || '';
    }

    static capture(container, event) {
        const paragraphs = [...container.querySelectorAll(TEXTBLOCKS)].filter(el =>
            !el.closest(DECORATIONS) && ![...el.querySelectorAll(TEXTBLOCKS)]
                .some(child => !child.closest(DECORATIONS)));
        const paragraph = paragraphs.find(el => el === event.target || el.contains(event.target));
        if (!paragraph) return null;

        const doc = container.ownerDocument;
        const caret = doc.caretPositionFromPoint?.(event.clientX, event.clientY);
        const range = caret ? null : doc.caretRangeFromPoint?.(event.clientX, event.clientY);
        const selection = doc.getSelection();
        const node = caret?.offsetNode || range?.startContainer || selection?.anchorNode;
        const offset = caret?.offset ?? range?.startOffset ?? selection?.anchorOffset;
        let textOffset = 0;
        if (node && paragraph.contains(node)) {
            const prefix = doc.createRange();
            prefix.selectNodeContents(paragraph);
            prefix.setEnd(node, offset);
            textOffset = this.clean(prefix.cloneContents(), '\ufffc').length;
        }
        return {index: paragraphs.indexOf(paragraph), text: this.clean(paragraph), offset: textOffset};
    }

    static restore(editor, anchor, container) {
        if (!anchor) return;
        const paragraphs = [];
        editor.state.doc.descendants((node, pos) => {
            if (node.isTextblock) paragraphs.push({node, pos});
        });
        const normalize = text => text.replace(/\s+/g, ' ').trim();
        const matches = paragraphs.filter(({node}) => normalize(node.textContent) === normalize(anchor.text));
        // Matching text also handles reading mode combining old code paragraphs.
        const target = matches.reduce((best, item) =>
            !best || Math.abs(paragraphs.indexOf(item) - anchor.index)
                < Math.abs(paragraphs.indexOf(best) - anchor.index) ? item : best,
        null) || paragraphs[anchor.index];
        if (!target) return;

        const pos = target.pos + 1 + Math.min(anchor.offset, target.node.content.size);
        editor.commands.setTextSelection(pos);
        editor.view.focus();
        // Scroll only the editor's two nested panes, keeping the reading page still.
        const caret = editor.view.coordsAtPos(pos);
        const textPane = container.querySelector('.modal-tiptap-content');
        textPane.scrollTop += caret.top - textPane.getBoundingClientRect().top - textPane.clientHeight / 2;
        const body = container.querySelector('.modal-body');
        const updated = editor.view.coordsAtPos(pos);
        const bounds = body.getBoundingClientRect();
        if (updated.top < bounds.top || updated.bottom > bounds.bottom) {
            body.scrollTop += updated.top - bounds.top - body.clientHeight / 2;
        }
    }
}
