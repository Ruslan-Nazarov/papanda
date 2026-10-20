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
    let explained;
    ctx.ArticleExpositionModal = {show: (source, owner) => {explained = {source, owner};}};
    doc.querySelector('.btn-explain-src').click();
    assert.equal(explained.source, block.sources[0]);
    assert.equal(explained.owner, block);

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
    assert.equal(doc.querySelectorAll('.btn-explain-src')[1].disabled, true);
    assert.equal(badge.textContent, '2');
    assert.equal(doc.querySelector('.btn-connections').getAttribute('aria-label'), 'tt_block_sources (2)');
    doc.querySelectorAll('.btn-del-src')[0].click();
    assert.equal(block.sources.length, 1);
    assert.equal(badge.textContent, '1');
    doc.querySelector('.btn-del-src').click();
    assert.equal(doc.querySelector('.sources-badge'), null);
});

test('source editing is bound to its document even when another note reuses the block ID', () => {
    const dom = new JSDOM('<body><button id="trigger">Sources</button></body>');
    const ctx = context({document: dom.window.document, window: dom.window,
        CustomEvent: dom.window.CustomEvent});
    for (const name of ['AppState', 'HtmlSafety', 'BlockMetaModalService']) load(ctx, name);
    ctx.AppState.setNote({id: 1, blocks: [{id: 'same', sources: [{title: 'First source'}]}]});
    ctx.BlockMetaModalService.showSourcesModal('same');
    const doc = dom.window.document;
    doc.querySelector('.btn-edit-src').click();
    doc.querySelector('.src-title-input').value = 'Stale change';
    const staleForm = doc.querySelector('.block-sources-form');
    ctx.AppState.setNote({id: 2, blocks: [{id: 'same', sources: [{title: 'Second source'}]}]});
    assert.equal(doc.querySelector('.block-sources-modal'), null);
    staleForm.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    assert.equal(ctx.AppState.getBlock('same').sources[0].title, 'Second source');
    assert.equal(ctx.AppState.isDirty, false);

    doc.getElementById('trigger').focus();
    ctx.BlockMetaModalService.showSourcesModal('same');
    doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    assert.equal(doc.querySelector('.block-sources-modal'), null);
    assert.equal(doc.activeElement.id, 'trigger');
    ctx.BlockMetaModalService.showSourcesModal('same');
    ctx.AppState.removeBlock('same');
    assert.equal(doc.querySelector('.block-sources-modal'), null);
});
