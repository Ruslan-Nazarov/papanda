const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('section uses the ordinary block palette and restores its chosen accent', () => {
    const dom = new JSDOM('<div id="blocks-container"></div>');
    const document = dom.window.document;
    const block = {id: 'section-1', role: 'section', title: 'Раздел', border_color: '#ef4444'};
    const ctx = context({document, window: dom.window, AppState: {
        updateBlock(id, patch) { assert.equal(id, block.id); Object.assign(block, patch); }
    }, BlockMathRenderer: {renderMath() {}}, t: key => key,
    Lifecycle: class {
        own() {}
        on() {}
        timeout() {}
        dispose() { document.getElementById('block-color-picker-popover')?.remove(); }
    }, showToast() {}});
    load(ctx, 'BlockColorPicker');
    load(ctx, 'BlockNormalBuilder');

    const section = ctx.BlockNormalBuilder.build(block);
    document.getElementById('blocks-container').append(section);
    assert(section.querySelector('.btn-color'), 'Section must expose the palette button');
    assert.equal(section.style.getPropertyValue('--section-accent'), '#ef4444');
    assert.equal(section.style.borderLeftColor, '');

    section.querySelector('.btn-color').click();
    document.querySelector('.color-dot-btn[data-color="#10b981"]').click();
    assert.equal(block.border_color, '#10b981');
    assert.equal(section.style.getPropertyValue('--section-accent'), '#10b981');

    const reopened = ctx.BlockNormalBuilder.build(block);
    assert.equal(reopened.style.getPropertyValue('--section-accent'), '#10b981');
});
