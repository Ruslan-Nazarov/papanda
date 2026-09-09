/* Согласие на cookie + условная загрузка аналитики.
   Яндекс.Метрика и Google Analytics НЕ грузятся, пока пользователь не нажал
   «Принять всё». Выбор хранится в localStorage. Загружается до app.js. */
(function () {
    var KEY = 'papanda-cookie-consent';   // '', 'all', 'essential'
    var GA_ID = 'G-EMCJ311GK3';
    var YM_ID = 109947494;

    function get() {
        try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; }
    }
    function set(v) {
        try { localStorage.setItem(KEY, v); } catch (e) { /* noop */ }
    }

    function loadAnalytics() {
        // Google Analytics
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', GA_ID);

        // Яндекс.Метрика (вебвизор ОТКЛЮЧЁН)
        (function (m, e, t, r, i, k, a) {
            m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
            m[i].l = 1 * new Date();
            for (var j = 0; j < e.scripts.length; j++) { if (e.scripts[j].src === r) { return; } }
            k = e.createElement(t); a = e.getElementsByTagName(t)[0];
            k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
        })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + YM_ID, 'ym');
        window.ym(YM_ID, 'init', {
            ssr: true, webvisor: false, clickmap: true, ecommerce: 'dataLayer',
            accurateTrackBounce: true, trackLinks: true
        });
    }

    var TXT = {
        ru: { msg: 'Мы используем необходимые cookie для работы сервиса. С вашего согласия — аналитику (Яндекс.Метрика, Google Analytics).',
              all: 'Принять всё', ess: 'Только необходимые', more: 'Подробнее' },
        en: { msg: 'We use essential cookies to run the service. With your consent — analytics (Yandex.Metrica, Google Analytics).',
              all: 'Accept all', ess: 'Essential only', more: 'Learn more' },
        kz: { msg: 'Сервистің жұмысы үшін қажетті cookie қолданамыз. Сіздің келісіміңізбен — аналитика (Яндекс.Метрика, Google Analytics).',
              all: 'Барлығын қабылдау', ess: 'Тек қажеттілер', more: 'Толығырақ' }
    };

    function showBanner() {
        var lang = (document.documentElement.lang || 'ru').slice(0, 2);
        var t = TXT[lang] || TXT.ru;
        var b = document.createElement('div');
        b.id = 'cookie-banner';
        b.setAttribute('style', [
            'position:fixed', 'left:12px', 'right:12px', 'bottom:12px', 'z-index:100000',
            'max-width:720px', 'margin:0 auto', 'background:#0f172a', 'color:#e2e8f0',
            'border-radius:12px', 'padding:14px 16px', 'font:14px/1.45 system-ui,-apple-system,sans-serif',
            'box-shadow:0 12px 40px rgba(0,0,0,.35)', 'display:flex', 'flex-wrap:wrap',
            'align-items:center', 'gap:10px'
        ].join(';'));
        b.innerHTML =
            '<span style="flex:1;min-width:220px">' + t.msg +
            ' <a href="/privacy" style="color:#fb923c;white-space:nowrap">' + t.more + '</a></span>' +
            '<span style="display:flex;gap:8px;flex-shrink:0">' +
            '<button id="cc-ess" style="background:transparent;border:1px solid #475569;color:#cbd5e1;border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer">' + t.ess + '</button>' +
            '<button id="cc-all" style="background:linear-gradient(135deg,#fb923c,#ea580c);border:none;color:#fff;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer">' + t.all + '</button>' +
            '</span>';
        document.body.appendChild(b);
        b.querySelector('#cc-all').addEventListener('click', function () {
            set('all'); b.remove(); loadAnalytics();
        });
        b.querySelector('#cc-ess').addEventListener('click', function () {
            set('essential'); b.remove();
        });
    }

    var choice = get();
    if (choice === 'all') {
        loadAnalytics();
    } else if (choice !== 'essential') {
        if (document.body) showBanner();
        else document.addEventListener('DOMContentLoaded', showBanner);
    }
})();
