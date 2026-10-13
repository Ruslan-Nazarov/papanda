const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('a background version refresh preserves the active material picker and file input', async () => {
    const dom = new JSDOM('<button id="btn-note-materials"><span class="materials-count"></span></button><section id="note-materials-panel"></section>');
    const document = dom.window.document;
    const ctx = context({document, window: dom.window, AppState: {
        documentEpoch: 1, currentNote: {id: 7, blocks: [{role: 'anchor', attached_conspects: [], included_conspects: []}]},
    }, NotesAPI: {
        getNotes: async () => [{id: 8, title: 'Other example'}],
        getMaterials: async () => [{title: 'Saved version', material_token: 'fixed-version'}],
    }});
    load(ctx, 'MaterialsPanel');
    const panel = ctx.MaterialsPanel;
    panel.panel = document.querySelector('section');
    panel.button = document.querySelector('button');
    panel.render();
    const addButton = document.querySelector('.materials-add-app');
    const fileInput = document.querySelector('input[type=file]');
    await panel.showPicker(document.querySelector('.materials-generated'), addButton);
    const search = document.querySelector('.materials-picker-search');
    search.value = 'Unfinished search';
    await panel.loadVersions();
    assert.equal(document.querySelector('.materials-add-app'), addButton);
    assert.equal(document.querySelector('input[type=file]'), fileInput);
    assert.equal(document.querySelector('.materials-picker-search'), search);
    assert.equal(search.value, 'Unfinished search');
    assert.equal(document.querySelector('.materials-versions a').getAttribute('href'), '/v/fixed-version');
    assert.equal(document.querySelector('.materials-total').textContent, '1');
});
