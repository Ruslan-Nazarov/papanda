import AppState from './AppState.js';
import NotesAPI from './api.js';
import { renderStreamMarkdown } from './ConceptExplainManager.js';

import { t } from '../i18n.js';
class AICheckModalService {
    static async show(blockId) {
        const block = AppState.getBlock(blockId);
        if (!block) return;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '1200';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog ai-check-modal';
        dialog.style.maxWidth = '560px';
        dialog.style.width = '90%';
        dialog.style.borderRadius = '16px';
        dialog.style.overflow = 'hidden';
        dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
        dialog.style.background = '#ffffff';

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.15rem; color: #1e293b;">
                    <span style="font-size: 1.25rem;">🔬</span>
                    <span>${t('tt_ai_check')}: ${this.escapeHtml(block.title || t('aicheck_block'))}</span>
                </div>
                <button class="btn-close-modal" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
            </div>
            <div class="modal-dialog-body" style="padding: 20px; min-height: 240px; max-height: 420px; overflow-y: auto; background: #fafafa;">
                <div id="ai-check-response-area" style="font-size: 0.95rem; line-height: 1.6; color: #334155;">
                    <div style="color: #64748b; text-align: center; padding: 40px 0;">
                        <span class="typing-dot">●</span> <span class="typing-dot">●</span> <span class="typing-dot">●</span>
                        <p style="margin-top: 8px;">${t('aicheck_analyzing')}</p>
                    </div>
                </div>
            </div>
            <div class="modal-dialog-footer" style="padding: 12px 20px; background: #ffffff; border-top: 1px solid #f1f5f9; display: flex; gap: 10px; align-items: center;">
                <input type="text" id="ai-check-query-input" placeholder="${t('aicheck_ask_ph')}" style="flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; box-sizing: border-box;">
                <button id="ai-check-send-btn" style="background: #ea580c; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">${t('send_word')}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };
        dialog.querySelector('.btn-close-modal').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        const respArea = dialog.querySelector('#ai-check-response-area');
        const input = dialog.querySelector('#ai-check-query-input');
        const sendBtn = dialog.querySelector('#ai-check-send-btn');

        const sendQuery = async (queryText = '') => {
            respArea.innerHTML = `
                <div style="color: #64748b; text-align: center; padding: 40px 0;">
                    <span class="typing-dot">●</span> <span class="typing-dot">●</span> <span class="typing-dot">●</span>
                    <p style="margin-top: 8px;">${t('aicheck_requesting')}</p>
                </div>
            `;

            try {
                respArea.innerHTML = `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                        <strong style="color: #1e293b; font-size: 1rem;">${t('aicheck_result')}</strong>
                        <div id="ai-check-stream-body" style="margin-top: 8px; color: #334155;"><span style="color:#94a3b8;">▍</span></div>
                    </div>
                `;
                const streamBody = respArea.querySelector('#ai-check-stream-body');
                let last = 0;
                const full = await NotesAPI.stream(
                    '/ai/dialectics/check-ai/stream',
                    {
                        text: `${block.title || ''}\n${block.html || ''}`,
                        history: queryText ? [{ role: 'user', content: queryText }] : []
                    },
                    (_d, acc) => {
                        const now = Date.now();
                        if (now - last > 60) { last = now; renderStreamMarkdown(streamBody, acc + ' ▍'); }
                    }
                );
                renderStreamMarkdown(streamBody, full || t('aicheck_done'));
                return;
            } catch {}

            // Fallback dialectical analysis stub if backend AI is not available
            const plainContent = (block.html || '').replace(/<[^>]+>/g, '').trim();
            const fallbackReport = `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="font-weight: 700; color: #1e293b; margin-bottom: 8px; font-size: 1.02rem;">${t('aicheck_fb_title')}</div>
                    <ul style="margin: 0; padding-left: 18px; color: #475569; display: flex; flex-direction: column; gap: 6px;">
                        <li><strong>${t('aicheck_fb_thesis_label')}</strong> «${this.escapeHtml(block.title || t('hint_anchor_title'))}» ${t('aicheck_fb_thesis')}</li>
                        <li><strong>${t('aicheck_fb_content_label')}</strong> ${plainContent ? `${t('aicheck_fb_fixed')} ${plainContent.length} ${t('aicheck_fb_chars')}. ${t('aicheck_fb_have')}` : t('aicheck_fb_none')}</li>
                        <li><strong>${t('aicheck_fb_logic')}</strong> ${t('aicheck_fb_logic_text')}</li>
                        <li><strong>${t('aicheck_fb_rec')}</strong> ${t('aicheck_fb_rec_text')}</li>
                    </ul>
                </div>
            `;

            respArea.innerHTML = fallbackReport;
        };

        // Initial check call
        sendQuery();

        const handleFollowUp = () => {
            const val = input.value.trim();
            if (!val) return;
            input.value = '';
            sendQuery(val);
        };

        sendBtn.addEventListener('click', handleFollowUp);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleFollowUp();
        });
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default AICheckModalService;
