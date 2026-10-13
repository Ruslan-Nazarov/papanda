const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function setup() {
    const records = [], notices = [];
    const ctx = context({FormData, NotesAPI: {addActivity: async (id, data) => records.push({id, data})},
        NoteStorageService: {saveCurrentNote: async () => ({id:7})}, showToast: text => notices.push(text)});
    load(ctx, 'AIDiary');
    ctx.AIDiary.init();
    return {ctx, records, notices};
}

test('editor AI requests and streamed answers are saved in the diary', async () => {
    const {ctx, records} = setup();
    const answer = await ctx.NotesAPI.captureAI('/ai/dialectics/explain/stream', {text:'Original selection'}, async () => 'Explanation');
    assert.equal(answer, 'Explanation');
    assert.equal(records[0].id, 7);
    assert.match(records[0].data.request, /Original selection/);
    assert.equal(records[0].data.text, 'Explanation');
    assert.equal(records[0].data.status, 'completed');
    assert.match(records[0].data.started_at, /Z$/);
    assert(records[0].data.duration_ms >= 0);
});

function viewSetup(getActivity = async () => []) {
    const {JSDOM} = require('jsdom');
    const document = new JSDOM('<html lang="ru"><body><button id="opener">Diary</button></body></html>').window.document;
    document.querySelector('button').focus();
    const ctx = context({document, AppState: {currentNote: {id: 7, title: 'My note'}, documentEpoch: 1},
        NotesAPI: {getActivity}, showToast() {}});
    for (const name of ['HtmlSafety', 'Lifecycle', 'AIDiaryView', 'AIDiary']) load(ctx, name);
    return ctx;
}

test('diary loads only the current note and renders unsafe text inertly', async () => {
    const requested = [];
    const ctx = viewSetup(async id => {
        requested.push(id);
        return [{id: 1, note_id: 7, kind: 'ai_request', created_at: '2026-10-09T03:51:26+00:00',
            data: {request: '<img src=x onerror=alert(1)>', text: 'Visible answer', status: 'completed'}},
        {id: 2, note_id: 99, kind: 'ai_request', data: {request: 'Other note'}}];
    });
    await ctx.AIDiary.open();
    assert.deepEqual(requested, [7]);
    assert.match(ctx.document.querySelector('#ai-diary-note').textContent, /My note/);
    assert.equal(ctx.document.querySelectorAll('.ai-diary-entry').length, 1);
    assert.equal(ctx.document.querySelectorAll('.ai-diary-entry img').length, 0);
    assert(!ctx.document.body.textContent.includes('Other note'));
    ctx.AIDiary.session.dispose();
});

test('diary presents structured requests as readable fields with collapsible context', async () => {
    const request = JSON.stringify({text: 'ЭКГ', context_before: 'Как изучают сердце',
        context_after: '<img src=x onerror=alert(1)>', history: []});
    const ctx = viewSetup(async () => [{id: 3, note_id: 7, kind: 'ai_request',
        created_at: '2026-10-09T03:51:26+00:00', data: {request, text: 'Объяснение'}}]);
    await ctx.AIDiary.open();
    const entry = ctx.document.querySelector('.ai-diary-entry');
    assert.equal(entry.querySelector('.ai-diary-preview').textContent, 'ЭКГ');
    assert.equal(entry.querySelector('.ai-diary-request-field.is-primary .ai-diary-field-value').textContent, 'ЭКГ');
    assert.equal(entry.querySelectorAll('details.ai-diary-request-field').length, 2);
    assert.equal(entry.querySelectorAll('.ai-diary-request-field').length, 3);
    assert.equal(entry.querySelectorAll('.ai-diary-request-field[open]').length, 0);
    assert.equal(entry.querySelectorAll('img').length, 0);
    assert(!entry.querySelector('.ai-diary-entry-body').textContent.includes('"context_before"'));
    ctx.AIDiary.session.dispose();
});

test('opening an unsaved note diary does not create a note or fetch other history', async () => {
    const ctx = viewSetup(async () => {throw new Error('Must not fetch');});
    ctx.AppState.currentNote = {id: null, title: 'New'};
    await ctx.AIDiary.open();
    assert.match(ctx.document.body.textContent, /ai_diary_empty/);
    ctx.AIDiary.session.dispose();
});

test('late diary responses cannot reappear after navigation or replace a newer view', async () => {
    let finish;
    const ctx = viewSetup(() => new Promise(resolve => {finish = resolve;}));
    const opening = ctx.AIDiary.open();
    ctx.AppState.documentEpoch++;
    ctx.document.dispatchEvent(new ctx.document.defaultView.Event('noteOpened'));
    finish([{id: 1, note_id: 7, kind: 'ai_request', data: {text: 'Old answer'}}]);
    await opening;
    assert.equal(ctx.document.querySelector('.ai-diary-overlay'), null);
});

test('legacy naive times are UTC; explicit offsets are preserved', () => {
    const ctx = viewSetup();
    assert.equal(ctx.AIDiaryView.date('2026-10-09T03:51:26').toISOString(), '2026-10-09T03:51:26.000Z');
    assert.equal(ctx.AIDiaryView.date('2026-10-09T08:51:26+05:00').toISOString(), '2026-10-09T03:51:26.000Z');
    assert.equal(ctx.AIDiaryView.date('broken'), null);
});

test('uploaded request records filename and preserves the readable response', async () => {
    const {ctx, records} = setup();
    const form = new FormData();
    form.append('file', new Blob(['image bytes']), 'formula.png');
    const response = await ctx.NotesAPI.captureAI('/api/ai/dialectics/formula/ocr', form,
        async () => new Response(JSON.stringify({result:'x = 1'})));
    assert.deepEqual(await response.json(), {result:'x = 1'});
    assert.match(records[0].data.request, /formula.png/);
    assert.match(records[0].data.text, /x = 1/);
});

test('interrupted stream preserves partial answer and reports failure', async () => {
    const {ctx, records} = setup();
    await assert.rejects(ctx.NotesAPI.captureAI('/ai/dialectics/check/stream', {text:'Q'},
        async () => {throw Object.assign(new Error('Interrupted'), {partialText:'Partial answer'});}), /Interrupted/);
    assert.equal(records[0].data.status, 'failed');
    assert.match(records[0].data.text, /Partial answer/);
});

test('diary save failure shows a notice without losing the AI answer', async () => {
    const {ctx, notices} = setup();
    ctx.console = {error() {}};
    ctx.NotesAPI.addActivity = async () => {throw new Error('Offline');};
    assert.equal(await ctx.NotesAPI.captureAI('/ai/dialectics/text-math', {text:'Q'}, async () => 'Answer'), 'Answer');
    assert.deepEqual(notices, ['ai_diary_save_failed']);
});
