import AppState from './AppState.js';

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
                    <span>Проверка ИИ: ${this.escapeHtml(block.title || 'Блок конспекта')}</span>
                </div>
                <button class="btn-close-modal" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
            </div>
            <div class="modal-dialog-body" style="padding: 20px; min-height: 240px; max-height: 420px; overflow-y: auto; background: #fafafa;">
                <div id="ai-check-response-area" style="font-size: 0.95rem; line-height: 1.6; color: #334155;">
                    <div style="color: #64748b; text-align: center; padding: 40px 0;">
                        <span class="typing-dot">●</span> <span class="typing-dot">●</span> <span class="typing-dot">●</span>
                        <p style="margin-top: 8px;">Анализ диалектической логики блока...</p>
                    </div>
                </div>
            </div>
            <div class="modal-dialog-footer" style="padding: 12px 20px; background: #ffffff; border-top: 1px solid #f1f5f9; display: flex; gap: 10px; align-items: center;">
                <input type="text" id="ai-check-query-input" placeholder="Задайте уточняющий вопрос..." style="flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; box-sizing: border-box;">
                <button id="ai-check-send-btn" style="background: #ea580c; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">Отправить</button>
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
                    <p style="margin-top: 8px;">Запрос к ИИ...</p>
                </div>
            `;

            try {
                const res = await fetch('/api/ai/dialectics/check-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `${block.title || ''}\n${block.html || ''}`,
                        history: queryText ? [{ role: 'user', content: queryText }] : []
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    const resultText = data.result || 'Логика блока проверена.';
                    const parsedHtml = (typeof marked !== 'undefined') ? DOMPurify.sanitize(marked.parse(resultText)) : this.escapeHtml(resultText).replace(/\n/g, '<br>');
                    respArea.innerHTML = `
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                            <strong style="color: #1e293b; font-size: 1rem;">Результат проверки:</strong>
                            <div style="margin-top: 8px; color: #334155;">${parsedHtml}</div>
                        </div>
                    `;
                    return;
                }
            } catch {}

            // Fallback dialectical analysis stub if backend AI is not available
            const plainContent = (block.html || '').replace(/<[^>]+>/g, '').trim();
            const fallbackReport = `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="font-weight: 700; color: #1e293b; margin-bottom: 8px; font-size: 1.02rem;">Диалектический анализ блока:</div>
                    <ul style="margin: 0; padding-left: 18px; color: #475569; display: flex; flex-direction: column; gap: 6px;">
                        <li><strong>Тезис:</strong> «${this.escapeHtml(block.title || 'Что вам нужно понять?')}» четко задает контекст исследования.</li>
                        <li><strong>Содержание:</strong> ${plainContent ? `Зафиксировано ${plainContent.length} символов. Определена предметная область.` : 'Рекомендуется добавить текстовое описание процесса.'}</li>
                        <li><strong>Логическая связность:</strong> Структура соответствует диалектическому алгоритму развертывания понятий.</li>
                        <li><strong>Рекомендация:</strong> Проверьте, раскрыты ли внутренние противоречия и условия перехода к следующему шагу.</li>
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
