const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

const tick = () => new Promise(resolve => setTimeout(resolve, 150));
const until = async predicate => {
    const deadline = Date.now() + 5000;
    while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert(predicate(), 'the dialog must finish rendering within five seconds');
};

function setup(stream) {
    const dom = new JSDOM('<!doctype html><html><body><div class="modal-overlay"><button id="source">Source</button></div></body></html>');
    const ctx = context({document: dom.window.document, window: dom.window,
        NotesAPI: {stream}, AppState: {currentNote: {title: 'Note'}},
        navigator: {clipboard: {writeText: async text => {ctx.copied = text;}}}});
    load(ctx, 'HtmlSafety');
    load(ctx, 'StreamMarkdownRenderer');
    load(ctx, 'ArticleExpositionModal');
    dom.window.document.getElementById('source').focus();
    return {ctx, doc: dom.window.document, dom};
}

test('article dialog streams sanitized Markdown, reports scope and copies the complete answer', async () => {
    let sent;
    const {ctx, doc} = setup(async (url, payload, delta, event, options) => {
        sent = {url, payload, options};
        event({type: 'status', status: 'article_loaded', source_scope: 'excerpt'});
        delta('Answer', '**Answer**<img src=x onerror="evil()"><script>evil()</script>');
        return '**Answer**<img src=x onerror="evil()"><script>evil()</script>';
    });
    ctx.ArticleExpositionModal.show({title: '<unsafe>', url: 'javascript:evil()', quote: 'Excerpt'}, {title: 'Block'});
    assert.equal(doc.querySelector('.article-exposition-source strong').textContent, '<unsafe>');
    assert.equal(doc.querySelector('.article-exposition-source a'), null);
    await until(() => !doc.querySelector('.article-exposition-copy').disabled);
    assert.equal(sent.url, '/ai/dialectics/explain-article/stream');
    assert.equal(sent.payload.quote, 'Excerpt');
    assert.equal(sent.payload.note_title, 'Note');
    assert.equal(doc.querySelector('.article-exposition-status').textContent, 'article_exposition_excerpt');
    assert.equal(doc.querySelector('.article-exposition-answer strong').textContent, 'Answer');
    assert.equal(doc.querySelector('.article-exposition-answer script'), null);
    assert.equal(doc.querySelector('.article-exposition-answer [onerror]'), null);
    assert.equal(doc.querySelector('.article-exposition-copy').disabled, false);
    doc.querySelector('.article-exposition-copy').click();
    await tick();
    assert(ctx.copied.includes('**Answer**'));
    doc.querySelector('.article-exposition-close').click();
    assert.equal(sent.options.signal.aborted, true);
    assert.equal(doc.activeElement.id, 'source');
    assert.equal(doc.querySelector('.article-exposition-overlay'), null);
});

test('failed stream retains partial answer, offers retry and enables copying only after completion', async () => {
    let attempts = 0;
    const {ctx, doc} = setup(async (_url, _payload, _delta, event) => {
        attempts++;
        event({type: 'status', status: 'article_loaded', source_scope: 'article'});
        if (attempts === 1) throw Object.assign(new Error('Network failed'), {partialText: '**Partial**'});
        return '**Complete**';
    });
    ctx.ArticleExpositionModal.show({url: 'https://example.org'}, {});
    await tick();
    assert.equal(doc.querySelector('.article-exposition-error').hidden, false);
    assert(doc.querySelector('.article-exposition-error').textContent.includes('Network failed'));
    assert.equal(doc.querySelector('.article-exposition-answer strong').textContent, 'Partial');
    assert.equal(doc.querySelector('.article-exposition-copy').disabled, true);
    doc.querySelector('.article-exposition-retry').click();
    await tick();
    assert.equal(attempts, 2);
    assert.equal(doc.querySelector('.article-exposition-error').hidden, true);
    assert.equal(doc.querySelector('.article-exposition-answer strong').textContent, 'Complete');
    assert.equal(doc.querySelector('.article-exposition-copy').disabled, false);
    doc.querySelector('.article-exposition-close').click();
});

test('closing during a request aborts it and ignores a late response', async () => {
    let finish, signal;
    const {ctx, doc} = setup((_url, _payload, _delta, _event, options) => {
        signal = options.signal;
        return new Promise(resolve => {finish = resolve;});
    });
    ctx.ArticleExpositionModal.show({quote: 'Excerpt'}, {});
    doc.querySelector('.btn-close-modal').click();
    assert.equal(signal.aborted, true);
    finish('Late response');
    await tick();
    assert.equal(doc.querySelector('.article-exposition-overlay'), null);
    assert.equal(doc.activeElement.id, 'source');
});

test('Escape and opening another note close the dialog and abort work', async () => {
    const signals = [];
    const {ctx, doc, dom} = setup((_url, _payload, _delta, _event, options) => {
        signals.push(options.signal);
        return new Promise(() => {});
    });
    ctx.ArticleExpositionModal.show({quote: 'Excerpt'}, {});
    doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    assert.equal(signals[0].aborted, true);
    ctx.ArticleExpositionModal.show({quote: 'Excerpt'}, {});
    doc.dispatchEvent(new dom.window.Event('noteOpened'));
    assert.equal(signals[1].aborted, true);
    assert.equal(doc.querySelector('.article-exposition-overlay'), null);
});

test('saving requires confirmation, persists with the source and reopens without another AI request', async () => {
    let requests = 0, saves = 0, confirmed = false;
    const {ctx, doc} = setup(async (_url, _payload, _delta, event) => {
        requests++;
        event({type: 'status', status: 'article_loaded', source_scope: 'section', selection: '3.1–3.3'});
        return '**Saved exposition**';
    });
    const source = {url: 'https://example.org/book#chapter3', title: 'Book'};
    const block = {id: 'b1', sources: [source]};
    ctx.AppState = {currentNote: {title: 'Note'}, documentEpoch: 1, getBlock: () => block,
        updateBlock: (_id, patch) => Object.assign(block, patch)};
    ctx.DialogService = {confirm: async () => confirmed};
    ctx.SaveCoordinator = {saveCurrentNote: async () => {saves++;}};
    ctx.ArticleExpositionModal.show(source, block);
    await tick();
    assert.equal(block.sources[0].exposition, undefined);
    assert.equal(doc.querySelector('.article-exposition-save').disabled, false);
    doc.querySelector('.article-exposition-save').click();
    await tick();
    assert.equal(saves, 0);
    assert.equal(block.sources[0].exposition, undefined);
    confirmed = true;
    doc.querySelector('.article-exposition-save').click();
    await tick();
    assert.equal(saves, 1);
    assert.equal(block.sources[0].exposition.text, '**Saved exposition**');
    assert.equal(block.sources[0].exposition.scope, 'section');
    doc.querySelector('.article-exposition-close').click();
    ctx.ArticleExpositionModal.show(block.sources[0], block);
    await tick();
    assert.equal(requests, 1);
    assert.equal(doc.querySelector('.article-exposition-answer strong').textContent, 'Saved exposition');
    assert.equal(doc.querySelector('.article-exposition-saved').hidden, false);
    doc.querySelector('.article-exposition-close').click();
});

test('confirmation cannot attach an answer to a source changed while it was pending', async () => {
    let approve, saves = 0;
    const {ctx, doc} = setup(async () => '**Answer**');
    const source = {quote: 'Original'};
    const block = {id: 'b', sources: [source]};
    ctx.AppState = {currentNote: {}, documentEpoch: 1, getBlock: () => block,
        updateBlock: (_id, patch) => Object.assign(block, patch)};
    ctx.DialogService = {confirm: () => new Promise(resolve => {approve = resolve;})};
    ctx.SaveCoordinator = {saveCurrentNote: async () => {saves++;}};
    ctx.ArticleExpositionModal.show(source, block);
    await tick();
    doc.querySelector('.article-exposition-save').click();
    block.sources = [{quote: 'Changed'}];
    approve(true);
    await tick();
    assert.equal(saves, 0);
    assert.equal(block.sources[0].exposition, undefined);
    assert(doc.querySelector('.article-exposition-error').textContent.includes('article_exposition_source_changed'));
    doc.querySelector('.article-exposition-close').click();
});
