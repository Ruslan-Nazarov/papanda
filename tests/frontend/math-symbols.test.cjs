const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const katex = require('katex');
const {context, load} = require('./helpers.cjs');

function setup() {
    const dom = new JSDOM('<div id="math"></div>');
    dom.window.katex = katex;
    const ctx = context({document: dom.window.document, window: dom.window});
    load(ctx, 'MathSymbols');
    return {MathSymbols: ctx.MathSymbols, document: dom.window.document};
}

test('whole indexed atoms and their common base have stable keys, without TeX syntax or prose', () => {
    const {MathSymbols: symbols} = setup();
    const atoms = Array.from(symbols.candidates(String.raw`h_k = \tanh(h_{k-1}+x_k) + \frac{\alpha_i}{\mathbf{W}_{ij}} + \text{word}`), entry => entry.symbol);
    for (const key of ['h_{k}', 'h_{k-1}', 'h', 'x_{k}', 'x', 'k', String.raw`\tanh`, String.raw`\alpha_{i}`, String.raw`\mathbf{W}_{ij}`]) assert.ok(atoms.includes(key), key);
    assert.ok(!atoms.includes('word'));
    assert.ok(!atoms.includes(String.raw`\frac`));
    assert.equal(symbols.normalize('h_{k}'), symbols.normalize('h_k'));
    assert.notEqual(symbols.normalize('h_k'), symbols.normalize('H_k'));
    assert.equal(symbols.resolve('h_k', [{symbol: 'h', definition: 'Global'}], [{symbol: 'h', definition: 'Local'}]).definition, 'Local');
    assert.equal(symbols.resolve('h_k', [{symbol: 'h', definition: 'Base'}, {symbol: 'h_k', definition: 'Exact'}]).definition, 'Exact');
});

test('annotated formulas preserve original TeX and block unsafe trusted commands', () => {
    const {MathSymbols: symbols, document} = setup();
    const formula = String.raw`h_k = \tanh(h_{k-1}+x_k)`;
    const root = document.getElementById('math');
    root.innerHTML = symbols.render(formula);
    assert.equal(root.querySelector('annotation').textContent, formula);
    const selector = `[data-math-symbol="${symbols.encode('h_{k-1}')}"]`;
    assert.equal(root.querySelectorAll(selector).length, 1);
    assert.equal(root.querySelector(selector).textContent.includes('k'), true);
    assert.equal(root.querySelector('.katex-error'), null);
    root.innerHTML = symbols.render(String.raw`\href{javascript:alert(1)}{x}+\htmlStyle{color:red}{y}`);
    assert.equal(root.querySelector('a'), null);
    assert.equal(root.querySelector('[style*="color:red"]'), null);
});

test('common fractions, matrices, sums, roots and Greek symbols remain renderable', () => {
    const {MathSymbols: symbols, document} = setup();
    for (const formula of [String.raw`\frac{a+b}{c}`, String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`,
        String.raw`\sum_{i=1}^{n} x_i`, String.raw`\sqrt[3]{x^2}+\sin(\theta)`, String.raw`\left\{x\in\mathbb{R}\right\}`]) {
        const root = document.getElementById('math');
        root.innerHTML = symbols.render(formula, {displayMode: true});
        assert.equal(root.querySelector('.katex-error'), null, formula);
        assert.ok(root.querySelector('[data-math-symbol]'), formula);
        assert.equal(root.querySelector('annotation').textContent, formula);
    }
});

test('subscripts and superscripts expose their own definitions inside a complete expression', () => {
    const {MathSymbols: symbols, document} = setup();
    const root = document.getElementById('math');
    for (const formula of ['h_{t-1}', 'h_t', 'x^t', String.raw`h_{t_j-1}`]) {
        root.innerHTML = symbols.render(formula);
        assert.equal(root.querySelector('.katex-error'), null, formula);
        const whole = root.querySelector(`[data-math-symbol="${symbols.encode(symbols.normalize(formula))}"]`);
        assert.ok(whole, formula);
        const key = formula.includes('t_j') ? 't_{j}' : 't';
        const nested = whole.querySelector(`[data-math-symbol="${symbols.encode(key)}"]`);
        assert.ok(nested, formula);
        assert.equal(nested.closest('[data-math-symbol]').getAttribute('aria-label'), key);
        assert.equal(root.querySelector('annotation').textContent, formula);
        if (formula.includes('t_j')) assert.ok(nested.querySelector(`[data-math-symbol="${symbols.encode('j')}"]`));
    }
});

test('a transposed vector retains an independent operand and transpose target', () => {
    const {MathSymbols: symbols, document} = setup();
    const formula = String.raw`z=h_t^\top W+b`;
    const root = document.getElementById('math');
    root.innerHTML = symbols.render(formula);
    assert.equal(root.querySelector('.katex-error'), null);
    const operand = root.querySelector(`[data-math-symbol="${symbols.encode('h_{t}')}"]`);
    assert.ok(operand);
    assert.ok(root.querySelector(`[data-math-symbol="${symbols.encode(String.raw`\top`)}"]`));
    assert.ok(Array.from(symbols.candidates(formula), entry => entry.symbol).includes('h_{t}'));
    assert.equal(root.querySelector('annotation').textContent, formula);
});

test('unbraced TeX accents and fonts keep every part interactive, including block 12 transposes', () => {
    const {MathSymbols: symbols, document} = setup();
    const root = document.getElementById('math');
    for (const formula of [String.raw`W_{\mathrm{out}}=E^{\mathsf T},`,
        String.raw`z=h_{\mathrm{att}}E^{\mathsf T}.`,
        String.raw`\hat x+\vec y+\mathbf\alpha`]) {
        root.innerHTML = symbols.render(formula);
        assert.equal(root.querySelector('.katex-error'), null, formula);
        assert.ok(root.querySelector('[data-math-symbol]'), formula);
        assert.equal(root.querySelector('annotation').textContent, formula);
        for (const {symbol} of symbols.candidates(formula)) {
            // Common bases of indexed atoms are inherited; transpose operands
            // and formatted arguments must also have their own actual targets.
            if (symbol === 'W' || symbol === 'h') continue;
            assert.ok(root.querySelector(`[data-math-symbol="${symbols.encode(symbol)}"]`), symbol);
        }
    }
    assert.equal(symbols.normalize(String.raw`E^{\mathsf T}`), symbols.normalize(String.raw`E^{\mathsf{T}}`));
    assert.equal(symbols.normalize(String.raw`\mathbf\mathsf T`), String.raw`\mathbf{\mathsf{T}}`);
    assert.equal(symbols.resolve(String.raw`\hat x`, [{symbol: String.raw`\hat{x}`, definition: 'Estimate'}]).definition, 'Estimate');
});
