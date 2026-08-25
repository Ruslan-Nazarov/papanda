class BlockMathRenderer {
    static renderMath(element) {
        if (!element) return;

        if (!window.katex) {
            console.warn('KaTeX not loaded yet, scheduling render on load.');
            window.addEventListener('load', () => this.renderMath(element), { once: true });
            setTimeout(() => this.renderMath(element), 500);
            return;
        }

        // 1. Render custom TipTap mathCallout blocks (.math-callout)
        element.querySelectorAll('.math-callout').forEach(el => {
            if (el.querySelector('.katex')) return; // Already rendered
            const contentEl = el.querySelector('.math-content') || el;
            const formula = el.getAttribute('formula') || contentEl.innerText.trim();
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
            const formula = el.getAttribute('formula') || el.innerText.trim();
            if (formula) {
                try {
                    window.katex.render(formula, el, { displayMode: false, throwOnError: false });
                } catch (e) {
                    console.error('KaTeX error in math-inline:', e);
                }
            }
        });

        // 3. Auto-render standard delimiters ($$, $, \[, \() using KaTeX auto-render if available
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

        // 4. Fallback manual regex for $...$, $$...$$, \[...\], \(...\) on remaining text nodes
        const textNodes = this._getTextNodes(element);
        textNodes.forEach(node => {
            if (!node.nodeValue) return;
            
            let html = this.escapeHtml(node.nodeValue);
            let changed = false;
            
            // Display math $$...$$ or \[...\]
            html = html.replace(/(?:\$\$|\\\[)([\s\S]+?)(?:\$\$|\\\])/g, (match, formula) => {
                changed = true;
                try {
                    return window.katex.renderToString(formula, { displayMode: true, throwOnError: false });
                } catch (e) {
                    return match;
                }
            });
            
            // Inline math $...$ or \(...\)
            html = html.replace(/(?:\$|\\\()([^\$\n]+?)(?:\$|\\\))/g, (match, formula) => {
                changed = true;
                try {
                    return window.katex.renderToString(formula, { displayMode: false, throwOnError: false });
                } catch (e) {
                    return match;
                }
            });
            
            if (changed) {
                const wrapper = document.createElement('span');
                wrapper.innerHTML = html;
                if (node.parentNode) {
                    node.parentNode.replaceChild(wrapper, node);
                }
            }
        });

        // 5. Detect and render un-delimited LaTeX lines / paragraphs (e.g. S_{\text{...}} = a^2 + b^2 or \frac{...}{...})
        element.querySelectorAll('p, div.block-content > div').forEach(p => {
            if (p.querySelector('.katex')) return; // already has rendered math
            if (p.closest('.katex') || p.closest('.math-callout')) return;

            const text = p.innerText.trim();
            // Check if text looks like a LaTeX expression
            if (text && /\\[a-zA-Z]+|\b[A-Za-z0-9]+_[{A-Za-z0-9]|\b[A-Za-z0-9]+\^[{A-Za-z0-9]/.test(text)) {
                // Must not look like regular Russian/English prose with a stray symbol
                try {
                    const rendered = window.katex.renderToString(text, { displayMode: true, throwOnError: true });
                    p.innerHTML = rendered;
                } catch (err) {
                    // Not valid standalone LaTeX, leave as is
                }
            }
        });
    }

    static _getTextNodes(element) {
        const textNodes = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            if (node.parentNode && ['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE'].includes(node.parentNode.nodeName)) {
                continue;
            }
            if (node.parentNode && node.parentNode.closest('.katex')) {
                continue;
            }
            textNodes.push(node);
        }
        return textNodes;
    }

    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Make it global so it can be called easily
window.BlockMathRenderer = BlockMathRenderer;

export default BlockMathRenderer;
