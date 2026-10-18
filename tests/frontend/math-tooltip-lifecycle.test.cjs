const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const katex = require('katex');
const {context, load} = require('./helpers.cjs');

function setup() {
    const dom = new JSDOM('<section class="dialectics-block"><span id="target" data-math-symbol="78">x</span><span id="outside">text</span></section>');
    const timers = new Map();
    let next = 0;
    Object.assign(dom.window, {katex});
    const ctx = context({document: dom.window.document, window: dom.window,
        MutationObserver: dom.window.MutationObserver,
        setTimeout: callback => {timers.set(++next, callback); return next;}, clearTimeout: id => timers.delete(id),
        HiddenPhraseTooltip: {renderHint: (target, value) => {target.textContent = value;}},
        MathComputedValues: {forElement: () => []}, MathDefinitionContext: {target: () => ({})}});
    load(ctx, 'MathSymbols');
    load(ctx, 'MathSymbolTooltip');
    ctx.MathSymbolTooltip.bind(dom.window.document, {getContext: () => ({note: [{symbol: 'x', definition: 'Значение'}], block: []})});
    const target = dom.window.document.getElementById('target');
    const outside = dom.window.document.getElementById('outside');
    return {dom, ctx, target, outside, timers};
}

test('repeated exits leave only one dismissal timer and reentry cancels it', () => {
    const {dom, ctx, target, outside, timers} = setup();
    const event = type => new dom.window.MouseEvent(type, {bubbles: true, relatedTarget: outside});
    target.dispatchEvent(event('mouseover'));
    target.dispatchEvent(event('mouseout'));
    target.dispatchEvent(event('mouseout'));
    assert.equal(timers.size, 1);
    target.dispatchEvent(event('mouseover'));
    assert.equal(timers.size, 0);
    assert.ok(ctx.MathSymbolTooltip.active);
    const escape = new dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    target.dispatchEvent(escape);
    assert.equal(escape.defaultPrevented, true);
    assert.equal(ctx.MathSymbolTooltip.active, null);
    ctx.MathSymbolTooltip.dispose();
});

test('a delayed scroll at the measured position keeps the popup; actual target movement dismisses it', () => {
    const {dom, ctx, target} = setup();
    let top = 10;
    target.getBoundingClientRect = () => ({top, bottom: top + 20, left: 10, right: 30});
    target.dispatchEvent(new dom.window.MouseEvent('mouseover', {bubbles: true}));
    dom.window.document.dispatchEvent(new dom.window.Event('scroll'));
    assert.ok(ctx.MathSymbolTooltip.active);
    top = 25;
    dom.window.document.dispatchEvent(new dom.window.Event('scroll'));
    assert.equal(ctx.MathSymbolTooltip.active, null);
    ctx.MathSymbolTooltip.dispose();
});

test('a delayed viewport resize repositions a freshly pinned touch popup instead of closing it', () => {
    const {dom, ctx, target} = setup();
    target.dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true}));
    assert.equal(ctx.MathSymbolTooltip.active.pinned, true);
    dom.window.dispatchEvent(new dom.window.Event('resize'));
    assert.ok(ctx.MathSymbolTooltip.active);
    ctx.MathSymbolTooltip.dispose();
});
