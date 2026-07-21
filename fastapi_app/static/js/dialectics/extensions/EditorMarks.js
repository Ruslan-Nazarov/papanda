/**
 * EditorMarks.js - Кастомные марки TipTap (QuestionMark, HiddenPhraseMark, BlockLinkMark)
 * И глобальные обработчики событий для интерактивных элементов (скрытые пояснения и смарт-ссылки)
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export const QuestionMark = Mark.create({
    name: 'questionMark',
    inclusive: false,

    addAttributes() {
        return {
            title: {
                default: 'Есть вопрос, непонятно',
                parseHTML: element => element.getAttribute('title'),
                renderHTML: attributes => {
                    return {
                        title: attributes.title,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'span[data-question="true"]' },
            { tag: 'span.dialectics-question-highlight' }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                class: 'dialectics-question-highlight',
                'data-question': 'true',
            }),
            0,
        ];
    },

    addCommands() {
        return {
            toggleQuestionMark:
                (attributes) =>
                ({ commands }) => {
                    return commands.toggleMark(this.name, attributes);
                },
        };
    },
});

export const HiddenPhraseMark = Mark.create({
    name: 'hiddenPhrase',
    inclusive: false,

    addAttributes() {
        return {
            note: {
                default: 'Пояснение',
                parseHTML: element => element.getAttribute('data-note') || 'Пояснение',
                renderHTML: attributes => {
                    return { 'data-note': attributes.note };
                },
            },
            expanded: {
                default: 'false',
                parseHTML: element => element.getAttribute('data-expanded') || 'false',
                renderHTML: attributes => {
                    return { 'data-expanded': attributes.expanded };
                },
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'span[data-hidden-phrase="true"]' },
            { tag: 'span.dialectics-hidden-phrase' }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                class: 'dialectics-hidden-phrase',
                'data-hidden-phrase': 'true',
            }),
            0,
        ];
    },

    addCommands() {
        return {
            toggleHiddenPhrase:
                (attributes) =>
                ({ commands }) => {
                    return commands.toggleMark(this.name, attributes);
                },
        };
    },
});

export const BlockLinkMark = Mark.create({
    name: 'blockLink',
    inclusive: false,

    addAttributes() {
        return {
            targetId: {
                default: '',
                parseHTML: element => element.getAttribute('data-target-id') || '',
                renderHTML: attributes => {
                    return { 'data-target-id': attributes.targetId };
                },
            },
            targetTitle: {
                default: '',
                parseHTML: element => element.getAttribute('data-target-title') || '',
                renderHTML: attributes => {
                    return { 'data-target-title': attributes.targetTitle };
                },
            },
            targetNoteId: {
                default: '',
                parseHTML: element => element.getAttribute('data-target-note-id') || '',
                renderHTML: attributes => {
                    if (!attributes.targetNoteId) return {};
                    return { 'data-target-note-id': attributes.targetNoteId };
                },
            },
            targetNoteTitle: {
                default: '',
                parseHTML: element => element.getAttribute('data-target-note-title') || '',
                renderHTML: attributes => {
                    if (!attributes.targetNoteTitle) return {};
                    return { 'data-target-note-title': attributes.targetNoteTitle };
                },
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'span[data-block-link="true"]' },
            { tag: 'span.dialectics-block-link' }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                class: 'dialectics-block-link',
                'data-block-link': 'true',
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setBlockLink:
                (attributes) =>
                ({ commands }) => {
                    return commands.setMark(this.name, attributes);
                },
            unsetBlockLink:
                () =>
                ({ commands }) => {
                    return commands.unsetMark(this.name);
                },
            toggleBlockLink:
                (attributes) =>
                ({ commands }) => {
                    return commands.toggleMark(this.name, attributes);
                },
        };
    },
});

// Глобальный обработчик для интерактивных скрытых фраз (инлайн-сносок)
if (typeof window !== 'undefined' && !window._hiddenPhraseHandlerInitialized) {
    window._hiddenPhraseHandlerInitialized = true;

    document.addEventListener('click', (e) => {
        const hiddenPhraseEl = e.target.closest('.dialectics-hidden-phrase');
        if (hiddenPhraseEl) {
            e.preventDefault();
            e.stopPropagation();
            const current = hiddenPhraseEl.getAttribute('data-expanded') === 'true';
            const nextState = !current ? 'true' : 'false';
            hiddenPhraseEl.setAttribute('data-expanded', nextState);

            if (window.app && window.app.editor && window.app.editor.tiptap) {
                const editor = window.app.editor.tiptap;
                const pos = editor.view.posAtDOM(hiddenPhraseEl, 0);
                if (pos >= 0) {
                    const { doc } = editor.state;
                    let tr = editor.state.tr;
                    let found = false;
                    doc.nodesBetween(Math.max(0, pos - 2), Math.min(doc.content.size, pos + 2), (node, nPos) => {
                        if (node.isInline) {
                            node.marks.forEach(mark => {
                                if (mark.type.name === 'hiddenPhrase') {
                                    tr = tr.removeMark(nPos, nPos + node.nodeSize, mark.type);
                                    tr = tr.addMark(nPos, nPos + node.nodeSize, mark.type.create({ ...mark.attrs, expanded: nextState }));
                                    found = true;
                                }
                            });
                        }
                    });
                    if (found) {
                        editor.view.dispatch(tr);
                    }
                }
            }
        }
    });

    window.toggleAllHiddenPhrases = function() {
        const allPhrases = document.querySelectorAll('.dialectics-hidden-phrase');
        if (!allPhrases.length) return;
        let anyCollapsed = false;
        allPhrases.forEach(el => {
            if (el.getAttribute('data-expanded') !== 'true') anyCollapsed = true;
        });
        const targetState = anyCollapsed ? 'true' : 'false';
        allPhrases.forEach(el => {
            el.setAttribute('data-expanded', targetState);
        });

        if (window.app && window.app.editor && window.app.editor.tiptap) {
            const editor = window.app.editor.tiptap;
            const { doc } = editor.state;
            let tr = editor.state.tr;
            let modified = false;
            doc.descendants((node, pos) => {
                if (node.isInline) {
                    node.marks.forEach(mark => {
                        if (mark.type.name === 'hiddenPhrase' && mark.attrs.expanded !== targetState) {
                            tr = tr.removeMark(pos, pos + node.nodeSize, mark.type);
                            tr = tr.addMark(pos, pos + node.nodeSize, mark.type.create({ ...mark.attrs, expanded: targetState }));
                            modified = true;
                        }
                    });
                }
            });
            if (modified) {
                editor.view.dispatch(tr);
            }
        }
    };
}

// Глобальный обработчик для интерактивных ссылок между блоками (смарт-чипы)
if (typeof window !== 'undefined' && !window._blockLinkHandlerInitialized) {
    window._blockLinkHandlerInitialized = true;

    document.addEventListener('click', async (e) => {
        const linkEl = e.target.closest('.dialectics-block-link');
        if (linkEl) {
            e.preventDefault();
            e.stopPropagation();
            const targetId = linkEl.getAttribute('data-target-id');
            const targetNoteId = linkEl.getAttribute('data-target-note-id');
            if (!targetId && !targetNoteId) return;

            const scrollAndHighlight = (blockId) => {
                if (!blockId) return false;
                const targetBlock = document.querySelector(`.dialectics-block[data-block-id="${blockId}"], .dialectics-block[data-id="${blockId}"]`);
                if (targetBlock) {
                    targetBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetBlock.style.transition = 'box-shadow 0.5s ease';
                    const origBoxShadow = targetBlock.style.boxShadow;
                    targetBlock.style.boxShadow = '0 0 0 4px #3b82f6, 0 0 25px rgba(59, 130, 246, 0.5)';
                    setTimeout(() => { targetBlock.style.boxShadow = origBoxShadow; }, 2000);
                    return true;
                }
                return false;
            };

            if (targetNoteId) {
                if (window.app && typeof window.app.loadNoteToEditor === 'function') {
                    await window.app.loadNoteToEditor(targetNoteId);
                    if (targetId) {
                        setTimeout(() => {
                            if (!scrollAndHighlight(targetId)) {
                                if (window.showToast) window.showToast('Целевой блок не найден в загруженном конспекте', 'warning');
                            }
                        }, 300);
                    }
                } else {
                    if (window.showToast) window.showToast('Не удалось загрузить целевой конспект', 'warning');
                }
            } else {
                if (targetId && !scrollAndHighlight(targetId)) {
                    if (window.showToast) {
                        window.showToast('Целевой блок не найден на холсте', 'warning');
                    }
                }
            }
        }
    });

    let hoverTimeout = null;
    let previewPopover = null;

    function removePreview() {
        if (previewPopover) {
            previewPopover.remove();
            previewPopover = null;
        }
    }

    document.addEventListener('mouseover', (e) => {
        const linkEl = e.target.closest('.dialectics-block-link');
        if (linkEl) {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            removePreview();

            const targetId = linkEl.getAttribute('data-target-id');
            const targetNoteId = linkEl.getAttribute('data-target-note-id');
            const targetNoteTitle = linkEl.getAttribute('data-target-note-title');
            let targetTitle = linkEl.getAttribute('data-target-title') || 'Связанный блок';
            
            if (targetNoteTitle) {
                targetTitle += ` (в "${targetNoteTitle}")`;
            }

            const targetBlock = document.querySelector(`.dialectics-block[data-block-id="${targetId}"], .dialectics-block[data-id="${targetId}"]`);

            let previewText = 'Текст блока отсутствует или блок удалён';
            
            if (targetNoteId) {
                previewText = 'Загрузка превью...';
                fetch(`/api/dialectics/${targetNoteId}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(n => {
                        if (!n) return;
                        if (!targetId) {
                            previewText = `Переход к конспекту: ${n.title || targetNoteTitle}`;
                            if (previewPopover) {
                                const bodyTextEl = previewPopover.querySelector('.preview-body-text');
                                if (bodyTextEl) bodyTextEl.innerText = previewText;
                            }
                            return;
                        }
                        const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;
                        if (Array.isArray(blocks)) {
                            const b = blocks.find(x => x.id === targetId);
                            if (b) {
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = b.html || '';
                                let text = tempDiv.innerText.trim();
                                if (text.length > 180) text = text.substring(0, 180) + '...';
                                previewText = text || 'Пустой блок';
                                
                                if (previewPopover) {
                                    const bodyTextEl = previewPopover.querySelector('.preview-body-text');
                                    if (bodyTextEl) bodyTextEl.innerText = previewText;
                                }
                            }
                        }
                    })
                    .catch(err => console.error("Preview load error:", err));
            } else if (targetBlock) {
                const inner = targetBlock.querySelector('.dialectics-content-inner');
                if (inner) {
                    previewText = inner.innerText.trim();
                    if (previewText.length > 180) previewText = previewText.substring(0, 180) + '...';
                }
            }

            previewPopover = document.createElement('div');
            previewPopover.className = 'dialectics-link-preview-popover';
            previewPopover.style.cssText = `
                position: absolute; z-index: 10000; width: 300px; background: white;
                border: 1px solid #93c5fd; border-radius: 12px; padding: 14px;
                box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.25);
                font-size: 0.85rem; pointer-events: none; opacity: 0;
                transition: opacity 0.15s ease, transform 0.15s ease;
                transform: translateY(4px); font-family: inherit;
            `;
            previewPopover.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-weight: 700; color: #1d4ed8; font-size: 0.9rem; border-bottom: 1px solid #eff6ff; padding-bottom: 6px;">
                    <span>🔗</span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${targetTitle}</span>
                </div>
                <div class="preview-body-text" style="color: #475569; line-height: 1.45; font-size: 0.82rem; max-height: 90px; overflow: hidden; text-overflow: ellipsis;">
                    ${previewText}
                </div>
            `;
            document.body.appendChild(previewPopover);

            const rect = linkEl.getBoundingClientRect();
            let left = Math.max(10, rect.left + window.scrollX);
            if (left + 300 > window.innerWidth) {
                left = window.innerWidth - 310;
            }
            previewPopover.style.left = `${left}px`;
            previewPopover.style.top = `${rect.bottom + window.scrollY + 6}px`;

            requestAnimationFrame(() => {
                if (previewPopover) {
                    previewPopover.style.opacity = '1';
                    previewPopover.style.transform = 'translateY(0)';
                }
            });
        }
    });

    document.addEventListener('mouseout', (e) => {
        const linkEl = e.target.closest('.dialectics-block-link');
        if (linkEl) {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                removePreview();
            }, 200);
        }
    });
}
