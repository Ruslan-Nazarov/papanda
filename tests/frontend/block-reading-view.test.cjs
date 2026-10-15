const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('reading view centers one block temporarily and survives a canvas render', () => {
    const {window} = new JSDOM('<!doctype html><div id="blocks-container"></div>');
    const note = {dictionary: []};
    let updates = 0;
    const ctx = context({window, document: window.document,
        AppState: {currentNote: note, updateBlock() {updates++;}},
        ALGORITHM_STEPS: [], ALGORITHM_TEXTS: {},
        HtmlSafety: {escape: value => value, rich: value => value},
        BlockCodeRenderer: {render() {}}, BlockMathRenderer: {renderMath() {}},
        BlockStickersManager: {_updateBadge() {}}, showToast() {},
    });
    load(ctx, 'BlockNormalBuilder');
    const canvas = window.document.getElementById('blocks-container');
    const right = {id: 'right', side: 'right', title: 'Long block', html: '<p>Text</p>', collapsed: true};
    const left = {id: 'left', side: 'left', title: 'Other block', html: '<p>Other</p>'};
    const build = block => {
        const el = ctx.BlockNormalBuilder.build(block);
        el.scrollIntoView = () => {};
        return el;
    };
    const first = build(right);
    const second = build(left);
    canvas.append(first, second);

    first.querySelector('.btn-reading-view').click();
    assert(first.classList.contains('reading-centered'));
    assert.equal(first.querySelector('.btn-reading-view').getAttribute('aria-pressed'), 'true');
    assert.equal(updates, 0);
    assert.equal(right.collapsed, true);

    canvas.replaceChild(build(right), first);
    const rerendered = canvas.querySelector('[data-id="right"]');
    assert(rerendered.classList.contains('reading-centered'));
    second.querySelector('.btn-reading-view').click();
    assert(!rerendered.classList.contains('reading-centered'));
    assert(second.classList.contains('reading-centered'));
    second.querySelector('.btn-reading-view').click();
    assert(!second.classList.contains('reading-centered'));
    assert.equal(updates, 0);

    ctx.AppState.currentNote = {dictionary: []};
    assert(!build(right).classList.contains('reading-centered'));
});
