const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

function setup(data = {}, selected = 'h') {
    const dom = new JSDOM('<div id="editor"></div>');
    const ctx = context({document: dom.window.document, window: dom.window, structuredClone});
    load(ctx, 'MathSymbols');
    load(ctx, 'FormulaSymbolsEditor');
    const draft = {note: [], block: [], blockId: 'current', ...data};
    const editor = new ctx.FormulaSymbolsEditor(dom.window.document.getElementById('editor'), draft, selected);
    editor.update('h_1+h_2+x');
    const input = value => {
        editor.input.value = value;
        editor.input.dispatchEvent(new dom.window.Event('input'));
    };
    const scope = value => {
        editor.select.value = value;
        editor.select.dispatchEvent(new dom.window.Event('change'));
    };
    return {editor, draft, input, scope, document: dom.window.document};
}

test('a replacement warns live, retains the saved meaning, and can reuse it without mutating the note', () => {
    const {editor, draft, input, document} = setup({note: [{symbol: 'h', definition: 'Hidden state'}]});
    assert.equal(editor.check.dataset.state, 'info');
    input('Context vector');
    assert.equal(editor.check.dataset.state, 'conflict');
    assert.match(editor.check.textContent, /Hidden state/);
    assert.equal(draft.note[0].definition, 'Hidden state');
    assert.equal(document.querySelector('[data-symbol="h"]').dataset.definitionState, 'conflict');
    document.querySelector('.formula-definition-reuse').click();
    assert.equal(editor.input.value, 'Hidden state');
    assert.equal(editor.check.dataset.state, 'info');
    input('  Hidden\n state  ');
    assert.equal(editor.check.dataset.state, 'info', 'formatting whitespace is not a meaning conflict');
    input('Context vector');
    editor.apply();
    assert.equal(draft.note[0].definition, 'Context vector');
});

test('matching checks indexed TeX spelling and common bases but keeps indexed siblings independent', () => {
    const {editor, input} = setup({note: [
        {symbol: 'h_{1}', definition: 'First state'},
        {symbol: 'h_2', definition: 'Second state'},
        {symbol: 'x', definition: 'Input'},
    ]}, 'h_1');
    assert.equal(editor.input.value, 'First state');
    assert.equal(editor.check.dataset.state, 'info');
    assert.match(editor.check.textContent, /Second state/);
    assert.doesNotMatch(editor.check.textContent, /Input/);
    input('Changed first state');
    assert.equal(editor.check.dataset.state, 'conflict');
    assert.equal(editor.check.querySelectorAll('.has-conflict').length, 1);
    const base = setup({note: [{symbol: 'h', definition: 'State'}]}, 'h_1');
    base.input('Context');
    assert.equal(base.editor.check.dataset.state, 'conflict');
    const siblings = setup({note: [{symbol: 'h_2', definition: 'Second state'}]}, 'h_1');
    siblings.input('First state');
    assert.equal(siblings.editor.check.dataset.state, 'info');
});

test('global changes compare every block while separate local scopes do not create false conflicts', () => {
    const {editor, input, scope} = setup({blocks: [
        {id: 'current', title: 'Current', math_symbols: [{symbol: 'h', definition: 'Stale copy'}]},
        {id: 'other', title: 'Attention', math_symbols: [{symbol: 'h', definition: 'Context vector'}]},
    ]});
    assert.match(editor.check.textContent, /Attention/);
    assert.doesNotMatch(editor.check.textContent, /Stale copy/);
    input('State');
    assert.equal(editor.check.dataset.state, 'conflict');
    scope('block');
    input('State');
    assert.equal(editor.check.dataset.state, 'info');
    scope('note');
    assert.equal(editor.check.dataset.state, 'conflict');
});

test('local overrides compare the shared meaning and removal restores inheritance', () => {
    const {editor, draft, scope, input, document} = setup({note: [{symbol: 'h', definition: 'State'}]});
    scope('block');
    input('Context');
    assert.equal(editor.check.dataset.state, 'conflict');
    document.querySelector('.formula-definition-delete').click();
    assert.equal(editor.check.dataset.state, 'info');
    assert.equal(editor.input.placeholder, 'State');
    editor.apply();
    assert.equal(draft.block.length, 0);
    assert.equal(draft.note[0].definition, 'State');
});

test('conflicts on other symbols remain marked after switching selection and updating a formula', () => {
    const {editor, input, document} = setup({note: [{symbol: 'h', definition: 'State'}]});
    input('Context');
    document.querySelector('[data-symbol="x"]').click();
    assert.equal(editor.check.dataset.state, 'info');
    assert.equal(editor.check.querySelector('strong').textContent, 'ms_no_matches');
    assert.equal(document.querySelector('[data-symbol="h"]').dataset.definitionState, 'conflict');
    editor.update('h+x+y');
    document.querySelector('[data-symbol="h"]').click();
    assert.equal(editor.input.value, 'Context');
    assert.equal(editor.check.dataset.state, 'conflict');
});

test('existing meanings and block titles remain inert text', () => {
    const value = '<img src=x onerror="alert(1)">';
    const {editor, document} = setup({blocks: [{id: 'other', title: value,
        math_symbols: [{symbol: 'h', definition: value}]}]});
    assert.match(editor.check.textContent, /<img/);
    assert.equal(document.querySelector('img'), null);
    document.querySelector('.formula-definition-reuse').click();
    assert.equal(editor.input.value, value);
});
