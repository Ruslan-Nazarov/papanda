const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('formula callout keeps symbol definitions and text size while rendering the equation', () => {
    const dom = new JSDOM('<div id="block" class="block-content"><div class="math-callout"><div class="math-content">'
        + '<p><span class="text-size-12" data-text-size="12">U = N / G</span></p>'
        + '<p>где N — цифровой код, G — коэффициент усиления.</p>'
        + '</div></div></div>');
    const rendered = [];
    dom.window.katex = {render(formula, target) {
        rendered.push(formula);
        target.innerHTML = '<span class="katex">equation</span>';
    }};
    const ctx = context({document: dom.window.document, window: dom.window,
        NodeFilter: dom.window.NodeFilter});
    load(ctx, 'BlockMathRenderer');
    ctx.BlockMathRenderer.renderMath(dom.window.document.getElementById('block'));
    assert.deepEqual(rendered, ['U = N / G']);
    assert.equal(dom.window.document.querySelector('.math-content [data-text-size]').getAttribute('data-text-size'), '12');
    assert.match(dom.window.document.querySelector('.math-content').textContent, /где N — цифровой код/);
});

test('unfenced generated code becomes a readable code block without swallowing following prose', () => {
    const dom = new JSDOM('<div class="block-content"><p>Описание преобразования.</p>'
        + '<p>#include &lt;stdint.h&gt;</p><p>// Кадр АЦП</p><p>int32_t decode() {</p>'
        + '<p>&nbsp;&nbsp;&nbsp;&nbsp;return 1;</p><p>}</p><p>Полученное напряжение используем дальше.</p></div>');
    const ctx = context({document: dom.window.document});
    load(ctx, 'BlockCodeRenderer');
    ctx.BlockCodeRenderer.render(dom.window.document.querySelector('.block-content'));
    const code = dom.window.document.querySelector('.block-content pre code');
    assert.equal(code.textContent, '#include <stdint.h>\n// Кадр АЦП\nint32_t decode() {\n    return 1;\n}');
    assert.match(code.nextElementSibling?.textContent || code.closest('pre').nextElementSibling.textContent,
        /Полученное напряжение/);
});
