const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

function setup() {
    const dom = new JSDOM('<html><body></body></html>');
    dom.window.confirm = () => true;
    const note = {dictionary_tags: [{id: 'math', name: 'Математика', color: '#2563eb'},
        {id: 'nets', name: 'Виды сетей', color: '#7c3aed'}], dictionary: [
        {word: 'Матрица', definition: 'Таблица чисел', connections: 'RNN', tags: ['math']},
        {word: 'RNN', definition: 'Рекуррентная сеть', tags: ['nets']},
        {word: 'Новое понятие', definition: '', tags: []}
    ]};
    const ctx = context({window: dom.window, document: dom.window.document,
        AppState: {currentNote: note, updateNote: patch => Object.assign(note, patch)}});
    load(ctx, 'DictModalService');
    ctx.DictModalService.show();
    return {note, ctx, dom, doc: dom.window.document};
}

test('tags filter list and graph, support tag-name search and display an empty selection', () => {
    const {doc, dom} = setup();
    assert.equal(doc.querySelector('.dict-tag-filters [data-tag-id="math"]').textContent, 'Математика · 1');
    doc.querySelector('.dict-tag-filters [data-tag-id="math"]').click();
    assert.deepEqual([...doc.querySelectorAll('.dict-entry strong')].map(node => node.textContent), ['Матрица']);
    doc.querySelector('.dict-view-graph').click();
    assert.equal(doc.querySelector('.dict-graph-detail strong').textContent, 'Матрица');
    assert.equal(doc.querySelectorAll('.dict-graph-index-item').length, 1);
    doc.querySelector('.dict-graph-node:not(.is-selected)').click();
    assert.equal(doc.querySelector('.dict-graph-detail strong').textContent, 'RNN');
    assert.equal(doc.querySelector('.dict-tag-filters [data-tag-id=""]').getAttribute('aria-pressed'), 'true');
    doc.querySelector('.dict-tag-filters [data-tag-id="math"]').click();
    doc.querySelector('.dict-search').value = 'нет совпадений';
    doc.querySelector('.dict-search').dispatchEvent(new dom.window.Event('input'));
    assert.equal(doc.querySelector('.dict-graph-detail').childElementCount, 0);
    assert.equal(doc.querySelector('.dict-graph-empty').textContent, 'dict_no_results');
    doc.querySelector('.dict-search').value = '';
    doc.querySelector('.dict-tag-filters [data-tag-id="__untagged"]').click();
    assert.equal(doc.querySelector('.dict-graph-detail strong').textContent, 'Новое понятие');
    doc.querySelector('.dict-tag-filters [data-tag-id=""]').click();
    doc.querySelector('.dict-view-list').click();
    doc.querySelector('.dict-search').value = 'математика';
    doc.querySelector('.dict-search').dispatchEvent(new dom.window.Event('input'));
    assert.equal(doc.querySelectorAll('.dict-entry').length, 1);
});

test('article tag selection is a draft until Save; creating a tag assigns it to the draft', () => {
    const {doc, dom, note} = setup();
    doc.querySelector('.dict-edit').click();
    doc.querySelector('.dict-tag-picker [data-tag-id="nets"]').click();
    doc.querySelector('.dict-cancel').click();
    assert.deepEqual(note.dictionary[0].tags, ['math']);
    doc.querySelector('.dict-edit').click();
    doc.querySelector('.dict-tag-picker [data-tag-id="nets"]').click();
    const form = doc.querySelector('.dict-tag-picker form');
    form.querySelector('input[type=text]').value = '<img src=x onerror=alert(1)>';
    form.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
    assert.equal(doc.querySelector('.dict-tag-picker img'), null);
    const newTag = note.dictionary_tags.at(-1);
    doc.querySelector('.dict-save').click();
    assert.deepEqual(Array.from(note.dictionary[0].tags), ['math', 'nets', newTag.id]);
    assert.equal(doc.querySelector('.dict-entry .dict-entry-tags').childElementCount, 3);
});

test('settings rename and recolor shared tags; reject duplicates; deletion removes assignments only', () => {
    const {doc, dom, note} = setup();
    const submit = form => form.dispatchEvent(new dom.window.Event('submit', {cancelable: true}));
    let form = doc.querySelector('.dict-tag-setting[data-tag-id="math"]');
    form.querySelector('input[type=text]').value = 'Виды сетей';
    submit(form);
    assert.equal(note.dictionary_tags[0].name, 'Математика');
    assert.equal(form.nextElementSibling.textContent, 'dict_tags_invalid');
    form.querySelector('input[type=text]').value = 'Алгебра';
    form.querySelector('input[type=color]').value = '#123456';
    submit(form);
    assert.equal(note.dictionary_tags[0].name, 'Алгебра');
    assert.equal(note.dictionary_tags[0].color, '#123456');
    assert.equal(doc.querySelector('.dict-entry .dict-tag').textContent, 'Алгебра');
    doc.querySelector('.dict-tag-filters [data-tag-id="math"]').click();
    form = doc.querySelector('.dict-tag-setting[data-tag-id="math"]');
    form.querySelector('.dict-tag-remove').click();
    assert.equal(note.dictionary_tags.length, 1);
    assert.deepEqual(Array.from(note.dictionary[0].tags), []);
    assert.equal(note.dictionary.length, 3);
    assert.equal(doc.querySelectorAll('.dict-entry').length, 3);
    assert.equal(doc.querySelector('.dict-tag-filters [data-tag-id="math"]'), null);
});
