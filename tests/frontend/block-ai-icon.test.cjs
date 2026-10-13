const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('AI icon fills only the clicked block, regardless of its internal role', async () => {
    const {window} = new JSDOM('<!doctype html><html><body></body></html>');
    const filledIds = [];
    const ctx = context({window, document: window.document,
        AppState: {currentNote: {dictionary: []}}, ALGORITHM_STEPS: [], ALGORITHM_TEXTS: {},
        HtmlSafety: {escape: value => value, rich: value => value},
        BlockCodeRenderer: {render() {}}, BlockMathRenderer: {renderMath() {}},
        BlockStickersManager: {_updateBadge() {}},
        AIController: {
            generateBlock: async id => {filledIds.push(id); return {content: 'Filled'};},
            generateStep: () => {throw new Error('The icon must not generate a group of blocks');},
        },
        showToast() {},
    });
    load(ctx, 'BlockNormalBuilder');
    const block = ctx.BlockNormalBuilder.build({id: 'custom', title: 'Signal', html: '<p>Text</p>'});
    const labeled = ctx.BlockNormalBuilder.build({id: 'labeled', role: 'step4.1', title: 'Wave', html: '<p>Text</p>'});
    const section = ctx.BlockNormalBuilder.build({id: 'section', role: 'section', title: 'Part'});
    const icon = block.querySelector('.btn-autofill-ai');
    const labeledIcon = labeled.querySelector('.btn-autofill-ai');
    assert.equal(icon.textContent.trim(), '✦');
    assert.equal(labeledIcon.textContent.trim(), '✦');
    assert.equal(section.querySelector('.btn-autofill-ai'), null);
    icon.click();
    labeledIcon.click();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(filledIds, ['custom', 'labeled']);
});
