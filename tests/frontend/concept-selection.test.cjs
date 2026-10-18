const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('selected-fragment questions send bounded note passages and a short dialog', async () => {
    const dom = new JSDOM('<div class="dialectics-block"><div class="block-title">Тепловой режим</div>' +
        '<div class="block-content">Измеряем температуру компонентов</div></div>');
    const block = dom.window.document.querySelector('.dialectics-block');
    block.querySelector('.block-content').innerText = 'Измеряем температуру компонентов';
    const requests = [];
    const ctx = context({document: dom.window.document, window: dom.window,
        CustomEvent: dom.window.CustomEvent, NotesAPI: {stream: async (_path, payload) => {
            requests.push(payload);
            return 'Ответ';
        }}, HtmlSafety: {escape: text => text},
        renderStreamMarkdown: (target, text) => {target.textContent = text;},
        t: key => key});
    load(ctx, 'AppState');
    load(ctx, 'NoteText');
    load(ctx, 'NoteContextSearch');
    load(ctx, 'ConceptSelectionMenu');
    ctx.AppState.setNote({title: 'Устройство регистрации', blocks: []});

    await ctx.ConceptSelectionMenu._explain('Измеряем температуру', block);
    await new Promise(resolve => setImmediate(resolve));
    const input = dom.window.document.querySelector('.concept-explain-input');
    input.value = 'Как это сделать?';
    dom.window.document.querySelector('.concept-explain-send').click();
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(requests.length, 2);
    assert.equal(requests[0].note_title, 'Устройство регистрации');
    assert.equal(requests[0].context_before, 'Тепловой режим');
    assert.equal(requests[0].context_after, 'Измеряем температуру компонентов');
    assert.equal(requests[1].question, 'Как это сделать?');
    assert.equal(requests[1].history.length, 2);
    assert.equal(requests[0].note_passages.length, 0);
});

test('finds another block, renders safe source buttons and opens a collapsed source', async () => {
    const dom = new JSDOM('<div class="dialectics-block" data-id="current"><div class="block-title">Обновление</div>' +
        '<div class="block-content">Изменение скрытых состояний</div></div>' +
        '<div class="dialectics-block collapsed" data-id="definition"><button class="btn-collapse-toggle"></button></div>');
    const requests = [];
    const ctx = context({document: dom.window.document, window: dom.window,
        CustomEvent: dom.window.CustomEvent,
        NotesAPI: {stream: async (_path, payload) => {requests.push(payload); return 'Ответ в блоке [1]';}},
        HtmlSafety: {escape: text => text}, renderStreamMarkdown: (target, text) => {target.textContent = text;}});
    for (const name of ['AppState', 'NoteText', 'NoteContextSearch', 'ConceptSelectionMenu']) load(ctx, name);
    ctx.AppState.setNote({title: 'Трансформер', blocks: [
        {id: 'current', html: '<p>Изменение скрытых состояний</p>'},
        {id: 'definition', title: 'Скрытое состояние <img src=x onerror=alert(1)>',
            html: '<p>Скрытое состояние — вектор, который хранит информацию о предыдущих словах.</p>'},
    ]});
    const source = dom.window.document.querySelector('[data-id="definition"]');
    let scrolled = false, expanded = false;
    source.scrollIntoView = () => {scrolled = true;};
    source.querySelector('button').onclick = () => {expanded = true;};
    await ctx.ConceptSelectionMenu._explain('скрытых состояний', dom.window.document.querySelector('[data-id="current"]'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests[0].note_passages[0].block_id, 'definition');
    const button = dom.window.document.querySelector('.concept-explain-sources button');
    assert.match(button.textContent, /\[1\].*Скрытое состояние/);
    assert.equal(button.querySelector('img'), null);
    button.click();
    assert.equal(expanded, true);
    assert.equal(scrolled, true);
    assert.equal(dom.window.document.querySelector('.modal-overlay'), null);
});

test('note change aborts the request and prevents sources from a previous note appearing', async () => {
    const dom = new JSDOM('<div class="dialectics-block"><div class="block-content">Hidden state</div></div>');
    let resolve, signal;
    const ctx = context({document: dom.window.document, window: dom.window,
        CustomEvent: dom.window.CustomEvent,
        NotesAPI: {stream: (_path, _payload, _delta, _event, options) => {
            signal = options.signal;
            return new Promise(done => {resolve = done;});
        }}, HtmlSafety: {escape: text => text}, renderStreamMarkdown: (target, text) => {target.textContent = text;}});
    for (const name of ['AppState', 'NoteText', 'NoteContextSearch', 'ConceptSelectionMenu']) load(ctx, name);
    ctx.AppState.setNote({title: 'First', blocks: []});
    await ctx.ConceptSelectionMenu._explain('Hidden state', dom.window.document.querySelector('.dialectics-block'));
    ctx.AppState.setNote({title: 'Second', blocks: []});
    assert.equal(signal.aborted, true);
    resolve('Old answer');
    await new Promise(done => setImmediate(done));
    assert.equal(dom.window.document.querySelector('.modal-overlay'), null);
});

test('explanations read multi-target internal links, respect block targets and keep inaccessible links as metadata', async () => {
    const dom = new JSDOM('');
    const reads = [];
    const ctx = context({document: dom.window.document, window: dom.window, CustomEvent: dom.window.CustomEvent,
        NotesAPI: {getNote: async (id, signal) => {
            reads.push(id);
            assert.equal(signal.aborted, false);
            if (id === 'missing') throw new Error('404');
            return {id, title: 'Linked note', content_json: [
                {id: 'target', title: 'Attention', html: '<p>Attention combines value vectors.</p>'},
                {id: 'private', title: 'Unselected', html: '<p>Attention must not include this block.</p>'}]};
        }}});
    for (const name of ['AppState', 'NoteText', 'NoteContextSearch', 'ConceptSelectionMenu']) load(ctx, name);
    ctx.AppState.setNote({id: 1, dictionary: [{word: 'Attention', definition: 'Weighted values'}], blocks: [
        {id: 'current', title: 'Attention', html: '<p>Attention <a href="internal://note/2/block/target" '
            + 'data-internal-links=\'[{"url":"internal://note/missing","text":"Attention missing"}]\'>Attention reference</a></p>'} ]});
    const sources = await ctx.ConceptSelectionMenu._context({text: 'Attention', blockId: 'current'}, new AbortController().signal);
    assert.deepEqual(reads, ['2', 'missing']);
    assert(sources.some(source => source.kind === 'dictionary'));
    assert(sources.some(source => source.reference === 'linked_content' && /combines value/.test(source.text)));
    assert(sources.some(source => source.url === 'internal://note/missing'));
    assert(sources.every(source => !source.text.includes('must not include')));
});

test('numbered citations open dictionary entries and display past text without restoring it', () => {
    const dom = new JSDOM('<div class="concept-explain-answer">From the dictionary [1], previously [2]. Unknown [9].</div>');
    let word, closed = false;
    const ctx = context({document: dom.window.document, window: dom.window,
        DictModalService: {show: value => {word = value;}},
        renderStreamMarkdown: (target, text) => {target.textContent = text;}});
    load(ctx, 'ConceptSelectionMenu');
    const answer = dom.window.document.querySelector('.concept-explain-answer');
    ctx.ConceptSelectionMenu._showSources(answer, [
        {kind: 'dictionary', title: 'Attention', reference: 'Attention', text: 'Weighted values'},
        {kind: 'draft', block_id: 'b', title: 'Attention', text: 'Future tokens', reason: 'Missing causal masking'}], () => {closed = true;});
    const citations = answer.querySelectorAll('button');
    assert.equal(citations.length, 2);
    citations[1].click();
    assert.match(dom.window.document.querySelector('.concept-source-details').textContent, /Future tokens.*Missing causal masking/s);
    assert.equal(closed, false);
    citations[0].click();
    assert.equal(word, 'Attention');
    assert.equal(closed, true);
    assert.match(answer.textContent, /Unknown \[9\]/);
});
