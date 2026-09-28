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
