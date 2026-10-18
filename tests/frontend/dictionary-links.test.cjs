const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function setup(definition = 'См. в блоке 16.', dialog = {}) {
    const dom = new JSDOM('<html><body></body></html>');
    const note = {id: 1, blocks: [{id: 'b16', title: 'Градиентный спуск'}], dictionary: [
        {word: 'Скорость обучения', definition, connections: 'Градиент'},
        {word: 'Градиент', definition: '', connections: ''},
    ]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote: note, updateNote: patch => Object.assign(note, patch)},
        NotesAPI: {getNotes: async () => [{id: 1, title: 'Конспект'}]},
        ...dialog});
    if (!ctx.DialogService) load(ctx, 'DialogService');
    load(ctx, 'DictModalService');
    ctx.DictModalService.show();
    const document = dom.window.document;
    document.querySelector('.dict-edit').click();
    return {dom, ctx, note, document, field: document.querySelector('.dict-definition')};
}

test('dictionary links selected words, preserves drafts on Escape, and renders both reading views', async () => {
    const {dom, ctx, note, document, field} = setup();
    field.setSelectionRange(4, 14);
    const button = document.querySelector('.dict-insert-link');
    button.click();
    await tick();
    document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await tick();
    assert.equal(document.querySelector('.dict-editor').hidden, false);
    assert.equal(field.value, 'См. в блоке 16.');
    assert.equal(document.activeElement, field);
    assert.equal(document.querySelector('.internal-links-dialog'), null);
    button.click();
    await tick();
    document.querySelector('.internal-links-expand').click();
    await tick();
    document.querySelector('.internal-links-block').click();
    document.querySelector('.internal-links-confirm').click();
    await tick();
    assert.equal(field.value, 'См. [в блоке 16](internal://note/1/block/b16).');
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[0].definition, field.value);
    assert.equal(document.querySelector('.dict-entry p a').textContent, 'в блоке 16');
    assert.equal(document.querySelector('.dict-entry p a').getAttribute('href'), 'internal://note/1/block/b16');
    document.querySelector('.dict-done').click();
    ctx.DictModalService.show();
    document.querySelector('.dict-view-graph').click();
    assert.equal(document.querySelector('.dict-graph-detail p a').textContent, 'в блоке 16');
    document.querySelector('.dict-graph-detail p a').dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true, cancelable: true}));
    assert.equal(document.querySelector('.dict-modal'), null);
    dom.window.close();
});

test('dictionary inserts note and block links at the caret and can retarget or unlink them', async () => {
    const {dom, document, field} = setup('До. После.');
    field.setSelectionRange(4, 4);
    const button = document.querySelector('.dict-insert-link');
    button.click();
    await tick();
    document.querySelector('.internal-links-note-row .internal-links-target').click();
    document.querySelector('.internal-links-expand').click();
    await tick();
    document.querySelector('.internal-links-block').click();
    document.querySelector('.internal-links-confirm').click();
    await tick();
    assert.equal(field.value, 'До. [Конспект](internal://note/1), [Градиентный спуск](internal://note/1/block/b16)После.');
    field.setSelectionRange(7, 7);
    button.click();
    await tick();
    assert.equal(document.querySelectorAll('.internal-links-chip').length, 1);
    document.querySelector('.internal-links-chip').click();
    document.querySelector('.internal-links-expand').click();
    await tick();
    document.querySelector('.internal-links-block').click();
    document.querySelector('.internal-links-confirm').click();
    await tick();
    assert.match(field.value, /^До\. \[Конспект\]\(internal:\/\/note\/1\/block\/b16\)/);
    field.setSelectionRange(7, 7);
    button.click();
    await tick();
    document.querySelector('.internal-links-delete').click();
    await tick();
    assert.match(field.value, /^До\. Конспект, \[Градиентный спуск\]/);
    dom.window.close();
});

test('connection explanations accept links and keep them on both ends of the relationship', async () => {
    const {dom, ctx, note, document} = setup();
    const field = document.querySelector('textarea[data-connection]');
    field.value = 'См. градиент';
    field.setSelectionRange(4, field.value.length);
    document.querySelector('.dict-connection-explanations .dict-insert-link').click();
    await tick();
    document.querySelector('.internal-links-expand').click();
    await tick();
    document.querySelector('.internal-links-block').click();
    document.querySelector('.internal-links-confirm').click();
    await tick();
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[0].connection_explanations['Градиент'], 'См. [градиент](internal://note/1/block/b16)');
    assert.equal(note.dictionary[1].connection_explanations['Скорость обучения'], note.dictionary[0].connection_explanations['Градиент']);
    assert.equal(document.querySelector('.dict-entry small a').textContent, 'градиент');
    document.querySelector('.dict-view-graph').click();
    assert.equal(document.querySelector('.dict-graph-relations a').textContent, 'градиент');
    ctx.DictModalService.activeClose();
    dom.window.close();
});

test('link labels round trip brackets, TeX and HTML text while unsafe links remain literal', async () => {
    const label = String.raw`в [блоке] \(\eta\) <img src=x onerror=alert(1)>`;
    const {dom, ctx, document, field} = setup(label, {DialogService: {
        selectInternalLinks: async () => [{url: 'internal://note/1/block/b16', text: 'Блок'}],
    }});
    field.setSelectionRange(0, label.length);
    document.querySelector('.dict-insert-link').click();
    await tick();
    document.querySelector('.dict-save').click();
    assert.equal(document.querySelector('.dict-entry p a').textContent, label);
    assert.equal(document.querySelector('.dict-entry img'), null);
    const content = document.createElement('div');
    const unsafe = '[bad](javascript:alert(1)) [external](https://example.com) <script>bad()</script>';
    ctx.DictModalService.renderText(content, unsafe);
    assert.equal(content.textContent, unsafe);
    assert.equal(content.querySelector('a,script'), null);
    dom.window.close();
});

test('a late picker response cannot overwrite a closed dictionary or exceed the field limit', async () => {
    let finish;
    const {dom, document, field} = setup('x'.repeat(9990), {DialogService: {
        selectInternalLinks: () => new Promise(resolve => {finish = resolve;}),
    }});
    field.setSelectionRange(field.value.length, field.value.length);
    const button = document.querySelector('.dict-insert-link');
    button.click();
    finish([{url: 'internal://note/1/block/b16', text: 'Блок'}]);
    await tick();
    assert.equal(field.value.length, 9990);
    assert.equal(document.querySelector('.dict-error').hidden, false);
    field.value = 'Черновик';
    button.click();
    document.querySelector('.dict-close').click();
    finish([{url: 'internal://note/1/block/b16', text: 'Блок'}]);
    await tick();
    assert.equal(field.value, 'Черновик');
    assert.equal(document.querySelector('.dict-modal'), null);
    dom.window.close();
});
