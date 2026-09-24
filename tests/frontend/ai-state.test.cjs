const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function setup() {
    const ctx = context({ALGORITHM_STEPS: []});
    load(ctx, 'AppState');
    load(ctx, 'GenerationChanges');
    load(ctx, 'AIController');
    ctx.AppState.setNote({id: 1, blocks: [{id: 'one', role: 'step1', html: 'old', status: 'ready'}]});
    return ctx;
}

test('regenerating an existing block marks edits dirty and normalizes legacy draft', () => {
    const {AppState, AIController} = setup();
    let renders = 0;
    AIController.processUpdatedSteps({step1: {content: 'new', status: 'draft'}}, () => renders++);
    assert.equal(AppState.getBlock('one').html, '<p>new</p>');
    assert.equal(AppState.getBlock('one').status, 'in_progress');
    assert.equal(AppState.isDirty, true);
    assert.equal(AppState.editRevision, 1);
    assert.equal(renders, 1);
});

test('invalidation alone marks the document dirty', () => {
    const {AppState, AIController} = setup();
    AIController.processUpdatedSteps({step1: {status: 'invalidated'}});
    assert.equal(AppState.currentNote.blocks.length, 0);
    assert.equal(AppState.isDirty, true);
});

test('loading an old draft block makes it editable with a persistable status', () => {
    const {AppState} = setup();
    AppState.setNote({id: 1, content_json: [{id: 'legacy', status: 'draft'}]});
    assert.equal(AppState.getBlock('legacy').status, 'in_progress');
    assert.equal(AppState.isDirty, false);
});
