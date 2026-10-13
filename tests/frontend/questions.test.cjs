const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('questions button sits beside Materials and indexes editor question marks', () => {
    const template = fs.readFileSync(path.join(__dirname, '../../fastapi_app/templates/index.html'), 'utf8');
    const markup = new JSDOM(template).window.document;
    assert.equal(markup.getElementById('btn-note-materials').parentElement.nextElementSibling
        .querySelector('button')?.id, 'btn-questions');

    const dom = new JSDOM(`<div class="materials-wrapper"><button id="btn-note-materials"></button></div>
        <div class="questions-wrapper"><button id="btn-questions"><span class="questions-count" hidden></span></button>
        <section id="questions-panel" class="dropdown-menu hidden"></section></div>
        <div class="dialectics-block" data-id="one"></div>`);
    const document = dom.window.document;
    const note = {blocks: [
        {id: 'one', title: 'Процесс', html: '<p>Текст без знака вопроса <span class="question-mark-text" data-question="Почему так происходит">фрагмент</span> и <span class="question-mark-text" data-question="Что проверить">другой</span>.</p>'},
        {id: 'two', title: 'Буквальный знак?', html: '<p>Почему?</p>'},
        {id: 'draft', title: 'Черновик', isDraft: true, html: '<span class="question-mark-text" data-question="Не готово">текст</span>'}
    ]};
    const ctx = context({document, window: dom.window, AppState: {currentNote: note},
        t: key => ({questions_title: 'Вопросы', questions_empty: 'Нет вопросов', block_word: 'Блок', close_word: 'Закрыть'})[key] || key,
        setTimeout: () => 0});
    load(ctx, 'QuestionsManager');
    const manager = ctx.QuestionsManager;
    manager.init();
    assert.equal(document.querySelector('.questions-count').textContent, '1');
    assert.equal(document.querySelector('.questions-count').hidden, false);

    let scrolled = false;
    document.querySelector('[data-id="one"]').scrollIntoView = () => { scrolled = true; };
    document.getElementById('btn-questions').click();
    assert.equal(document.querySelectorAll('.questions-item').length, 1);
    assert.match(document.querySelector('.questions-item').textContent, /Почему так происходит/);
    assert.match(document.querySelector('.questions-item').textContent, /Что проверить/);
    document.querySelector('.questions-item').click();
    assert.equal(scrolled, true);
    assert.equal(document.getElementById('questions-panel').classList.contains('hidden'), true);

    note.blocks[0].html = '<p>Остался только обычный знак ?</p>';
    document.dispatchEvent(new dom.window.Event('stateDirty'));
    assert.equal(document.querySelector('.questions-count').hidden, true);
    document.getElementById('btn-questions').click();
    assert.match(document.getElementById('questions-panel').textContent, /Нет вопросов/);
});
