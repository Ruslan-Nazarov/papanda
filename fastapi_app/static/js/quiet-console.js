/* На проде глушим шумный console.log/debug/info, оставляем warn/error.
   Вернуть логи: добавить ?debug к URL. Грузится до app.js. */
(function () {
    try {
        var h = location.hostname;
        var dev = h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0'
            || h.endsWith('.local') || location.search.indexOf('debug') !== -1;
        if (!dev) {
            var noop = function () {};
            console.log = noop;
            console.debug = noop;
            console.info = noop;
        }
    } catch (e) { /* noop */ }
})();
