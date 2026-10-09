const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function setup(extra = {}) {
    const ctx = context({ALGORITHM_STEPS: [],
        document: {addEventListener() {}, dispatchEvent() {}, getElementById() {return null;}},
        BlockDOMParser: {syncDOMToState() {}}, GlobalLoader: {show() {}, hide() {}},
        DialogService: {confirm: async () => false}, showToast() {},
        NoteStorageService: {saveCurrentNote: async () => ctx.AppState.currentNote},
        ...extra, NotesAPI: {addActivity: async () => {}, createCheckpoint: async () => {}, ...extra.NotesAPI}});
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

const result = (status = 'completed') => ({run_id:'test-run', status, source_revision: 4,
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

test('AI result applies in one render', async () => {
    const ctx = setup({NotesAPI: {routeConspectus: async () => result(), addActivity: async () => {}}});
    let rendered = 0;
    await ctx.AIController.generateStep(2, () => rendered++);
    assert.equal(rendered, 1);
    assert.equal(ctx.AppState.editRevision, 1);
    assert.equal(ctx.AppState.currentNote.blocks.at(-1).html, '<p>new two</p>');
});

test('a generated content heading replaces the step role title', async () => {
    const ctx = setup({NotesAPI: {routeConspectus: async () => ({...result(),
        step_titles: {'2': 'A readable signal from the electrodes'}})}});
    await ctx.AIController.generateStep(2);
    assert.equal(ctx.AppState.currentNote.blocks.find(b => b.role === 'step2').title,
        'A readable signal from the electrodes');
});

test('saved engine data is bound to rendered predecessors and sent to the next step', async () => {
    const generated = {...result(), replace_bases: ['2'], updated_steps: {
        'step2.1': {content: 'new first', status: 'in_progress', generation_data: {world: {domain: 'Question'}}},
        'step2.2': {content: 'new second', status: 'in_progress'},
    }};
    const ctx = setup({NotesAPI: {routeConspectus: async () => generated}});
    await ctx.AIController.generateStep(2);
    const payload = ctx.AIController.buildStateForAI();
    const data = payload.steps['step2.1'].generation_data;
    assert.equal(data.world.domain, 'Question');
    assert.equal(data.dependencies.step1, payload.steps.step1.content);
    assert.equal(data.dependencies.step2, payload.steps.step2.content);
    assert.equal(data.dependencies['step2.2'], payload.steps['step2.2'].content);
    assert(!('step3' in data.dependencies));
    ctx.AppState.updateBlock('one', {html: 'manual revision'});
    assert.notEqual(data.dependencies.step1, ctx.AIController.buildStateForAI().steps.step1.content);
});

test('generation sends headings and sticker meanings attached to their own blocks', () => {
    const {AppState, AIController} = setup();
    AppState.updateBlock('one', {title: 'Measure the ECG signal', stickers: [
        {id: 's', title: 'For development', text: 'Electrodes for a specific frequency', color: '#ffffff'},
        {title: '  ', text: ''},
    ]});
    AppState.updateBlock('two-a', {title: 'First development', stickers: [{text: 'Child annotation'}]});
    const steps = plain(AIController.buildStateForAI().steps);
    assert.equal(steps.step1.title, 'Measure the ECG signal');
    assert.equal(steps.step1.content, 'manual');
    assert.deepEqual(steps.step1.stickers, [{title: 'For development', text: 'Electrodes for a specific frequency'}]);
    assert.deepEqual(steps['step2.1'].stickers, [{title: '', text: 'Child annotation'}]);
    assert.equal(steps['step2.1'].title, 'First development');
    assert.deepEqual(steps['step2.2'].stickers, []);
    assert.deepEqual(steps.step2.stickers, []);
});

test('engine context snapshot includes final generated headings and detects annotation edits', async () => {
    const ctx = setup({NotesAPI: {routeConspectus: async () => ({...result(), replace_bases: ['2'],
        step_titles: {'2': 'Final heading'}, updated_steps: {step2: {
            content: 'new two', generation_data: {world: {domain: 'Question'}},
        }}})}});
    ctx.AppState.updateBlock('one', {title: 'Original heading', stickers: [{title: 'Note', text: 'Original annotation'}]});
    await ctx.AIController.generateStep(2);
    const data = ctx.AIController.buildStateForAI().steps.step2.generation_data;
    assert.equal(data.context_dependencies.step2.title, 'Final heading');
    assert.deepEqual(plain(data.context_dependencies.step1.stickers), [{title: 'Note', text: 'Original annotation'}]);
    ctx.AppState.updateBlock('one', {title: 'Revised heading', stickers: []});
    const updated = ctx.AIController.buildStateForAI().steps.step1;
    assert.equal(data.dependencies.step1, updated.content);
    assert.notEqual(data.context_dependencies.step1.title, updated.title);
    assert.notDeepEqual(plain(data.context_dependencies.step1.stickers), plain(updated.stickers));
});

test('edits during generation are preserved and result can be saved as an ordinary copy', async () => {
    let finish, saved;
    const ctx = setup({NotesAPI: {
        routeConspectus: () => new Promise(resolve => {finish = resolve;}),
        addActivity: async () => {},
        createNote: async note => {saved = note;},
    }, DialogService: {confirm: async () => true}});
    const running = ctx.AIController.generateStep(2);
    await new Promise(setImmediate);
    ctx.AppState.updateBlock('one', {html: 'new manual edit'});
    finish(result());
    await running;
    assert.equal(ctx.AppState.getBlock('one').html, 'new manual edit');
    assert.equal(ctx.AppState.getBlock('two-a').html, 'old-a');
    assert.equal(saved.blocks.find(b => b.role === 'step2').html, '<p>new two</p>');
});

test('late result does not mutate a different loaded document', async () => {
    let finish;
    const ctx = setup({NotesAPI: {routeConspectus: () => new Promise(resolve => {finish = resolve;}), addActivity: async () => {}}});
    const running = ctx.AIController.generateStep(2);
    await new Promise(setImmediate);
    ctx.AppState.setNote({id: 2, revision: 1, title: 'Other', blocks: []});
    finish(result());
    await running;
    assert.equal(ctx.AppState.currentNote.title, 'Other');
    assert.equal(ctx.AppState.currentNote.blocks.length, 0);
    assert.equal(ctx.AppState.isDirty, false);
});

test('declining partial result leaves the note untouched', async () => {
    let reviews = 0;
    const ctx = setup({NotesAPI: {routeConspectus: async () => result('partial'), addActivity: async () => {}},
        DialogService: {confirm: async () => {reviews++; return false;}}});
    await ctx.AIController.generateStep(2);
    assert.equal(reviews, 1);
    assert.equal(ctx.AppState.isDirty, false);
    assert.equal(ctx.AppState.getBlock('two-a').html, 'old-a');
});

test('cancel aborts the request without changing the note', async () => {
    let cancel;
    const ctx = setup({NotesAPI: {routeConspectus: (payload, signal) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(Object.assign(new Error('cancel'), {name: 'AbortError'})));
    }), addActivity: async () => {}}, GlobalLoader: {show(text, onCancel) {cancel = onCancel;}, hide() {}}});
    const running = ctx.AIController.generateStep(2);
    await new Promise(setImmediate);
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


test('full generation records the request and checkpoints the same note before applying', async () => {
    const events = [], order = [];
    const ctx = setup({NotesAPI: {
        stream: async () => result(),
        addActivity: async (id, data) => {events.push({id, data}); order.push('diary');},
        createCheckpoint: async id => {assert.equal(id, 1); order.push('checkpoint');},
    }});
    await ctx.AIController.generateFull(() => order.push('render'));
    assert.equal(ctx.AppState.currentNote.id, 1);
    assert.deepEqual(order, ['diary', 'checkpoint', 'render']);
    assert.equal(events.length, 1);
    assert.equal(events[0].data.request, 'Question');
    assert.match(events[0].data.text, /new two/);
    assert.equal(events[0].data.status, 'completed');
});

test('late result is kept in the original note diary after navigation', async () => {
    let finish, logged;
    const ctx = setup({NotesAPI: {
        routeConspectus: () => new Promise(resolve => {finish = resolve;}),
        addActivity: async (id, data) => {logged = {id, data};},
    }});
    const running = ctx.AIController.generateStep(2);
    await new Promise(setImmediate);
    ctx.AppState.setNote({id: 2, revision: 1, title:'Other', blocks:[]});
    finish(result());
    await running;
    assert.equal(logged.id, 1);
    assert.match(logged.data.text, /new two/);
    assert.equal(ctx.AppState.currentNote.id, 2);
});
