import { DialecticsAPI } from '../api.js';
import { DialecticsUI } from '../ui_utils.js';
import { BlockManager } from '../BlockManager.js';
import { customConfirm } from '../../modal_controller.js';

class AIBlockAnalysisClass {
    async runAI(block) {
        const container = block.closest('.dialectics-editor') || document;
        const getRoleText = (role) => {
            const el = container.querySelector(`[data-role="${role}"] .dialectics-content-inner`);
            return el ? (el.innerText || el.textContent).trim() : '';
        };

        const anchorText = getRoleText('anchor');
        const step1Text = getRoleText('step1');
        const step2Text = getRoleText('step2');

        let parts = [];
        if (anchorText) parts.push(`Что понять: ${anchorText}`);
        if (step1Text) parts.push(`Простейший процесс: ${step1Text}`);
        if (step2Text) parts.push(`Развитие процесса: ${step2Text}`);

        let processText = parts.join('\n\n');
        if (!processText) {
            const inner = block.querySelector('.dialectics-content-inner');
            processText = inner ? (inner.innerText || inner.textContent).trim() : '';
        }
        if (!processText) return;

        window.showToast(window._("toast.ai_is_analyzing_the_process"), "info");

        try {
            const res = await fetch('/api/ai/dialectics/opposites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ process_a: processText })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'API Error');
            }

            const data = await res.json();

            const modal = document.getElementById('explainConceptModal');
            const titleEl = document.getElementById('explainConceptTitle');
            const bodyEl = document.getElementById('explainConceptBody');

            if (modal && titleEl && bodyEl) {
                const defaultFooter = document.getElementById('explainConceptDefaultFooter');
                const chatFooter = document.getElementById('explainConceptChatFooter');
                if (defaultFooter) defaultFooter.style.display = 'block';
                if (chatFooter) chatFooter.style.display = 'none';

                titleEl.innerText = window._ ? (window._('analysis_result') || 'Результат анализа') : 'Результат анализа';
                bodyEl.innerHTML = this._renderMarkdown(data.result);
                modal.style.display = 'flex';
            } else {
                // Fallback safe formatting
                const safeResult = data.result.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const formattedResult = `<div style="white-space: pre-wrap; text-align: left; font-family: monospace; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 8px; max-height: 60vh; overflow-y: auto;">${safeResult}</div>`;
                customConfirm({
                    title: 'Результат анализа',
                    message: formattedResult,
                    buttons: [
                        { label: 'Закрыть', value: true, class: 'confirm-btn-primary' }
                    ]
                });
            }

        } catch (error) {
            console.error(error);
            const modal = document.getElementById('explainConceptModal');
            const titleEl = document.getElementById('explainConceptTitle');
            const bodyEl = document.getElementById('explainConceptBody');

            if (modal && titleEl && bodyEl) {
                const defaultFooter = document.getElementById('explainConceptDefaultFooter');
                const chatFooter = document.getElementById('explainConceptChatFooter');
                if (defaultFooter) defaultFooter.style.display = 'block';
                if (chatFooter) chatFooter.style.display = 'none';

                titleEl.innerText = 'Ошибка';
                bodyEl.innerHTML = `<div style="color:#ef4444;">${error.message}</div>`;
                modal.style.display = 'flex';
            } else {
                customConfirm({
                    title: 'Ошибка',
                    message: `<div style="color: red;">${error.message}</div>`,
                    buttons: [
                        { label: 'Закрыть', value: true, class: 'confirm-btn-secondary' }
                    ]
                });
            }
        }
    }

    async checkAI(block) {
        const titleEl = block.querySelector('.block-title-text');
        const title = titleEl ? titleEl.innerText.trim() : '';
        const inner = block.querySelector('.dialectics-content-inner');
        const content = inner ? (inner.innerText || inner.textContent).trim() : '';
        const textToCheck = title ? `Заголовок: ${title}\n\nТекст:\n${content}` : content;

        if (!textToCheck.trim()) {
            if (window.showToast) window.showToast("Блок пуст. Нечего проверять.", "warning");
            return;
        }

        if (window.showToast) window.showToast("🤖 Анализирую текст...", "info");

        const modal = document.getElementById('explainConceptModal');
        const titleModalEl = document.getElementById('explainConceptTitle');
        const bodyEl = document.getElementById('explainConceptBody');
        const defaultFooter = document.getElementById('explainConceptDefaultFooter');
        const chatFooter = document.getElementById('explainConceptChatFooter');
        const inputEl = document.getElementById('explainConceptInput');
        const sendBtn = document.getElementById('explainConceptSendBtn');

        if (!modal || !bodyEl || !inputEl || !sendBtn) return;

        let chatHistory = [];

        titleModalEl.innerText = window._ ? (window._('dialectics.ai_checking') || 'Проверка ИИ') : 'Проверка ИИ';
        bodyEl.innerHTML = '';
        inputEl.value = '';
        inputEl.disabled = true;
        sendBtn.disabled = true;

        if (defaultFooter) defaultFooter.style.display = 'none';
        if (chatFooter) chatFooter.style.display = 'block';

        modal.style.display = 'flex';

        const appendMessage = (role, text) => {
            const msgDiv = document.createElement('div');
            if (role === 'user') {
                msgDiv.style.cssText = "margin-left: auto; margin-right: 0; max-width: 80%; background: #3b82f6; color: #fff; padding: 10px 14px; border-radius: 12px 12px 0 12px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15); margin-bottom: 12px; word-break: break-word;";
                msgDiv.innerText = text;
            } else if (role === 'assistant') {
                msgDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #1e293b; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; word-break: break-word;";
                msgDiv.innerHTML = this._renderMarkdown ? this._renderMarkdown(text) : text;
            } else if (role === 'loading') {
                msgDiv.id = 'explainConceptLoading';
                msgDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #94a3b8; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;";
                msgDiv.innerHTML = `<span class="spinner" style="border: 2px solid #cbd5e1; border-top: 2px solid #3b82f6; border-radius: 50%; width: 14px; height: 14px; animation: spin 0.8s linear infinite; display: inline-block;"></span><span>Думаю...</span>`;
            }
            bodyEl.appendChild(msgDiv);
            bodyEl.scrollTop = bodyEl.scrollHeight;
        };

        appendMessage('loading');

        try {
            const response = await fetch('/api/ai/dialectics/check-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textToCheck
                })
            });

            const loadingEl = document.getElementById('explainConceptLoading');
            if (loadingEl) loadingEl.remove();

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            chatHistory.push({ role: 'user', content: `Проверь следующий текст:\n${textToCheck}` });
            chatHistory.push({ role: 'assistant', content: data.result });

            appendMessage('assistant', data.result);

            inputEl.disabled = false;
            sendBtn.disabled = false;
            inputEl.focus();
        } catch (err) {
            const loadingEl = document.getElementById('explainConceptLoading');
            if (loadingEl) loadingEl.remove();
            bodyEl.innerHTML = `<div style="color:#ef4444; padding:10px;">Ошибка: ${err.message}</div>`;
        }

        const formEl = document.getElementById('explainConceptForm');
        if (formEl) {
            formEl.onsubmit = async (evt) => {
                evt.preventDefault();
                const questionText = inputEl.value.trim();
                if (!questionText || inputEl.disabled) return;

                appendMessage('user', questionText);
                chatHistory.push({ role: 'user', content: questionText });

                inputEl.value = '';
                inputEl.disabled = true;
                sendBtn.disabled = true;
                appendMessage('loading');

                try {
                    const response = await fetch('/api/ai/dialectics/check-ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: textToCheck,
                            history: chatHistory
                        })
                    });

                    const loadingEl = document.getElementById('explainConceptLoading');
                    if (loadingEl) loadingEl.remove();

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();

                    chatHistory.push({ role: 'assistant', content: data.result });
                    appendMessage('assistant', data.result);
                } catch (err) {
                    const loadingEl = document.getElementById('explainConceptLoading');
                    if (loadingEl) loadingEl.remove();

                    const errDiv = document.createElement('div');
                    errDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; color: #ef4444; padding: 10px 12px; margin-bottom: 12px;";
                    errDiv.innerText = `Ошибка: ${err.message}`;
                    bodyEl.appendChild(errDiv);
                    bodyEl.scrollTop = bodyEl.scrollHeight;
                } finally {
                    inputEl.disabled = false;
                    sendBtn.disabled = false;
                    inputEl.focus();
                }
            };
        }
    }
}

export const AIBlockAnalysisMixin = {};
Object.getOwnPropertyNames(AIBlockAnalysisClass.prototype).forEach(k => { if (k !== 'constructor') AIBlockAnalysisMixin[k] = AIBlockAnalysisClass.prototype[k]; });
