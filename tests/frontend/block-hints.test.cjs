const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
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

test('a divider below a visible block inserts the new block below it when the anchor is stored first', () => {
    const document = new JSDOM('<div id="blocks-container"></div>').window.document;
    const ctx = context({document, CustomEvent: document.defaultView.CustomEvent,
        BlockHintBuilder: {pendingAnchor() {return null;}},
        BlockNormalBuilder: {build(block) {
            const el = document.createElement('div');
            el.className = 'dialectics-block';
            el.dataset.id = block.id;
            return el;
        }},
        RequestDocuments: {mount() {}}});
    load(ctx, 'AppState');
    load(ctx, 'BlockDOMRenderer');
    ctx.AppState.mode = 'ai';
    ctx.AppState.setNote({blocks: [anchor,
        {id: 'section', role: 'section', side: 'center'},
        {id: 'step2', role: 'step2', side: 'right', html: 'Existing block'}]});

    ctx.BlockDOMRenderer.renderAll();
    const divider = document.querySelector('[data-id="step2"] + .block-divider');
    assert.equal(divider.dataset.index, '3');
    ctx.AppState.addBlock({id: 'new', side: 'right', title: 'New block'}, Number(divider.dataset.index));
    ctx.BlockDOMRenderer.renderAll();

    const visibleIds = [...document.querySelectorAll('.dialectics-block')].map(el => el.dataset.id);
    assert.deepEqual(visibleIds, ['section', 'step2', 'new', 'a']);
});
