import AppState from './AppState.js';

import { t } from '../i18n.js';
class DictModalService {
    static show(blockId) {
        const block = AppState.getBlock(blockId);
        if (!block) return;



        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog dict-modal';
        dialog.style.maxWidth = '600px';
        dialog.style.width = '90%';

        const renderWordsList = () => {
            if (!block.words || block.words.length === 0) {
                return `<p style="color: #94a3b8; font-style: italic; margin-top: 6px;">${t('dict_empty')}</p>`;
            }
            return `
                <div class="dict-words-list" style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                    ${block.words.map((w, i) => `
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <strong style="color: #1e293b; font-size: 1rem;">${this.escapeHtml(w.word)}</strong>
                                <div style="color: #475569; font-size: 0.9rem; margin-top: 4px;">${this.escapeHtml(w.definition || '')}</div>
                                ${w.connections ? `<div style="color: #3b82f6; font-size: 0.8rem; margin-top: 2px;">${t('dict_connections')}: ${this.escapeHtml(w.connections)}</div>` : ''}
                            </div>
                            <button class="btn-del-word icon-btn" data-index="${i}" title=t('dict_del_word') style="color: #ef4444; font-size: 1rem; border: none; background: none; cursor: pointer;">✕</button>
                        </div>
                    `).join('')}
                </div>
            `;
        };

        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2 style="display: flex; align-items: center; gap: 8px; font-size: 1.25rem; font-weight: 700; color: #1e293b;">
                    <span>📖</span>
                    <span>${t('dict_title')}</span>
                </h2>
                <button class="icon-btn btn-close-modal">✕</button>
            </div>
            <div class="modal-dialog-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${t('dict_words_label')}</div>
                    <div id="dict-words-container">${renderWordsList()}</div>
                </div>

                <div style="border-top: 1px dashed #cbd5e1; margin: 20px 0;"></div>

                <div>
                    <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 12px;">${t('dict_new_concept')}</div>
                    
                    <input type="text" id="dict-word-input" placeholder="${t('dict_word_ph')}" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; margin-bottom: 10px; outline: none;">
                    
                    <textarea id="dict-def-input" placeholder="${t('dict_expl_ph')}" rows="3" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; resize: vertical; margin-bottom: 10px; outline: none; font-family: inherit;"></textarea>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <button type="button" id="btn-helper-formula" class="action-btn" style="background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer;">${t('dict_helper_formula')}</button>
                        <button type="button" id="btn-helper-link" class="action-btn" style="background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer;">${t('dict_helper_link')}</button>
                    </div>

                    <input type="text" id="dict-conn-input" placeholder="${t('dict_conn_ph')}" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; margin-bottom: 14px; outline: none;">

                    <button type="button" id="btn-add-dict-word" class="action-btn" style="background: #3b82f6; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer;">${t('dict_add_btn')}</button>
                </div>
            </div>
            <div class="modal-dialog-footer" style="padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                <button class="action-btn primary btn-done" style="background: #3b82f6; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">${t('dict_done')}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };
        dialog.querySelector('.btn-close-modal').addEventListener('click', close);
        dialog.querySelector('.btn-done').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        const wordInput = dialog.querySelector('#dict-word-input');
        const defInput = dialog.querySelector('#dict-def-input');
        const connInput = dialog.querySelector('#dict-conn-input');
        const wordsContainer = dialog.querySelector('#dict-words-container');

        const bindDeleteWords = () => {
            wordsContainer.querySelectorAll('.btn-del-word').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index, 10);
                    AppState.updateBlock(block.id, {words: block.words.filter((_, i) => i !== idx)});
                    wordsContainer.innerHTML = renderWordsList();
                    bindDeleteWords();
                });
            });
        };
        bindDeleteWords();

        dialog.querySelector('#btn-helper-formula').addEventListener('click', () => {
            defInput.value += ` $${t('dict_formula_sample')}$ `;
            defInput.focus();
        });

        dialog.querySelector('#btn-helper-link').addEventListener('click', () => {
            defInput.value += ` [[${t('dict_link_sample')}]] `;
            defInput.focus();
        });

        dialog.querySelector('#btn-add-dict-word').addEventListener('click', () => {
            const word = wordInput.value.trim();
            const definition = defInput.value.trim();
            const connections = connInput.value.trim();

            if (!word) return;

            AppState.updateBlock(block.id, {words: [...(block.words || []), { word, definition, connections }]});

            wordInput.value = '';
            defInput.value = '';
            connInput.value = '';

            wordsContainer.innerHTML = renderWordsList();
            bindDeleteWords();
        });
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default DictModalService;
