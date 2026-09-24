const {test} = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function beginSave() {
    let resolve;
    const ctx = context({BlockDOMParser: {syncDOMToState() {}}, NotesAPI: {
        updateNote: () => new Promise(done => {resolve = done;}),
    }});
    load(ctx, 'AppState');
    load(ctx, 'NoteStorageService');
    ctx.AppState.setNote({id: 1, title: 'old', blocks: []});
    ctx.AppState.isDirty = true;
    const pending = ctx.NoteStorageService.saveCurrentNote();
    return {ctx, pending, resolve};
}

test('save response must preserve edits made while request is pending',
    {todo: 'F02 / R1: save replaces the current state'}, async () => {
        const {ctx, pending, resolve} = beginSave();
        ctx.AppState.currentNote.title = 'new edit';
        ctx.AppState.isDirty = true;
        resolve({id: 1, title: 'old', blocks: []});
        await pending;
        assert.equal(ctx.AppState.currentNote.title, 'new edit');
        assert.equal(ctx.AppState.isDirty, true);
    });

test('late save response must not navigate back to the previous note',
    {todo: 'F02 / R1: late save switches the active note'}, async () => {
        const {ctx, pending, resolve} = beginSave();
        ctx.AppState.setNote({id: 2, title: 'another note', blocks: []});
        resolve({id: 1, title: 'old', blocks: []});
        await pending;
        assert.equal(ctx.AppState.currentNote.id, 2);
    });
