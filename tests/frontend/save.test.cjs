const {test} = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function setup(id = 1) {
    const requests = [];
    const events = [];
    const send = (id, data) => new Promise((resolve, reject) => requests.push({id, data, resolve, reject}));
    const ctx = context({BlockDOMParser: {syncDOMToState() {}}, NotesAPI: {
        updateNote: send, createNote: data => send(null, data),
    }, document: {getElementById() {return null;}, dispatchEvent(event) {events.push(event.type);}},
    CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options?.detail;}}});
    load(ctx, 'AppState');
    load(ctx, 'NoteStorageService');
    ctx.AppState.setNote({id, revision: id ? 4 : null, title: 'old', blocks: [{id: 'b', html: 'old block'}]});
    ctx.AppState.markDirty();
    events.length = 0;
    const finish = index => requests[index].resolve({id: requests[index].id || 10, ...requests[index].data,
        revision: (requests[index].data.revision || 0) + 1});
    return {ctx, requests, events, finish};
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test('save queues edits made during the request and snapshots nested blocks', async () => {
    const {ctx, requests, events, finish} = setup();
    const pending = ctx.NoteStorageService.saveCurrentNote();
    ctx.AppState.currentNote.title = 'new edit';
    ctx.AppState.updateBlock('b', {html: 'new block'});
    assert.equal(requests[0].data.blocks[0].html, 'old block');
    finish(0);
    await tick();
    assert.equal(ctx.AppState.currentNote.title, 'new edit');
    assert.equal(ctx.AppState.isDirty, true);
    assert.equal(requests[1].data.title, 'new edit');
    assert.equal(requests[0].data.revision, 4);
    assert.equal(requests[1].data.revision, 5);
    finish(1);
    await pending;
    assert.equal(ctx.AppState.currentNote.blocks[0].html, 'new block');
    assert.equal(ctx.AppState.isDirty, false);
    assert.equal(events.includes('noteLoaded'), false);
    assert.equal(events.filter(e => e === 'noteSaved').length, 1);
});

test('late save does not change active note or its dirty state', async () => {
    const {ctx, finish} = setup();
    const pending = ctx.NoteStorageService.saveCurrentNote();
    ctx.AppState.setNote({id: 2, title: 'another note', blocks: []});
    ctx.AppState.markDirty();
    finish(0);
    const saved = await pending;
    assert.equal(saved.id, 1);
    assert.equal(ctx.AppState.currentNote.id, 2);
    assert.equal(ctx.AppState.isDirty, true);
});

test('double save of a new note creates exactly one record', async () => {
    const {ctx, requests, finish} = setup(null);
    const first = ctx.NoteStorageService.saveCurrentNote();
    const second = ctx.NoteStorageService.saveCurrentNote();
    assert.equal(first, second);
    assert.equal(requests.length, 1);
    finish(0);
    await Promise.all([first, second]);
    assert.equal(ctx.AppState.currentNote.id, 10);
    assert.equal(ctx.AppState.isDirty, false);
});

test('new note edits during create are updated with the assigned id', async () => {
    const {ctx, requests, finish} = setup(null);
    const pending = ctx.NoteStorageService.saveCurrentNote();
    ctx.AppState.currentNote.title = 'changed during create';
    ctx.AppState.markDirty();
    finish(0);
    await tick();
    assert.equal(requests[1].id, 10);
    assert.equal(requests[1].data.revision, 1);
    finish(1);
    await pending;
    assert.equal(requests.filter(r => r.id === null).length, 1);
});

test('failed save retains data and can be retried', async () => {
    const {ctx, requests, finish} = setup();
    const pending = ctx.NoteStorageService.saveCurrentNote();
    requests[0].reject(new Error('network down'));
    await assert.rejects(pending, /network down/);
    assert.equal(ctx.AppState.isDirty, true);
    assert.equal(ctx.AppState.currentNote.blocks[0].html, 'old block');
    const retry = ctx.NoteStorageService.saveCurrentNote();
    finish(1);
    await retry;
    assert.equal(ctx.AppState.isDirty, false);
});

test('409 retains the edited document and explicit copy creates a separate record', async () => {
    const {ctx, requests, finish} = setup();
    const original = ctx.AppState.currentNote;
    original.title = 'my conflicting edit';
    const pending = ctx.NoteStorageService.saveCurrentNote();
    requests[0].reject(Object.assign(new Error('conflict'), {status: 409}));
    await assert.rejects(pending, error => error.status === 409);
    assert.equal(ctx.AppState.isDirty, true);
    assert.equal(original.revision, 4);
    assert.equal(requests.length, 1);
    const copy = ctx.NoteStorageService.saveCopy();
    assert.equal(requests[1].id, null);
    assert.equal(requests[1].data.title, 'my conflicting edit');
    assert.equal(requests[1].data.blocks[0].html, 'old block');
    finish(1);
    await copy;
    assert.equal(original.id, 1);
    assert.equal(ctx.AppState.currentNote.id, 10);
    assert.equal(ctx.AppState.isDirty, false);
});

test('out of order note loads cannot replace the latest navigation', async () => {
    const {ctx} = setup();
    const loads = new Map();
    ctx.NotesAPI.getNote = id => new Promise(resolve => loads.set(id, resolve));
    const first = ctx.NoteStorageService.loadNote(2);
    const second = ctx.NoteStorageService.loadNote(3);
    await tick();
    loads.get(3)({id: 3, title: 'latest', blocks: []});
    await second;
    loads.get(2)({id: 2, title: 'stale', blocks: []});
    await first;
    assert.equal(ctx.AppState.currentNote.id, 3);
});

test('unchanged DOM sync does not dirty a clean document', () => {
    const {ctx} = setup();
    ctx.AppState.isDirty = false;
    const block = ctx.AppState.currentNote.blocks[0];
    block.title = 'existing';
    ctx.document.querySelectorAll = () => [{dataset: {id: 'b'}, querySelector: selector =>
        selector === '.block-title' ? {textContent: 'existing'} : null}];
    load(ctx, 'BlockDOMParser');
    ctx.BlockDOMParser.syncDOMToState();
    assert.equal(ctx.AppState.isDirty, false);
});
