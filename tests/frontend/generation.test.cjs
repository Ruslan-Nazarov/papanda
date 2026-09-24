const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function setup(extra = {}) {
    const ctx = context({ALGORITHM_STEPS: [],
        document: {addEventListener() {}, dispatchEvent() {}, getElementById() {return null;}},
        BlockDOMParser: {syncDOMToState() {}}, GlobalLoader: {show() {}, hide() {}},
        DialogService: {confirm: async () => false}, showToast() {}, ...extra});
    for (const name of ['AppState', 'GenerationChanges', 'AIController']) load(ctx, name);
    ctx.AppState.setNote({id: 1, revision: 4, title: 'Manual note', blocks: [
        {id: 'a', role: 'anchor', html: 'Question'},
        {id: 'one', role: 'step1', html: 'manual', status: 'ready'},
        {id: 'section', role: 'section', html: 'keep me'},
        {id: 'two-a', role: 'step2.1', html: 'old-a'},
        {id: 'two-b', role: 'step2.2', html: 'old-b'},
        {id: 'three', role: 'step3', html: 'old-three'},
    ]});
    return ctx;
}

const result = (status = 'completed') => ({status, source_revision: 4,
    updated_steps: {step2: {content: 'new two', status: 'in_progress'}}, replace_bases: ['2', '3', '4', '5']});
const plain = value => JSON.parse(JSON.stringify(value));

test('atomic family replacement collapses multiple blocks and invalidates descendants', () => {
    const {AppState, GenerationChanges} = setup();
    const before = JSON.stringify(AppState.currentNote);
    const next = GenerationChanges.build(AppState.currentNote, result(), text => text);
    assert.deepEqual(plain(next.blocks.map(b => b.role)), ['anchor', 'step1', 'section', 'step2']);
    assert.equal(next.blocks[1].html, 'manual');
    assert.equal(JSON.stringify(AppState.currentNote), before);
});

test('atomic family replacement expands a single block in numeric order', () => {
    const {AppState, GenerationChanges} = setup();
    const next = GenerationChanges.build(AppState.currentNote, {replace_bases: ['1'], updated_steps: {
        'step1.2': {content: 'second'}, 'step1.1': {content: 'first'},
    }}, text => text);
    assert.deepEqual(plain(next.blocks.slice(1, 3).map(b => b.html)), ['first', 'second']);
    assert(!next.blocks.some(b => b.role === 'step1'));
});

test('invalid later block cannot partially mutate an active note', () => {
    const {AppState, GenerationChanges} = setup();
    const before = JSON.stringify(AppState.currentNote);
    assert.throws(() => GenerationChanges.build(AppState.currentNote, {updated_steps: {
        step1: {content: 'valid'}, step2: {content: {}},
    }}, text => text));
    assert.equal(JSON.stringify(AppState.currentNote), before);
});

test('successful result applies in one render and dirty revision', async () => {
    const ctx = setup({NotesAPI: {routeConspectus: async () => result()}});
    let rendered = 0;
    await ctx.AIController.generateStep(2, () => rendered++);
    assert.equal(rendered, 1);
    assert.equal(ctx.AppState.editRevision, 1);
    assert.equal(ctx.AppState.currentNote.blocks.at(-1).html, '<p>new two</p>');
});

test('edits during generation are preserved and result can be saved separately', async () => {
    let finish, saved;
    const ctx = setup({NotesAPI: {
        routeConspectus: () => new Promise(resolve => {finish = resolve;}),
        createNote: async note => {saved = note;},
    }, DialogService: {confirm: async () => true}});
    const running = ctx.AIController.generateStep(2);
    ctx.AppState.updateBlock('one', {html: 'new manual edit'});
    finish(result());
    await running;
    assert.equal(ctx.AppState.getBlock('one').html, 'new manual edit');
    assert.equal(ctx.AppState.getBlock('two-a').html, 'old-a');
    assert.equal(saved.blocks.find(b => b.role === 'step1').html, 'manual');
    assert.equal(saved.blocks.find(b => b.role === 'step2').html, '<p>new two</p>');
});

test('late result does not mutate a different loaded document', async () => {
    let finish;
    const ctx = setup({NotesAPI: {routeConspectus: () => new Promise(resolve => {finish = resolve;})}});
    const running = ctx.AIController.generateStep(2);
    ctx.AppState.setNote({id: 2, revision: 1, title: 'Other', blocks: []});
    finish(result());
    await running;
    assert.equal(ctx.AppState.currentNote.title, 'Other');
    assert.equal(ctx.AppState.currentNote.blocks.length, 0);
    assert.equal(ctx.AppState.isDirty, false);
});

test('partial result requires explicit acceptance before any edit', async () => {
    let confirms = 0;
    const ctx = setup({NotesAPI: {routeConspectus: async () => result('partial')},
        DialogService: {confirm: async () => {confirms++; return false;}}});
    await ctx.AIController.generateStep(2);
    assert.equal(confirms, 1);
    assert.equal(ctx.AppState.isDirty, false);
    assert.equal(ctx.AppState.getBlock('two-a').html, 'old-a');
});

test('cancel aborts the request without changing the note', async () => {
    let cancel;
    const ctx = setup({NotesAPI: {routeConspectus: (payload, signal) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(Object.assign(new Error('cancel'), {name: 'AbortError'})));
    })}, GlobalLoader: {show(text, onCancel) {cancel = onCancel;}, hide() {}}});
    const running = ctx.AIController.generateStep(2);
    cancel();
    assert.equal(await running, null);
    assert.equal(ctx.AppState.isDirty, false);
});

function apiFor(events, {crlf = false, splitBytes = false} = {}) {
    const separator = crlf ? '\r\n\r\n' : '\n\n';
    const bytes = new TextEncoder().encode(events.map(e => 'data: ' + (typeof e === 'string' ? e : JSON.stringify(e))).join(separator));
    const body = splitBytes ? new ReadableStream({start(c) {for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close();}}) : bytes;
    const ctx = context({fetch: async () => new Response(body, {status: 200})});
    load(ctx, 'api', 'NotesAPI');
    return ctx.NotesAPI;
}
const start = {type: 'started', run_id: 'run', sequence: 1};
const delta = {type: 'delta', run_id: 'run', sequence: 2, delta: 'текст'};
const terminal = {type: 'terminal', run_id: 'run', sequence: 3, status: 'completed', done: true};

test('SSE decodes split UTF-8, CRLF and final frame without delimiter', async () => {
    assert.equal(await apiFor([start, delta, terminal], {crlf: true, splitBytes: true}).stream('/x', {}), 'текст');
});

for (const [name, frames] of Object.entries({
    'EOF without terminal': [start, delta],
    'malformed JSON': [start, '{bad'],
    'wrong sequence': [start, {...delta, sequence: 4}, terminal],
    'wrong run': [start, {...delta, run_id: 'other'}, terminal],
    'duplicate terminal': [start, delta, terminal, {...terminal, sequence: 4}],
    'partial text completion': [start, delta, {...terminal, status: 'partial'}],
})) test('SSE rejects ' + name, async () => {
    await assert.rejects(apiFor(frames).stream('/x', {}));
});
