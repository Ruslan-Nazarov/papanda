const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

test('context receives detached past versions without changing current text or undo position', () => {
    const ctx = context();
    load(ctx, 'AppState');
    ctx.AppState.setNote({blocks: [{id: 'b', html: 'old'}]});
    ctx.AppState.updateBlock('b', {html: 'new'});
    const versions = ctx.AppState.previousBlockVersions('b');
    assert.equal(versions[0].html, 'old');
    versions[0].html = 'mutated';
    assert.equal(ctx.AppState.previousBlockVersions('b')[0].html, 'old');
    assert.equal(ctx.AppState.getBlock('b').html, 'new');
    assert.equal(ctx.AppState.blockHistory('b').undo, 1);
});

function store() {
    const ctx = context();
    load(ctx, 'AppState');
    const state = new ctx.NoteStore();
    state.open({id: 1, blocks: [{id: 'a', html: '<p>0</p>', title: 'Original'}, {id: 'b', html: 'Other'}]});
    return state;
}
const block = (state, id = 'a') => state.note.blocks.find(item => item.id === id);
const plain = value => JSON.parse(JSON.stringify(value));

test('each block retains five previous versions and can move backwards and forwards', () => {
    const state = store();
    for (let i = 1; i <= 8; i++) state.updateBlock('a', {html: `<p>${i}</p>`});
    assert.deepEqual(plain(state.blockHistory('a')), {undo: 5, redo: 0, position: 6, total: 6});
    for (let i = 7; i >= 3; i--) {
        assert.equal(state.restoreBlockVersion('a', 'undo'), true);
        assert.equal(block(state).html, `<p>${i}</p>`);
    }
    assert.equal(state.restoreBlockVersion('a', 'undo'), false);
    assert.equal(block(state, 'b').html, 'Other');
    for (let i = 4; i <= 8; i++) {
        assert.equal(state.restoreBlockVersion('a', 'redo'), true);
        assert.equal(block(state).html, `<p>${i}</p>`);
    }
    assert.equal(state.restoreBlockVersion('a', 'redo'), false);
    assert.equal(state.restoreBlockVersion('missing', 'undo'), false);
    assert.equal(state.restoreBlockVersion('a', 'invalid'), false);
});

test('restoration keeps block identity and layout, removes absent content fields, and starts a new branch on edit', () => {
    const state = store();
    const original = block(state);
    state.updateBlock('a', {html: '<p>New</p>', title: 'New title', tags: 'tag',
        shapesData: {objects: [{type: 'circle'}]}, math_symbols: [{symbol: 'x', definition: 'Value'}], author: 'ai'});
    state.updateBlock('a', {collapsed: true, is_pinned: true, side: 'right', status: 'ready', border_color: '#123456',
        rejected_drafts: [{html: '<p>Keep archive</p>'}]});
    state.updateBlock('a', {html: '<p>New</p>'});
    assert.equal(state.blockHistory('a').undo, 1);
    const revision = state.editRevision;
    state.restoreBlockVersion('a', 'undo');
    assert.equal(state.editRevision, revision + 1);
    assert.equal(state.dirty, true);
    assert.equal(block(state), original);
    assert.equal(original.title, 'Original');
    for (const field of ['tags', 'shapesData', 'math_symbols', 'author']) assert.equal(original[field], undefined);
    assert.equal(original.collapsed && original.is_pinned && original.status === 'ready', true);
    assert.equal(original.side, 'right');
    assert.equal(original.rejected_drafts.length, 1);
    state.restoreBlockVersion('a', 'redo');
    assert.equal(original.shapesData.objects[0].type, 'circle');
    assert.equal(original.math_symbols[0].symbol, 'x');
    state.restoreBlockVersion('a', 'undo');
    state.updateBlock('a', {html: '<p>Different edit</p>'});
    assert.equal(state.blockHistory('a').redo, 0);
    assert.equal(state.restoreBlockVersion('a', 'redo'), false);
});

test('bulk AI replacements record versions by block id; reordering and note metadata do not', () => {
    const state = store();
    state.update({blocks: [...state.note.blocks].reverse()});
    state.update({title: 'Note title', dictionary: [{word: 'word', definition: 'meaning'}]});
    assert.equal(state.blockHistory('a').undo, 0);
    state.update({blocks: state.note.blocks.map(item => ({...item, html: item.id === 'a' ? '<p>AI result</p>' : item.html}))});
    assert.equal(state.blockHistory('a').undo, 1);
    assert.equal(state.blockHistory('b').undo, 0);
    state.restoreBlockVersion('a', 'undo');
    assert.equal(block(state).html, '<p>0</p>');
    assert.equal(state.note.blocks[0].id, 'b');
});

test('bulk updates retain live block views for existing reading controls', () => {
    const state = store();
    const first = block(state);
    const second = block(state, 'b');
    state.update({blocks: [...state.note.blocks].reverse().map(item => ({...item,
        ...(item.id === 'a' ? {title: 'Changed', status: 'ready'} : {})}))});
    assert.equal(block(state), first);
    assert.equal(block(state, 'b'), second);
    assert.equal(first.title, 'Changed');
    assert.equal(first.status, 'ready');
    assert.equal(state.blockHistory('a').undo, 1);
    state.updateBlock('a', {status: 'in_progress'});
    assert.equal(first.status, 'in_progress');
    state.update({blocks: [{id: 'a', html: 'Replacement'}]});
    assert.equal(block(state), first);
    assert.equal(first.title, undefined, 'a replacement must remove fields absent from the new block');
    assert.equal(first.html, 'Replacement');
});

test('autosaves retain history without serializing it; reopening and deleting clear it', () => {
    const state = store();
    state.updateBlock('a', {html: '<p>Saved</p>'});
    const note = state.note;
    const saved = plain(note);
    assert.equal(JSON.stringify(saved).includes('past'), false);
    assert.equal(JSON.stringify(saved).includes('blockHistory'), false);
    state.acceptSaved(note, {content_json: saved.blocks}, {blocks: saved.blocks});
    assert.equal(state.dirty, false);
    assert.equal(state.blockHistory('a').undo, 1);
    state.restoreBlockVersion('a', 'undo');
    assert.equal(state.dirty, true);
    state.open(saved);
    assert.equal(block(state).html, '<p>Saved</p>');
    assert.equal(state.blockHistory('a').undo + state.blockHistory('a').redo, 0);
    state.updateBlock('a', {html: 'Another'});
    state.removeBlock('a');
    assert.equal(state.blockHistory('a').undo, 0);
    state.addBlock({id: 'a', html: 'Reused id'});
    assert.equal(state.restoreBlockVersion('a', 'undo'), false);
    state.updateBlock('a', {html: 'Edited'});
    state.open({id: 2, blocks: [{id: 'a', html: 'Different note'}]});
    assert.equal(state.restoreBlockVersion('a', 'undo'), false);
    // A late save response from the old document cannot reset the new history.
    state.updateBlock('a', {html: 'Different edit'});
    state.acceptSaved(note, {content_json: saved.blocks}, {blocks: saved.blocks});
    assert.equal(state.blockHistory('a').undo, 1);
    assert.equal(block(state).html, 'Different edit');
});
