// The same text extraction binds engine snapshots and supplies model context.
class NoteText {
    static hasContent(html) {
        if (this.fromHtml(html)) return true;
        const template = document.createElement('template');
        template.innerHTML = html || '';
        return !!template.content.querySelector('img, svg, math, canvas, video, audio, iframe, object, embed, table, hr, [formula]');
    }

    static mathRanges(text) {
        // Saved answers also contain multiline single-dollar math and bare TeX
        // environments. Excerpts must never start or end inside either form.
        return [...text.matchAll(/(?<!\\)(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$]+?\$|\\begin\{(aligned|align\*?|equation\*?|[pbBvV]?matrix|cases|gathered)\}[\s\S]+?\\end\{\2\})/g)]
            .map(match => ({start: match.index, end: match.index + match[0].length}));
    }

    static excerpt(text, offset = 0, limit = 1200, formulas = this.mathRanges(text)) {
        let start = offset;
        const atStart = formulas.find(item => item.start < start && start < item.end);
        if (atStart) start = atStart.end - atStart.start <= limit ? atStart.start : atStart.end;
        let end = Math.min(text.length, start + limit);
        const atEnd = formulas.find(item => item.start < end && end < item.end);
        if (atEnd) end = atEnd.start;
        return text.slice(start, end).trim();
    }

    static wordCount(html) {
        const template = document.createElement('template');
        template.innerHTML = html || '';
        template.content.querySelectorAll('[formula], math, .katex').forEach(node => node.remove());
        return (this.fromHtml(template.innerHTML).match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || []).length;
    }

    static fromHtml(html) {
        const template = document.createElement('template');
        template.innerHTML = html || '';
        const blocks = new Set(['P', 'DIV', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);
        const read = node => {
            if (node.nodeType === 3) return node.nodeValue || '';
            if (node.nodeType !== 1 && node.nodeType !== 11) return '';
            if (['SCRIPT', 'STYLE', 'TEMPLATE'].includes(node.nodeName)) return '';
            // Display controls are derived from data-hint, not additional content.
            if (node.nodeType === 1 && node.matches('.hp-arrow, .hp-content, .math-expand-button, .math-calculation-button')) return '';
            if (node.nodeName === 'BR') return '\n';
            if (node.nodeType === 1 && node.matches('.katex-display, .katex')) {
                const formula = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
                if (formula) {
                    const delimiter = node.matches('.katex-display') ? '$$' : '$';
                    return delimiter + formula + delimiter;
                }
            }
            if (node.nodeType === 1 && node.hasAttribute('formula')) {
                const delimiter = node.closest('.math-callout') ? '$$' : '$';
                return delimiter + node.getAttribute('formula') + delimiter;
            }
            const text = Array.from(node.childNodes, read).join('');
            if (node.nodeType === 1 && node.matches('span[data-type="hidden-phrase"], .hidden-phrase-mark')) {
                const explanation = (node.getAttribute('data-hint') || '').trim();
                return explanation ? `${text} (${explanation})` : text;
            }
            if (blocks.has(node.nodeName)) return '\n' + text + '\n';
            if (['TD', 'TH'].includes(node.nodeName)) return text + '\t';
            return text;
        };
        return read(template.content).replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n').trim();
    }
}

export default NoteText;
