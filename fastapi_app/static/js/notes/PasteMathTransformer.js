class PasteMathTransformer {
    /**
     * Transforms pasted HTML by converting KaTeX elements, LaTeX delimiters,
     * and math callouts into clean TipTap-compatible MathInline and MathCallout nodes.
     */
    static transformHTML(html) {
        if (!html || typeof html !== 'string') return '';

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 1. Process all .katex-display blocks (display math)
            doc.querySelectorAll('.katex-display').forEach(displayEl => {
                const annotation = displayEl.querySelector('annotation[encoding="application/x-tex"]');
                let formula = '';
                if (annotation) {
                    formula = annotation.textContent.trim();
                } else {
                    formula = displayEl.getAttribute('data-formula') || displayEl.getAttribute('formula') || '';
                }

                if (!formula) {
                    const mathml = displayEl.querySelector('.katex-mathml');
                    if (mathml) formula = mathml.textContent.trim();
                }

                if (formula) {
                    const cleanFormula = this.cleanFormulaString(formula);
                    const callout = doc.createElement('div');
                    callout.className = 'math-callout';
                    const content = doc.createElement('div');
                    content.className = 'math-content';
                    const p = doc.createElement('p');
                    const inline = doc.createElement('span');
                    inline.className = 'math-inline';
                    inline.setAttribute('formula', cleanFormula);
                    inline.textContent = cleanFormula;
                    p.appendChild(inline);
                    content.appendChild(p);
                    callout.appendChild(content);
                    displayEl.parentNode.replaceChild(callout, displayEl);
                }
            });

            // 2. Process all remaining inline .katex elements
            doc.querySelectorAll('.katex').forEach(katexEl => {
                if (katexEl.closest('.math-inline') || katexEl.closest('.math-callout')) return;

                const annotation = katexEl.querySelector('annotation[encoding="application/x-tex"]');
                let formula = '';
                if (annotation) {
                    formula = annotation.textContent.trim();
                } else {
                    formula = katexEl.getAttribute('data-formula') || katexEl.getAttribute('formula') || '';
                }

                if (!formula) {
                    const mathml = katexEl.querySelector('.katex-mathml');
                    if (mathml) formula = mathml.textContent.trim();
                }

                if (formula) {
                    const cleanFormula = this.cleanFormulaString(formula);
                    const mathInline = doc.createElement('span');
                    mathInline.className = 'math-inline';
                    mathInline.setAttribute('formula', cleanFormula);
                    mathInline.textContent = cleanFormula;
                    katexEl.parentNode.replaceChild(mathInline, katexEl);
                }
            });

            // 3. Remove all leftover KaTeX internal helper nodes
            doc.querySelectorAll('.katex-mathml, .katex-html').forEach(el => el.remove());

            // 4. Normalize existing math callouts
            doc.querySelectorAll('.math-callout, .callout-blue, .formula-callout').forEach(callout => {
                if (!callout.classList.contains('math-callout')) {
                    callout.className = 'math-callout';
                }
                if (!callout.querySelector('.math-content')) {
                    const content = doc.createElement('div');
                    content.className = 'math-content';
                    const p = doc.createElement('p');
                    while (callout.firstChild) {
                        p.appendChild(callout.firstChild);
                    }
                    content.appendChild(p);
                    callout.appendChild(content);
                }
            });

            let serialized = doc.body.innerHTML;

            // 5. Convert $$...$$ display math into math-callout with <p><span class="math-inline">
            serialized = serialized.replace(/(?:\$\$|\\\[)([\s\S]+?)(?:\$\$|\\\])/g, (match, formula) => {
                const cleanFormula = this.cleanFormulaString(formula);
                return `<div class="math-callout"><div class="math-content"><p><span class="math-inline" formula="${this.escapeAttr(cleanFormula)}">${this.escapeHtml(cleanFormula)}</span></p></div></div>`;
            });

            // 6. Convert $...$ or \(...\) inline math into math-inline
            serialized = serialized.replace(/(?:\$|\\\()([^\$\n\r]+?)(?:\$|\\\))/g, (match, formula) => {
                const cleanFormula = this.cleanFormulaString(formula);
                if (/^\d+(?:\.\d+)?%?$/.test(cleanFormula.trim())) return match;
                return `<span class="math-inline" formula="${this.escapeAttr(cleanFormula)}">${this.escapeHtml(cleanFormula)}</span>`;
            });

            return serialized;
        } catch (err) {
            console.error('PasteMathTransformer error:', err);
            return html;
        }
    }

    /**
     * Converts plain text with LaTeX markers or equations into rich HTML
     */
    static transformTextToHTML(text) {
        if (!text || typeof text !== 'string') return '';

        let hasMath = false;

        // Display math $$...$$
        let html = text.replace(/(?:\$\$|\\\[)([\s\S]+?)(?:\$\$|\\\])/g, (match, formula) => {
            hasMath = true;
            const cleanFormula = this.cleanFormulaString(formula);
            return `<div class="math-callout"><div class="math-content"><p><span class="math-inline" formula="${this.escapeAttr(cleanFormula)}">${this.escapeHtml(cleanFormula)}</span></p></div></div>`;
        });

        // Inline math $...$
        html = html.replace(/(?:\$|\\\()([^\$\n\r]+?)(?:\$|\\\))/g, (match, formula) => {
            const cleanFormula = this.cleanFormulaString(formula);
            if (/^\d+(?:\.\d+)?%?$/.test(cleanFormula.trim())) return match;
            hasMath = true;
            return `<span class="math-inline" formula="${this.escapeAttr(cleanFormula)}">${this.escapeHtml(cleanFormula)}</span>`;
        });

        // Split paragraphs
        const paragraphs = html.split(/\n\s*\n/);
        const processed = paragraphs.map(p => {
            const trimmed = p.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<div class="math-callout">') || trimmed.startsWith('<span class="math-inline">')) {
                return trimmed;
            }
            if (this.isPureFormula(trimmed)) {
                hasMath = true;
                const clean = this.cleanFormulaString(trimmed);
                return `<div class="math-callout"><div class="math-content"><p><span class="math-inline" formula="${this.escapeAttr(clean)}">${this.escapeHtml(clean)}</span></p></div></div>`;
            }
            const lines = trimmed.split('\n').map(l => this.escapeHtml(l)).join('<br>');
            return `<p>${lines}</p>`;
        }).filter(Boolean);

        return hasMath ? processed.join('') : '';
    }

    static isPureFormula(text) {
        if (!text || text.length > 250) return false;
        const russianWords = text.match(/[а-яА-ЯёЁ]{3,}/g) || [];
        if (russianWords.length > 2 && !text.includes('\\text{')) return false;

        const hasMathTokens = (
            text.includes('\\') ||
            /^[A-Za-z0-9_\{\}\^]+\s*=\s*/.test(text) ||
            /\b(?:alpha|beta|gamma|delta|Delta|theta|lambda|pi|sigma|nabla|ln|log|sin|cos|tan|tanh|frac|sqrt|sum|int|cdot|approx|pm)\b/i.test(text) ||
            /^[A-Za-z]_[a-zA-Z0-9\{\}]/.test(text)
        );

        return hasMathTokens && (text.includes('=') || text.includes('\\') || text.includes('^') || text.includes('_'));
    }

    static cleanFormulaString(str) {
        if (!str) return '';
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/<br\s*[\/]?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();
    }

    static escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    static escapeAttr(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;');
    }
}

export default PasteMathTransformer;
