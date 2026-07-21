/**
 * BlockMathRenderer.js - Рендеринг формул KaTeX и цитат в DOM
 */
import katex from 'katex';

export const BlockMathRenderer = {
    renderMath(element) {
        // Convert raw text like $formula$ into <span data-type="mathNode">
        const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let textNode;
        const nodesToReplace = [];
        
        while (textNode = walk.nextNode()) {
            const parent = textNode.parentNode;
            if (parent && 
                parent.tagName !== 'SCRIPT' && 
                parent.tagName !== 'STYLE' && 
                parent.tagName !== 'CODE' && 
                parent.tagName !== 'PRE' && 
                parent.getAttribute('data-type') !== 'mathNode' &&
                !parent.closest('.ProseMirror')) {
                
                const text = textNode.nodeValue;
                if (text.includes('$')) {
                    nodesToReplace.push(textNode);
                }
            }
        }
        
        nodesToReplace.forEach(node => {
            const text = node.nodeValue;
            const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
            let lastIndex = 0;
            let match;
            const fragments = document.createDocumentFragment();
            let hasMatches = false;
            
            while ((match = mathRegex.exec(text)) !== null) {
                hasMatches = true;
                const matchIndex = match.index;
                const rawMatch = match[0];
                
                if (matchIndex > lastIndex) {
                    fragments.appendChild(document.createTextNode(text.substring(lastIndex, matchIndex)));
                }
                
                const isDisplay = rawMatch.startsWith('$$');
                const latex = isDisplay ? rawMatch.slice(2, -2) : rawMatch.slice(1, -1);
                
                const mathSpan = document.createElement('span');
                mathSpan.setAttribute('data-type', 'mathNode');
                mathSpan.setAttribute('latex', latex.trim());
                mathSpan.setAttribute('data-display', isDisplay ? 'true' : 'false');
                mathSpan.className = 'math-node';
                fragments.appendChild(mathSpan);
                
                lastIndex = mathRegex.lastIndex;
            }
            
            if (hasMatches) {
                if (lastIndex < text.length) {
                    fragments.appendChild(document.createTextNode(text.substring(lastIndex)));
                }
                node.parentNode.replaceChild(fragments, node);
            }
        });

        // Now render all mathNode spans
        const mathNodes = element.querySelectorAll('span[data-type="mathNode"]');
        mathNodes.forEach(node => {
            node.classList.add('math-node');
            const latex = node.getAttribute('latex');
            if (latex) {
                const cleanLatex = latex.replace(/\\softmax\b/g, '\\operatorname{softmax}');
                const isDisplay = node.getAttribute('data-display') === 'true';
                try {
                    if (window.katex && typeof window.katex.render === 'function') {
                        window.katex.render(cleanLatex, node, { throwOnError: false, displayMode: isDisplay });
                    } else if (typeof katex !== 'undefined' && typeof katex.render === 'function') {
                        katex.render(cleanLatex, node, { throwOnError: false, displayMode: isDisplay });
                    } else {
                        node.textContent = latex;
                    }
                } catch(e) {
                    node.textContent = latex;
                    node.style.color = 'red';
                }
            }
        });

        // Render quotes authors/sources & fix quote structure
        const quotes = element.querySelectorAll('blockquote[data-type="quoteBlock"], blockquote.modern-blockquote');
        quotes.forEach(quote => {
            quote.classList.add('modern-blockquote');
            if (!quote.getAttribute('data-type')) quote.setAttribute('data-type', 'quoteBlock');

            let contentEl = quote.querySelector('.quote-content');
            if (!contentEl) {
                contentEl = document.createElement('div');
                contentEl.className = 'quote-content';
                while (quote.firstChild) {
                    if (quote.firstChild.classList && quote.firstChild.classList.contains('quote-author-line')) break;
                    contentEl.appendChild(quote.firstChild);
                }
                quote.insertBefore(contentEl, quote.firstChild);
            } else {
                let nested = contentEl.querySelector('.quote-content');
                while (nested) {
                    while (nested.firstChild) {
                        contentEl.insertBefore(nested.firstChild, nested);
                    }
                    nested.remove();
                    nested = contentEl.querySelector('.quote-content');
                }
            }

            const author = quote.getAttribute('data-author');
            if (author) {
                if (!quote.querySelector('.quote-author-line')) {
                    const authorLine = document.createElement('div');
                    authorLine.className = 'quote-author-line';
                    authorLine.contentEditable = 'false';
                    authorLine.innerHTML = `<span class="quote-author-text">— ${author}</span>`;
                    quote.appendChild(authorLine);
                } else {
                    const authorSpan = quote.querySelector('.quote-author-text');
                    if (authorSpan && !authorSpan.textContent.includes(author)) {
                        authorSpan.textContent = `— ${author}`;
                    }
                }
            }
        });
    }
};
