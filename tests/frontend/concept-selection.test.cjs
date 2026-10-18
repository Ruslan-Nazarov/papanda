const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

async function waitForAnswer(document) {
    const deadline = Date.now() + 2000;
    while (document.querySelector('.concept-explain-send')?.disabled) {
        assert(Date.now() < deadline, 'stream rendering completes');
        await new Promise(resolve => setTimeout(resolve, 5));
    }
}

function savingContext(html, stream = async () => 'Первый **ответ**: $q_1$.') {
    const dom = new JSDOM('<div class="dialectics-block" data-id="current"><div class="block-title">Тема</div>' +
        `<div class="block-content">${html}</div></div>`);
    const renders = [];
    const ctx = context({document: dom.window.document, window: dom.window, CustomEvent: dom.window.CustomEvent,
        HtmlSafety: {escape: text => text, link: () => ''}, NotesAPI: {stream},
        BlockDOMRenderer: {renderAll: options => renders.push(options)},
        renderStreamMarkdown: (target, text) => {target.textContent = text;}});
    for (const name of ['AppState', 'NoteText', 'NoteContextSearch', 'ConceptSelectionMenu']) load(ctx, name);
    ctx.AppState.setNote({id: 1, title: 'Тема', blocks: [{id: 'current', title: 'Тема', html}]});
    return {dom, ctx, renders, block: dom.window.document.querySelector('.dialectics-block')};
}

test('calculation action keeps the complete chosen formula, definitions and detailed follow-ups, then saves at that occurrence', async () => {
    const formula = String.raw`\frac{3v_p}{3(v_p+\varepsilon)}=\frac{v_p}{v_p+\varepsilon}`;
    const html = `<p>Первый <span class="math-inline" formula="${formula}"></span>.</p>`
        + `<p>Второй <span class="math-inline" formula="${formula}"></span> после.</p>`;
    const calls = [];
    const answer = 'Полная выкладка: ' + 'пояснение '.repeat(500);
    const {dom, ctx, block} = savingContext(html, async (url, data) => {calls.push({url, data}); return answer;});
    load(ctx, 'MathSymbols');
    load(ctx, 'MathDefinitionContext');
    load(ctx, 'CalculationExplanation');
    ctx.AppState.updateNote({math_symbols: [{symbol: 'v_p', definition: 'Старое определение'}]});
    ctx.AppState.updateBlock('current', {math_symbols: [{symbol: 'v_p', definition: 'Дисперсия трёх компонент'}]});
    const katex = require('katex');
    block.querySelectorAll('.math-inline').forEach(span => {
        span.innerHTML = katex.renderToString(formula) + '<button class="math-calculation-button">Разобрать расчёт</button>';
    });
    const selected = block.querySelectorAll('.katex')[1];
    selected.dataset.mathOriginal = ctx.MathSymbols.encode(JSON.stringify(['S_p=(S-\\mu)/\\sigma']));
    await ctx.CalculationExplanation.open(selected);
    await waitForAnswer(dom.window.document);
    assert.equal(calls[0].url, '/ai/dialectics/explain-calculation/stream');
    assert.equal(calls[0].data.formula, formula);
    assert.equal(calls[0].data.text, undefined);
    assert.equal(calls[0].data.math_symbols[0].definition, 'Дисперсия трёх компонент');
    assert.equal(calls[0].data.original_formulas[0], 'S_p=(S-\\mu)/\\sigma');
    assert(!calls[0].data.context_after.includes('Разобрать расчёт'));
    assert(dom.window.document.querySelector('.calculation-explain-modal'));
    const input = dom.window.document.querySelector('.concept-explain-input');
    input.value = 'Откуда взялась тройка?';
    dom.window.document.querySelector('.concept-explain-send').click();
    await waitForAnswer(dom.window.document);
    assert.equal(calls[1].data.history[1].content, answer);
    assert.equal(calls[1].data.question, 'Откуда взялась тройка?');
    dom.window.document.querySelector('.concept-explain-save').click();
    const saved = dom.window.document.createElement('div');
    saved.innerHTML = ctx.AppState.getBlock('current').html;
    assert.equal(saved.querySelectorAll('.math-inline').length, 2);
    assert.match(saved.children[1].textContent, /Второй/);
    assert.equal(saved.children[2].tagName, 'BLOCKQUOTE');
    assert.match(saved.children[3].textContent, /после/);
    assert.doesNotMatch(saved.innerHTML, /math-calculation-button|class="katex/);
});

test('chat changes the note only on save and follows the selected repeated occurrence with all completed turns', async () => {
    const html = '<p style="text-align: right">термин; <strong>термин</strong> и продолжение.</p><p>Конец.</p>';
    let requests = 0;
    const {dom, ctx, block, renders} = savingContext(html, async () => ++requests === 1
        ? 'Первый **ответ**: $q_1$.' : 'Второй ответ. <img src=x onerror="alert(1)">');
    const range = dom.window.document.createRange();
    range.selectNodeContents(block.querySelector('strong'));
    await ctx.ConceptSelectionMenu._explain('термин', block, range);
    await waitForAnswer(dom.window.document);
    assert.equal(ctx.AppState.getBlock('current').html, html);
    assert.equal(ctx.AppState.isDirty, false);
    const input = dom.window.document.querySelector('.concept-explain-input');
    input.value = 'Уточняющий вопрос';
    dom.window.document.querySelector('.concept-explain-send').click();
    assert.equal(dom.window.document.querySelector('.concept-explain-save').disabled, true);
    await waitForAnswer(dom.window.document);
    dom.window.getSelection().removeAllRanges();
    dom.window.document.querySelector('.concept-explain-save').click();
    const result = dom.window.document.createElement('div');
    result.innerHTML = ctx.AppState.getBlock('current').html;
    assert.equal(result.children[0].outerHTML, '<p style="text-align: right">термин; <strong>термин</strong></p>');
    assert.equal(result.children[1].tagName, 'BLOCKQUOTE');
    assert.equal(result.children[2].textContent, ' и продолжение.');
    assert.equal(result.children[3].textContent, 'Конец.');
    assert.match(result.querySelector('blockquote').textContent, /Первый ответ.*Уточняющий вопрос.*Второй ответ/s);
    assert.equal(result.querySelector('.math-inline').getAttribute('formula'), 'q_1');
    assert.equal(result.querySelector('[onerror]'), null);
    assert.equal(dom.window.document.querySelector('.concept-explain-save'), null);
    assert.equal(ctx.AppState.isDirty, true);
    assert.equal(renders.length, 1);
    assert.equal(ctx.AppState.restoreBlockVersion('current', 'undo'), true);
    assert.equal(ctx.AppState.getBlock('current').html, html);
});

test('closing a completed chat leaves the note and its history unchanged', async () => {
    const html = '<p>Выделенный термин.</p>';
    const {dom, ctx, block, renders} = savingContext(html);
    await ctx.ConceptSelectionMenu._explain('термин', block);
    await waitForAnswer(dom.window.document);
    assert.equal(dom.window.document.querySelector('.concept-explain-save').disabled, false);
    dom.window.document.querySelector('.btn-close-modal').click();
    assert.equal(ctx.AppState.getBlock('current').html, html);
    assert.equal(ctx.AppState.isDirty, false);
    assert.equal(ctx.AppState.blockHistory('current').undo, 0);
    assert.equal(renders.length, 0);
});

test('saving next to rendered math and hidden phrases preserves source markup and excludes reading decorations', async () => {
    const html = '<p style="text-align:center">\\[Q=XW\\]</p><p><span data-type="hidden-phrase" data-hint="Подсказка">Матрица</span> и текст.</p>';
    const {dom, ctx, block} = savingContext(html);
    block.querySelector('.block-content').innerHTML = '<div class="math-callout"><div class="math-content"><p>'
        + '<span class="math-inline" formula="Q=XW"><span class="katex">Q=XWQ=XW</span></span></p></div></div>'
        + '<p><span data-type="hidden-phrase" data-hint="Подсказка">Матрица'
        + '<span class="hp-arrow"> ▾</span><span class="hp-content">Подсказка</span></span> и текст.</p>';
    const word = block.querySelector('[data-type="hidden-phrase"]').firstChild;
    const range = dom.window.document.createRange();
    range.setStart(word, 0);
    range.setEnd(word, word.length);
    await ctx.ConceptSelectionMenu._explain('Матрица', block, range);
    await waitForAnswer(dom.window.document);
    dom.window.document.querySelector('.concept-explain-save').click();
    const saved = ctx.AppState.getBlock('current').html;
    assert(saved.startsWith('<p style="text-align:center">\\[Q=XW\\]</p>'));
    assert.match(saved, /data-hint="Подсказка">Матрица<\/span><\/p><blockquote/);
    assert.doesNotMatch(saved, /hp-arrow|hp-content|class="katex/);
});

test('saving refuses a changed or deleted source block', async () => {
    for (const remove of [false, true]) {
        const {dom, ctx, block, renders} = savingContext('<p>Термин.</p>');
        await ctx.ConceptSelectionMenu._explain('Термин', block);
        await waitForAnswer(dom.window.document);
        if (remove) ctx.AppState.removeBlock('current');
        else ctx.AppState.updateBlock('current', {html: '<p>Новый текст.</p>'});
        const revision = ctx.AppState.editRevision;
        dom.window.document.querySelector('.concept-explain-save').click();
        assert.equal(ctx.AppState.editRevision, revision);
        assert.equal(dom.window.document.querySelector('.concept-explain-notice').hidden, false);
        assert.equal(renders.length, 0);
        dom.window.document.querySelector('.btn-close-modal').click();
    }
});

test('failed requests cannot save error text, and an ambiguous missing selection cannot insert at the wrong occurrence', async () => {
    const failed = savingContext('<p>Термин.</p>', async () => {throw new Error('offline');});
    await failed.ctx.ConceptSelectionMenu._explain('Термин', failed.block);
    await waitForAnswer(failed.dom.window.document);
    assert.equal(failed.dom.window.document.querySelector('.concept-explain-save').disabled, true);
    assert.equal(failed.ctx.AppState.isDirty, false);
    failed.dom.window.document.querySelector('.btn-close-modal').click();
    const repeated = savingContext('<p>Термин и Термин.</p>');
    await repeated.ctx.ConceptSelectionMenu._explain('Термин', repeated.block);
    await waitForAnswer(repeated.dom.window.document);
    repeated.dom.window.document.querySelector('.concept-explain-save').click();
    assert.equal(repeated.ctx.AppState.isDirty, false);
    assert.equal(repeated.dom.window.document.querySelector('.concept-explain-notice').hidden, false);
    repeated.dom.window.document.querySelector('.btn-close-modal').click();
});

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
    await waitForAnswer(dom.window.document);
    const input = dom.window.document.querySelector('.concept-explain-input');
    input.value = 'Как это сделать?';
    dom.window.document.querySelector('.concept-explain-send').click();
    await waitForAnswer(dom.window.document);

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
    await waitForAnswer(dom.window.document);
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

test('a failed follow-up preserves the next question being typed during generation', async () => {
    const dom = new JSDOM('<div class="dialectics-block"><div class="block-content">Вероятность</div></div>');
    let rejectRequest;
    let requests = 0;
    const ctx = context({document: dom.window.document, window: dom.window,
        CustomEvent: dom.window.CustomEvent, HtmlSafety: {escape: text => text},
        renderStreamMarkdown: (target, text) => {target.textContent = text;},
        NotesAPI: {stream: () => ++requests === 1 ? Promise.resolve('Первый ответ')
            : new Promise((_resolve, reject) => {rejectRequest = reject;})}});
    for (const name of ['AppState', 'NoteText', 'NoteContextSearch', 'ConceptSelectionMenu']) load(ctx, name);
    ctx.AppState.setNote({title: 'Тема', blocks: []});
    await ctx.ConceptSelectionMenu._explain('Вероятность', dom.window.document.querySelector('.dialectics-block'));
    await waitForAnswer(dom.window.document);
    const input = dom.window.document.querySelector('.concept-explain-input');
    input.value = 'Уточните ответ';
    dom.window.document.querySelector('.concept-explain-send').click();
    await new Promise(resolve => setImmediate(resolve));
    input.value = 'Следующий вопрос, который ещё не отправлен';
    rejectRequest(new Error('offline'));
    await waitForAnswer(dom.window.document);
    assert.equal(input.value, 'Следующий вопрос, который ещё не отправлен');
    assert.match(dom.window.document.querySelector('.concept-explain-messages').textContent, /offline/);
    dom.window.document.querySelector('.btn-close-modal').click();
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
