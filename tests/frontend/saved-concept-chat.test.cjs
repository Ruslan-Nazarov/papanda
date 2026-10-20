const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

function fixture() {
    const dom = new JSDOM('<main><div class="block-content"></div>'
        + '<section class="dialectics-block collapsed" data-id="source"><button class="btn-collapse-toggle"></button></section>'
        + '<section class="dialectics-block" data-id="second"></section></main>');
    const document = dom.window.document;
    let dictionaryWord;
    const ctx = context({document, window: dom.window, CustomEvent: dom.window.CustomEvent,
        DOMPurify: require('dompurify')(dom.window),
        DictModalService: {show: word => {dictionaryWord = word;}},
        NotesAPI: {stream: () => {throw new Error('Saved chats must not request AI');}}});
    for (const name of ['AppState', 'HtmlSafety', 'NoteText', 'ConceptSelectionMenu']) load(ctx, name);
    load(ctx, 'ConceptExplainManager', 'renderStreamMarkdown');
    ctx.AppState.setNote({id: 12, blocks: [{id: 'source', title: 'Источник', html: '<p>Текст источника.</p>'},
        {id: 'second', title: 'Второй источник', html: '<p>Второй текст.</p>'}]});
    document.querySelector('.btn-collapse-toggle').addEventListener('click', event => event.target.parentElement.classList.remove('collapsed'));
    ctx.ConceptSelectionMenu.init();
    const mount = data => {
        const marker = ctx.SavedConceptChat.create({version: 1, fragment: 'Матрица', calculation: false, ...data});
        document.querySelector('.block-content').replaceChildren(marker);
        return marker;
    };
    return {dom, document, ctx, mount, dictionary: () => dictionaryWord};
}

test('saved data opens a sanitized full chat without requesting AI or changing the note', () => {
    const {dom, document, ctx, mount} = fixture();
    const marker = mount({turns: [
        {question: '', answer: 'Матрица **Q**: $q_1$.\n\n| x | y |\n|---|---|\n| 1 | 2 |', sources: []},
        {question: 'Почему?', answer: '<img src=x onerror="alert(1)"><script>alert(1)</script>Ответ.', sources: []},
    ]});
    marker.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: ' ', bubbles: true, cancelable: true}));
    assert(document.querySelector('.saved-concept-chat-modal'));
    assert(document.querySelector('.saved-concept-chat-modal table'));
    assert(document.querySelector('.saved-concept-chat-modal [formula="q_1"]'));
    assert.match(document.querySelector('.saved-concept-chat-modal').textContent, /Почему\?.*Ответ/s);
    assert.equal(document.querySelector('.saved-concept-chat-modal [onerror], .saved-concept-chat-modal script'), null);
    assert.equal(document.querySelector('.concept-explain-footer'), null);
    assert.equal(ctx.AppState.isDirty, false);
    document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Escape'}));
    assert.equal(document.querySelector('.saved-concept-chat-modal'), null);
    assert.equal(document.activeElement, marker);
});

test('saved markers work inside hidden phrases and count as one editor atom', () => {
    const {document, ctx, mount} = fixture();
    const marker = mount({turns: [{question: '', answer: 'Ответ', sources: []}]});
    const phrase = document.createElement('span');
    phrase.setAttribute('data-type', 'hidden-phrase');
    phrase.textContent = 'Термин';
    marker.before(phrase);
    phrase.append(marker);
    phrase.addEventListener('click', event => {event.stopPropagation(); throw new Error('Must open the chat first');});
    marker.click();
    assert(document.querySelector('.saved-concept-chat-modal'));
    const position = context({document});
    load(position, 'EditorTextPosition');
    assert.equal(position.EditorTextPosition.clean(phrase, '\ufffc'), 'Термин\ufffc');
    assert.equal(position.EditorTextPosition.clean(phrase), 'Термин');
});

test('saved citations retain per-turn source IDs and open collapsed blocks or dictionary entries', () => {
    const {document, ctx, mount, dictionary} = fixture();
    const marker = mount({turns: [
        {question: '', answer: 'Сначала [source 1].', sources: [{block_id: 'source', title: 'Источник', text: 'Текст'}]},
        {question: 'Уточнение', answer: 'Затем [1].', sources: [{kind: 'dictionary', title: 'Матрица', reference: 'Матрица', text: 'Определение'}]},
    ]});
    marker.click();
    document.querySelector('.concept-explain-citation').click();
    assert.equal(document.querySelector('.saved-concept-chat-modal'), null);
    assert.equal(document.querySelector('[data-id="source"]').classList.contains('collapsed'), false);
    marker.click();
    document.querySelectorAll('.concept-explain-citation')[1].click();
    assert.equal(dictionary(), 'Матрица');
    assert.equal(document.querySelector('.saved-concept-chat-modal'), null);
    assert.equal(ctx.AppState.isDirty, false);
});

test('saved sources preserve links, past versions and excerpts from deleted blocks', () => {
    const {document, ctx, mount} = fixture();
    mount({turns: [{question: '', answer: 'Источники.', sources: [
        {kind: 'link', title: 'Сайт', text: 'Сайт', url: 'https://example.com/source'},
        {kind: 'version', title: 'История', block_id: 'source', text: 'Старая версия: $x$.'},
        {title: 'Удалённый блок', block_id: 'deleted', text: 'Сохранённая выдержка.'},
        {kind: 'link', title: 'Небезопасный адрес', text: 'Текст', url: 'javascript:alert(1)'},
        {title: 'Другой конспект', block_id: 'b', note_id: '99', text: 'Текст'},
    ]}]}).click();
    assert.equal(document.querySelector('.concept-explain-source[href^="https:"]').getAttribute('href'), 'https://example.com/source');
    assert.equal(document.querySelector('a[href^="internal:"]').getAttribute('href'), 'internal://note/99/block/b');
    assert.equal(document.querySelector('a[href^="javascript:"]'), null);
    const buttons = document.querySelectorAll('button.concept-explain-source');
    buttons[0].click();
    assert.match(document.querySelector('.concept-source-details').textContent, /Старая версия/);
    buttons[1].click();
    assert.match(document.querySelectorAll('.concept-source-details')[1].textContent, /Сохранённая выдержка/);
    assert.equal(ctx.AppState.isDirty, false);
});

test('legacy quotes become markers, preserve all HTML and recover source navigation from unique titles', () => {
    const {document, ctx} = fixture();
    const root = document.querySelector('.block-content');
    root.innerHTML = '<p>Формула.</p><blockquote class="custom-quote"><p><strong>Подробный разбор расчёта · ИИ: «x^2»</strong></p>'
        + '<p>Ответ [1]: <span class="math-inline" formula="x^2">x^2</span>.</p><p><strong>Уточнение?</strong></p><p>Полный ответ.</p>'
        + '<p>Связанные фрагменты конспекта:<br><span>[1] Источник</span></p></blockquote>'
        + '<blockquote class="custom-quote"><p><strong>Обычная цитата</strong></p><p>Оставить.</p></blockquote>';
    ctx.SavedConceptChat.compactLegacy(root);
    assert.equal(root.querySelectorAll('blockquote').length, 1);
    const marker = root.querySelector('[data-type="concept-chat"]');
    const data = ctx.SavedConceptChat.read(marker);
    assert.equal(data.fragment, 'x^2');
    assert.equal(data.calculation, true);
    assert.match(data.legacyHTML, /Уточнение\?.*Полный ответ/s);
    marker.click();
    assert(document.querySelector('.saved-concept-chat-modal [formula="x^2"]'));
    document.querySelector('.concept-explain-citation').click();
    assert.equal(document.querySelector('.saved-concept-chat-modal'), null);
    assert.equal(document.querySelector('[data-id="source"]').classList.contains('collapsed'), false);
    assert.equal(ctx.AppState.isDirty, false);
});

test('ambiguous legacy source titles show a choice of matching blocks', () => {
    const {document, ctx, mount} = fixture();
    ctx.AppState.updateBlock('second', {title: 'Источник'});
    const legacySource = document.createElement('span');
    legacySource.textContent = '[1] Источник';
    const source = ctx.ConceptSelectionMenu._legacySource(legacySource);
    assert.equal(source.kind, 'legacy');
    assert.deepEqual(Array.from(source.targets, item => item.block_id), ['source', 'second']);
    mount({turns: [{question: '', answer: 'См. [1].', sources: [source]}]}).click();
    document.querySelector('.concept-explain-citation').click();
    assert.equal(document.querySelectorAll('.concept-source-details .concept-explain-source').length, 2);
});

test('legacy chats previously edited with a quote wrapper also become markers', () => {
    const {document, ctx} = fixture();
    const root = document.querySelector('.block-content');
    root.innerHTML = '<blockquote class="custom-quote"><div class="quote-content">'
        + '<p><strong>✨ Что это?: «Матрица»</strong></p><p>Ответ.</p></div></blockquote>';
    ctx.SavedConceptChat.compactLegacy(root);
    const marker = root.querySelector('[data-type="concept-chat"]');
    assert.equal(ctx.SavedConceptChat.read(marker).legacyHTML, '<p>Ответ.</p>');
    marker.click();
    assert.match(document.querySelector('.saved-concept-chat-modal').textContent, /Ответ/);
});

test('malformed saved data does not open a dialog, and note navigation closes an open chat', () => {
    const {document, dom, ctx, mount} = fixture();
    for (const data of ['{}', 'null', '{', '{"version":1,"fragment":"x","turns":[null]}']) {
        const marker = mount({turns: []});
        marker.setAttribute('data-chat', data);
        assert.equal(ctx.SavedConceptChat.read(marker), null);
        marker.click();
        assert.equal(document.querySelector('.saved-concept-chat-modal'), null);
    }
    mount({turns: [{question: '', answer: 'Ответ', sources: []}]}).click();
    document.dispatchEvent(new dom.window.CustomEvent('noteOpened'));
    assert.equal(document.querySelector('.saved-concept-chat-modal'), null);
});
