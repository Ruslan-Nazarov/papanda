const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const katex = require('katex');
const {context, load} = require('./helpers.cjs');

function setup() {
    const dom = new JSDOM('<div id="blocks-container"></div>');
    dom.window.katex = katex;
    const ctx = context({window: dom.window, document: dom.window.document});
    load(ctx, 'MathSymbols');
    load(ctx, 'MathComputedValues');
    return {values: ctx.MathComputedValues, symbols: ctx.MathSymbols, document: dom.window.document};
}
const plain = value => JSON.parse(JSON.stringify(value));

test('extracts the final numeric result of a calculation and preserves approximate equality', () => {
    const {values} = setup();
    assert.deepEqual(plain(values.extract(String.raw`h_t=\tanh([0.90,-0.55,0.21]+h_{t-1})\approx[0.5709,-0.3825,0.7647].`)), [
        {symbol: 'h_{t}', relation: '\\approx', value: '[0.5709,-0.3825,0.7647]'},
    ]);
    for (const value of ['0', '-0.5', '−0.5', '1,25', '1.5e-3', String.raw`1.5\times10^{-3}`,
        String.raw`\frac{1}{2}`, String.raw`\sqrt{2}`, String.raw`\left[0.1, -0.2, 0.3\right]`,
        String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`]) {
        assert.equal(values.extract(`x=${value}`).length, 1, value);
    }
});

test('does not treat a formula using variables or unfinished arithmetic as a computed value', () => {
    const {values} = setup();
    for (const formula of [String.raw`z=h_t^\top W+b`, 'x=2+3', 'x=2-3', 'x=2*3', 'x=[1,y,3]',
        String.raw`h_t=\tanh(x_t+h_{t-1})`, 'a+b=3', 'x=NaN', 'x=Infinity', 'x=[]', 'x=<img src=x>',
        String.raw`x=\href{javascript:alert(1)}{2}`]) {
        assert.deepEqual(plain(values.extract(formula)), [], formula);
    }
});

test('extracts independent assignments and aligned rows without breaking matrix cells', () => {
    const {values} = setup();
    const source = String.raw`\begin{aligned}a&=1\\b&\approx[2,3]\\M&=\begin{pmatrix}1&2\\3&4\end{pmatrix}\end{aligned}`;
    assert.deepEqual(plain(values.extract(source)), [
        {symbol: 'a', relation: '=', value: '1'},
        {symbol: 'b', relation: '\\approx', value: '[2,3]'},
        {symbol: 'M', relation: '=', value: String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`},
    ]);
    assert.deepEqual(plain(values.extract(String.raw`a=1,\quad b=2; c=d=3`)).map(entry => entry.symbol), ['a', 'b', 'c', 'd']);
});

test('a sequence h_t includes concrete h_0 and h_1; a particular h_1 or h_{t-1} stays precise', () => {
    const {values} = setup();
    for (const key of ['h_{0}', 'h_{1}', 'h_{t}']) assert.equal(values.matches('h_t', key), true, key);
    for (const key of ['x_{1}', 'h_{k}', 'h_{t-1}', 'h^{2}']) assert.equal(values.matches('h_t', key), false, key);
    assert.equal(values.matches('h_1', 'h_{2}'), false);
    assert.equal(values.matches('h_{t-1}', 'h_{t}'), false);
    assert.equal(values.matches('h', 'h_{2}'), true);
    assert.equal(values.matches('t', 'h_{t}'), false);
});

test('indexes prior calculations across blocks, removes repetitions and skips future results and code', () => {
    const {values, symbols, document} = setup();
    const root = document.getElementById('blocks-container');
    const block = (id, formulas) => {
        const div = document.createElement('div'); div.className = 'dialectics-block'; div.id = id;
        const title = document.createElement('h3'); title.className = 'block-title'; title.textContent = id;
        const content = document.createElement('div'); content.className = 'block-content';
        for (const [index, formula] of formulas.entries()) {
            const context = document.createElement('p'); context.textContent = `Шаг ${index + 1}`;
            const p = document.createElement('p'); p.innerHTML = symbols.render(formula);
            content.append(context, p);
        }
        div.append(title, content); root.append(div); return div;
    };
    block('initial', ['h_0=[0,0,0]']);
    const current = block('steps', ['h_t=[0.1,0.2,0.3]', 'h_t=[0.4,0.5,0.6]', 'h_t=[0.4,0.5,0.6]', 'z=h_t+b', 'h_t=[9,9,9]']);
    const target = current.querySelectorAll('.katex')[3].querySelector(`[data-math-symbol="${symbols.encode('h_{t}')}"]`);
    const found = plain(values.forElement('h_t', target));
    assert.deepEqual(found.map(entry => entry.value), ['[0,0,0]', '[0.1,0.2,0.3]', '[0.4,0.5,0.6]']);
    assert.deepEqual(found.map(entry => entry.blockId), ['initial', 'steps', 'steps']);
    assert.deepEqual(found.map(entry => entry.blockNumber), [1, 2, 2]);
    assert.deepEqual(found.map(entry => entry.blockTitle), ['initial', 'steps', 'steps']);
    assert.ok(found.every(entry => !('title' in entry) && !('context' in entry)),
        'source metadata must stay separate from values and surrounding prose');
    const before = root.innerHTML;
    values.forElement('h_t', target);
    assert.equal(root.innerHTML, before, 'indexing must not modify saved content or rendered formulas');
});

test('source labels follow rendered block order and titles in shared notes, including unnamed blocks', () => {
    const {values, symbols, document} = setup();
    document.body.innerHTML = '<div class="blk" id="first"><h3>Начальное состояние</h3><div class="blk-body"></div></div>'
        + '<div class="blk" id="second"><div class="blk-body"></div></div>';
    document.querySelector('#first .blk-body').innerHTML = symbols.render('h_0=[0,0]');
    document.querySelector('#second .blk-body').innerHTML = symbols.render('h_1=[1,2]') + symbols.render('z=h_t+b');
    const target = document.querySelector('#second .katex:last-child [data-math-symbol]');
    const found = plain(values.forElement('h_t', target));
    assert.deepEqual(found.map(({blockId, blockNumber, blockTitle}) => ({blockId, blockNumber, blockTitle})), [
        {blockId: 'first', blockNumber: 1, blockTitle: 'Начальное состояние'},
        {blockId: 'second', blockNumber: 2, blockTitle: ''},
    ]);
    document.querySelector('#first h3').textContent = 'Переименованный блок';
    assert.equal(values.forElement('h_t', target)[0].blockTitle, 'Переименованный блок');
});
