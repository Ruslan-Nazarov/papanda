const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('elapsed time survives phase changes, cancellation and restart without leaking timers', () => {
    const dom = new JSDOM('');
    let now = 1000, cancelled = 0, next = 0;
    const timers = new Map();
    const ctx = context({document: dom.window.document, Date: {now: () => now},
        t: key => key === 'gen_elapsed' ? 'Прошло: {time}' : key,
        setInterval: callback => {timers.set(++next, callback); return next;},
        clearInterval: id => timers.delete(id)});
    load(ctx, 'GlobalLoader');
    const text = () => dom.window.document.querySelector('.loader-elapsed').textContent;
    ctx.GlobalLoader.show('Планирование', () => cancelled++);
    assert.equal(text(), 'Прошло: 0:00');
    now += 65_000;
    timers.values().next().value();
    assert.equal(text(), 'Прошло: 1:05');
    ctx.GlobalLoader.show('Проверка', () => cancelled++);
    assert.equal(text(), 'Прошло: 1:05');
    assert.equal(timers.size, 1);
    dom.window.document.querySelector('button').click();
    assert.equal(cancelled, 1);
    ctx.GlobalLoader.hide();
    assert.equal(timers.size, 0);
    ctx.GlobalLoader.show('Новый запрос');
    assert.equal(text(), 'Прошло: 0:00');
    ctx.GlobalLoader.hide();
    assert.equal(timers.size, 0);
});
