import NotesAPI from './api.js';
import AppState from './AppState.js';
import HtmlSafety from './HtmlSafety.js';
import { renderStreamMarkdown } from './ConceptExplainManager.js';
import { t } from '../i18n.js';

/**
 * Плавающая кнопка «✨ Что это?» при выделении текста внутри блока конспекта.
 * Стримит объяснение выделенного фрагмента через /explain-concept/stream.
 */
class ConceptSelectionMenu {
    static init() {
        this._btn = null;
        document.addEventListener('mouseup', (e) => this._onMouseUp(e));
        document.addEventListener('selectionchange', () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) this._hide();
        });
        document.addEventListener('scroll', () => this._hide(), true);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this._hide(); });
    }

    static _onMouseUp(e) {
        if (e.target.closest?.('.concept-explain-btn')) return;
        // Даём браузеру дорисовать выделение.
        setTimeout(() => {
            const sel = window.getSelection();
            const text = sel ? sel.toString().trim() : '';
            if (text.length < 2 || text.length > 400) { this._hide(); return; }

            const node = sel.anchorNode;
            const anchorEl = node && (node.nodeType === 3 ? node.parentElement : node);
            const content = anchorEl?.closest?.('.block-content');
            if (!content) { this._hide(); return; }

            const rect = sel.getRangeAt(0).getBoundingClientRect();
            this._show(rect, text, content.closest('.dialectics-block'));
        }, 0);
    }

    static _show(rect, text, blockEl) {
        this._hide();
        const btn = document.createElement('button');
        btn.className = 'concept-explain-btn';
        btn.textContent = t('whatis_btn');
        btn.style.cssText = [
            'position:fixed', `top:${Math.max(8, rect.top - 40)}px`,
            `left:${rect.left + rect.width / 2}px`, 'transform:translateX(-50%)',
            'z-index:3000', 'background:#3b82f6', 'color:#fff', 'border:none',
            'border-radius:8px', 'padding:6px 12px', 'font-size:0.85rem',
            'font-weight:600', 'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,.22)',
            'white-space:nowrap',
        ].join(';');
        // не сбрасываем выделение при клике по кнопке
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            this._hide();
            this._explain(text, blockEl);
        });
        document.body.appendChild(btn);
        this._btn = btn;
    }

    static _hide() {
        if (this._btn) { this._btn.remove(); this._btn = null; }
    }

    static _modal(fragment) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '3100';
        overlay.innerHTML = `
            <div class="modal-dialog" style="max-width:560px;width:92%;">
                <div class="modal-dialog-header">
                    <h2>${t('whatis_title')}</h2>
                    <button class="icon-btn btn-close-modal">✕</button>
                </div>
                <div class="modal-dialog-body">
                    <div style="margin-bottom:10px;padding:8px 12px;background:#eff6ff;border-radius:8px;color:#1e40af;font-size:0.9rem;">«${HtmlSafety.escape(fragment)}»</div>
                    <div class="concept-explain-messages" style="font-size:0.95rem;line-height:1.6;color:#334155;">
                        <div class="concept-explain-answer">▍</div>
                    </div>
                </div>
                <div class="modal-dialog-footer" style="gap:10px;align-items:center;">
                    <input class="concept-explain-input" type="text" maxlength="2000" placeholder="${t('aicheck_ask_ph')}" style="flex:1;min-width:0;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.95rem;">
                    <button class="concept-explain-send" type="button" style="background:#ea580c;color:#fff;border:0;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;">${t('send_word')}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('.btn-close-modal').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        return {
            target: overlay.querySelector('.concept-explain-answer'),
            messages: overlay.querySelector('.concept-explain-messages'),
            input: overlay.querySelector('.concept-explain-input'),
            send: overlay.querySelector('.concept-explain-send'),
        };
    }

    static async _explain(text, blockEl) {
        const noteTitle = (AppState.currentNote?.title || '').slice(0, 255);
        const title = blockEl?.querySelector('.block-title')?.textContent?.trim() || '';
        const body = blockEl?.querySelector('.block-content')?.innerText?.trim().slice(0, 2000) || '';
        const { target, messages, input, send } = this._modal(text);
        const history = [];
        let busy = false;
        const request = async (question = '') => {
            if (busy) return;
            busy = true;
            send.disabled = true;
            let answer = target;
            if (question) {
                const userMessage = document.createElement('div');
                userMessage.style.cssText = 'margin-top:16px;font-weight:600;color:#1e293b;';
                userMessage.textContent = question;
                messages.appendChild(userMessage);
                answer = document.createElement('div');
                answer.className = 'concept-explain-answer';
                answer.style.marginTop = '8px';
                answer.textContent = '▍';
                messages.appendChild(answer);
                answer.scrollIntoView?.({ block: 'nearest' });
            }
            try {
                let last = 0;
                const full = await NotesAPI.stream(
                    '/ai/dialectics/explain-concept/stream',
                    { text, note_title: noteTitle, context_before: title, context_after: body,
                        history: history.slice(-2), question },
                    (_d, acc) => {
                        const now = Date.now();
                        if (now - last > 60) { last = now; renderStreamMarkdown(answer, acc + ' ▍'); }
                    }
                );
                renderStreamMarkdown(answer, full || t('whatis_empty'));
                history.push(
                    { role: 'user', content: question || `Объясни выделенный фрагмент: ${text}` },
                    { role: 'assistant', content: full || t('whatis_empty') }
                );
            } catch (e) {
                answer.innerHTML = `<span style="color:#ef4444;">${t('whatis_error')}: ${HtmlSafety.escape(e.message)}</span>`;
                if (question) input.value = question;
            } finally {
                busy = false;
                send.disabled = false;
            }
        };
        send.addEventListener('click', () => {
            const question = input.value.trim();
            if (!question || busy) return;
            input.value = '';
            request(question);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') send.click();
        });
        request();
    }
}

export default ConceptSelectionMenu;
