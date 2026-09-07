import AppState from './AppState.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';
import { t } from '../i18n.js';

/**
 * Режим повторения: конспект превращается в карточки для активного
 * вспоминания. Лицо карточки — роль шага + суть (заголовок), тыл — полный
 * текст блока. Диалектическая структура заточена под recall: пытаешься
 * восстановить объяснение по «зацепке», потом проверяешь себя.
 * Без сохранения — чисто клиентское, на AppState.currentNote.blocks.
 */
const RecallMode = {
    _cards: [],
    _idx: 0,
    _flipped: false,
    _el: null,

    open() {
        const cards = this._buildCards();
        if (cards.length < 2) {
            import('./ToastService.js').then(m => m.showToast(t('recall_need_conspect'), 'info'));
            return;
        }
        this._cards = cards;
        this._idx = 0;
        this._flipped = false;
        this._render();
        document.addEventListener('keydown', this._onKey);
    },

    close() {
        document.removeEventListener('keydown', this._onKey);
        if (this._el) { this._el.remove(); this._el = null; }
    },

    _buildCards() {
        const blocks = (AppState.currentNote && AppState.currentNote.blocks || []).filter(
            b => b.role && (b.role.startsWith('step') || (b.role === 'anchor' && b.anchorResolved))
        );
        const order = r => (r === 'anchor' ? 99 : parseFloat(r.replace('step', '')) || 0);
        blocks.sort((a, b) => order(a.role) - order(b.role));
        return blocks.map(b => {
            const base = b.role.split('.')[0];
            const stepObj = ALGORITHM_STEPS.find(s => s.role === base);
            const roleLabel = base === 'anchor'
                ? t('anchor_resolved_label')
                : (stepObj ? stepObj.title : '');
            let back = b.html || '';
            if (typeof DOMPurify !== 'undefined') {
                back = DOMPurify.sanitize(back, { ADD_ATTR: ['formula'] });
            }
            return { role: roleLabel, front: (b.title || roleLabel || '').trim(), back };
        });
    },

    _onKey(e) {
        if (e.key === 'Escape') return RecallMode.close();
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); RecallMode._flipOrNext(); }
        else if (e.key === 'ArrowRight') RecallMode._next();
        else if (e.key === 'ArrowLeft') RecallMode._prev();
    },

    _flip() { this._flipped = !this._flipped; this._render(); },
    _flipOrNext() { this._flipped ? this._next() : this._flip(); },
    _next() {
        if (this._idx < this._cards.length - 1) { this._idx++; this._flipped = false; this._render(); }
        else this.close();
    },
    _prev() {
        if (this._idx > 0) { this._idx--; this._flipped = false; this._render(); }
    },

    _render() {
        const c = this._cards[this._idx];
        const dots = this._cards.map((_, i) =>
            `<span class="recall-dot${i === this._idx ? ' active' : ''}${i < this._idx ? ' done' : ''}"></span>`
        ).join('');

        if (!this._el) {
            this._el = document.createElement('div');
            this._el.className = 'recall-overlay';
            document.body.appendChild(this._el);
        }
        const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        this._el.innerHTML = `
            <div class="recall-top">
                <div class="recall-dots">${dots}</div>
                <button class="recall-close" title="Esc">✕</button>
            </div>
            <div class="recall-card${this._flipped ? ' flipped' : ''}">
                <div class="recall-role">${esc(c.role)}</div>
                ${this._flipped
                    ? `<div class="recall-back">${c.back}</div>`
                    : `<div class="recall-front">
                           <div class="recall-front-title">${esc(c.front)}</div>
                           <div class="recall-hint">${t('recall_flip_hint')}</div>
                       </div>`}
            </div>
            <div class="recall-nav">
                <button class="recall-btn" id="recall-prev"${this._idx === 0 ? ' disabled' : ''}>←</button>
                <button class="recall-btn primary" id="recall-flip">${this._flipped ? t('recall_next') : t('recall_show')}</button>
                <button class="recall-btn" id="recall-next">${this._idx === this._cards.length - 1 ? t('recall_done') : '→'}</button>
            </div>`;

        this._el.querySelector('.recall-close').onclick = () => this.close();
        this._el.querySelector('.recall-card').onclick = () => this._flip();
        this._el.querySelector('#recall-prev').onclick = e => { e.stopPropagation(); this._prev(); };
        this._el.querySelector('#recall-next').onclick = e => { e.stopPropagation(); this._next(); };
        this._el.querySelector('#recall-flip').onclick = e => { e.stopPropagation(); this._flipOrNext(); };

        if (window.renderMathInElement) {
            try {
                renderMathInElement(this._el, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                    ],
                    throwOnError: false,
                });
            } catch { /* noop */ }
        }
    },
};

export default RecallMode;
