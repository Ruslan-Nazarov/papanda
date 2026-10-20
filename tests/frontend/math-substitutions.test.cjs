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

test('coordinate calculations retain the lhs across aligned continuation rows and reuse explicit numeric coordinates', () => {
    const {sub, symbols, document} = setup();
    const product = String.raw`\begin{aligned}(x_1W_{hx})_1&=(-0.24)\cdot0.988340+0.31\cdot(-0.000290)+0.18\cdot(-0.042236)\\&\approx-0.247684,\end{aligned}`;
    const state = String.raw`\begin{aligned}h_1&\approx\tanh[-0.247684-0.112436;0.317809+0.107522;0.173451-0.073507]\\&=\tanh[-0.360120;0.425331;0.099944]\\&\approx[-0.345320;0.401412;0.099612].\end{aligned}`;
    const formulas = [String.raw`x_1=[-0.24;0.31;0.18]`,
        String.raw`W_{hx}=\begin{bmatrix}0.988340&0.009805\\-0.000290&1.009774\end{bmatrix}`,
        String.raw`b=[-0.112436;0.107522;-0.073507]`, product, state];
    const content = document.getElementById('content');
    content.innerHTML = formulas.map((formula, index) => `<p id="eq-${index}">${symbols.render(formula)}</p>`).join('');
    sub.refresh(document);
    const numbers = index => [...document.querySelectorAll(`#eq-${index} [data-math-number]`)]
        .map(el => JSON.parse(symbols.decode(el.dataset.mathNumber)));
    const productNumbers = numbers(3);
    assert.equal(productNumbers.find(n => n.value === '-0.247684').symbol, '(x_{1}W_{hx})_{1}');
    assert.equal(productNumbers.find(n => n.value === '-0.24').symbol, '(x_{1})_{1}');
    assert.equal(productNumbers.find(n => n.value === '0.988340').symbol, '(W_{hx})_{1,1}');
    assert.equal(productNumbers.find(n => n.value === '-0.000290').symbol, '(W_{hx})_{2,1}');
    const stateNumbers = numbers(4);
    assert.equal(stateNumbers.find(n => n.value === '-0.247684').symbol, '(x_{1}W_{hx})_{1}');
    assert.equal(stateNumbers.find(n => n.value === '-0.112436').symbol, '(b)_{1}');
    assert.equal(stateNumbers.find(n => n.value === '-0.345320').symbol, '(h_{1})_{1}');
    assert.equal(stateNumbers.find(n => n.value === '-0.360120').symbol, undefined, 'do not invent meanings for unassigned intermediate values');
    formulas.forEach((formula, index) => {
        assert.equal(document.querySelector(`#eq-${index} annotation`).textContent, formula);
        for (const number of numbers(index)) assert.equal(formula.slice(number.start, number.end), number.value);
    });
    assert.equal(document.querySelector('.katex-error'), null);
    document.getElementById('eq-3').remove();
    sub.refresh(document);
    assert.equal(numbers(4).find(n => n.value === '-0.247684').symbol, undefined, 'removed results must not leave stale associations');
});

test('equal values keep direct meanings and ambiguous or differently written values are not assigned a symbol', () => {
    const {sub, symbols, document} = setup();
    document.getElementById('content').innerHTML = ['a=0.1', 'b=0.1', 'y=0.1+0.10'].map(f => symbols.render(f)).join('');
    sub.refresh(document);
    const numbers = [...document.querySelectorAll('[data-math-number]')].map(el => JSON.parse(symbols.decode(el.dataset.mathNumber)));
    assert.deepEqual(numbers.map(number => number.symbol), ['a', 'b', undefined, undefined]);
});

test('one chronological pass indexes each source once and preserves stable rendered nodes', () => {
    const {sub, symbols, document} = setup();
    const formulas = [original, 'a=0.90', String.raw`\alpha=0.1`, 'g=0.5397',
        String.raw`v_{1,\text{новое}}=0.90-0.1*0.5397=0.84603`,
        'y=a+b', 'y=0.1+0.2=0.3', 'y=c+d', 'y=0.1+0.2',
        ...Array.from({length: 40}, (_, i) => `x_{${i}}=${i + 10}`)];
    const content = document.getElementById('content');
    content.innerHTML = formulas.map(formula => symbols.render(formula)).join('');
    let sources = 0;
    const addSource = sub.addSource;
    sub.addSource = function(...args) {sources++; return addSource.apply(this, args);};
    sub.refresh(document);
    assert.equal(sources, formulas.length);
    const rendered = [...content.querySelectorAll('.katex')];
    assert.deepEqual(rendered.map(el => el.querySelector('annotation').textContent), formulas);
    assert.equal(JSON.parse(rendered[4].dataset.mathSubstitutions).ranges[1].symbol, String.raw`\alpha`);
    assert.equal(JSON.parse(rendered.at(-1).dataset.mathSubstitutions).numbers[0].symbol, 'x_{39}');
    sub.refresh(document);
    assert.equal(sources, formulas.length * 2);
    assert(rendered.every((el, i) => el === content.querySelectorAll('.katex')[i]));
});
