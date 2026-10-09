const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));

function setup(html = '') {
    const dom = new JSDOM(html);
    const ctx = context({document: dom.window.document, window: dom.window,
        CustomEvent: dom.window.CustomEvent, Event: dom.window.Event,
        BlockDOMParser: {syncDOMToState() {}}, BlockDOMRenderer: {renderAll() {}},
        NotesAPI: {}, DialogService: {alert() {}, confirm: async () => true},
        showToast() {}});
    for (const name of ['AppState', 'NoteText', 'HtmlSafety']) load(ctx, name);
    return ctx;
}

test('export preserves formula source, lists and decoded Unicode', () => {
    const ctx = setup();
    load(ctx, 'NoteExportService');
    const text = ctx.NoteExportService._htmlToText('<p>&#x410; &lt; B</p>' +
        '<div class="math-callout" formula="x^2"><span>rendered twice</span></div>' +
        '<ul><li>one</li><li>two</li></ul>');
    assert.equal(text, 'А < B\n$$x^2$$\n• one\n\n• two');
});

test('search highlights symbols without corrupting entities or markup', () => {
    const ctx = setup('<div id="results"></div>');
    load(ctx, 'SearchManager');
    ctx.AppState.setNote({blocks: [{id: 'one', title: 'A < B & C', html: '<p>A &lt; B &amp; C</p>'}]});
    const results = ctx.document.getElementById('results');
    for (const query of ['<', '&', 'A < B']) {
        ctx.SearchManager.performSearch(query, results);
        assert.equal(results.querySelector('mark').textContent, query);
        assert.equal(results.querySelectorAll('img, script').length, 0);
    }
});

test('opening another note saves pending edits first and keeps the note on save failure', async () => {
    const ctx = setup();
    load(ctx, 'NoteStorageService');
    ctx.AppState.setNote({id: 1, revision: 1, blocks: []});
    ctx.AppState.updateNote({title: 'unsaved'});
    const calls = [];
    ctx.NotesAPI.updateNote = async (id, data) => {calls.push('save'); return {...data, id, revision: 2};};
    ctx.NotesAPI.getNote = async id => {calls.push('load'); return {id, title: 'other', blocks: []};};
    await ctx.NoteStorageService.openNote(2);
    assert.deepEqual(calls, ['save', 'load']);
    ctx.AppState.updateNote({title: 'keep me'});
    ctx.NotesAPI.updateNote = async () => {throw new Error('offline');};
    await assert.rejects(ctx.NoteStorageService.openNote(3), /offline/);
    assert.equal(ctx.AppState.currentNote.title, 'keep me');
    assert.equal(ctx.AppState.currentNote.id, 2);
});

test('new note saves a dirty document and invalidates an older pending load', async () => {
    const ctx = setup();
    load(ctx, 'NoteStorageService');
    ctx.AppState.setNote({id: 1, revision: 1, blocks: []});
    ctx.AppState.updateNote({title: 'keep me'});
    let saved;
    ctx.NotesAPI.updateNote = async (id, data) => {saved = data; return {...data, id, revision: 2};};
    let resolve;
    ctx.NotesAPI.getNote = () => new Promise(done => {resolve = done;});
    const pending = ctx.NoteStorageService.loadNote(2);
    await tick();
    await ctx.NoteStorageService.createNewNote();
    resolve({id: 2, title: 'late', blocks: []});
    await pending;
    assert.equal(saved.title, 'keep me');
    assert.equal(ctx.AppState.currentNote.id, null);
});

test('edits made while the next note loads are saved before navigation completes', async () => {
    const ctx = setup();
    load(ctx, 'NoteStorageService');
    ctx.AppState.setNote({id: 1, revision: 1, blocks: []});
    let resolve, saved;
    ctx.NotesAPI.getNote = () => new Promise(done => {resolve = done;});
    ctx.NotesAPI.updateNote = async (id, data) => {saved = data; return {...data, id, revision: 2};};
    const pending = ctx.NoteStorageService.openNote(2);
    await tick();
    ctx.AppState.updateNote({title: 'typed during loading'});
    resolve({id: 2, title: 'next', blocks: []});
    await pending;
    assert.equal(saved.title, 'typed during loading');
    assert.equal(ctx.AppState.currentNote.id, 2);
});

test('back navigation retains history when saving or loading fails', async () => {
    const ctx = setup();
    ctx.NoteStorageService = {openNote: async () => {throw new Error('offline');}};
    load(ctx, 'NavHistoryManager');
    ctx.NavHistoryManager.push(1);
    ctx.NavHistoryManager.push(2);
    await assert.rejects(ctx.NavHistoryManager.goBack(), /offline/);
    assert.deepEqual(Array.from(ctx.NavHistoryManager._navHistory), [1, 2]);
});

test('dragging cards retains hidden drafts and external text drops are ignored', () => {
    const ctx = setup('<div id="blocks-container"><div class="dialectics-block" data-id="a"></div>' +
        '<div class="dialectics-block" data-id="b"></div><div class="drop-indicator"></div></div>');
    load(ctx, 'BlockDnDManager');
    ctx.AppState.setNote({blocks: [{id: 'a'}, {id: 'hidden', isDraft: true, html: 'draft'}, {id: 'b'}]});
    ctx.window._draggedBlock = ctx.document.querySelector('[data-id="a"]');
    ctx.BlockDnDManager.handleDrop({preventDefault() {}, clientX: 0});
    assert.deepEqual(Array.from(ctx.AppState.currentNote.blocks, b => b.id), ['b', 'hidden', 'a']);
    assert.equal(ctx.AppState.getBlock('hidden').html, 'draft');
    ctx.window._draggedBlock = null;
    ctx.BlockDnDManager.handleDrop({preventDefault() {assert.fail('external drop intercepted');}});
    ctx.BlockDnDManager.handleDragStart({target: ctx.document.body, preventDefault() {assert.fail('native drag blocked');}});
});

test('category names containing quotes round trip through rename controls', async () => {
    const ctx = setup('<div id="category-dropdown-menu"></div>');
    ctx.NotesAPI.getCategories = async () => [{id: 1, name: 'A "quoted" <category>'}];
    load(ctx, 'CategoryManager');
    await ctx.CategoryManager.loadAndRender();
    assert.equal(ctx.document.querySelector('.btn-edit-cat').dataset.name, 'A "quoted" <category>');
    assert.equal(ctx.document.querySelector('category'), null);
});

test('stale note-list requests cannot replace the trash tab', async () => {
    const ctx = setup();
    ctx.fetch = async () => ({ok: true, json: async () => []});
    ctx.NotesAPI.getNotes = async () => [];
    ctx.NotesAPI.getTrash = async () => [];
    load(ctx, 'LoadNotesModalService');
    const app = {showModal(title, html) {
        const dialog = ctx.document.createElement('div');
        dialog.innerHTML = '<div class="modal-dialog-body">' + html + '</div>';
        ctx.document.body.append(dialog);
        return {dialog, close: () => dialog.remove()};
    }};
    await ctx.LoadNotesModalService.show(app);
    let resolve;
    ctx.NotesAPI.getNotes = () => new Promise(done => {resolve = done;});
    ctx.document.querySelector('#tab-btn-notes').click();
    ctx.document.querySelector('#tab-btn-trash').click();
    await tick();
    resolve([]);
    await tick();
    assert(ctx.document.querySelector('#tab-btn-trash.active'));
    assert.equal(ctx.document.querySelector('#modal-search'), null);
});
