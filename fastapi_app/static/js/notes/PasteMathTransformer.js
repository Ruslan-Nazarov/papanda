import createDOMPurify from 'dompurify';
import { marked } from 'marked';

// Process text nodes so markup, code and table cell boundaries stay intact.
class PasteMathTransformer {
    static sanitize(html) {
        return createDOMPurify(window).sanitize(html, {
            ADD_ATTR: ['formula', 'author'],
            FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'svg'],
            FORBID_ATTR: ['style'],
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|internal):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
        });
    }

    static mathNode(doc, formula, display = false) {
        const span = doc.createElement('span');
        span.className = 'math-inline';
        span.setAttribute('formula', formula.trim());
        span.textContent = formula.trim();
        if (!display) return span;
        const callout = doc.createElement('div');
        callout.className = 'math-callout';
        const content = doc.createElement('div');
        content.className = 'math-content';
        const paragraph = doc.createElement('p');
        paragraph.append(span);
        content.append(paragraph);
        callout.append(content);
        return callout;
    }

    static formulaFromDelimiter(token) {
        if (token.startsWith('$$') || token.startsWith('\\[')) {
            return {formula: token.slice(2, -2).trim(), display: true};
        }
        if (token.startsWith('\\(')) return {formula: token.slice(2, -2).trim(), display: false};
        const formula = token.slice(1, -1).trim();
        // Paired currency signs, including "$10 and $20", are ordinary text.
        const mathematical = /^[A-Za-z\p{Script=Greek}]$/u.test(formula)
            || /[\\^_={}+*/<>∑∫]/u.test(formula);
        return mathematical ? {formula, display: false} : null;
    }

    static delimiterPattern() {
        return /(?<!\\)(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([^\n]+?\\\)|\$[^$\n]+?\$)/g;
    }

    static replaceTextMath(root) {
        const doc = root.ownerDocument;
        const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) {
            if (!node.parentElement || node.parentElement.closest('code, pre, .math-inline, .katex, script, style, textarea')) continue;
            const source = node.nodeValue;
            const matches = [...source.matchAll(this.delimiterPattern())];
            if (!matches.length) continue;
            const fragment = doc.createDocumentFragment();
            let offset = 0;
            let changed = false;
            for (const match of matches) {
                const parsed = this.formulaFromDelimiter(match[0]);
                if (!parsed || !parsed.formula) continue;
                const parent = node.parentElement;
                const isolated = parsed.display && parent.matches('p, div')
                    && parent.textContent.trim() === match[0] && !parent.closest('td, th, li');
                if (isolated) {
                    parent.replaceWith(this.mathNode(doc, parsed.formula, true));
                    changed = false;
                    break;
                }
                fragment.append(doc.createTextNode(source.slice(offset, match.index)));
                fragment.append(this.mathNode(doc, parsed.formula));
                offset = match.index + match[0].length;
                changed = true;
            }
            if (changed && node.parentNode) {
                fragment.append(doc.createTextNode(source.slice(offset)));
                node.replaceWith(fragment);
            }
        }
    }

    static transformHTML(html) {
        if (!html || typeof html !== 'string') return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('script, style, iframe, object, embed, form, svg').forEach(node => node.remove());
        // Chat renderers commonly keep the TeX source in a KaTeX annotation.
        doc.querySelectorAll('.katex-display').forEach(display => {
            const formula = display.querySelector('annotation[encoding="application/x-tex"]')?.textContent
                || display.getAttribute('data-formula') || display.getAttribute('formula');
            if (!formula) return;
            const parent = display.parentElement;
            const target = parent?.matches('p') && parent.textContent.trim() === display.textContent.trim()
                ? parent : display;
            target.replaceWith(this.mathNode(doc, formula, true));
        });
        doc.querySelectorAll('.katex').forEach(katex => {
            const formula = katex.querySelector('annotation[encoding="application/x-tex"]')?.textContent
                || katex.getAttribute('data-formula') || katex.getAttribute('formula');
            if (formula) katex.replaceWith(this.mathNode(doc, formula));
        });
        this.replaceTextMath(doc.body);
        return this.sanitize(doc.body.innerHTML);
    }

    static transformTextToHTML(text) {
        if (!text || typeof text !== 'string') return '';
        const formulas = [];
        // Leave fenced and inline code untouched by the math scanner.
        const guarded = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, index) => {
            if (index % 2) return part;
            return part.replace(this.delimiterPattern(), token => {
                const parsed = this.formulaFromDelimiter(token);
                if (!parsed || !parsed.formula) return token;
                const id = formulas.push(parsed) - 1;
                return 'MATHPASTETOKEN' + id + 'END';
            });
        }).join('');
        const doc = new DOMParser().parseFromString(marked.parse(guarded, {gfm: true}), 'text/html');
        doc.querySelectorAll('script, style, iframe, object, embed, form, svg').forEach(node => node.remove());
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) {
            if (!node.parentElement || node.parentElement.closest('code, pre')) continue;
            const source = node.nodeValue;
            const matches = [...source.matchAll(/MATHPASTETOKEN(\d+)END/g)];
            if (!matches.length) continue;
            const fragment = doc.createDocumentFragment();
            let offset = 0;
            for (const match of matches) {
                const parsed = formulas[Number(match[1])];
                if (!parsed) continue;
                const parent = node.parentElement;
                if (parsed.display && parent.matches('p') && parent.textContent.trim() === match[0]) {
                    parent.replaceWith(this.mathNode(doc, parsed.formula, true));
                    break;
                }
                fragment.append(doc.createTextNode(source.slice(offset, match.index)));
                fragment.append(this.mathNode(doc, parsed.formula));
                offset = match.index + match[0].length;
            }
            if (node.parentNode) {
                fragment.append(doc.createTextNode(source.slice(offset)));
                node.replaceWith(fragment);
            }
        }
        return this.sanitize(doc.body.innerHTML);
    }
}

export default PasteMathTransformer;
