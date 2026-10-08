const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function setup(extra = {}) {
    const ctx = context({document: {dispatchEvent() {}, getElementById() {return null;}, querySelector() {return null;}}, ...extra});
    load(ctx, 'AppState');
    load(ctx, 'Lifecycle');
    load(ctx, 'RequestDocuments');
    load(ctx, 'GenerationChanges');
    load(ctx, 'AIController');
    return ctx;
}

test('document survives save snapshot and reaches full and step generation without shortening the goal', () => {
    const ctx = setup();
    const text = 'Первый пункт\n' + 'Контекст. '.repeat(4000) + '\nПоследний пункт';
    ctx.AppState.setNote({blocks: [{id: 'anchor', role: 'anchor', side: 'left', html: '<p>Создать ЭКГ</p>',
        request_document: {name: 'ТЗ.txt', text}}]});
    const state = ctx.AIController.buildStateForAI();
    assert.equal(state.target_goal, 'Создать ЭКГ');
    assert.equal(state.reference, text);
    const snapshot = JSON.parse(JSON.stringify(ctx.AppState.currentNote));
    ctx.AppState.setNote(snapshot);
    assert.equal(ctx.AIController.buildStateForAI().reference, text);
    ctx.AppState.updateBlock('anchor', {request_document: null});
    assert.equal('reference' in ctx.AIController.buildStateForAI(), false);
});

test('finishing extraction after opening another note cannot attach to that note', async () => {
    let resolve;
    const ctx = setup({NotesAPI: {extractRequestDocument: () => new Promise(done => {resolve = done;})}});
    ctx.AppState.setNote({id: 1, blocks: []});
    const pending = ctx.RequestDocuments.attach({name: 'ТЗ.txt', size: 100});
    ctx.AppState.setNote({id: 2, blocks: []});
    resolve({name: 'ТЗ.txt', text: 'Исходное задание'});
    await pending;
    assert.equal(ctx.AppState.currentNote.id, 2);
    assert.equal(ctx.AppState.currentNote.blocks.length, 0);
});

test('attaching before entering a goal creates an anchor with a separate document', async () => {
    const ctx = setup({NotesAPI: {extractRequestDocument: async () => ({name: 'ТЗ.docx', text: 'Требования'})}});
    await ctx.RequestDocuments.attach({name: 'ТЗ.docx', size: 100});
    const anchor = ctx.AppState.currentNote.blocks[0];
    assert.equal(anchor.role, 'anchor');
    assert.equal(anchor.html, '');
    assert.equal(anchor.request_document.text, 'Требования');
    assert.equal(ctx.AppState.isDirty, true);
});
