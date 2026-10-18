import MathSymbols from './MathSymbols.js';
import FormulaZoom from './FormulaZoom.js';
import MathSubstitutions from './MathSubstitutions.js';

class BlockMathRenderer {
    static unescapeHtml(safe) {
        if (!safe) return '';
        return safe
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, ' ');
    }

    static renderMath(element) {
        if (!element) return;

        if (!window.katex) {
            console.warn('KaTeX not loaded yet, scheduling render on load.');
            window.addEventListener('load', () => this.renderMath(element), { once: true });
            setTimeout(() => this.renderMath(element), 400);
            return;
        }

        // A callout may contain both an equation and prose beginning with «где».
        // Render only its first formula line; keep the remaining editable content.
        element.querySelectorAll('.math-callout').forEach(el => {
            const contentEl = el.querySelector('.math-content') || el;
            const firstLine = contentEl.firstElementChild;
            if (!firstLine || firstLine.querySelector('.math-inline, .katex')) return;
            const formula = this.unescapeHtml(el.getAttribute('formula') || firstLine.textContent.trim());
            if (!formula || !/[=\\^_]/.test(formula) || /^где\b/i.test(formula)) return;
            const markedText = firstLine.children.length === 1
                && firstLine.firstElementChild.matches('[data-text-size]')
                && firstLine.firstElementChild.textContent.trim() === formula
                ? firstLine.firstElementChild : null;
            if (firstLine.children.length && !markedText) return;
            try {
                window.katex.render(formula, markedText || firstLine, { displayMode: true, throwOnError: false, trust: false });
            } catch (e) {
                console.error('KaTeX error in math-callout:', e);
            }
        });

        // 2. Render custom TipTap mathInline elements (.math-inline)
        element.querySelectorAll('.math-inline').forEach(el => {
            if (el.querySelector('.katex')) return;
            if (el.closest('pre, code')) return;
            const rawFormula = el.getAttribute('formula') || el.textContent.trim();
            const formula = this.unescapeHtml(rawFormula);
            if (formula) {
                try {
                    const content = el.closest('.math-callout .math-content');
                    const displayMode = el.dataset.mathDisplay === 'true' || !!content?.firstElementChild?.contains(el);
                    window.katex.render(formula, el, { displayMode, throwOnError: false, trust: false });
                } catch (e) {
                    console.error('KaTeX error in math-inline:', e);
                }
            }
        });

        // Parse standard delimiters once in text nodes. Replacing innerHTML
        // used to corrupt attributes, code and TeX annotations already rendered.
        this.joinMathLines(element);
        if (typeof window.renderMathInElement === 'function') {
            try {
                window.renderMathInElement(element, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '\\[', right: '\\]', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false }
                    ],
                    throwOnError: false,
                    trust: false,
                    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"]
                });
            } catch (e) {
                console.warn('KaTeX renderMathInElement error:', e);
            }
        }

        this.renderLegacyMath(element);

        // Older AI answers sometimes omit delimiters. Recover only explicit
        // algebraic equalities with powers; never interpret arbitrary prose as TeX.
        const atom = String.raw`(?:[A-Za-z]+(?:\([A-Za-z]+\))?|\d+)(?:\^\{?\d+\}?)?`;
        const expression = `${atom}(?:\\s*[+*/·−-]\\s*${atom})*`;
        const equation = new RegExp(`(?<![\\w\\\\])${expression}\\s*=\\s*${expression}(?![\\w^])`, 'g');
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.parentElement?.closest('code, pre, textarea, script, style, .katex, .math-inline, .math-callout')) nodes.push(node);
        }
        for (const node of nodes) {
            const text = node.textContent;
            const matches = [...text.matchAll(equation)].filter(match => match[0].includes('^'));
            if (!matches.length) continue;
            const fragment = document.createDocumentFragment();
            let offset = 0;
            for (const match of matches) {
                fragment.append(document.createTextNode(text.slice(offset, match.index)));
                const span = document.createElement('span');
                const formula = match[0].replace(/·/g, '\\cdot ');
                span.className = 'math-inline';
                span.setAttribute('formula', formula);
                window.katex.render(formula, span, {displayMode: false, throwOnError: false, trust: false});
                fragment.append(span);
                offset = match.index + match[0].length;
            }
            fragment.append(document.createTextNode(text.slice(offset)));
            node.replaceWith(fragment);
        }
        MathSymbols.decorate(element);
        MathSubstitutions.decorate(element);
        FormulaZoom.decorate(element);
    }

    static joinMathLines(element) {
        // Old saved paragraphs can have <br> inside display delimiters. KaTeX
        // needs adjacent text nodes; preserve line breaks outside those formulas.
        const parents = new Set([...element.querySelectorAll('br')].map(br => br.parentElement));
        for (const parent of parents) {
            if (parent.closest('pre, code, textarea, .katex, .math-inline')) continue;
            const nodes = [...parent.childNodes];
            if (nodes.some(node => node.nodeType !== 3 && node.nodeName !== 'BR')) continue;
            const text = nodes.map(node => node.nodeName === 'BR' ? '\n' : node.textContent).join('');
            const formulas = [...text.matchAll(/\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]/g)];
            let offset = 0;
            for (const node of nodes) {
                if (node.nodeName === 'BR') {
                    if (formulas.some(match => match.index < offset && offset < match.index + match[0].length)) {
                        node.replaceWith(document.createTextNode('\n'));
                    }
                    offset++;
                } else offset += node.textContent.length;
            }
            parent.normalize();
        }
    }

    static renderLegacyMath(element) {
        // Recover older content whose Markdown parser stripped delimiters.
        // Each pass skips rendered math and never rewrites surrounding markup.
        const rules = [
            {pattern: /(?:[A-Za-z0-9_{}^\\'\s]+\s*=\s*)?\\begin\{(pmatrix|matrix|bmatrix|vmatrix|aligned|cases)\}[\s\S]+?\\end\{\1\}/g, display: true},
            {pattern: /(?:^|\n)\s*\[\s*([^[\]<>\n]*[=\\^_][^[\]<>\n]*?)\s*\]\s*(?=$|\n)/g,
                display: true, formula: match => match[1].trim().replace(/\.\s*$/, '')},
            {pattern: /(?<=\s|^|\()(\\(?:alpha|beta|gamma|delta|Delta|epsilon|theta|lambda|mu|pi|sigma|Sigma|phi|omega|Omega|cdot|times|approx|ne|le|ge|pm)[a-zA-Z0-9_^{}]*)(?=\s|$|[,.?!;)])/g, display: false},
        ];
        for (const rule of rules) {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (!node.parentElement?.closest('code, pre, textarea, script, style, .katex, .math-inline, .math-callout')) nodes.push(node);
            }
            for (const node of nodes) {
                const matches = [...node.textContent.matchAll(rule.pattern)];
                if (!matches.length) continue;
                const fragment = document.createDocumentFragment();
                let offset = 0;
                for (const match of matches) {
                    fragment.append(document.createTextNode(node.textContent.slice(offset, match.index)));
                    const span = document.createElement('span');
                    window.katex.render(rule.formula ? rule.formula(match) : match[0].trim(), span,
                        {displayMode: rule.display, throwOnError: false, trust: false});
                    fragment.append(span);
                    offset = match.index + match[0].length;
                }
                fragment.append(document.createTextNode(node.textContent.slice(offset)));
                node.replaceWith(fragment);
            }
        }
    }
}

// Make it global so it can be called easily
window.BlockMathRenderer = BlockMathRenderer;

export default BlockMathRenderer;
