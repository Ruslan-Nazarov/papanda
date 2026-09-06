import NotesAPI from './api.js';
import { renderStreamMarkdown } from './ConceptExplainManager.js';
import SkillManager from './SkillManager.js';
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
                    <div style="margin-bottom:10px;padding:8px 12px;background:#eff6ff;border-radius:8px;color:#1e40af;font-size:0.9rem;">«${fragment.replace(/</g, '&lt;')}»</div>
                    <div id="concept-explain-stream" style="font-size:0.95rem;line-height:1.6;color:#334155;">▍</div>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('.btn-close-modal').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        return overlay.querySelector('#concept-explain-stream');
    }

    static async _explain(text, blockEl) {
        const title = blockEl?.querySelector('.block-title')?.textContent?.trim() || '';
        const body = blockEl?.querySelector('.block-content')?.innerText?.trim().slice(0, 2000) || '';
        const target = this._modal(text);
        try {
            let last = 0;
            const full = await NotesAPI.stream(
                '/ai/dialectics/explain-concept/stream',
                { text, context_before: title, context_after: body, history: [], skill: SkillManager.getSkill() },
                (_d, acc) => {
                    const now = Date.now();
                    if (now - last > 60) { last = now; renderStreamMarkdown(target, acc + ' ▍'); }
                }
            );
            renderStreamMarkdown(target, full || t('whatis_empty'));
        } catch (e) {
            target.innerHTML = `<span style="color:#ef4444;">${t('whatis_error')}: ${e.message}</span>`;
        }
    }
}

export default ConceptSelectionMenu;
