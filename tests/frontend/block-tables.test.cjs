const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

const table = value => `<table><thead><tr><th>Элемент</th><th>Значение</th></tr></thead><tbody><tr><td>${value}</td><td>42</td></tr></tbody></table>`;

function setup(html) {
    const {window} = new JSDOM('<!doctype html><main id="blocks-container"></main>');
    const ctx = context({window, document: window.document, CustomEvent: window.CustomEvent,
        HtmlSafety: {escape: value => value, rich: value => value},
        BlockMathRenderer: {renderMath() {}}, BlockStickersManager: {_updateBadge() {}}, showToast() {}});
    load(ctx, 'AppState');
    load(ctx, 'BlockNormalBuilder');
    load(ctx, 'SaveCoordinator');
    load(ctx, 'BlockDOMParser');
    load(ctx, 'NoteExportService');
    ctx.AppState.setNote({id: 1, title: 'Расчёт', blocks: [{id: 'a', title: 'Обновление', html}]});
    const render = () => {
        const block = ctx.BlockNormalBuilder.build(ctx.AppState.getBlock('a'));
        window.document.getElementById('blocks-container').replaceChildren(block);
        return block;
    };
    return {ctx, window, render};
}

test('table folds are independent, survive save/reopen, and leave editable HTML and exports intact', () => {
    const html = '<p>Матрица:</p>' + table('W') + '<p>Смещение:</p>' + table('b');
    const {ctx, render} = setup(html);
    let block = render();
    const originalExport = ctx.NoteExportService.buildMarkdown(ctx.AppState.currentNote);
    assert.equal(ctx.AppState.isDirty, false);
    block.querySelector('.table-fold-toggle').click();
    assert.deepEqual([...block.querySelectorAll('.table-fold-body')].map(el => el.hidden), [true, false]);
    assert.equal(ctx.AppState.blockHistory('a').undo, 0, 'folding does not create a content version');
    assert.equal(ctx.AppState.getBlock('a').html, html);
    ctx.SaveCoordinator._sync(ctx.AppState.currentNote);
    const payload = ctx.SaveCoordinator._payload(ctx.AppState.currentNote);
    assert.equal(payload.blocks[0].collapsed_tables.length, 1);
    assert.equal(payload.blocks[0].html, html);
    ctx.AppState.acceptSaved(ctx.AppState.currentNote, {content_json: payload.blocks}, payload);
    ctx.AppState.setNote({id: 1, ...payload});
    block = render();
    assert.deepEqual([...block.querySelectorAll('.table-fold-body')].map(el => el.hidden), [true, false]);
    assert.equal(ctx.NoteExportService.buildMarkdown(ctx.AppState.currentNote), originalExport);
    block.querySelector('.table-fold-all').click();
    assert.equal(ctx.AppState.getBlock('a').collapsed_tables.length, 2);
    assert.equal(block.querySelector('.table-fold-all').title, 'tables_expand_all');
    block.querySelector('.table-fold-all').click();
    assert.equal(ctx.AppState.getBlock('a').collapsed_tables.length, 0);
    assert.equal(block.querySelectorAll('.table-fold-body[hidden]').length, 0);
});

test('fold follows the same table after insertion; edited and identical tables remain independent', () => {
    const {ctx, render} = setup(table('W') + table('b') + table('b'));
    render().querySelectorAll('.table-fold-toggle')[1].click();
    ctx.AppState.updateBlock('a', {html: table('new') + table('b') + table('W') + table('b')});
    let block = render();
    assert.deepEqual([...block.querySelectorAll('.table-fold-body')].map(el => el.hidden), [false, true, false, false]);
    ctx.AppState.updateBlock('a', {html: table('new') + table('edited') + table('W')});
    block = render();
    assert.equal(block.querySelectorAll('.table-fold-body[hidden]').length, 0);
});

test('mount is idempotent, ignores editor tables, and old controls cannot update another note', () => {
    const {ctx, window, render} = setup(table('W'));
    const block = render();
    const content = block.querySelector('.block-content');
    ctx.BlockTableControls.mount(content, ctx.AppState.getBlock('a'));
    assert.equal(block.querySelectorAll('.table-fold-toggle').length, 1);
    assert.equal(block.querySelector('.table-fold-all'), null);
    const editor = window.document.createElement('div');
    editor.className = 'tiptap';
    editor.innerHTML = table('editor');
    ctx.BlockTableControls.mount(editor, ctx.AppState.getBlock('a'));
    assert.equal(editor.querySelector('.table-fold'), null);
    ctx.AppState.setNote({id: 2, blocks: [{id: 'a', html: table('other')}]});
    block.querySelector('.table-fold-toggle').click();
    assert.equal(ctx.AppState.isDirty, false);
    assert.equal(ctx.AppState.getBlock('a').collapsed_tables, undefined);
});
