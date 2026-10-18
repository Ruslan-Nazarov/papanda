import PasteMathTransformer from './PasteMathTransformer.js';

// Reading decorations must not affect positions in the saved, editable HTML.
const DECORATIONS = '.hp-arrow, .hp-content, .math-expand-button, .math-calculation-button';
const ATOMS = '.math-inline, .katex-display, .katex, img, br';

class ConceptChatInsertion {
    static parts(root) {
        const parts = [];
        const visit = node => {
            if (node.nodeType === 3) {
                const text = node.textContent;
                let offset = 0;
                if (!node.parentElement?.closest('pre, code')) {
                    for (const match of text.matchAll(PasteMathTransformer.delimiterPattern())) {
                        if (!PasteMathTransformer.formulaFromDelimiter(match[0])) continue;
                        if (match.index > offset) parts.push({node, text: text.slice(offset, match.index), from: offset});
                        offset = match.index + match[0].length;
                        parts.push({node, text: '\ufffc', from: match.index, to: offset});
                    }
                }
                if (offset < text.length) parts.push({node, text: text.slice(offset), from: offset});
            }
            else if (node.nodeType === 1 || node.nodeType === 11) {
                if (node.nodeType === 1 && node.matches(DECORATIONS)) return;
                if (node.nodeType === 1 && node.matches(ATOMS)) {
                    parts.push({node, text: node.matches('br') ? '\n' : '\ufffc'});
                } else node.childNodes.forEach(visit);
            }
        };
        visit(root);
        return parts;
    }

    static text(root) { return this.parts(root).map(part => part.text).join(''); }

    static capture(content, html, range, fragment) {
        if (!content) return null;
        const root = document.createElement('div');
        root.innerHTML = html || '';
        const sourceText = this.text(root);
        let offset;
        if (range && !range.collapsed && content.contains(range.startContainer) && content.contains(range.endContainer)) {
            if (this.text(content) !== sourceText) return null;
            const prefix = document.createRange();
            prefix.selectNodeContents(content);
            const end = range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement;
            let atom = end.closest(ATOMS);
            // A formula is a single editor atom, even when only its index is selected.
            while (atom?.parentElement?.closest(ATOMS)) atom = atom.parentElement.closest(ATOMS);
            if (atom && content.contains(atom)) prefix.setEndAfter(atom);
            else prefix.setEnd(range.endContainer, range.endOffset);
            offset = this.text(prefix.cloneContents()).length;
        } else {
            // Compatibility for callers without a DOM selection: never guess
            // which occurrence of repeated text the user meant.
            const first = sourceText.indexOf(fragment);
            if (first < 0 || first !== sourceText.lastIndexOf(fragment)) return null;
            offset = first + fragment.length;
        }
        return {root, offset};
    }

    static insert(anchor, chat) {
        const root = anchor.root.cloneNode(true);
        const range = document.createRange();
        let remaining = anchor.offset;
        for (const part of this.parts(root)) {
            if (remaining > part.text.length) { remaining -= part.text.length; continue; }
            if (part.node.nodeType === 3) range.setStart(part.node,
                part.to ? (remaining ? part.to : part.from) : part.from + remaining);
            else if (remaining) range.setStartAfter(part.node);
            else range.setStartBefore(part.node);
            range.collapse(true);
            // Split only the enclosing text block. Lists, table cells and
            // callouts keep their structure, and the selected words stay intact.
            const element = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
            let paragraph = element.closest('p, h1, h2, h3, h4, h5, h6, pre');
            if (!paragraph && element !== root && !element.matches('div, li, td, th, blockquote')) {
                paragraph = element;
                while (paragraph.parentElement !== root && !paragraph.parentElement.matches('div, li, td, th, blockquote')) {
                    paragraph = paragraph.parentElement;
                }
            }
            if (paragraph && root.contains(paragraph)) {
                const tail = document.createRange();
                tail.selectNodeContents(paragraph);
                tail.setStart(range.startContainer, range.startOffset);
                const suffix = paragraph.cloneNode(false);
                suffix.removeAttribute('id');
                suffix.append(tail.extractContents());
                paragraph.after(chat);
                if (suffix.hasChildNodes()) chat.after(suffix);
            } else range.insertNode(chat);
            return root.innerHTML;
        }
        return null;
    }
}

export default ConceptChatInsertion;
