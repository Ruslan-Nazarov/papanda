/**
 * Общий плавающий индикатор долгих ИИ-операций (низ-право). Раньше был
 * захардкожен внутри EditorManager.triggerAutofill — вынесено сюда, чтобы
 * AIController мог показывать статус судьи/повторных попыток тем же
 * визуальным языком, без дублирования разметки.
 */
import { t } from '../i18n.js';

const LOADER_ID = 'ai-global-loader';
const SPINNER_STYLE_ID = 'ai-spinner-style';

class GlobalLoader {
    static startedAt = 0;
    /** @type {ReturnType<typeof setInterval> | null} */
    static timer = null;

    static updateElapsed() {
        const timer = document.querySelector('#ai-global-loader .loader-elapsed');
        if (!timer) return;
        const seconds = Math.max(0, Math.floor((Date.now() - this.startedAt) / 1000));
        const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        timer.textContent = t('gen_elapsed').replace('{time}', time);
    }

    /** @param {string} text @param {(() => void) | null} [onCancel] */
    static show(text, onCancel = null) {
        let loader = document.getElementById(LOADER_ID);
        if (!loader) {
            loader = document.createElement('div');
            loader.id = LOADER_ID;
            loader.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#8b5cf6; color:white; padding:12px 16px; border-radius:8px; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-weight:bold; font-family:sans-serif; display:flex; align-items:center; gap:10px; box-sizing:border-box; max-width:min(380px,calc(100vw - 40px)); transition: opacity 0.3s;';
            document.body.appendChild(loader);
        }
        loader.innerHTML = '<span aria-hidden="true" style="animation: spin 1s linear infinite; display:inline-block; flex-shrink:0;">⏳</span>'
            + '<span style="min-width:0"><span class="loader-text" role="status" aria-live="polite"></span>'
            + '<small class="loader-elapsed" aria-live="off" style="display:block;font-weight:400;opacity:.9;font-variant-numeric:tabular-nums"></small></span>';
        const label = loader.querySelector('.loader-text');
        if (label) label.textContent = text;
        if (this.timer === null) {
            this.startedAt = Date.now();
            this.timer = setInterval(() => this.updateElapsed(), 1000);
        }
        this.updateElapsed();
        if (onCancel) {
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.textContent = '✕';
            cancel.setAttribute('aria-label', t('cancel'));
            cancel.style.cssText = 'flex-shrink:0;min-width:36px;min-height:36px;border:1px solid #ffffff66;border-radius:6px;background:transparent;color:inherit;cursor:pointer';
            cancel.addEventListener('click', onCancel, {once: true});
            loader.appendChild(cancel);
        }
        loader.style.display = 'flex';

        if (!document.getElementById(SPINNER_STYLE_ID)) {
            const style = document.createElement('style');
            style.id = SPINNER_STYLE_ID;
            style.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
    }

    static hide() {
        if (this.timer !== null) clearInterval(this.timer);
        this.timer = null;
        this.startedAt = 0;
        const loader = document.getElementById(LOADER_ID);
        if (loader) loader.style.display = 'none';
    }
}

export default GlobalLoader;
