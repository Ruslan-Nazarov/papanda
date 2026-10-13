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
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '1200';
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog block-sources-modal';
        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2 class="block-sources-title"><span aria-hidden="true">🔗</span>
                    <span>${t('meta_sources_title')}</span>
                </h2>
                <button class="btn-close-modal block-sources-icon-btn" type="button" aria-label="${t('close_word')}">✕</button>
            </div>
            <div class="modal-dialog-body">
                <div class="block-sources-list-header">
                    <span>${t('meta_attached')}</span>
                    <button class="block-sources-primary btn-new-src" type="button">${t('meta_attach_btn')}</button>
                </div>
                <div class="sources-list-container"></div>
                <form class="block-sources-form" hidden>
                    <h3 class="block-sources-form-title"></h3>
                    <input type="text" class="src-url-input" placeholder="${t('src_url_ph')}" aria-label="${t('src_url_ph')}">
                    <input type="text" class="src-title-input" placeholder="${t('src_name_ph')}" aria-label="${t('src_name_ph')}">
                    <textarea class="src-quote-input" placeholder="${t('src_quote_ph')}" aria-label="${t('src_quote_ph')}" rows="3"></textarea>
                    <div class="block-sources-form-actions">
                        <button class="block-sources-secondary btn-cancel-src" type="button">${t('cancel')}</button>
                        <button class="block-sources-primary btn-save-src" type="submit"></button>
                    </div>
                </form>
            </div>
            <div class="modal-dialog-footer">
                <button class="block-sources-secondary btn-done" type="button">${t('meta_done')}</button>
            </div>
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        const list = dialog.querySelector('.sources-list-container');
        const form = dialog.querySelector('.block-sources-form');
        const urlInput = form.querySelector('.src-url-input');
        const titleInput = form.querySelector('.src-title-input');
        const quoteInput = form.querySelector('.src-quote-input');
        let editingIndex = null;
        const blockElement = [...document.querySelectorAll('.dialectics-block')].find(el => el.dataset.id === String(block.id));
        const button = blockElement?.querySelector('.btn-connections');
        const updateBadge = () => {
            if (!button) return;
            const count = block.sources?.length || 0;
            button.setAttribute('aria-label', `${t('tt_block_sources')} (${count})`);
            let badge = button.querySelector('.sources-badge');
            if (count && !badge) {
                badge = document.createElement('span');
                badge.className = 'sources-badge';
                badge.setAttribute('aria-hidden', 'true');
                button.appendChild(badge);
            }
            if (badge) {
                if (count) badge.textContent = String(count);
                else badge.remove();
            }
        };
        const renderList = () => {
            list.innerHTML = (block.sources?.length || 0) ? block.sources.map((src, idx) => `
                <article class="block-source-card">
                    <div class="block-source-content">
                        <strong>${this.escapeHtml(src.title || src.url)}</strong>
                        ${HtmlSafety.link(src.url) ? `<a href="${HtmlSafety.escape(HtmlSafety.link(src.url))}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(src.url)}</a>` : ''}
                        ${src.quote ? `<blockquote>${this.escapeHtml(src.quote)}</blockquote>` : ''}
                    </div>
                    <div class="block-source-actions">
                        <button class="block-sources-icon-btn btn-edit-src" type="button" data-idx="${idx}" title="${t('tt_edit')}" aria-label="${t('tt_edit')}">✎</button>
                        <button class="block-sources-icon-btn btn-del-src" type="button" data-idx="${idx}" title="${t('tt_delete')}" aria-label="${t('tt_delete')}">✕</button>
                    </div>
                </article>`).join('') : `<p class="block-sources-empty">${t('meta_no_sources')}</p>`;
        };
        const closeForm = () => {
            editingIndex = null;
            form.reset();
            form.hidden = true;
            list.hidden = false;
            dialog.querySelector('.btn-new-src').hidden = false;
        };
        const openForm = (index = null) => {
            editingIndex = index;
            form.reset();
            if (index !== null) {
                const source = block.sources[index];
                urlInput.value = source.url || '';
                titleInput.value = source.title || '';
                quoteInput.value = source.quote || '';
            }
            form.querySelector('.block-sources-form-title').textContent = index === null ? t('meta_new_source') : t('meta_edit_source');
            form.querySelector('.btn-save-src').textContent = index === null ? t('meta_attach_btn') : t('save');
            form.hidden = false;
            list.hidden = true;
            dialog.querySelector('.btn-new-src').hidden = true;
            urlInput.focus();
        };
        renderList();
        const close = () => overlay.remove();
        dialog.querySelector('.btn-close-modal').addEventListener('click', close);
        dialog.querySelector('.btn-done').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        dialog.querySelector('.btn-new-src').addEventListener('click', () => openForm());
        dialog.querySelector('.btn-cancel-src').addEventListener('click', closeForm);
        list.addEventListener('click', e => {
            const edit = e.target.closest('.btn-edit-src');
            const del = e.target.closest('.btn-del-src');
            if (edit) openForm(Number(edit.dataset.idx));
            if (del) {
                const idx = Number(del.dataset.idx);
                AppState.updateBlock(block.id, {sources: block.sources.filter((_, i) => i !== idx)});
                renderList();
                updateBadge();
            }
        });
        form.addEventListener('submit', e => {
            e.preventDefault();
            const url = urlInput.value.trim();
            const title = titleInput.value.trim();
            const quote = quoteInput.value.trim();
            if (!url && !title && !quote) return;
            const sources = [...(block.sources || [])];
            if (editingIndex === null) sources.push({url, title, quote});
            else sources[editingIndex] = {...sources[editingIndex], url, title, quote};
            AppState.updateBlock(block.id, {sources});
            renderList();
            updateBadge();
            closeForm();
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
