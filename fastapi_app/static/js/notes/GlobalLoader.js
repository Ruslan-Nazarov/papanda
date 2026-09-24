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
    static show(text, onCancel = null) {
        let loader = document.getElementById(LOADER_ID);
        if (!loader) {
            loader = document.createElement('div');
            loader.id = LOADER_ID;
            loader.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#8b5cf6; color:white; padding:12px 24px; border-radius:8px; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-weight:bold; font-family:sans-serif; display:flex; align-items:center; gap:10px; max-width:340px; transition: opacity 0.3s;';
            document.body.appendChild(loader);
        }
        loader.innerHTML = '<span style="animation: spin 1s linear infinite; display:inline-block; flex-shrink:0;">⏳</span> <span class="loader-text"></span>';
        loader.querySelector('.loader-text').textContent = text;
        if (onCancel) {
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.textContent = '✕';
            cancel.setAttribute('aria-label', t('cancel'));
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
        const loader = document.getElementById(LOADER_ID);
        if (loader) loader.style.display = 'none';
    }
}

export default GlobalLoader;
