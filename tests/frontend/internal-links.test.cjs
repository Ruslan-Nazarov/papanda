const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('internal link picker numbers blocks like the canvas and filters by number', async () => {
    const dom = new JSDOM('<html><body></body></html>');
    const currentNote = {content_json: [
        {id: 'anchor', role: 'anchor', title: 'Цель'},
        {id: 'first', role: 'step1', title: 'Первый'},
        {id: 'section', role: 'section', title: 'Раздел'},
        {id: 'second', role: 'step2', title: 'Второй'}
    ]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote},
        NotesAPI: {
            getNotes: async () => [{id: 1, title: 'Конспект'}],
            getNote: async () => { throw new Error('The open note should use local blocks'); }
        }});
    load(ctx, 'DialogService');
    const selection = ctx.DialogService.selectInternalLinks({noteId: 1, blockId: 'second'});
    await new Promise(resolve => setTimeout(resolve, 0));
    dom.window.document.querySelector('.internal-links-expand').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    const document = dom.window.document;
    assert.deepEqual([...document.querySelectorAll('.internal-links-block')].map(el => el.firstChild.textContent),
        ['1. Первый', '2. Второй', '3. Цель']);
    const current = document.querySelector('.internal-links-block.is-current');
    assert.equal(current.dataset.linkUrl, 'internal://note/1/block/second');
    assert.equal(current.getAttribute('aria-current'), 'location');
    const dot = current.querySelector('.internal-links-current-dot');
    assert.equal(dot.textContent, '');
    assert.equal(dot.title, 'picker_you_are_here');
    assert.equal(dot.getAttribute('aria-label'), 'picker_you_are_here');
    assert.equal(current.getAttribute('aria-pressed'), 'false');
    assert.equal(document.querySelector('.internal-links-confirm').disabled, true);
    const search = document.querySelector('.internal-links-search');
    search.value = '2';
    search.dispatchEvent(new dom.window.Event('input'));
    const rows = [...document.querySelectorAll('.internal-links-block')];
    assert.deepEqual(rows.map(row => row.hidden), [true, false, true]);
    rows[1].click();
    assert.equal(current.querySelectorAll('.internal-links-current-dot').length, 1);
    assert.equal(current.getAttribute('aria-current'), 'location');
    document.querySelector('.internal-links-confirm').click();
    const chosen = await selection;
    assert.equal(chosen[0].url, 'internal://note/1/block/second');
    assert.equal(chosen[0].text, 'Второй');
    dom.window.close();
});

test('current block marker matches both note and block IDs, including numeric IDs', async () => {
    const dom = new JSDOM('<html><body></body></html>');
    const currentNote = {content_json: [{id: 7, title: 'Текущий'}]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote}, NotesAPI: {
            getNotes: async () => [{id: 1, title: 'Открытый'}, {id: 2, title: 'Другой'}],
            getNote: async () => ({content_json: [{id: 7, title: 'Совпавший ID'}]})
        }});
    load(ctx, 'DialogService');
    const pending = ctx.DialogService.selectInternalLinks({noteId: '1', blockId: '7'});
    await new Promise(resolve => setTimeout(resolve, 0));
    for (const expand of dom.window.document.querySelectorAll('.internal-links-expand')) {
        expand.click();
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    const markers = dom.window.document.querySelectorAll('[aria-current="location"]');
    assert.equal(markers.length, 1);
    assert.equal(markers[0].dataset.linkUrl, 'internal://note/1/block/7');
    dom.window.document.querySelector('.internal-links-cancel').click();
    assert.equal(await pending, null);
    dom.window.close();
});

test('internal links dialog selects a note and a block in one pass', async () => {
    const dom = new JSDOM('<html><body></body></html>');
    const currentNote = {content_json: [{id: 'a', role: 'step1', title: 'Первый'}]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote}, NotesAPI: {getNotes: async () => [{id: 1, title: 'Конспект'}]}});
    load(ctx, 'DialogService');
    const pending = ctx.DialogService.selectInternalLinks({noteId: 1});
    await new Promise(resolve => setTimeout(resolve, 0));
    const document = dom.window.document;
    document.querySelector('.internal-links-note-row .internal-links-target').click();
    document.querySelector('.internal-links-expand').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    document.querySelector('.internal-links-block').click();
    assert.equal(document.querySelector('.internal-links-current-dot'), null);
    assert.equal(document.querySelectorAll('.internal-links-chip').length, 2);
    document.querySelector('.internal-links-confirm').click();
    const links = await pending;
    assert.deepEqual(JSON.parse(JSON.stringify(links.map(link => link.url))),
        ['internal://note/1', 'internal://note/1/block/a']);
    dom.window.close();
});

test('multi-link click chooser returns the selected destination', async () => {
    const dom = new JSDOM('<html><body></body></html>');
    const ctx = context({document: dom.window.document, window: dom.window});
    load(ctx, 'DialogService');
    const pending = ctx.DialogService.chooseInternalDestination([
        {url: 'internal://note/1', label: 'Первый'},
        {url: 'internal://note/2/block/3', label: 'Второй → 3. Блок'}
    ]);
    dom.window.document.querySelectorAll('.internal-links-choice')[1].click();
    assert.equal(await pending, 'internal://note/2/block/3');
    assert.equal(dom.window.document.querySelector('.internal-links-chooser'), null);
    dom.window.close();
});
