const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const snapshot = note => JSON.stringify({format: 'conspect-snapshot', version: 1, note});
const file = text => ({size: Buffer.byteLength(text), text: async () => text});
function setup() {
    const {window} = new JSDOM('', {url: 'http://localhost/'});
    const calls = [], alerts = [];
    const ctx = context({window, document: window.document, TextEncoder,
        CustomEvent: window.CustomEvent, BlockDOMParser: {syncDOMToState() {}},
        NotesAPI: {
            createNote: async data => {calls.push(['create', plain(data)]); return {...data, id: 42, revision: 1};},
            updateNote: async (id, data) => {calls.push(['save', plain(data)]); return {...data, id, revision: 2};},
            getNote: async id => {calls.push(['get', id]); return {id, revision: 1, title: 'Imported', blocks: []};},
        },
        DialogService: {confirm: async () => true, alert: async (_, message) => alerts.push(message)},
        showToast() {},
    });
    for (const name of ['AppState', 'NoteDocument', 'NoteSnapshot', 'NoteText', 'NoteExportService',
        'NoteStorageService', 'NoteImportService']) load(ctx, name);
    ctx.AppState.setNote({id: 1, revision: 1, title: 'Original', blocks: []});
    return {ctx, calls, alerts};
}

test('full Markdown and JSON snapshots round-trip every document field and omit server identity', () => {
    const {ctx} = setup();
    const note = {
        id: 17, revision: 9, category_id: 32, share_token: 'secret', is_deleted: true,
        title: 'Архив', note_notice: 'Общее замечание', status: 'ready',
        blocks: [{id: 'b1', side: 'left', title: 'Карточка',
            html: '<p>Текст <span class="math-inline" formula="x^2"></span></p>',
            sources: [{url: 'https://example.org', quote: '```json\nexample\n````'}],
            tabs: [{html: '<p>Вкладка</p>'}], shapesData: [{x: 2}],
            derivations: [{source_id: 'b2', html: '<p>Вывод</p>'}],
            stickers: [{id: 'bs', title: '', text: 'Заметка', color: '#ffe08a'}]}],
        stickers: [{id: 's1', title: 'Важно', text: 'Проверить', color: '#ffe08a'}],
        dictionary: [{word: 'x', definition: 'Число', tags: ['tag'], connection_explanations: {y: 'Связь'}}],
        dictionary_tags: [{id: 'tag', name: 'Математика', color: '#112233'}],
        math_symbols: [{symbol: 'x', definition: 'Число'}],
    };
    const expected = {...plain(ctx.NoteDocument.payload(note)), category_id: null};
    for (const text of [snapshot(note), ctx.NoteExportService.buildSnapshotMarkdown(note)]) {
        assert.deepEqual(plain(ctx.NoteSnapshot.parse(text)), expected);
    }
    assert.equal(note.category_id, 32, 'parsing does not mutate the source');
});

test('malformed, incomplete, oversized and future snapshots are rejected before any save', async () => {
    const {ctx, calls, alerts} = setup();
    for (const text of ['# plain Markdown', '{bad}', 'null', snapshot({title: 'x', blocks: {}}),
        snapshot({title: 'x', blocks: [null]}), snapshot({title: 'x', blocks: [], dictionary: {}}),
        '{"format":"conspect-snapshot","version":2,"note":{"title":"x","blocks":[]}}']) {
        await ctx.NoteImportService.importFile(file(text));
    }
    await ctx.NoteImportService.importFile({size: ctx.NoteSnapshot.MAX_BYTES + 1, text() {throw Error('must not read');}});
    assert.equal(alerts.length, 8);
    assert.equal(alerts.at(-2), 'snapshot_version');
    assert.equal(alerts.at(-1), 'snapshot_too_large');
    assert.equal(calls.length, 0);
    assert.equal(ctx.AppState.currentNote.id, 1);
    assert.throws(() => ctx.NoteSnapshot.parse('я'.repeat(ctx.NoteSnapshot.MAX_BYTES / 2 + 1)), /snapshot_too_large/);
});

test('import disconnects foreign references, preserves local derivations and leaves source untouched', () => {
    const {ctx} = setup();
    const payload = {blocks: [{id: 'b1', side: 'left',
        html: '<a href="internal://note/17/block/b2">Карточка</a><a href="&#105;nternal:&#47;&#47;note/9">Encoded</a>',
        included_conspects: [{note_id: 1, title: 'Другая база'}],
        derivations: [{source_id: 'b2', html: '<p>Вывод</p>'}]}],
        dictionary: [{word: 'x', definition: '[ссылка](internal://note/1)'}]};
    const detached = ctx.NoteSnapshot.detachReferences(payload);
    assert.doesNotMatch(JSON.stringify(detached), /internal:\/\//);
    assert.doesNotMatch(detached.blocks[0].html, /href=/);
    assert.equal(detached.dictionary[0].definition, 'ссылка');
    assert.deepEqual(plain(detached.blocks[0].included_conspects), []);
    assert.equal(detached.blocks[0].derivations[0].source_id, 'b2');
    assert.match(payload.blocks[0].html, /internal:\/\//);
});

test('import saves dirty document before creating and opening a new copy', async () => {
    const {ctx, calls, alerts} = setup();
    ctx.AppState.updateNote({title: 'Unsaved original'});
    await ctx.NoteImportService.importFile(file(snapshot({title: 'Imported', blocks: []})));
    assert.deepEqual(calls.map(call => call[0]), ['save', 'create', 'get']);
    assert.equal(calls[0][1].title, 'Unsaved original');
    assert.equal(calls[1][1].category_id, null);
    assert.equal(ctx.AppState.currentNote.id, 42);
    assert.equal(alerts.length, 0);
});

test('cancel or failed original save never creates or replaces a document', async () => {
    const {ctx, calls, alerts} = setup();
    ctx.DialogService.confirm = async () => false;
    await ctx.NoteImportService.importFile(file(snapshot({title: 'Imported', blocks: []})));
    assert.equal(calls.length, 0);
    ctx.DialogService.confirm = async () => true;
    ctx.AppState.updateNote({title: 'Keep this'});
    ctx.NotesAPI.updateNote = async () => {throw new Error('offline');};
    await ctx.NoteImportService.importFile(file(snapshot({title: 'Imported', blocks: []})));
    assert.equal(calls.length, 0);
    assert.equal(ctx.AppState.currentNote.title, 'Keep this');
    assert.equal(ctx.AppState.isDirty, true);
    assert.equal(alerts.length, 1);
});

test('import protects navigation during confirmation and creation, and rejects parallel imports', async () => {
    const {ctx, calls} = setup();
    ctx.DialogService.confirm = async () => {
        ctx.AppState.setNote({id: 2, title: 'Navigated', blocks: []});
        return true;
    };
    const input = file(snapshot({title: 'Imported', blocks: []}));
    await ctx.NoteImportService.importFile(input);
    assert.equal(calls.length, 0);
    ctx.DialogService.confirm = async () => true;
    let finish;
    ctx.NotesAPI.createNote = () => new Promise(resolve => {finish = resolve;});
    const pending = ctx.NoteImportService.importFile(input);
    await new Promise(resolve => setImmediate(resolve));
    assert(finish);
    await ctx.NoteImportService.importFile(input);
    ctx.AppState.setNote({id: 3, title: 'Latest', blocks: []});
    finish({id: 42, revision: 1});
    await pending;
    assert.equal(calls.length, 0, 'no fetch that would replace the new document');
    assert.equal(ctx.AppState.currentNote.id, 3);
    assert.equal(ctx.NoteImportService.busy, false);
});
