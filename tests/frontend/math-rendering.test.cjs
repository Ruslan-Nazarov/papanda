const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const katex = require('katex');
const renderMathInElement = require('katex/contrib/auto-render');
const {context, load} = require('./helpers.cjs');

function setup(html) {
    const dom = new JSDOM(html);
    Object.assign(globalThis, {document: dom.window.document, Node: dom.window.Node});
    Object.assign(dom.window, {katex, renderMathInElement});
    const ctx = context({window: dom.window, document: dom.window.document, NodeFilter: dom.window.NodeFilter});
    load(ctx, 'BlockMathRenderer');
    return {dom, render: ctx.BlockMathRenderer.renderMath.bind(ctx.BlockMathRenderer)};
}

test('block rendering preserves TeX in matrices and mixed inline/display formulas', () => {
    const {dom, render} = setup('<div class="block-content" id="root"></div>');
    const root = dom.window.document.getElementById('root');
    const formulas = [String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`,
        String.raw`p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}`, String.raw`\alpha+\beta`];
    root.innerHTML = `<p>\\[${formulas[0]}\\]</p><p>$${formulas[1]}$</p><p>$${formulas[2]}$ и \\(h_t\\).</p>`;
    render(root);
    assert.equal(root.querySelectorAll('.katex-error').length, 0);
    assert.equal(root.querySelectorAll('.katex .katex').length, 0, 'rendered math must not be parsed again');
    const annotations = [...root.querySelectorAll('annotation')].map(el => el.textContent);
    assert.deepEqual(annotations, [...formulas, 'h_t']);
    const before = root.innerHTML;
    render(root);
    assert.equal(root.innerHTML, before, 'rendering must be idempotent');
});

test('block rendering leaves code, attributes, and hidden explanations intact', () => {
    const {dom, render} = setup(String.raw`<div class="block-content" id="root"><p><code>$x_1$</code>
        <span data-hint="$x_2$">пояснение</span> и $y_1$</p><pre>\[z_1\]</pre></div>`);
    const root = dom.window.document.getElementById('root');
    render(root);
    assert.equal(root.querySelector('code').textContent, '$x_1$');
    assert.equal(root.querySelector('code .katex'), null);
    assert.equal(root.querySelector('pre').textContent, String.raw`\[z_1\]`);
    assert.equal(root.querySelector('[data-hint]').dataset.hint, '$x_2$');
    assert.deepEqual([...root.querySelectorAll('annotation')].map(el => el.textContent), ['y_1']);
});

test('display callouts use display math while formulas in explanatory prose stay inline', () => {
    const {dom, render} = setup(String.raw`<div id="root"><div class="math-callout"><div class="math-content">
        <p><span class="math-inline" formula="\sum_{j=0}^{5}e^{z_j}"></span></p>
        <p>где <span class="math-inline" formula="z_j"></span> — оценка.</p></div></div></div>`);
    const root = dom.window.document.getElementById('root');
    render(root);
    assert.equal(root.querySelectorAll('.katex-display').length, 1);
    assert.ok(root.querySelector('.math-content > :first-child .katex-display'));
    assert.equal(root.querySelector('.math-content > :last-child .katex-display'), null);
});

test('display formulas saved with HTML line breaks render without losing ordinary line breaks', () => {
    const {dom, render} = setup(String.raw`<div class="block-content" id="root"><p>До<br>\[<br>
        p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}<br>\]<br>После</p></div>`);
    const root = dom.window.document.getElementById('root');
    render(root);
    assert.equal(root.querySelectorAll('.katex-display').length, 1);
    assert.equal(root.querySelectorAll('.katex-error').length, 0);
    assert.equal(root.querySelector('annotation').textContent.trim(), String.raw`p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}`);
    assert.equal(root.querySelectorAll('br').length, 2);
});
