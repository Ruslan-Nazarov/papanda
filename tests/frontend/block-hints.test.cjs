const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function next(blocks) {
    const ctx = context({BlockHintBuilder: {pendingAnchor() {return null;}}});
    load(ctx, 'AppState');
    load(ctx, 'BlockDOMRenderer');
    return ctx.BlockDOMRenderer.getNextActiveRole(blocks.map((block, i) => ({id: 'b' + i, ...block})))?.role;
}

const anchor = {id: 'a', role: 'anchor', html: 'Question', status: 'ready'};

test('an applied AI draft replaces its hint, including after reopening', () => {
    assert.equal(next([anchor, {role: 'step1', html: '<p>Generated</p>',
        status: 'in_progress', isDraft: false}]), 'step2');
});

test('a saved substep occupies the base step', () => {
    assert.equal(next([anchor, {role: 'step1.1', html: 'Generated', status: 'in_progress'}]), 'step2');
});

test('empty content and unsaved drafts retain the hint', () => {
    for (const block of [{html: '<p><br></p>'}, {html: '<p>&nbsp;</p>'},
        {html: 'Editing', isDraft: true}]) {
        assert.equal(next([anchor, {role: 'step1', status: 'in_progress', ...block}]), 'step1');
    }
});
