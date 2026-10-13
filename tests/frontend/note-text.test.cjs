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
        {id: 'one', role: 'step1', html: '<p>First</p><p><span data-type="hidden-phrase" data-hint="Explanation">Second &amp; third</span></p>'}]};
    const next = ctx.GenerationChanges.build(note, {replace_bases: ['2'], updated_steps: {
        'step2.1': {content: 'Next', generation_data: {world: {}}}}}, text => '<p>' + text + '</p>');
    ctx.AppState.setNote(next);
    const state = ctx.AIController.buildStateForAI();
    const saved = next.blocks.find(b => b.role === 'step2.1').generation_data.dependencies;
    assert.equal(state.steps.step1.content, 'First\n\nSecond & third (Explanation)');
    assert.equal(saved.step1, state.steps.step1.content);
    assert.equal(saved['step2.1'], state.steps['step2.1'].content);
    assert.equal(state.target_goal, 'Why < ?');
});

test('hidden explanations reach model context once regardless of display state', () => {
    const ctx = context();
    load(ctx, 'NoteText');
    for (const expanded of [false, true]) {
        for (const rendered of [false, true]) {
            const html = `<p><span data-type="hidden-phrase" class="hidden-phrase-mark${expanded ? ' is-expanded' : ''}" data-hint="500 Hz = 500 samples &amp; values" data-expanded="${expanded}">Sampling rate${rendered ? '<span class="hp-arrow"> ▾</span><span class="hp-content"> 💡 500 Hz = 500 samples &amp; values</span>' : ''}</span>.</p>`;
            assert.equal(ctx.NoteText.fromHtml(html), 'Sampling rate (500 Hz = 500 samples & values).');
        }
    }
    assert.equal(ctx.NoteText.fromHtml('<span class="hidden-phrase-mark" data-hint="">Keep</span>'), 'Keep');
});
