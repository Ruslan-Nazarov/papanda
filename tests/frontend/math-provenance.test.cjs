const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const katex = require('katex');
const {context, load} = require('./helpers.cjs');

function setup(formulas) {
    const dom = new JSDOM('<main id="blocks-container"><section class="dialectics-block"><div class="block-content"></div></section></main>');
    dom.window.katex = katex;
    const ctx = context({window: dom.window, document: dom.window.document});
    for (const name of ['MathSymbols', 'MathComputedValues', 'MathSubstitutions']) load(ctx, name);
    const content = dom.window.document.querySelector('.block-content');
    content.innerHTML = formulas.map((formula, i) => `<p id="f${i}">${ctx.MathSymbols.render(formula)}</p>`).join('');
    ctx.MathSubstitutions.refresh(dom.window.document);
    const numbers = i => [...content.querySelectorAll(`#f${i} [data-math-number]`)].map(el => JSON.parse(ctx.MathSymbols.decode(el.dataset.mathNumber))).sort((a, b) => a.start - b.start);
    const sources = number => (number.provenance || []).map(step => ({...step, formula: ctx.MathProvenance.record(content, step.ref)?.formula}));
    return {ctx, dom, content, numbers, sources};
}

const matrices = [
    String.raw`Y=\begin{bmatrix}-0.958428857&1.221831603&-0.549004597\end{bmatrix}`,
    String.raw`W_1=\begin{bmatrix}0.2&-0.4&0.1&0.3\\-0.3&0.2&0.5&-0.1\\0.4&0.1&-0.2&-0.6\end{bmatrix}`,
    'b_1=[0.05;-0.02;0.03;0.04]',
    'A=YW_1+b_1',
    String.raw`\begin{aligned}A_{0,0}&=(-0.958428857)\cdot0.2+1.221831603\cdot(-0.3)\\&+(-0.549004597)\cdot0.4+0.05\\&=-0.7278370911\end{aligned}`,
];

test('matrix multiplication links a repeated coefficient through its rule to the exact zero-based source cell', () => {
    const {numbers, sources, content} = setup(matrices);
    const coefficient = numbers(4).find(number => number.value === '0.2');
    assert.equal(coefficient.symbol, '(W_{1})_{0,0}');
    const trace = sources(coefficient);
    assert.deepEqual(trace.map(step => step.kind), ['rule', 'expansion', 'source']);
    assert.equal(trace[0].formula, 'A=YW_1+b_1');
    assert.match(trace[1].expression, /\(W_\{1\}\)_\{0,0\}/);
    assert.equal(trace[2].formula, matrices[1]);
    assert.equal(trace[2].formula.slice(trace[2].start, trace[2].end), '0.2');
    assert.equal(numbers(1)[0].symbol, '(W_{1})_{0,0}');
    assert.equal(numbers(1)[5].symbol, '(W_{1})_{1,1}');
    assert.equal(content.querySelector('.katex-error'), null);
    assert.equal(content.querySelector('#f4 annotation').textContent, matrices[4]);
});

test('assembling a matrix links each repeated zero to its own coordinate calculation', () => {
    const formulas = [
        String.raw`B_{0,0}=\max(0,-0.7278370911)=0`,
        String.raw`B_{0,1}=\max(0,0.5528374037)=0.5528374037`,
        String.raw`B_{1,0}=\max(0,-0.8576358675)=0`,
        String.raw`B_{1,1}=\max(0,0.2)=0.2`,
        String.raw`B=\begin{bmatrix}0&0.5528374037\\0&0.2\end{bmatrix}`,
    ];
    const {numbers, sources} = setup(formulas);
    const zeros = numbers(4).filter(number => number.value === '0');
    assert.equal(zeros[0].symbol, '(B)_{0,0}');
    assert.equal(zeros[1].symbol, '(B)_{1,0}');
    assert.equal(sources(zeros[0])[1].formula, formulas[0]);
    assert.equal(sources(zeros[1])[1].formula, formulas[2]);
    assert.equal(sources(zeros[0])[1].start, formulas[0].length - 1);
});

test('ReLU expansion connects its operand by coordinate and keeps the zero threshold constant', () => {
    const formulas = [String.raw`A=\begin{bmatrix}-2&3\end{bmatrix}`, String.raw`B=\operatorname{ReLU}(A)`,
        String.raw`B_{0,0}=\max(0,-2)=0`, String.raw`B=\begin{bmatrix}0&3\end{bmatrix}`];
    const {numbers, sources} = setup(formulas);
    assert.equal(numbers(2)[0].provenanceRole, 'constant');
    assert.equal(numbers(2)[0].symbol, undefined);
    assert.equal(numbers(2)[1].symbol, '(A)_{0,0}');
    assert.equal(sources(numbers(2)[1]).at(-1).formula, formulas[0]);
    assert.ok(sources(numbers(3)[0]).some(step => step.formula === formulas[2]));
});

test('contradictory values, incompatible dimensions, ambiguous rules and future definitions never establish a source', () => {
    for (const formulas of [
        [...matrices.slice(0, 4), 'A_{0,0}=(-0.958428857)*0.9+1.221831603*(-0.3)+(-0.549004597)*0.4+0.05'],
        ['Y=[1;2]', String.raw`W=\begin{bmatrix}1&2&3\end{bmatrix}`, 'A=YW', 'A_{0,0}=1*1+2*2'],
        ['a=1', 'b=2', 'c=1', 'd=2', 'y=a+b', 'y=c+d', 'y=1+2'],
        ['y=a+b', 'y=1+2', 'a=1', 'b=2'],
    ]) {
        const {numbers, sources} = setup(formulas);
        const actual = numbers(formulas.findIndex(formula => /^A_\{0,0\}|^y=1\+2/.test(formula)));
        assert.ok(actual.every(number => sources(number).every(step => step.kind !== 'source')));
    }
});

test('deleting or editing a definition clears provenance and stable refreshes preserve rendered nodes', () => {
    const {ctx, dom, content, numbers} = setup(matrices);
    const rendered = content.querySelector('#f4 .katex');
    ctx.MathSubstitutions.refresh(dom.window.document);
    assert.equal(content.querySelector('#f4 .katex'), rendered);
    content.querySelector('#f1').remove();
    ctx.MathSubstitutions.refresh(dom.window.document);
    assert.equal(numbers(4).find(number => number.value === '0.2').provenance, undefined);
});

test('one-based coordinates, transposition and subtraction of a negative bias retain exact sources', () => {
    const {numbers, sources} = setup([
        String.raw`X=\begin{bmatrix}1&2\\3&4\end{bmatrix}`,
        'b=[-0.1;-0.2]', String.raw`C=X^\top+b`, 'C_{1,2}=3-0.2=2.8',
    ]);
    assert.equal(numbers(3)[0].symbol, '(X)_{2,1}');
    assert.equal(numbers(3)[1].symbol, '(b)_{2}');
    assert.equal(numbers(3)[1].value, '-0.2');
    assert.equal(sources(numbers(3)[0]).at(-1).formula, String.raw`X=\begin{bmatrix}1&2\\3&4\end{bmatrix}`);
});

test('a result can be followed backwards through activation, a scalar calculation and the original matrices', () => {
    const formulas = [...matrices, String.raw`B=\max(0,A)`, String.raw`B_{0,0}=\max(0,-0.7278370911)=0`,
        String.raw`B=\begin{bmatrix}0&0.2\end{bmatrix}`];
    const {numbers, sources} = setup(formulas);
    const input = numbers(6).find(number => number.value === '-0.7278370911');
    assert.equal(input.symbol, 'A_{0,0}');
    const trace = sources(numbers(7)[0]);
    assert.ok(trace.some(step => step.formula === formulas[6]));
    assert.ok(trace.some(step => step.formula === matrices[4]));
    assert.ok(trace.some(step => step.formula === matrices[3]));
    assert.ok(trace.some(step => step.formula === matrices[1]));
});

test('scalar fractions, powers and functions use the same structural provenance rules', () => {
    const {numbers, sources} = setup(['a=2', 'b=3', 'x=0.5', String.raw`y=\frac{a}{b}+\sin(x)^2`,
        String.raw`y=\frac{2}{3}+\sin(0.5)^2`]);
    const bindings = numbers(4).filter(number => number.symbol);
    assert.deepEqual(bindings.map(number => number.symbol), ['a', 'b', 'x']);
    assert.equal(sources(bindings[2]).at(-1).formula, 'x=0.5');
});

test('redefining a matrix does not attach old zero results to a new literal declaration', () => {
    const {numbers, sources} = setup(['B_{0,0}=0', String.raw`B=\begin{bmatrix}0&1\end{bmatrix}`,
        String.raw`B=\begin{bmatrix}0&2\end{bmatrix}`]);
    assert.equal(sources(numbers(1)[0]).length, 2);
    assert.equal(sources(numbers(2)[0]).length, 1);
});

test('finite indexed sums specialize their free coordinates and resolve exact source cells', () => {
    const {numbers, sources} = setup([
        String.raw`X=\begin{bmatrix}1&2\\3&4\end{bmatrix}`,
        String.raw`W=\begin{bmatrix}5&6\\7&8\end{bmatrix}`, 'n=2',
        String.raw`C_{i,j}=\sum_{k=0}^{n-1}X_{i,k}W_{k,j}`,
        'C_{0,1}=1*6+2*8=22',
    ]);
    assert.deepEqual(numbers(4).slice(0, 4).map(number => number.symbol), ['(X)_{0,0}', '(W)_{0,1}', '(X)_{0,1}', '(W)_{1,1}']);
    assert.ok(sources(numbers(4)[3]).some(step => step.formula === String.raw`W=\begin{bmatrix}5&6\\7&8\end{bmatrix}`));
});

test('unbounded and excessive sums and unsupported syntax leave numbers unlinked', () => {
    for (const formula of [String.raw`y=\sum_{k=0}^{1000000}x_k`, String.raw`y=\int_0^1x\,dx`, String.raw`y=\sum_kx_k`]) {
        const {numbers} = setup([formula, 'y=1+2']);
        assert.ok(numbers(1).every(number => !number.provenance));
    }
});

test('a scalar finite sum establishes its vector indexing convention from its lower bound', () => {
    const {numbers, sources} = setup(['x=[3;4]', String.raw`y=\sum_{k=0}^{1}x_k`, 'y=3+4=7']);
    assert.deepEqual(numbers(2).slice(0, 2).map(number => number.symbol), ['(x)_{0}', '(x)_{1}']);
    assert.ok(sources(numbers(2)[0]).some(step => step.formula === 'x=[3;4]'));
});

test('nested subtraction is displayed with its grouping intact in generated explanations', () => {
    const {ctx} = setup([]);
    const engine = new ctx.MathProvenance([]);
    const tree = ctx.MathExpression.parse('a-(b-c)');
    const expanded = engine.expand(tree).cells[0];
    assert.equal(engine.tex(expanded), 'a-(b-c)');
    assert.match(engine.expansion('y', expanded), /-\(b-c\)/);
});

test('normalizing matrix names preserves original typography for definition lookup', () => {
    const {numbers} = setup([String.raw`\mathbf{X}=\begin{bmatrix}2&3\end{bmatrix}`, 'b=[1;1]', 'A=X+b', 'A_{0,0}=2+1=3']);
    assert.equal(numbers(3)[0].sourceSymbol, String.raw`\mathbf{X}`);
    assert.equal(numbers(3)[0].symbol, '(X)_{0,0}');
});
