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

import { t } from '../i18n.js';
export class EditorTiptapSetup {
    static createEditor(containerEl, currentHtml, autofocus = true) {
        return new Editor({
            element: containerEl,
            extensions: [
                StarterKit.configure({
                    blockquote: false,
                    orderedList: false,
                    link: false,
                    underline: false,
                }), 
                Underline,
                InternalLink.configure({ openOnClick: false }),
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
            content: currentHtml,
            autofocus: autofocus,
            editorProps: {
                transformPastedHTML(html) {
                    return PasteMathTransformer.transformHTML(html);
                }
            }
        });
    }

    static bindFormatButtons(modalContainer, getEditor) {
        const updateFormatButtons = () => {
            const editor = getEditor();
            if (!editor) return;
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
        }

        modalContainer.querySelectorAll('.format-btn').forEach(btn => {
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
                if (format === 'clear') currentEditor.chain().focus().unsetAllMarks().run();
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
                        confirmText: t('save')
                    }).then(questionText => {
                        if (questionText === null || currentEditor.isDestroyed) return;
                        if (questionText === '') {
                            currentEditor.chain().focus().unsetQuestionMark().run();
                        } else {
                            currentEditor.chain().focus().setQuestionMark({ text: questionText }).run();
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

                    if (!isEditing && (!selectedText || selectedText.trim().length === 0)) return;

                    DialogService.selectInternalLink(isEditing).then(url => {
                        if (url === null || currentEditor.isDestroyed) return;
                        if (url === '') {
                            currentEditor.chain().focus().extendMarkRange('link').unsetLink().run();
                        } else {
                            currentEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
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
        dialog.className = 'modal-dialog';
        dialog.style.maxWidth = '480px';
        dialog.style.width = '90%';
        dialog.style.borderRadius = '16px';
        dialog.style.overflow = 'hidden';
        dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
        dialog.style.background = '#ffffff';

        const { state } = currentEditor;
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        const isEditing = currentEditor.isActive('hiddenPhrase');
        const existingHint = isEditing ? (currentEditor.getAttributes('hiddenPhrase').hint || '') : '';

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.15rem; color: #1e293b;">
                    <span style="font-size: 1.25rem;">👁</span>
                    <span>${isEditing ? t('hp_edit') : t('hp_add')}</span>
                </div>
                <button class="btn-close-hp" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
            </div>
            <div style="padding: 20px;">
                <div style="font-size: 0.92rem; color: #334155; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <span style="color: #64748b;">✍</span>
                    <span>${t('tip_hp_intro')}</span>
                </div>
                <input type="text" id="hp-explanation-input" placeholder="${t('hp_example_ph')}" value="${this.escapeHtml(existingHint)}" style="width: 100%; padding: 10px 14px; border: 1.5px solid #f97316; border-radius: 10px; font-size: 0.95rem; outline: none; box-sizing: border-box; margin-bottom: 20px;">
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-cancel-hp" style="background: #2563eb; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">${t('tip_cancel')}</button>
                    <button class="btn-save-hp" style="background: #ea580c; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">${t('save')}</button>
                </div>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const input = dialog.querySelector('#hp-explanation-input');
        input.focus();

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };

        dialog.querySelector('.btn-close-hp').addEventListener('click', close);
        dialog.querySelector('.btn-cancel-hp').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        const handleSave = async () => {
            if (currentEditor.isDestroyed) {close(); return;}
            const hintText = input.value.trim();
            if (hintText) {
                if (isEditing || (selectedText && selectedText.trim().length > 0)) {
                    currentEditor.chain().focus().setHiddenPhrase({ hint: hintText }).run();
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
                currentEditor.chain().focus().unsetHiddenPhrase().run();
            }
            close();
        };

        dialog.querySelector('.btn-save-hp').addEventListener('click', handleSave);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') close();
        });
    }

    static escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
