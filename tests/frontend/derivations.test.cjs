const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

test('removing a source cleans only its derivations and preserves other pairs', () => {
    const ctx = context();
    load(ctx, 'AppState');
    ctx.AppState.setNote({blocks: [
        {id: 'a', side: 'left'}, {id: 'b', side: 'left'},
        {id: 'c', side: 'right', derivations: [{source_id: 'a', html: '<p>A</p>'}, {source_id: 'b', html: '<p>B</p>'}]},
    ]});
    ctx.AppState.removeBlock('a');
    assert.equal(ctx.AppState.getBlock('a'), undefined);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.AppState.getBlock('c').derivations)), [{source_id: 'b', html: '<p>B</p>'}]);
    assert.equal(ctx.AppState.isDirty, true);
    ctx.AppState.removeBlock('c');
    assert.equal(ctx.AppState.getBlock('b').id, 'b');
});
