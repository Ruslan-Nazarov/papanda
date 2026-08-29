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

        // 1. Render custom TipTap mathCallout blocks (.math-callout)
        element.querySelectorAll('.math-callout').forEach(el => {
            if (el.querySelector('.katex')) return; // Already rendered
            const contentEl = el.querySelector('.math-content') || el;
            const rawFormula = el.getAttribute('formula') || contentEl.innerText.trim();
            const formula = this.unescapeHtml(rawFormula);
            if (formula) {
                try {
                    window.katex.render(formula, el, { displayMode: true, throwOnError: false });
                } catch (e) {
                    console.error('KaTeX error in math-callout:', e);
                }
            }
        });

        // 2. Render custom TipTap mathInline elements (.math-inline)
        element.querySelectorAll('.math-inline').forEach(el => {
            if (el.querySelector('.katex')) return;
            const rawFormula = el.getAttribute('formula') || el.innerText.trim();
            const formula = this.unescapeHtml(rawFormula);
            if (formula) {
                try {
                    window.katex.render(formula, el, { displayMode: false, throwOnError: false });
                } catch (e) {
                    console.error('KaTeX error in math-inline:', e);
                }
            }
        });

        // 3. Render paragraphs and block contents
        const targets = element.querySelectorAll ? element.querySelectorAll('.block-content p, .block-content li, .block-content > div') : [element];
        targets.forEach(target => {
            if (target.querySelector('.katex')) return;
            let html = target.innerHTML;
            if (!html || !html.trim()) return;

            let changed = false;

            // A. Display math ($$...$$ or \[...\])
            html = html.replace(/(?:\$\$|\\\[)([\s\S]+?)(?:\$\$|\\\])/g, (match, formula) => {
                changed = true;
                const cleanFormula = this.unescapeHtml(formula).replace(/<br\s*[\/]?>/gi, '\n').trim();
                try {
                    return window.katex.renderToString(cleanFormula, { displayMode: true, throwOnError: false });
                } catch (e) {
                    return match;
                }
            });

            // B. Standalone raw LaTeX environments: \begin{pmatrix}... \end{pmatrix}, etc.
            html = html.replace(/((?:[A-Za-z0-9_\{\}\^\\'\s]+\s*=\s*)?\\begin\{(?:pmatrix|matrix|bmatrix|vmatrix|aligned|cases)\}[\s\S]+?\\end\{(?:pmatrix|matrix|bmatrix|vmatrix|aligned|cases)\}(?:\s*\\begin\{matrix\}[\s\S]+?\\end\{matrix\})?)/g, (match, formula) => {
                changed = true;
                const cleanFormula = this.unescapeHtml(formula).replace(/<br\s*[\/]?>/gi, '\n').trim();
                try {
                    return window.katex.renderToString(cleanFormula, { displayMode: true, throwOnError: false });
                } catch (e) {
                    return match;
                }
            });

            // C. Inline math ($...$ or \(...\))
            html = html.replace(/(?:\$|\\\()([^\$\n]+?)(?:\$|\\\))/g, (match, formula) => {
                changed = true;
                const cleanFormula = this.unescapeHtml(formula).trim();
                try {
                    return window.katex.renderToString(cleanFormula, { displayMode: false, throwOnError: false });
                } catch (e) {
                    return match;
                }
            });

            // D. Standalone inline LaTeX Greek/math tokens (e.g. \alpha, \beta, \cdot, etc.) inside regular prose
            html = html.replace(/(?<=\s|^|>|\()(\\(?:alpha|beta|gamma|delta|Delta|epsilon|theta|lambda|mu|pi|sigma|Sigma|phi|omega|Omega|cdot|times|approx|ne|le|ge|pm)[a-zA-Z0-9_\^\{\}]*)(?=\s|$|<|[,\.\?!;\)])/g, (match, token) => {
                changed = true;
                const cleanToken = this.unescapeHtml(token).trim();
                try {
                    return window.katex.renderToString(cleanToken, { displayMode: false, throwOnError: false });
                } catch (e) {
                    return match;
                }
            });

            if (changed) {
                target.innerHTML = html;
            }
        });

        // 4. Auto-render standard delimiters using KaTeX auto-render if available
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
                    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"]
                });
            } catch (e) {
                console.warn('KaTeX renderMathInElement error:', e);
            }
        }
    }
}

// Make it global so it can be called easily
window.BlockMathRenderer = BlockMathRenderer;

export default BlockMathRenderer;
