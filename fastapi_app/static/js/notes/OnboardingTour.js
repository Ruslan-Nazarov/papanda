import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import ModeManager from './ModeManager.js';
import DialogService from './DialogService.js';
import { t } from '../i18n.js';

/**
 * Лёгкий пошаговый онбординг-тур: подсвечивает реальные элементы интерфейса,
 * в конце предлагает загрузить пример «Теорема Пифагора».
 */

const STEPS = [
    { sel: '#mode-master-toggle', key: 'tour1' },
    { sel: '.dialectics-hint-block[data-role="anchor"], .dialectics-block .block-role-label', key: 'tour2' },
    { sel: '.btn-autofill-ai', key: 'tour3' },
    { sel: '#mode-substep', key: 'tour4' },
    { sel: '.btn-edit', key: 'tour5' },
    { sel: '.btn-ask', key: 'tour6' },
    { sel: '.block-content', key: 'tour7' },
    { sel: '#btn-save, #btn-versions', key: 'tour8' },
];

const buildPythagorasNote = () => ({
    id: null,
    title: t('demo_title'),
    blocks: [
        { role: 'anchor', side: 'left', title: t('demo_anchor_t'), html: t('demo_anchor_h') },
        { role: 'step1', side: 'left', title: t('demo_step1_t'), html: t('demo_step1_h') },
        { role: 'step2', side: 'right', title: t('demo_step2_t'), html: t('demo_step2_h') },
        { role: 'step3', side: 'left', title: t('demo_step3_t'), html: t('demo_step3_h') },
        { role: 'step4', side: 'right', title: t('demo_step4_t'), html: t('demo_step4_h') },
        { role: 'step5', side: 'center', title: t('demo_step5_t'), html: t('demo_step5_h') },
    ].map(b => ({ ...b, id: 'demo-' + b.role, status: 'ready' })),
});

class OnboardingTour {
    static start() {
        if (this._active) return;
        this._active = true;
        this._i = 0;
        this._previousMode = ModeManager.getMode();
        try { ModeManager.setMode('ai', false); } catch {}

        this._overlay = document.createElement('div');
        this._overlay.className = 'tour-overlay';
        this._overlay.innerHTML = `
            <div class="tour-highlight" hidden></div>
            <div class="tour-card">
                <div class="tour-progress"></div>
                <h3 class="tour-title"></h3>
                <p class="tour-text"></p>
                <div class="tour-actions">
                    <button class="tour-skip">${t('tour_skip')}</button>
                    <span style="flex:1"></span>
                    <button class="tour-prev">${t('tour_back')}</button>
                    <button class="tour-next">${t('tour_next')}</button>
                </div>
            </div>`;
        document.body.appendChild(this._overlay);

        this._card = this._overlay.querySelector('.tour-card');
        this._hl = this._overlay.querySelector('.tour-highlight');
        this._overlay.querySelector('.tour-skip').addEventListener('click', () => this.close());
        this._overlay.querySelector('.tour-prev').addEventListener('click', () => this.go(-1));
        this._overlay.querySelector('.tour-next').addEventListener('click', () => this.go(1));
        this._onKey = (e) => { if (e.key === 'Escape') this.close(); };
        document.addEventListener('keydown', this._onKey);
        this._onResize = () => this._position();
        window.addEventListener('resize', this._onResize, { passive: true });

        this.render();
    }

    static go(dir) {
        // Пропускаем шаги, чьи цели не найдены.
        let n = this._i + dir;
        while (n >= 0 && n < STEPS.length && !document.querySelector(STEPS[n].sel)) n += dir;
        if (n >= STEPS.length) { this._i = STEPS.length; this.render(); return; }
        if (n < 0) return;
        this._i = n;
        this.render();
    }

    static render() {
        if (this._i >= STEPS.length) { this.renderFinal(); return; }
        const step = STEPS[this._i];
        const target = document.querySelector(step.sel);
        if (!target) { this.go(1); return; }

        this._card.querySelector('.tour-progress').textContent =
            t('tour_step').replace('{n}', this._i + 1).replace('{m}', STEPS.length + 1);
        this._card.querySelector('.tour-title').textContent = t(step.key + '_title');
        this._card.querySelector('.tour-text').textContent = t(step.key + '_text');
        this._card.querySelector('.tour-prev').style.visibility = this._i === 0 ? 'hidden' : 'visible';
        this._card.querySelector('.tour-next').textContent = t('tour_next');

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this._currentTarget = target;
        setTimeout(() => this._position(), 320);
    }

    static _position() {
        const target = this._currentTarget;
        if (!target || this._i >= STEPS.length) return;
        const r = target.getBoundingClientRect();
        this._hl.hidden = false;
        Object.assign(this._hl.style, {
            top: `${r.top - 6}px`, left: `${r.left - 6}px`,
            width: `${r.width + 12}px`, height: `${r.height + 12}px`,
        });
        // Карточку ставим под целью, если снизу есть место, иначе сверху.
        const cardH = this._card.offsetHeight || 200;
        const below = r.bottom + 14;
        const isMobile = window.innerWidth <= 768;
        if (isMobile) return; // на мобильном карточка прижата к низу через CSS
        this._card.style.transform = 'none';
        this._card.style.left = `${Math.max(12, Math.min(r.left, window.innerWidth - this._card.offsetWidth - 12))}px`;
        this._card.style.top = (below + cardH < window.innerHeight)
            ? `${below}px`
            : `${Math.max(12, r.top - cardH - 14)}px`;
    }

    static renderFinal() {
        this._hl.hidden = true;
        this._card.classList.add('tour-final');
        this._card.style.left = '';
        this._card.style.top = '';
        this._card.style.transform = '';
        this._card.querySelector('.tour-progress').textContent =
            t('tour_step').replace('{n}', STEPS.length + 1).replace('{m}', STEPS.length + 1);
        this._card.querySelector('.tour-title').textContent = t('tour_final_title');
        this._card.querySelector('.tour-text').textContent = t('tour_final_text');
        this._card.querySelector('.tour-prev').style.visibility = 'visible';
        this._card.querySelector('.tour-next').textContent = t('tour_load_example');
        this._card.querySelector('.tour-next').onclick = () => this.loadExample();
    }

    static async loadExample() {
        if (AppState.isDirty) {
            const ok = await DialogService.confirm({
                title: t('tour_confirm_title'),
                message: t('tour_confirm_msg'),
                confirmText: t('tour_confirm_ok'),
            });
            if (!ok) return;
        }
        AppState.setNote(JSON.parse(JSON.stringify(buildPythagorasNote())));
        BlockDOMRenderer.renderAll();
        this.close();
    }

    static close() {
        try { localStorage.setItem('dialectics_onboarding_seen', '1'); } catch {}
        if (this._previousMode) ModeManager.setMode(this._previousMode, false);
        this._previousMode = null;
        document.removeEventListener('keydown', this._onKey);
        window.removeEventListener('resize', this._onResize);
        this._overlay?.remove();
        this._overlay = null;
        this._active = false;
        // сбрасываем onclick, навешенный в renderFinal
        this._card = null;
    }
}

export default OnboardingTour;
