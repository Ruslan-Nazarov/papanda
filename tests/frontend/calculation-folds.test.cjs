const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const katex = require('katex');
const {context, load} = require('./helpers.cjs');

const calculation = (name, rows = 6) => String.raw`\begin{aligned}${name}&=1+2` + String.raw`\\&=3`.repeat(rows - 1) + String.raw`\end{aligned}`;
const htmlFor = formulas => formulas.map(formula => {
    const el = new JSDOM('').window.document.createElement('span');
    el.className = 'math-inline';
    el.setAttribute('formula', formula);
    return `<p>${el.outerHTML}</p>`;
}).join('');

function setup(formulas) {
    const {window} = new JSDOM('<main id="blocks-container"></main>');
    window.katex = {...katex, render(formula, element, options) { element.innerHTML = katex.renderToString(formula, options); }};
    const ctx = context({window, document: window.document, NodeFilter: window.NodeFilter,
        CustomEvent: window.CustomEvent, HtmlSafety: {escape: value => value, rich: value => value},
        BlockStickersManager: {_updateBadge() {}}, showToast() {},
        t: key => key === 'calculation_fold_rows' ? 'Строк: {n}' : key});
    load(ctx, 'AppState');
    load(ctx, 'BlockMathRenderer');
    load(ctx, 'BlockNormalBuilder');
    load(ctx, 'SaveCoordinator');
    load(ctx, 'BlockDOMParser');
    load(ctx, 'NoteExportService');
    load(ctx, 'ConceptChatInsertion');
    load(ctx, 'EditorTextPosition');
    ctx.AppState.setNote({id: 1, title: 'Расчёт', blocks: [{id: 'a', title: 'Пример', html: htmlFor(formulas)}]});
    const render = () => {
        const block = ctx.BlockNormalBuilder.build(ctx.AppState.getBlock('a'));
        window.document.querySelector('main').replaceChildren(block);
        return block;
    };
    return {ctx, window, render};
}

test('six outer equation rows are large; short formulas, tall matrices and nested matrix rows are not', () => {
    const {ctx, window, render} = setup([calculation('a', 5), calculation('b'), calculation('c', 12),
        String.raw`M=\begin{bmatrix}1\\2\\3\\4\\5\\6\\7\end{bmatrix}`,
        String.raw`\begin{aligned}M&=\begin{bmatrix}1\\2\\3\\4\\5\\6\end{bmatrix}\\&=N\end{aligned}`]);
    const block = render();
    assert.equal(block.querySelectorAll('.calculation-fold-toggle').length, 2);
    assert.deepEqual([...block.querySelectorAll('.calculation-fold-size')].map(el => el.textContent), ['Строк: 6', 'Строк: 12']);
    assert.equal(ctx.CalculationFolds.rowCount(block.querySelectorAll('.katex')[0]), 5);
    assert.equal(ctx.CalculationFolds.rowCount(block.querySelectorAll('.katex')[2]), 12);
    assert.equal(ctx.AppState.isDirty, false);
    ctx.FormulaZoom.scan(block);
    assert.equal(block.querySelectorAll('.calculation-fold-toggle').length, 2);
    assert.equal(block.querySelectorAll('.calculation-fold-all').length, 1);
    const editor = window.document.createElement('div');
    editor.className = 'tiptap block-content';
    editor.innerHTML = `<span class="math-expandable">${katex.renderToString(calculation('editor'))}</span>`;
    ctx.CalculationFolds.mount(editor);
    assert.equal(editor.querySelector('.calculation-fold'), null);
});

test('folds save independently, survive reopen and preserve source, export, text and chat insertion positions', () => {
    const {ctx, render} = setup([calculation('a'), calculation('b', 12)]);
    let block = render();
    const original = ctx.AppState.getBlock('a').html;
    const exported = ctx.NoteExportService.buildMarkdown(ctx.AppState.currentNote);
    const clean = ctx.NoteText.fromHtml(block.querySelector('.block-content').innerHTML);
    const positions = ctx.ConceptChatInsertion.text(block.querySelector('.block-content'));
    const editorText = ctx.EditorTextPosition.clean(block.querySelector('.block-content'));
    block.querySelector('.calculation-fold-toggle').click();
    assert.equal(block.querySelector('.calculation-fold-toggle').getAttribute('aria-expanded'), 'false');
    assert.deepEqual([...block.querySelectorAll('.calculation-fold-body')].map(el => el.hidden), [true, false]);
    assert.equal(ctx.AppState.blockHistory('a').undo, 0);
    ctx.SaveCoordinator._sync(ctx.AppState.currentNote);
    const payload = ctx.SaveCoordinator._payload(ctx.AppState.currentNote);
    assert.equal(payload.blocks[0].collapsed_calculations.length, 1);
    assert.equal(payload.blocks[0].html, original);
    ctx.AppState.setNote({id: 1, ...payload});
    block = render();
    assert.deepEqual([...block.querySelectorAll('.calculation-fold-body')].map(el => el.hidden), [true, false]);
    assert.equal(ctx.NoteExportService.buildMarkdown(ctx.AppState.currentNote), exported);
    assert.equal(ctx.NoteText.fromHtml(block.querySelector('.block-content').innerHTML), clean);
    assert.equal(ctx.ConceptChatInsertion.text(block.querySelector('.block-content')), positions);
    assert.equal(ctx.EditorTextPosition.clean(block.querySelector('.block-content')), editorText);
    block.querySelector('.calculation-fold-all').click();
    assert.equal(block.querySelectorAll('.calculation-fold-body[hidden]').length, 2);
    block.querySelector('.calculation-fold-all').click();
    assert.equal(block.querySelectorAll('.calculation-fold-body[hidden]').length, 0);
});

test('fold follows formula content after insertions; duplicates, changes and stale controls stay independent', () => {
    const {ctx, render} = setup([calculation('a'), calculation('b'), calculation('b')]);
    render().querySelectorAll('.calculation-fold-toggle')[1].click();
    ctx.AppState.updateBlock('a', {html: htmlFor([calculation('new'), calculation('b'), calculation('a'), calculation('b')])});
    let block = render();
    assert.deepEqual([...block.querySelectorAll('.calculation-fold-body')].map(el => el.hidden), [false, true, false, false]);
    ctx.AppState.updateBlock('a', {html: htmlFor([calculation('edited'), calculation('a')])});
    block.querySelector('.calculation-fold-all').click();
    block = render();
    assert.equal(block.querySelectorAll('.calculation-fold-body[hidden]').length, 0);
    ctx.AppState.updateBlock('a', {collapsed_calculations: []});
    ctx.AppState.setNote({id: 2, blocks: [{id: 'a', html: htmlFor([calculation('other')])}]});
    block.querySelector('.calculation-fold-toggle').click();
    assert.equal(ctx.AppState.isDirty, false);
    assert.equal(ctx.AppState.getBlock('a').collapsed_calculations, undefined);
});
