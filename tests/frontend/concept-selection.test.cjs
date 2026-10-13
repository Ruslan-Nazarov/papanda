const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('selected-fragment questions send only local note context and a short dialog', async () => {
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
    load(ctx, 'ConceptSelectionMenu');
    ctx.AppState.setNote({title: 'Устройство регистрации', blocks: []});

    await ctx.ConceptSelectionMenu._explain('Измеряем температуру', block);
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
});
