const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const katex = require('katex');
const {context, load} = require('./helpers.cjs');

function setup() {
    const dom = new JSDOM('<main id="blocks-container"><div class="block-content" id="content"></div></main>');
    dom.window.katex = katex;
    const ctx = context({window: dom.window, document: dom.window.document});
    for (const module of ['MathSymbols', 'MathComputedValues', 'MathSubstitutions']) load(ctx, module);
    return {sub: ctx.MathSubstitutions, symbols: ctx.MathSymbols, document: dom.window.document};
}
const plain = value => JSON.parse(JSON.stringify(value));
const original = String.raw`v_{\text{новое}}=v_{\text{старое}}-\alpha g`;

test('matches gradient descent by position, including implicit products, coordinates and negative operands', () => {
    const {sub} = setup();
    for (const [index, old, gradient, result] of [[1, '0.90', '0.5397', '0.84603'], [2, '-0.55', '(-0.6490)', '-0.48510']]) {
        const formula = String.raw`v_{${index},\text{новое}}\approx ${old}-0.1\cdot${gradient}=${result}`;
        const found = sub.analyze(formula, [original, String.raw`\alpha=0.1`, 'g=[0.5397,-0.6490,0.7241]']);
        assert.deepEqual(plain(found.ranges).map(({symbol, value}) => [symbol, value]), [
            [String.raw`v_{\text{старое}}`, old], [String.raw`\alpha`, '0.1'], ['g', gradient],
            [String.raw`v_{${index},\text{новое}}`, result],
        ]);
        assert.equal(found.originals.length, 1);
        for (const range of found.ranges) assert.equal(formula.slice(range.start, range.end), range.value);
    }
});

test('equal numbers keep distinct meanings by position and fixed constants and exponents stay fixed', () => {
    const {sub} = setup();
    assert.deepEqual(plain(sub.analyze('y=0.1+0.1=0.2', ['y=a+b'])).ranges.map(r => r.symbol), ['a', 'b', 'y']);
    assert.deepEqual(plain(sub.analyze('y=2*0.5^2=0.5', ['y=2*x^2'])).ranges.map(r => [r.symbol, r.value]), [['x', '0.5'], ['y', '0.5']]);
    assert.equal(sub.analyze('y=3*0.5^2', ['y=2*x^2']).ranges.length, 0);
    assert.equal(sub.analyze('y=0.1+0.2', ['y=a+a']).ranges.length, 0);
    assert.deepEqual(plain(sub.analyze('y=0.1+0.2', ['y=a+b', 'y=0.1+b'])).ranges.map(r => r.symbol), ['a', 'b']);
    assert.equal(sub.compatible(String.raw`\mathbf{v}_{\text{новое}}`, String.raw`v_{1,\text{новое}}`), true);
});

test('does not infer from coincidental values, future equations, unrelated outputs or ambiguous templates', () => {
    const {sub} = setup();
    for (const [formula, sources] of [
        ['y=0.1+0.2', ['a=0.1', 'b=0.2']],
        ['z=0.1+0.2', ['y=a+b']],
        ['y=0.1+0.2', ['y=a+b', 'y=c+d']],
        ['y=0.1+0.2', ['y=a+b', 'a=0.9']],
        ['y=0.1+0.2', ['y=a-b']],
        [String.raw`y=0.1+\frac{1}{2}`, ['y=a+b', String.raw`y=a+\frac{b}{c}`]],
    ]) assert.deepEqual(plain(sub.analyze(formula, sources)), {ranges: [], originals: []});
    const root = setup();
    root.document.getElementById('content').innerHTML = ['y=0.1+0.2', 'y=a+b'].map(f => root.symbols.render(f)).join('');
    root.sub.refresh(root.document);
    assert.equal(root.document.querySelector('[data-math-value]'), null);
});

test('supports fractions, roots, functions, scientific numbers, partial substitutions and equation chains', () => {
    const {sub} = setup();
    for (const [formula, source, expected] of [
        [String.raw`y=\frac{2}{3}`, String.raw`y=\frac{a}{b}`, ['a', 'b']],
        [String.raw`y=\sqrt{2}+\sin(0.5)`, String.raw`y=\sqrt{x}+\sin(t)`, ['x', 't']],
        ['y=1e-3+b', 'y=a+b', ['a']],
        ['y=a-b=3-1=2', '', ['a', 'b', 'y']],
    ]) assert.deepEqual(plain(sub.analyze(formula, source ? [source] : [])).ranges.map(r => r.symbol), expected);
});

test('decorations retain TeX, avoid index digits and editors, and clear when an earlier formula changes', () => {
    const {sub, symbols, document} = setup();
    const content = document.getElementById('content');
    const actual = String.raw`v_{1,\text{новое}}\approx0.90-0.1\cdot0.5397=0.84603`;
    content.innerHTML = `<p id="source">${symbols.render(original)}</p><p id="actual">${symbols.render(actual)}</p>`;
    sub.refresh(document);
    const number = document.querySelector('#actual [data-math-value]');
    assert.equal(JSON.parse(symbols.decode(number.dataset.mathValue)).symbol, String.raw`v_{\text{старое}}`);
    assert.equal(document.querySelector('#actual annotation').textContent, actual);
    assert.equal(document.querySelectorAll('#actual [data-math-value]').length, 4);
    assert.equal(document.querySelector('.katex-error'), null);
    const html = content.innerHTML;
    sub.refresh(document);
    assert.equal(content.innerHTML, html);
    document.getElementById('source').remove();
    sub.refresh(document);
    assert.equal(document.querySelectorAll('#actual [data-math-value]').length, 1, 'only the explicitly assigned final result remains');
    assert.equal(document.querySelector('[data-math-original]'), null);
    content.classList.add('tiptap');
    content.innerHTML = symbols.render('x=1');
    sub.refresh(document);
    assert.equal(content.querySelector('[data-math-value]'), null);
});
