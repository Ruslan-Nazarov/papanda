const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

function setup() {
    const {window} = new JSDOM('<!doctype html><body></body>');
    const ctx = context({window, document: window.document, CustomEvent: window.CustomEvent,
        DOMPurify: require('dompurify')(window),
        navigator: {clipboard: {writeText: async text => {ctx.copied = text;}}},
        ALGORITHM_STEPS: [], ALGORITHM_TEXTS: {},
        BlockCodeRenderer: {render() {}}, BlockMathRenderer: {renderMath() {}}, showToast() {},
    });
    load(ctx, 'AppState');
    load(ctx, 'HtmlSafety');
    load(ctx, 'BlockStickersManager');
    load(ctx, 'BlockNormalBuilder');
    ctx.AppState.setNote({id: 1, blocks: [
        {id: 'one', title: 'First', html: '<p>Before <em>selected &lt;text&gt;</em> after.</p>'},
        {id: 'two', title: 'Second', html: '<p>Other block</p>'},
    ]});
    for (const block of ctx.AppState.currentNote.blocks) {
        window.document.body.append(ctx.BlockNormalBuilder.build(block));
    }
    const first = window.document.getElementById('one');
    const second = window.document.getElementById('two');
    const select = (start, end = start, startOffset = 0, endOffset = end.textContent.length) => {
        const range = window.document.createRange();
        range.setStart(start, startOffset);
        range.setEnd(end, endOffset);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    };
    return {ctx, window, first, second, select};
}

test('block selection becomes a quote, saves with a comment, and survives editing and copying', async () => {
    const {ctx, window, first, select} = setup();
    select(first.querySelector('em').firstChild);
    const button = first.querySelector('.btn-sticker');
    const down = new window.MouseEvent('mousedown', {button: 0, cancelable: true});
    button.dispatchEvent(down);
    assert(down.defaultPrevented);
    button.click();
    assert.equal(first.querySelector('.sticker-panel-quote').textContent, 'selected <text>');
    assert.equal(first.querySelector('.sticker-panel-quote').hidden, false);
    assert.equal(window.document.activeElement, first.querySelector('.sticker-panel-text-input'));
    assert.equal(window.getSelection().toString(), '');
    first.querySelector('.sticker-panel-text-input').value = 'My comment';
    first.querySelector('.sticker-add-btn').click();
    const saved = ctx.AppState.getBlock('one').stickers[0];
    assert.equal(saved.text, '> selected <text>\n\nMy comment');
    assert.equal(first.querySelector('.sticker-card blockquote').textContent, 'selected <text>');
    assert.equal(first.querySelector('.sticker-card-text').textContent, 'My comment');
    assert.equal(first.querySelector('.sticker-card text'), null);
    assert.equal(first.querySelector('.sticker-badge').textContent, '1');
    first.querySelector('.sticker-edit-btn').click();
    assert.equal(first.querySelector('.sticker-panel-quote').textContent, 'selected <text>');
    assert.equal(first.querySelector('.sticker-panel-text-input').value, 'My comment');
    first.querySelector('.sticker-panel-text-input').value = 'Revised';
    first.querySelector('.sticker-add-btn').click();
    assert.equal(ctx.AppState.getBlock('one').stickers[0].id, saved.id);
    assert.equal(ctx.AppState.getBlock('one').stickers[0].text, '> selected <text>\n\nRevised');
    first.querySelector('.sticker-copy-btn').click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ctx.copied, '> selected <text>\n\nRevised');
});

test('no selection retains the normal form and toggle; another block selection is ignored', () => {
    const {ctx, first, second, select} = setup();
    const button = first.querySelector('.btn-sticker');
    select(second.querySelector('p').firstChild);
    button.click();
    assert.equal(first.querySelector('.sticker-panel-quote').hidden, true);
    assert.equal(first.querySelector('.sticker-panel-text-input').value, '');
    first.querySelector('.sticker-panel-text-input').value = 'Ordinary sticker';
    first.querySelector('.sticker-add-btn').click();
    assert.equal(ctx.AppState.getBlock('one').stickers[0].text, 'Ordinary sticker');
    assert.equal(first.querySelector('.sticker-card blockquote'), null);
    button.click();
    assert.equal(first.querySelector('.sticker-panel'), null);
    button.click();
    assert.equal(first.querySelector('.sticker-panel-quote').hidden, true);
});

test('multiline quotes, title selections and an already open panel are supported', () => {
    const {ctx, first, second, select} = setup();
    const button = first.querySelector('.btn-sticker');
    button.click();
    const content = first.querySelector('.block-content');
    content.textContent = 'First line\n\nLast line';
    select(content.firstChild);
    button.click();
    assert.equal(first.querySelectorAll('.sticker-panel').length, 1);
    assert.equal(first.querySelector('.sticker-panel-quote').textContent, 'First line\n\nLast line');
    first.querySelector('.sticker-add-btn').click();
    assert.equal(ctx.AppState.getBlock('one').stickers[0].text, '> First line\n> \n> Last line');
    first.querySelector('.sticker-edit-btn').click();
    assert.equal(first.querySelector('.sticker-panel-quote').textContent, 'First line\n\nLast line');
    first.querySelector('.sticker-cancel-btn').click();
    assert.equal(first.querySelector('.sticker-panel-quote').hidden, true);
    select(first.querySelector('.block-title').firstChild);
    button.click();
    assert.equal(first.querySelector('.sticker-panel-quote').textContent, 'First');
    select(content.firstChild, second.querySelector('p').firstChild);
    assert.equal(ctx.BlockStickersManager._selectedBlockText(first), '');
});
