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

test('numbers have complete interactive targets without annotating indices, powers, prose or TeX options', () => {
    const {MathSymbols: symbols, document} = setup();
    const formula = String.raw`\begin{aligned}(x_1W_{hx})_1&=(-0.24)\cdot0.988340+0.31^2\\&\approx-0.247684\end{aligned}+\sqrt[3]{8}+\text{step 12}`;
    const root = document.getElementById('math');
    root.innerHTML = symbols.render(formula);
    const numbers = [...root.querySelectorAll('[data-math-number]')].map(el => JSON.parse(symbols.decode(el.dataset.mathNumber)));
    assert.deepEqual(numbers.map(number => number.value), ['-0.24', '0.988340', '0.31', '-0.247684', '8']);
    assert.ok(numbers.every(number => formula.slice(number.start, number.end) === number.value));
    assert.ok([...root.querySelectorAll('[data-math-number]')].every(el => el.tabIndex === 0));
    assert.equal(root.querySelector('.katex-error'), null);
    assert.equal(root.querySelector('annotation').textContent, formula);
    assert.notEqual(symbols.numberKey('-0.247684'), symbols.numberKey('0.247684'));
    assert.notEqual(symbols.numberKey('0.10'), symbols.numberKey('0.1'));
    assert.notEqual(symbols.numberKey('12345678901234567890'), symbols.numberKey('12345678901234567891'));
    assert.equal(symbols.numberKey('− 0.247684'), symbols.numberKey('-0.247684'));
});

test('bare TeX arguments stay interactive without changing token boundaries or source positions', () => {
    const {MathSymbols: symbols, document} = setup();
    const root = document.getElementById('math');
    const formulas = [String.raw`R^{(1)}
=\frac{Q^{(1)}(K^{(1)})^{\mathsf T}}{\sqrt2}.`,
        String.raw`\sqrt2`, String.raw`\sqrt12`, String.raw`\sqrt[3]2`, String.raw`\sqrt x`,
        String.raw`\frac12`, String.raw`\frac xy`, String.raw`\frac1x`, String.raw`\frac x2`,
        String.raw`\dfrac23`, String.raw`\tfrac ab`, String.raw`\binom nk`, String.raw`\overset ab`,
        String.raw`\underset xy`, String.raw`\overline x`, String.raw`\underbrace x`,
        String.raw`\boxed x`, String.raw`\phantom2+x`, String.raw`\textcolor{blue}x`, "\\sqrt% root\n2",
        String.raw`\text{Scores}_i = \frac{Q_i K_i^T}{\sqrt{d_k}} + M_{mask}`];
    for (const formula of formulas) {
        root.innerHTML = symbols.render(formula);
        assert.equal(root.querySelector('.katex-error'), null, formula);
        assert.ok(root.querySelector('[data-math-symbol], [data-math-number]'), formula);
        for (const atom of symbols.atoms(formula)) {
            assert.ok(root.querySelector(`[data-math-symbol="${symbols.encode(atom.symbol)}"]`), `${formula}: ${atom.symbol}`);
        }
        const numbers = [...root.querySelectorAll('[data-math-number]')].map(el => JSON.parse(symbols.decode(el.dataset.mathNumber)));
        assert.equal(numbers.length, symbols.numbers(formula).length, formula);
        for (const number of numbers) assert.equal(formula.slice(number.start, number.end), number.value, formula);
        assert.equal(root.querySelector('annotation').textContent, formula);
    }
    root.innerHTML = symbols.render(String.raw`\sqrt12`);
    assert.equal(root.querySelector('msqrt').textContent, '1', 'a bare root consumes one TeX token');
    assert.equal(root.querySelector('msqrt').nextElementSibling.textContent, '2');
    root.innerHTML = symbols.render(String.raw`\frac12`);
    assert.deepEqual([...root.querySelector('mfrac').children].map(el => el.textContent), ['1', '2']);
});

test('dimensions and raw text never disable the mathematical targets around them', () => {
    const {MathSymbols: symbols, document} = setup();
    const root = document.getElementById('math');
    for (const spacing of [String.raw`\kern2pt`, String.raw`\kern{2pt}`, String.raw`\mkern3mu`, String.raw`\hspace{4pt}`,
        String.raw`\hskip4pt`, String.raw`\rule[5pt]{6pt}{7pt}`, String.raw`\text{step 8}`]) {
        const formula = `x+${spacing}y=9`;
        assert.doesNotThrow(() => katex.renderToString(formula, {throwOnError: true}), formula);
        root.innerHTML = symbols.render(formula);
        assert.equal(root.querySelector('.katex-error'), null, formula);
        assert.deepEqual([...root.querySelectorAll('[data-math-number]')].map(el => JSON.parse(symbols.decode(el.dataset.mathNumber)).value), ['9'], formula);
        for (const key of ['x', 'y', '=']) assert.ok(root.querySelector(`[aria-label="${key}"]`), formula);
        assert.equal(root.querySelector('[aria-label="p"]'), null, formula);
        assert.equal(root.querySelector('annotation').textContent, formula);
    }
    const formula = String.raw`\begin{aligned}x&=\sqrt2\\[6pt]y&=\frac12\end{aligned}`;
    root.innerHTML = symbols.render(formula);
    assert.equal(root.querySelector('.katex-error'), null);
    assert.equal(root.querySelectorAll('[data-math-number]').length, 3);
    assert.ok(root.querySelector('[aria-label="x"]'));
    assert.ok(root.querySelector('[aria-label="y"]'));
    assert.equal(root.querySelector('[aria-label="p"]'), null);
    assert.equal(root.querySelector('annotation').textContent, formula);
});
