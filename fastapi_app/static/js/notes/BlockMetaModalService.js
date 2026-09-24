import AppState from './AppState.js';
import HtmlSafety from './HtmlSafety.js';
import { ALGORITHM_TEXTS, ALGORITHM_STEPS, inferRoleFromTitle } from './BlockConstants.js';

import { t } from '../i18n.js';
class BlockMetaModalService {
    static showInfoModal(blockId) {
        const block = AppState.getBlock(blockId);
        if (!block) return;

        let role = block.role;
        if (!role) {
            inferRoleFromTitle(block);
            role = block.role;
        }
        if (!role) role = 'step1'; // fallback

        const stepObj = ALGORITHM_STEPS.find(s => s.role === role) || { title: block.title || t('meta_block_info') };
        const promptText = ALGORITHM_TEXTS[role] || (block.title || t('meta_no_instr'));

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '1200';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.style.maxWidth = '520px';
        dialog.style.width = '90%';
        dialog.style.borderRadius = '16px';
        dialog.style.overflow = 'hidden';
        dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
        dialog.style.background = '#ffffff';

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.1rem; color: #1e293b;">
                    <span style="font-size: 1.25rem;">ℹ️</span>
                    <span>${t('meta_step_instr')}${this.escapeHtml(stepObj.title)}</span>
                </div>
                <button class="btn-close-modal" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
            </div>
            <div style="padding: 20px; font-size: 0.95rem; line-height: 1.6; color: #334155; max-height: 60vh; overflow-y: auto;">
                ${promptText}
            </div>
            <div style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                <button class="btn-done" style="background: #2563eb; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">${t('meta_understood')}</button>
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
    }

    static showSourcesModal(blockId) {
        const block = AppState.getBlock(blockId);
        if (!block) return;
        
        if (!block.sources) block.sources = [];
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '1200';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.style.maxWidth = '540px';
        dialog.style.width = '90%';
        dialog.style.borderRadius = '16px';
        dialog.style.overflow = 'hidden';
        dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
        dialog.style.background = '#ffffff';

        const renderSourcesList = () => {
            if (!block.sources || block.sources.length === 0) {
                return `<p style="color: #94a3b8; font-style: italic; margin: 8px 0 0 0;">${t('meta_no_sources')}</p>`;
            }
            return `
                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                    ${block.sources.map((src, idx) => `
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <strong style="color: #1e293b; font-size: 0.95rem;">${this.escapeHtml(src.title || src.url)}</strong>
                                ${HtmlSafety.link(src.url) ? `<div style="font-size: 0.82rem; color: #2563eb; margin-top: 2px;"><a href="${HtmlSafety.escape(HtmlSafety.link(src.url))}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none;">${this.escapeHtml(src.url)}</a></div>` : ''}
                                ${src.quote ? `<blockquote style="margin: 6px 0 0 0; padding-left: 8px; border-left: 2px solid #2563eb; font-size: 0.85rem; color: #475569;">${this.escapeHtml(src.quote)}</blockquote>` : ''}
                            </div>
                            <button class="btn-del-src" data-idx="${idx}" title="${t('tt_delete')}" style="color: #ef4444; font-size: 1rem; border: none; background: none; cursor: pointer; padding: 2px 6px;">✕</button>
                        </div>
                    `).join('')}
                </div>
            `;
        };

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.15rem; color: #1e293b;">
                    <span style="font-size: 1.25rem;">🔗</span>
                    <span>${t('meta_sources_title')}</span>
                </div>
                <button class="btn-close-modal" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
            </div>
            <div style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${t('meta_attached')}</div>
                    <div id="sources-list-container">${renderSourcesList()}</div>
                </div>

                <div style="border-top: 1px dotted #cbd5e1; margin: 16px 0;"></div>

                <div>
                    <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 12px;">${t('meta_new_source')}</div>
                    
                    <input type="text" id="src-url-input" placeholder="${t('src_url_ph')}" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; margin-bottom: 10px; outline: none; box-sizing: border-box;">
                    
                    <input type="text" id="src-title-input" placeholder="${t('src_name_ph')}" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; margin-bottom: 10px; outline: none; box-sizing: border-box;">
                    
                    <textarea id="src-quote-input" placeholder="${t('src_quote_ph')}" rows="3" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; margin-bottom: 12px; outline: none; resize: vertical; box-sizing: border-box; font-family: inherit;"></textarea>

                    <button type="button" id="btn-add-src" style="background: #2563eb; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer;">${t('meta_attach_btn')}</button>
                </div>
            </div>
            <div style="padding: 14px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                <button class="btn-done" style="background: #2563eb; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">${t('meta_done')}</button>
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

        const urlInput = dialog.querySelector('#src-url-input');
        const titleInput = dialog.querySelector('#src-title-input');
        const quoteInput = dialog.querySelector('#src-quote-input');
        const listContainer = dialog.querySelector('#sources-list-container');

        const bindDelete = () => {
            listContainer.querySelectorAll('.btn-del-src').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx, 10);
                    block.sources.splice(idx, 1);
                    AppState.updateBlock(block.id, { sources: block.sources });
                    listContainer.innerHTML = renderSourcesList();
                    bindDelete();
                });
            });
        };
        bindDelete();

        dialog.querySelector('#btn-add-src').addEventListener('click', () => {
            const url = urlInput.value.trim();
            const title = titleInput.value.trim();
            const quote = quoteInput.value.trim();

            if (!url && !title && !quote) return;

            block.sources.push({ url, title, quote });
            AppState.updateBlock(block.id, { sources: block.sources });

            urlInput.value = '';
            titleInput.value = '';
            quoteInput.value = '';

            listContainer.innerHTML = renderSourcesList();
            bindDelete();
        });
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default BlockMetaModalService;
