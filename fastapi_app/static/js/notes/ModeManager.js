import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';

/**
 * Главный переключатель режимов приложения:
 *   'ai'     — ИИ генерирует конспект (подрежим «по шагам»), без подсказок, чистый UI блока.
 *   'manual' — пользователь пишет сам по алгоритму, видит подсказки-блоки, полный тулбар.
 * Выбор хранится глобально в localStorage.
 */
const MODE_KEY = 'dialectics_mode';
const STEP_KEY = 'dialectics_ai_stepbystep';

class ModeManager {
    static init() {
        let saved = 'ai';
        try { saved = localStorage.getItem(MODE_KEY) || 'ai'; } catch {}
        this.mode = saved === 'manual' ? 'manual' : 'ai';

        let step = false;
        try { step = localStorage.getItem(STEP_KEY) === '1'; } catch {}
        AppState.isAutoFillStepByStep = step;

        const toggle = document.getElementById('mode-master-toggle');
        if (toggle) {
            toggle.querySelectorAll('button[data-mode]').forEach(btn => {
                btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
            });
        }
        const stepChk = document.getElementById('toggle-autofill-step');
        if (stepChk) {
            stepChk.checked = step;
            stepChk.addEventListener('change', (e) => {
                AppState.isAutoFillStepByStep = e.target.checked;
                try { localStorage.setItem(STEP_KEY, e.target.checked ? '1' : '0'); } catch {}
                BlockDOMRenderer.renderAll();
            });
        }

        this.apply();
    }

    static getMode() {
        return this.mode;
    }

    static setMode(m) {
        m = m === 'manual' ? 'manual' : 'ai';
        if (m === this.mode) return;
        this.mode = m;
        try { localStorage.setItem(MODE_KEY, m); } catch {}
        this.apply();
    }

    static apply() {
        AppState.mode = this.mode;
        AppState.isAutoFillEnabled = this.mode === 'ai';

        const cont = document.getElementById('blocks-container');
        if (cont) {
            cont.classList.toggle('mode-ai', this.mode === 'ai');
            cont.classList.toggle('mode-manual', this.mode === 'manual');
        }

        const toggle = document.getElementById('mode-master-toggle');
        if (toggle) {
            toggle.querySelectorAll('button[data-mode]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === this.mode);
            });
        }

        const substep = document.getElementById('mode-substep');
        if (substep) substep.classList.toggle('visible', this.mode === 'ai');

        BlockDOMRenderer.renderAll();
    }
}

export default ModeManager;
