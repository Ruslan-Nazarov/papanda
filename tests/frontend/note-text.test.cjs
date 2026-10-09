const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

test('model context retains paragraphs, entities and original formula without KaTeX duplication', () => {
    const ctx = context();
    load(ctx, 'NoteText');
    const text = ctx.NoteText.fromHtml('<p>A &lt; B &amp; C</p><p>Then<br>next</p>' +
        '<p><span formula="x &lt; y"><span>duplicate visual</span><math>duplicate MathML</math></span></p>');
    assert.equal(text, 'A < B & C\n\nThen\nnext\n\n$x < y$');
});

test('engine dependencies and next request use exactly the same readable text', () => {
    const ctx = context({ALGORITHM_STEPS: []});
    for (const name of ['AppState', 'GenerationChanges', 'AIController']) load(ctx, name);
    const note = {title: 'Test', blocks: [{id: 'a', role: 'anchor', html: '<p>Why &lt; ?</p>'},
        {id: 'one', role: 'step1', html: '<p>First</p><p>Second &amp; third</p>'}]};
    const next = ctx.GenerationChanges.build(note, {replace_bases: ['2'], updated_steps: {
        'step2.1': {content: 'Next', generation_data: {world: {}}}}}, text => '<p>' + text + '</p>');
    ctx.AppState.setNote(next);
    const state = ctx.AIController.buildStateForAI();
    const saved = next.blocks.find(b => b.role === 'step2.1').generation_data.dependencies;
    assert.equal(state.steps.step1.content, 'First\n\nSecond & third');
    assert.equal(saved.step1, state.steps.step1.content);
    assert.equal(saved['step2.1'], state.steps['step2.1'].content);
    assert.equal(state.target_goal, 'Why < ?');
});
