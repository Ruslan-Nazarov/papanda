const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('block sources separate viewing, adding and editing while keeping the badge current', () => {
    const dom = new JSDOM('<html><body><div class="dialectics-block" data-id="b1"><button class="btn-connections">🔗<span class="sources-badge">1</span></button></div></body></html>');
    const block = {id: 'b1', sources: [{url: 'https://example.com', title: 'Original', quote: 'Old note'}]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {getBlock: () => block, updateBlock: (_id, patch) => Object.assign(block, patch)}});
    load(ctx, 'HtmlSafety');
    load(ctx, 'BlockMetaModalService');
    ctx.BlockMetaModalService.showSourcesModal('b1');
    const doc = dom.window.document;
    const form = doc.querySelector('.block-sources-form');
    const badge = doc.querySelector('.sources-badge');
    assert.equal(form.hidden, true);
    assert.equal(doc.querySelector('.block-source-card strong').textContent, 'Original');

    doc.querySelector('.btn-edit-src').click();
    assert.equal(form.hidden, false);
    assert.equal(doc.querySelector('.sources-list-container').hidden, true);
    assert.equal(doc.querySelector('.src-title-input').value, 'Original');
    doc.querySelector('.src-title-input').value = 'Updated';
    form.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    assert.equal(block.sources.length, 1);
    assert.equal(block.sources[0].title, 'Updated');
    assert.equal(form.hidden, true);
    assert.equal(badge.textContent, '1');

    doc.querySelector('.btn-new-src').click();
    doc.querySelector('.src-title-input').value = 'Second';
    form.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    assert.equal(block.sources.length, 2);
    assert.equal(badge.textContent, '2');
    assert.equal(doc.querySelector('.btn-connections').getAttribute('aria-label'), 'tt_block_sources (2)');
    doc.querySelectorAll('.btn-del-src')[0].click();
    assert.equal(block.sources.length, 1);
    assert.equal(badge.textContent, '1');
    doc.querySelector('.btn-del-src').click();
    assert.equal(doc.querySelector('.sources-badge'), null);
});
