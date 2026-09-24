const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function store() {
    const ctx = context();
    load(ctx, 'AppState');
    return new ctx.NoteStore();
}

test('store isolates input, rejects nested mutations, and preserves document identity', () => {
    const state = store();
    const source = {id: 1, title: 'one', blocks: [{id: 'a', html: 'original', stickers: ['saved']}]};
    state.open(source);
    const note = state.note;
    source.blocks[0].html = 'outside';
    assert.equal(note.blocks[0].html, 'original');
    assert.throws(() => {note.title = 'illegal';}, /NoteStore commands/);
    assert.throws(() => note.blocks[0].stickers.push('illegal'), /NoteStore commands/);
    state.updateBlock('a', {html: 'edited'});
    assert.equal(note, state.note);
    assert.equal(note.blocks[0].html, 'edited');
    assert.equal(state.editRevision, 1);
    state.updateBlock('a', {html: 'edited'});
    assert.equal(state.editRevision, 1, 'no-op must not dirty the document again');
});

test('autosave preserves block views used by render handlers and emits only noteSaved', () => {
    const events = [];
    const initial = store();
    const state = new initial.constructor(name => events.push(name));
    state.open({id: 1, blocks: [{id: 'a', collapsed: false}]});
    const block = state.note.blocks[0];
    state.updateBlock('a', {collapsed: true});
    state.acceptIdentity(state.note, {id: 1, revision: 2});
    state.acceptSaved(state.note, {content_json: [{id: 'a', collapsed: true, status: 'none'}]}, {});
    state.updateBlock('a', {collapsed: !block.collapsed});
    assert.equal(block, state.note.blocks[0]);
    assert.equal(block.collapsed, false);
    assert.deepEqual(events, ['noteOpened', 'stateDirty', 'noteSaved', 'stateDirty']);
});

test('lifecycle releases listeners and timers exactly once', () => {
    const clears = [], cleanups = [];
    const target = new EventTarget();
    let delivered = 0;
    const ctx = context({setTimeout: () => 11, setInterval: () => 12,
        clearTimeout: id => clears.push(id), clearInterval: id => clears.push(id)});
    load(ctx, 'Lifecycle');
    const lifecycle = new ctx.Lifecycle();
    lifecycle.on(target, 'change', () => delivered++);
    lifecycle.timeout(() => {}, 1);
    lifecycle.interval(() => {}, 1);
    lifecycle.own(() => cleanups.push('widget'));
    target.dispatchEvent(new Event('change'));
    lifecycle.dispose();
    lifecycle.dispose();
    target.dispatchEvent(new Event('change'));
    assert.equal(delivered, 1);
    assert.deepEqual(clears, [12, 11]);
    assert.deepEqual(cleanups, ['widget']);
});

function checkpoints(overrides = {}) {
    let now = 0, note = {id: 1}, count = 0;
    const events = new EventTarget();
    const ctx = context({setInterval: () => 0, clearInterval() {}});
    load(ctx, 'SessionCheckpoints');
    const scheduler = new ctx.SessionCheckpoints({events, now: () => now, getNote: () => note,
        save: async () => note, checkpoint: async () => count++, ...overrides});
    scheduler.mount();
    scheduler.mount();
    return {scheduler, events, get count() {return count;},
        edit() {events.dispatchEvent(new Event('stateDirty'));},
        advance(ms) {now += ms; scheduler.tick();},
        open() {note = {id: 2}; events.dispatchEvent(new Event('noteOpened'));}};
}
const settled = () => new Promise(resolve => setImmediate(resolve));

test('15 minutes of editing creates one checkpoint despite frequent autosaves', async () => {
    const c = checkpoints();
    c.edit();
    for (let i = 0; i < 29; i++) {
        c.advance(30_000);
        c.edit();
        c.events.dispatchEvent(new Event('noteSaved'));
    }
    c.advance(30_000);
    await settled();
    assert.equal(c.count, 1);
    assert.equal(c.scheduler.activeMs, 0);
    assert.equal(c.scheduler.changed, false);
    c.scheduler.dispose();
});

test('idle time does not produce checkpoints; opening a note resets activity', () => {
    const c = checkpoints();
    c.edit();
    c.advance(3_600_000);
    assert.equal(c.count, 0);
    assert.equal(c.scheduler.activeMs, 60_000);
    c.open();
    assert.equal(c.scheduler.activeMs, 0);
    assert.equal(c.scheduler.changed, false);
    c.scheduler.dispose();
});

test('typing in an open editor counts as activity without marking its uncommitted buffer saved', async () => {
    const c = checkpoints({interval: 100_000});
    c.events.dispatchEvent(new Event('editingActivity'));
    c.advance(50_000);
    c.events.dispatchEvent(new Event('editingActivity'));
    c.advance(50_000);
    assert.equal(c.count, 0);
    c.edit(); // OK commits the buffer; the next tick can checkpoint it.
    c.advance(1);
    await settled();
    assert.equal(c.count, 1);
    c.scheduler.dispose();
});

test('edits while checkpoint is pending are retained for the next checkpoint', async () => {
    let finish;
    const c = checkpoints({interval: 1000, checkpoint: () => new Promise(resolve => {finish = resolve;})});
    c.edit();
    c.advance(1000);
    await settled();
    c.advance(200);
    c.edit();
    finish();
    await settled();
    assert.equal(c.scheduler.changed, true);
    assert.equal(c.scheduler.activeMs, 200);
    c.scheduler.dispose();
});

test('navigation or disposal during save cannot checkpoint the next document', async () => {
    for (const action of ['open', 'dispose']) {
        let finish;
        const c = checkpoints({interval: 1000, save: () => new Promise(resolve => {finish = resolve;})});
        c.edit();
        c.advance(1000);
        if (action === 'open') c.open(); else c.scheduler.dispose();
        finish({id: 1});
        await settled();
        assert.equal(c.count, 0);
        c.scheduler.dispose();
    }
});

test('API contract rejects malformed note and generation payloads before rendering', () => {
    const ctx = context();
    load(ctx, 'ApiContracts');
    assert.throws(() => ctx.ApiContracts.noteResponse({id: 1, revision: 0, title: '', content_json: []}));
    assert.throws(() => ctx.ApiContracts.generationResponse({run_id: 'r', status: 'completed',
        source_revision: 1, replace_bases: ['2'], updated_steps: {step2: {content: {}, status: 'ready'}}}));
});
