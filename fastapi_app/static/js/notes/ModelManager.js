import { t } from '../i18n.js';

/**
 * Выбор модели ИИ (шапка). Выбор глобальный, хранится в localStorage и едет
 * на бэкенд заголовком X-Model-Prefer — там LLMRegistry ставит этого
 * провайдера первым в круге фолбэка (жёсткой привязки нет: если он лежит,
 * запрос всё равно уйдёт другому).
 */
const KEY = 'dialectics_model';
const DEFAULT = 'auto';

class ModelManager {
    static current = DEFAULT;
    static models = [];

    static init() {
        try { this.current = localStorage.getItem(KEY) || DEFAULT; } catch { this.current = DEFAULT; }

        const btn = document.getElementById('btn-model-menu');
        const menu = document.getElementById('model-menu-dropdown');
        if (!btn || !menu) return;

        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wasHidden = menu.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
            if (wasHidden) {
                menu.classList.remove('hidden');
                await this._ensureModels();
                this._render(menu);
                this._loadLimit(this.current, menu);
            }
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#btn-model-menu') && !e.target.closest('#model-menu-dropdown')) {
                menu.classList.add('hidden');
            }
        });

        this._ensureModels().then(() => this._updateLabel());
    }

    /** Заголовок для fetch. {} если авто. */
    static header() {
        return this.current && this.current !== DEFAULT ? { 'X-Model-Prefer': this.current } : {};
    }

    static async _ensureModels() {
        if (this.models.length) return;
        try {
            const res = await fetch('/api/ai/dialectics/models');
            const data = await res.json();
            this.models = data.models || [];
        } catch { this.models = []; }
    }

    static _meta(id) {
        return this.models.find(m => m.id === id) || { id, name: id, sub: '' };
    }

    static _updateLabel() {
        const label = document.getElementById('model-menu-label');
        if (label) label.textContent = this.current === DEFAULT ? t('nav_model') : this._meta(this.current).name;
    }

    static _render(menu) {
        menu.innerHTML = this.models.map(m => `
            <button type="button"
                    class="model-item ${m.id === this.current ? 'active' : ''} ${m.available ? '' : 'disabled'}"
                    data-id="${m.id}" ${m.available ? '' : 'disabled'}>
                <div class="model-item-row">
                    <span class="model-item-name">${m.name}</span>
                    ${m.id === this.current ? '<span class="model-item-check">✓</span>' : ''}
                </div>
                <div class="model-item-sub">${m.available ? m.sub : t('model_no_key')}</div>
                <div class="model-item-limit" data-limit-for="${m.id}"></div>
            </button>
        `).join('');

        menu.querySelectorAll('.model-item').forEach(el => {
            el.addEventListener('click', () => {
                if (el.disabled) return;
                this.current = el.dataset.id;
                try { localStorage.setItem(KEY, this.current); } catch {}
                this._updateLabel();
                this._render(menu);
                this._loadLimit(this.current, menu);
            });
        });
    }

    static async _loadLimit(id, menu) {
        if (!id || id === DEFAULT) return;
        const slot = menu.querySelector(`.model-item-limit[data-limit-for="${id}"]`);
        if (!slot) return;
        slot.textContent = t('model_limit_loading');
        try {
            const res = await fetch(`/api/ai/dialectics/models/${id}/limit`);
            const d = await res.json();
            if (d.tokens && d.tokens.remaining != null) {
                const lim = d.tokens.limit ? `/${d.tokens.limit}` : '';
                const reset = d.tokens.reset ? ` (${t('model_limit_reset')} ${d.tokens.reset})` : '';
                slot.textContent = `${t('model_limit_tokens')} ${d.tokens.remaining}${lim}${reset}`;
            } else if (d.requests && d.requests.remaining != null) {
                slot.textContent = `${t('model_limit_requests')} ${d.requests.remaining}/${d.requests.limit || '?'}`;
            } else {
                slot.textContent = t('model_limit_unknown');
            }
        } catch {
            slot.textContent = t('model_limit_unknown');
        }
    }
}

export default ModelManager;
