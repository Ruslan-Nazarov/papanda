import StarterKit from '@tiptap/starter-kit';
import { Editor } from '@tiptap/core';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';

import InternalLink from './extensions/InternalLink.js';
import QuestionMark from './extensions/QuestionMark.js';
import HiddenPhrase from './extensions/HiddenPhrase.js';
import CustomQuote from './extensions/CustomQuote.js';
import MathCallout from './extensions/MathCallout.js';
import MathInline from './extensions/MathInline.js';
import KeyboardEscape from './extensions/KeyboardEscape.js';
import DialogService from './DialogService.js';
import FormulaModalService from './FormulaModalService.js';
import PasteMathTransformer from './PasteMathTransformer.js';
import TextSize, { TEXT_SIZES } from './extensions/TextSize.js';
import BlockCodeRenderer from './BlockCodeRenderer.js';

import { t } from '../i18n.js';
export class EditorTiptapSetup {
    static createEditor(containerEl, currentHtml, autofocus = true) {
        const prepared = document.createElement('div');
        prepared.innerHTML = currentHtml || '';
        BlockCodeRenderer.mergeAdjacent(prepared);
        const editor = new Editor({
            element: containerEl,
            extensions: [
                StarterKit.configure({
                    blockquote: false,
                    link: false,
                    underline: false,
                }), 
                Underline,
                TextSize,
                InternalLink.configure({ openOnClick: false, protocols: ['internal'] }),
                Placeholder.configure({ placeholder: t('tip_placeholder') }),
                QuestionMark, 
                HiddenPhrase, 
                MathCallout,
                MathInline,
                CustomQuote,
                KeyboardEscape,
                Image.configure({
                    allowBase64: true,
                    inline: true
                })
            ],
            content: prepared.innerHTML,
            // TipTap's delayed autofocus can reset the selection after typing starts.
            autofocus: false,
            editorProps: {
                transformPastedHTML(html) {
                    return PasteMathTransformer.transformHTML(html);
                }
            }
        });
        if (autofocus) editor.view.focus();
        return editor;
    }

    static applyToText(editor, transform, clearStoredMarks = false) {
        const {empty} = editor.state.selection;
        const bookmark = editor.state.selection.getBookmark();
        let chain = editor.chain().focus();
        if (empty) chain = chain.selectAll();
        chain = transform(chain);
        if (empty) chain = chain.command(({tr}) => {
            tr.setSelection(bookmark.map(tr.mapping).resolve(tr.doc));
            if (clearStoredMarks) tr.setStoredMarks([]);
            return true;
        });
        return chain.run();
    }

    static clearFormatting(editor) {
        return this.applyToText(editor, chain => chain.unsetAllMarks().clearNodes(), true);
    }

    static clearBlockHtml(html) {
        const container = document.createElement('div');
        const editor = this.createEditor(container, html, false);
        try {
            this.clearFormatting(editor);
            return editor.getHTML();
        } finally {
            editor.destroy();
        }
    }

    static toggleCodeBlock(editor) {
        if (editor.isActive('codeBlock')) return editor.chain().focus().toggleCodeBlock().run();
        const {selection, doc} = editor.state;
        if (selection.empty) return editor.chain().focus().setCodeBlock().run();
        const first = doc.resolve(selection.$from.depth ? selection.from : Math.min(selection.from + 1, doc.content.size - 1));
        const last = doc.resolve(selection.$to.depth ? selection.to : Math.max(1, selection.to - 1));
        const depth = first.sharedDepth(last.pos) + 1;
        const from = first.before(depth);
        const to = last.after(depth);
        const code = doc.textBetween(from, to, '\n');
        if (!code.trim()) return false;
        return editor.chain().focus().insertContentAt({from, to}, {
            type: 'codeBlock', content: [{type: 'text', text: code}],
        }).run();
    }

    static bindFormatButtons(modalContainer, getEditor, session, linkContext = {}) {
        const codeControl = modalContainer.querySelector('.editor-code-control');
        const codeMenuButton = codeControl?.querySelector('.editor-code-menu-button');
        const codeMenu = codeControl?.querySelector('.editor-code-menu');
        const setCodeMenuOpen = open => {
            if (!codeMenu || !codeMenuButton) return;
            codeMenu.hidden = !open;
            codeMenuButton.setAttribute('aria-expanded', String(open));
        };
        codeMenuButton?.addEventListener('mousedown', event => event.preventDefault());
        codeMenuButton?.addEventListener('click', () => setCodeMenuOpen(codeMenu.hidden));
        codeMenu?.querySelectorAll('[data-code-action]').forEach(option => {
            option.addEventListener('mousedown', event => event.preventDefault());
            option.addEventListener('click', () => {
                const editor = getEditor();
                if (editor) {
                    if (option.dataset.codeAction === 'inline') editor.chain().focus().toggleCode().run();
                    else this.toggleCodeBlock(editor);
                }
                setCodeMenuOpen(false);
            });
        });
        session?.on(document, 'pointerdown', event => {
            if (codeMenu && !codeMenu.hidden && !codeControl.contains(event.target)) setCodeMenuOpen(false);
        });
        session?.on(document, 'keydown', event => {
            if (event.key !== 'Escape' || !codeMenu || codeMenu.hidden) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            setCodeMenuOpen(false);
            codeMenuButton.focus();
        }, true);
        const sizeControl = modalContainer.querySelector('.editor-size-control');
        const sizeButton = sizeControl?.querySelector('.format-btn-size');
        const sizeMenu = sizeControl?.querySelector('.editor-size-popover');
        const sizeOptions = [...(sizeMenu?.querySelectorAll('.editor-size-option') || [])];
        const setSizeMenuOpen = open => {
            if (!sizeMenu || !sizeButton) return;
            sizeMenu.hidden = !open;
            sizeButton.setAttribute('aria-expanded', String(open));
        };
        const updateFormatButtons = () => {
            const editor = getEditor();
            if (!editor) return;
            if (sizeButton) {
                const sizes = new Set();
                const {from, to, empty} = editor.state.selection;
                if (empty) sizes.add(String(editor.getAttributes('textSize').size || ''));
                else editor.state.doc.nodesBetween(from, to, node => {
                    if (node.isText) sizes.add(String(node.marks.find(mark => mark.type.name === 'textSize')?.attrs.size || ''));
                });
                const currentSize = sizes.size > 1 ? 'mixed' : [...sizes][0] || '';
                sizeButton.dataset.currentSize = currentSize;
                sizeOptions.forEach(option => {
                    const isCurrent = currentSize !== 'mixed' && option.dataset.size === currentSize;
                    option.classList.toggle('is-current', isCurrent);
                    option.setAttribute('aria-pressed', String(isCurrent));
                });
            }
            modalContainer.querySelectorAll('.format-btn[data-format]').forEach(btn => {
                const format = btn.dataset.format;
                const formatMap = { 
                    bold: 'bold', 
                    italic: 'italic', 
                    underline: 'underline', 
                    strike: 'strike', 
                    code: 'code', 
                    quote: 'customQuote',
                    math: 'mathCallout'
                };
                if (formatMap[format]) {
                    btn.classList.toggle('is-active', editor.isActive(formatMap[format]));
                }
            });
        };

        const editor = getEditor();
        if (editor) {
            editor.on('transaction', updateFormatButtons);
            updateFormatButtons();
        }

        sizeButton?.addEventListener('mousedown', event => event.preventDefault());
        sizeButton?.addEventListener('click', event => {
            event.preventDefault();
            setSizeMenuOpen(sizeMenu.hidden);
        });
        sizeOptions.forEach(option => {
            option.addEventListener('mousedown', event => event.preventDefault());
            option.addEventListener('click', () => {
                const current = getEditor();
                const value = option.dataset.size;
                if (!current || (value && !TEXT_SIZES.includes(Number(value)))) return;
                this.applyToText(current, chain => value
                    ? chain.setMark('textSize', {size: Number(value)}) : chain.unsetMark('textSize'));
                setSizeMenuOpen(false);
            });
        });
        session?.on(document, 'pointerdown', event => {
            if (sizeMenu && !sizeMenu.hidden && !sizeControl.contains(event.target)) setSizeMenuOpen(false);
        });
        session?.on(document, 'keydown', event => {
            if (event.key !== 'Escape' || !sizeMenu || sizeMenu.hidden) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            setSizeMenuOpen(false);
            sizeButton.focus();
        }, true);

        modalContainer.querySelectorAll('.format-btn[data-format]').forEach(btn => {
            // Keep the editor selection when a toolbar button is pressed.
            btn.addEventListener('mousedown', event => event.preventDefault());
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const format = btn.dataset.format;
                const currentEditor = getEditor();
                if (!currentEditor) return;
                
                if (format === 'bold') currentEditor.chain().focus().toggleBold().run();
                if (format === 'italic') currentEditor.chain().focus().toggleItalic().run();
                if (format === 'underline') currentEditor.chain().focus().toggleUnderline().run();
                if (format === 'strike') currentEditor.chain().focus().toggleStrike().run();
                if (format === 'code') currentEditor.chain().focus().toggleCode().run();
                if (format === 'quote') currentEditor.chain().focus().toggleCustomQuote().run();
                if (format === 'clear') this.clearFormatting(currentEditor);
                if (format === 'math') currentEditor.chain().focus().toggleMathCallout().run();
                
                if (format === 'question') {
                    const isEditing = currentEditor.isActive('questionMark');
                    const { state } = currentEditor;
                    const { from, to } = state.selection;
                    const selectedText = state.doc.textBetween(from, to, ' ');

                    if (!isEditing && (!selectedText || selectedText.trim().length === 0)) return;

                    const existingText = isEditing ? currentEditor.getAttributes('questionMark').text : '';

                    DialogService.prompt({
                        title: isEditing ? t('q_edit') : t('q_add'),
                        message: t('q_prompt'),
                        defaultValue: existingText,
                        placeholder: t('q_example_ph'),
                        icon: '❓',
                        confirmText: t('save'),
                        deleteText: isEditing ? t('delete') : ''
                    }).then(questionText => {
                        if (questionText === null || currentEditor.isDestroyed) return;
                        if (questionText === '') {
                            currentEditor.chain().focus().extendMarkRange('questionMark').unsetQuestionMark().run();
                        } else {
                            const chain = currentEditor.chain().focus();
                            if (isEditing) chain.extendMarkRange('questionMark');
                            chain.setQuestionMark({ text: questionText }).run();
                        }
                    });
                }

                if (format === 'hidden') {
                    const isEditing = currentEditor.isActive('hiddenPhrase');
                    const { state } = currentEditor;
                    const { from, to } = state.selection;
                    const selectedText = state.doc.textBetween(from, to, ' ');

                    if (!isEditing && (!selectedText || selectedText.trim().length === 0)) return;

                    this.openAddHiddenPhraseModal(currentEditor);
                }

                if (format === 'latex') {
                    let existingFormula = '';
                    const { state } = currentEditor;
                    const { from, to } = state.selection;
                    const selectedText = state.doc.textBetween(from, to, ' ');
                    if (currentEditor.isActive('mathInline')) {
                        existingFormula = currentEditor.getAttributes('mathInline').formula || '';
                    } else if (selectedText && selectedText.trim()) {
                        existingFormula = selectedText.trim();
                    }

                    FormulaModalService.open({ initialFormula: existingFormula }).then(formula => {
                        if (formula === null || formula === '' || currentEditor.isDestroyed) return;
                        currentEditor.chain().focus().insertMathInline({ formula }).run();
                    });
                }

                if (format === 'link') {
                    const isEditing = currentEditor.isActive('link');
                    const { state } = currentEditor;
                    const { from, to } = state.selection;
                    const selectedText = state.doc.textBetween(from, to, ' ');
                    const attrs = isEditing ? currentEditor.getAttributes('link') : {};
                    const existingLinks = Array.isArray(attrs.targets) && attrs.targets.length
                        ? attrs.targets : attrs.href?.startsWith('internal://note/')
                            ? [{url: attrs.href, text: selectedText || attrs.href, label: selectedText || attrs.href}] : [];

                    DialogService.selectInternalLinks({...linkContext, isEditing, existingLinks}).then(selection => {
                        if (selection === null || currentEditor.isDestroyed) return;
                        if (!selection.length) {
                            currentEditor.chain().focus().extendMarkRange('link').unsetLink().run();
                        } else {
                            const url = selection[0].url;
                            const targets = selection.length > 1 ? selection : null;
                            if (isEditing || selectedText.trim()) {
                                currentEditor.chain().focus().extendMarkRange('link').setLink({href: url, targets}).run();
                            } else {
                                currentEditor.chain().focus().insertContent({type: 'text', text: selection[0].text,
                                    marks: [{type: 'link', attrs: {href: url, targets}}]}).run();
                            }
                        }
                    });
                }
            });
        });
    }

    static openAddHiddenPhraseModal(currentEditor) {
        if (!currentEditor) return;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '1200';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog hidden-phrase-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');

        const { state } = currentEditor;
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        const isEditing = currentEditor.isActive('hiddenPhrase');
        const existingHint = isEditing ? (currentEditor.getAttributes('hiddenPhrase').hint || '') : '';
        dialog.setAttribute('aria-label', t(isEditing ? 'hp_edit' : 'hp_add'));

        dialog.innerHTML = `
            <div class="hidden-phrase-dialog-header">
                <div class="hidden-phrase-dialog-title">
                    <span aria-hidden="true">👁</span>
                    <span>${isEditing ? t('hp_edit') : t('hp_add')}</span>
                </div>
                <button class="btn-close-hp" type="button" aria-label="${t('close')}">✕</button>
            </div>
            <div class="hidden-phrase-dialog-body">
                <label for="hp-explanation-input">${t('tip_hp_intro')}</label>
                <textarea id="hp-explanation-input" rows="6" placeholder="${t('hp_example_ph')}"></textarea>
            </div>
            <div class="hidden-phrase-dialog-actions">
                ${isEditing ? `<button class="btn-delete-hp" type="button">${t('delete')}</button>` : ''}
                <button class="btn-cancel-hp" type="button">${t('tip_cancel')}</button>
                <button class="btn-save-hp" type="button">${t('save')}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const input = dialog.querySelector('#hp-explanation-input');
        input.value = existingHint;
        input.focus();

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };

        dialog.querySelector('.btn-close-hp').addEventListener('click', close);
        dialog.querySelector('.btn-cancel-hp').addEventListener('click', close);
        dialog.querySelector('.btn-delete-hp')?.addEventListener('click', () => {
            if (!currentEditor.isDestroyed) currentEditor.chain().focus().extendMarkRange('hiddenPhrase').unsetHiddenPhrase().run();
            close();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        const handleSave = async () => {
            if (currentEditor.isDestroyed) {close(); return;}
            const hintText = input.value.trim();
            if (hintText) {
                if (isEditing || (selectedText && selectedText.trim().length > 0)) {
                    const chain = currentEditor.chain().focus();
                    if (isEditing) chain.extendMarkRange('hiddenPhrase');
                    chain.setHiddenPhrase({ hint: hintText }).run();
                } else {
                    const placeholder = await DialogService.prompt({
                        title: t('hp_title'),
                        message: t('hp_prompt'),
                        defaultValue: t('tip_footnote_default'),
                        confirmText: t('insert_word')
                    }) || t('tip_footnote_default');
                    if (currentEditor.isDestroyed) {close(); return;}
                    currentEditor.chain().focus().insertContent({
                        type: 'text',
                        text: placeholder,
                        marks: [{ type: 'hiddenPhrase', attrs: { hint: hintText } }]
                    }).run();
                }
            } else if (isEditing) {
                currentEditor.chain().focus().extendMarkRange('hiddenPhrase').unsetHiddenPhrase().run();
            }
            close();
        };

        dialog.querySelector('.btn-save-hp').addEventListener('click', handleSave);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave(); }
            if (e.key === 'Escape') close();
        });
    }
}
