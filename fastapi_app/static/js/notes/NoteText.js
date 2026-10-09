// The same text extraction binds engine snapshots and supplies model context.
class NoteText {
    static fromHtml(html) {
        const template = document.createElement('template');
        template.innerHTML = html || '';
        const blocks = new Set(['P', 'DIV', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);
        const read = node => {
            if (node.nodeType === 3) return node.nodeValue || '';
            if (node.nodeType !== 1 && node.nodeType !== 11) return '';
            if (['SCRIPT', 'STYLE', 'TEMPLATE'].includes(node.nodeName)) return '';
            if (node.nodeName === 'BR') return '\n';
            if (node.nodeType === 1 && node.hasAttribute('formula')) {
                const delimiter = node.closest('.math-callout') ? '$$' : '$';
                return delimiter + node.getAttribute('formula') + delimiter;
            }
            const text = Array.from(node.childNodes, read).join('');
            if (blocks.has(node.nodeName)) return '\n' + text + '\n';
            if (['TD', 'TH'].includes(node.nodeName)) return text + '\t';
            return text;
        };
        return read(template.content).replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n').trim();
    }
}

export default NoteText;
