/**
 * BlockDOMParser.js - Сбор структуры блоков из DOM, парсинг данных и очистка HTML
 */
export const BlockDOMParser = {
    cleanRawHtml(innerNode) {
        if (!innerNode) return '';
        const clone = innerNode.cloneNode(true);
        clone.querySelectorAll('.katex-display, .katex').forEach(k => {
            const parentSpan = k.closest('span[data-type="mathNode"]');
            if (parentSpan) {
                const latex = parentSpan.getAttribute('latex');
                if (latex) {
                    const isDisplay = parentSpan.getAttribute('data-display') === 'true';
                    parentSpan.innerHTML = isDisplay ? `$$${latex}$$` : `$${latex}$`;
                }
            } else {
                k.remove();
            }
        });
        clone.querySelectorAll('.quote-author-line').forEach(el => el.remove());
        clone.querySelectorAll('blockquote[data-type="quoteBlock"], blockquote.modern-blockquote').forEach(q => {
            const c = q.querySelector('.quote-content');
            if (c) {
                let nested = c.querySelector('.quote-content');
                while (nested) {
                    while (nested.firstChild) {
                        c.insertBefore(nested.firstChild, nested);
                    }
                    nested.remove();
                    nested = c.querySelector('.quote-content');
                }
            }
        });
        return clone.innerHTML;
    },

    getBlocks(container) {
        if (!container) return [];
        const blocks = [];
        container.querySelectorAll('.dialectics-block').forEach(b => {
            const isSection = b.dataset.isSection === 'true' || b.classList.contains('block-section') || b.dataset.side === 'section';
            const blockId = b.dataset.blockId || b.dataset.id;
            const floatingWin = blockId ? document.querySelector(`.dialectics-floating-editor[data-block-id="${blockId}"]`) : null;

            if (isSection) {
                const titleEl = b.querySelector('.block-title-text');
                let titleText = b.dataset.title || (titleEl ? titleEl.innerText : 'Раздел');
                if (floatingWin) {
                    const winTitleInput = floatingWin.querySelector('.editor-block-title-input');
                    if (winTitleInput) {
                        titleText = winTitleInput.value.trim() || titleText;
                    }
                } else if (window.app && window.app.state && window.app.state.editingSectionBlock === b && document.getElementById('sectionTitleModal')?.style?.display !== 'none') {
                    const secInput = document.getElementById('sectionTitleInputField');
                    if (secInput && secInput.value.trim()) {
                        titleText = secInput.value.trim();
                    }
                }
                blocks.push({
                    id: blockId || ('block_' + Math.random().toString(36).substring(2, 9)),
                    side: 'section',
                    isSection: true,
                    title: titleText,
                    html: `<p>${titleText}</p>`
                });
                return;
            }
            const inner = b.querySelector('.dialectics-content-inner');
            if (inner) {
                let sources = [];
                try {
                    if (b.dataset.sources) {
                        sources = JSON.parse(b.dataset.sources);
                    }
                } catch(e) {}

                let words = [];
                try {
                    if (b.dataset.words) {
                        words = JSON.parse(b.dataset.words);
                    }
                } catch(e) {}

                let html = b._rawHtml || this.cleanRawHtml(inner);
                let title = b.dataset.title || undefined;

                if (floatingWin) {
                    const winTitleInput = floatingWin.querySelector('.editor-block-title-input');
                    if (winTitleInput) {
                        title = winTitleInput.value.trim() || undefined;
                    }
                    if (floatingWin._tiptapEditor) {
                        html = floatingWin._tiptapEditor.getHTML();
                        b._rawHtml = html;
                    } else {
                        const pmEl = floatingWin.querySelector('.ProseMirror') || floatingWin.querySelector('.tiptap-editor');
                        if (pmEl) {
                            html = pmEl.innerHTML;
                            b._rawHtml = html;
                        }
                    }
                } else if (b.classList.contains('is-editing')) {
                    const inlineTitleInput = b.querySelector('.inline-title-input');
                    if (inlineTitleInput) {
                        title = inlineTitleInput.value.trim() || undefined;
                    }
                    if (b._tiptapEditor) {
                        html = b._tiptapEditor.getHTML();
                        b._rawHtml = html;
                    }
                } else if (b._tiptapEditor) {
                    html = b._tiptapEditor.getHTML();
                    b._rawHtml = html;
                }

                blocks.push({
                    id: b.dataset.blockId || ('block_' + Math.random().toString(36).substring(2, 9)),
                    side: (b.classList.contains('block-left') ? 'left' : 
                          b.classList.contains('block-center') ? 'center' : 'right'),
                    isSection: false,
                    html: html,
                    role: b.dataset.role || undefined,
                    sources: sources,
                    title: title,
                    collapsed: b.dataset.collapsed === 'true',
                    pinned: b.dataset.pinned === 'true' || b.classList.contains('is-sticky'),
                    words: words,
                    color: b.dataset.color || undefined,
                    status: b.dataset.status || "none"
                });
            }
        });
        return blocks;
    },

    getLastSide(container) {
        if (!container) return null;
        const blocks = container.querySelectorAll('.dialectics-block');
        if (blocks.length === 0) return null;
        return blocks[blocks.length - 1].classList.contains('block-left') ? 'left' : 'right';
    }
};
