/* Переводы интерфейса. ОДИН источник — fastapi_app/i18n_data.json; сервер
   инлайнит словарь текущей локали (с ru-фолбэком) в страницу как
   <script type="application/json" id="i18n-data">. Раньше здесь лежала
   копия таблицы на ~1700 строк, расходившаяся с i18n.py. */

let TRANSLATIONS = {};
try {
    const el = typeof document !== 'undefined' && document.getElementById('i18n-data');
    if (el && el.textContent) TRANSLATIONS = JSON.parse(el.textContent);
} catch (e) {
    // Нет данных — t() вернёт сам ключ, интерфейс не падает.
}

export function t(key) {
    return (TRANSLATIONS && TRANSLATIONS[key]) || key;
}

export function switchLanguage(lang) {
    document.cookie = `locale=${lang}; path=/; max-age=31536000`;
    window.location.reload();
}
