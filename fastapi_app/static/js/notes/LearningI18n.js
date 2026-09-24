import { t } from '../i18n.js';

export function lt(key, values = {}) {
    return t(`learning_${key}`).replace(/\{(\w+)\}/g, (match, name) =>
        Object.hasOwn(values, name) ? String(values[name]) : match);
}

export function learningDate(value = new Date()) {
    const lang = document.documentElement.lang;
    return new Date(value).toLocaleString({ru:'ru-RU', en:'en-US', kz:'kk-KZ', kk:'kk-KZ'}[lang] || 'ru-RU');
}
