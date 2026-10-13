const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('note dictionary separates reading from editing and saves to the note', () => {
    const dom = new JSDOM('<html><body><button id="open">Open</button></body></html>');
    dom.window.confirm = () => true;
    const note = {dictionary: [{word: '<img src=x onerror=alert(1)>', definition: 'Old explanation', connections: ''}]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote: note, updateNote: patch => Object.assign(note, patch)}});
    load(ctx, 'DictModalService');
    ctx.DictModalService.show();
    const document = dom.window.document;
    assert.equal(document.querySelectorAll('.dict-list img').length, 0);
    assert.equal(document.querySelector('.dict-editor').hidden, true);
    document.querySelector('.dict-edit').click();
    assert.equal(document.querySelector('.dict-view').hidden, true);
    assert.equal(document.querySelector('.dict-word').value, '<img src=x onerror=alert(1)>');
    document.querySelector('.dict-word').value = 'ЭКГ';
    document.querySelector('.dict-definition').value = 'Новая формулировка';
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[0].word, 'ЭКГ');
    assert.equal(note.dictionary[0].definition, 'Новая формулировка');
    assert.equal(document.querySelector('.dict-view').hidden, false);
    document.querySelector('.dict-add').click();
    document.querySelector('.dict-word').value = 'Измерение';
    document.querySelector('.dict-definition').value = 'Получение данных';
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary.length, 2);
    document.querySelector('.dict-done').click();
    assert.equal(document.querySelector('.dict-modal'), null);
});

test('dictionary connection opens its matching concept', () => {
    const dom = new JSDOM('<html><body><button id="open">Open</button></body></html>');
    const note = {dictionary: [
        {word: 'Электрокардиография (ЭКГ)', definition: 'Запись активности', connections: ''},
        {word: 'Прибор', definition: 'Описание', connections: 'ЭКГ, отсутствующий термин'}
    ]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote: note, updateNote: patch => Object.assign(note, patch)}});
    load(ctx, 'DictModalService');
    ctx.DictModalService.show();
    const document = dom.window.document;
    document.querySelector('.dict-search').value = 'Прибор';
    document.querySelector('.dict-search').dispatchEvent(new dom.window.Event('input'));
    const link = document.querySelector('.dict-link');
    assert.equal(link.textContent, 'ЭКГ');
    link.click();
    assert.equal(document.querySelector('.dict-search').value, '');
    assert.equal(document.activeElement.querySelector('strong').textContent, 'Электрокардиография (ЭКГ)');
    assert.equal(document.querySelectorAll('.dict-link').length, 1);
    document.querySelectorAll('.dict-edit')[1].click();
    assert.equal(document.querySelector('.dict-connection-options').hidden, true);
    document.querySelector('.dict-connections').value = 'Электрокардиография (ЭКГ), отсутствующий термин';
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[1].connections, 'Электрокардиография (ЭКГ), отсутствующий термин');
});

test('dictionary connections suggest existing terms after each comma', () => {
    const dom = new JSDOM('<html><body></body></html>');
    const note = {dictionary: [
        {word: 'ЭКГ', definition: '', connections: ''},
        {word: 'Электрокардиография (ЭКГ)', definition: '', connections: ''},
        {word: 'Эхо', definition: '', connections: ''},
        {word: 'Прибор', definition: '', connections: ''}
    ]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote: note, updateNote: patch => Object.assign(note, patch)}});
    load(ctx, 'DictModalService');
    ctx.DictModalService.show();
    const document = dom.window.document;
    document.querySelectorAll('.dict-edit')[3].click();
    const input = document.querySelector('.dict-connections');
    const type = value => {
        input.value = value;
        input.setSelectionRange(value.length, value.length);
        input.dispatchEvent(new dom.window.Event('input'));
    };
    type('Э');
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    assert.ok([...document.querySelectorAll('.dict-connection-option')].some(option => option.textContent === 'ЭКГ'));
    document.querySelector('.dict-connection-option').click();
    assert.equal(input.value, 'ЭКГ, ');
    type('ЭКГ, Эх');
    input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
    input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    assert.equal(input.value, 'ЭКГ, Эхо, ');
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[3].connections, 'ЭКГ, Эхо');
});

test('dictionary connection explanation is shared, editable from either concept, and removed with the link', () => {
    const dom = new JSDOM('<html><body></body></html>');
    const note = {dictionary: [
        {word: 'Сигнал', definition: '', connections: ''},
        {word: 'Частота дискретизации', definition: '', connections: ''}
    ]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote: note, updateNote: patch => Object.assign(note, patch)}});
    load(ctx, 'DictModalService');
    ctx.DictModalService.show();
    const document = dom.window.document;
    document.querySelectorAll('.dict-edit')[0].click();
    assert.equal(document.querySelector('.dict-connection-explanation').disabled, true);
    const input = document.querySelector('.dict-connections');
    input.value = 'Частота дискретизации';
    input.dispatchEvent(new dom.window.Event('input'));
    assert.equal(document.querySelector('.dict-connection-explanation').disabled, false);
    document.querySelector('.dict-connection-explanation').value = 'Число отсчётов сигнала в секунду';
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[1].connections, 'Сигнал');
    assert.equal(note.dictionary[0].connection_explanations['Частота дискретизации'], 'Число отсчётов сигнала в секунду');
    assert.equal(note.dictionary[1].connection_explanations['Сигнал'], 'Число отсчётов сигнала в секунду');

    document.querySelectorAll('.dict-edit')[1].click();
    assert.equal(document.querySelector('.dict-connection-explanation').value, 'Число отсчётов сигнала в секунду');
    document.querySelector('.dict-connection-explanation').value = 'Отсчёты непрерывного сигнала';
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[0].connection_explanations['Частота дискретизации'], 'Отсчёты непрерывного сигнала');

    document.querySelectorAll('.dict-edit')[0].click();
    input.value = '';
    input.dispatchEvent(new dom.window.Event('input'));
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[1].connections, '');
    assert.deepEqual(Object.keys(note.dictionary[1].connection_explanations), []);
});

test('editing connections keeps other explanation drafts, including after a temporary removal', () => {
    const dom = new JSDOM('<html><body></body></html>');
    const note = {dictionary: [
        {word: 'Микроконтроллер', definition: '', connections: ''},
        {word: 'SPI (Serial Peripheral Interface)', definition: '', connections: ''},
        {word: 'Аналого-цифровой преобразователь (АЦП)', definition: '', connections: ''}
    ]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote: note, updateNote: patch => Object.assign(note, patch)}});
    load(ctx, 'DictModalService');
    ctx.DictModalService.show();
    const document = dom.window.document;
    document.querySelector('.dict-edit').click();
    const input = document.querySelector('.dict-connections');
    const changeConnections = value => {
        input.value = value;
        input.dispatchEvent(new dom.window.Event('input'));
    };
    changeConnections('SPI (Serial Peripheral Interface)');
    document.querySelector('textarea[data-connection]').value = 'Передаёт данные по SPI';
    changeConnections('');
    changeConnections('SPI (Serial Peripheral Interface), АЦП');
    const fields = [...document.querySelectorAll('textarea[data-connection]')];
    assert.equal(fields.length, 2);
    assert.equal(fields[0].value, 'Передаёт данные по SPI');
    fields[1].value = 'АЦП выполняет измерения';
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[0].connection_explanations['SPI (Serial Peripheral Interface)'], 'Передаёт данные по SPI');
    assert.equal(note.dictionary[0].connection_explanations['Аналого-цифровой преобразователь (АЦП)'], 'АЦП выполняет измерения');
    assert.equal(note.dictionary[1].connection_explanations['Микроконтроллер'], 'Передаёт данные по SPI');
    assert.equal(note.dictionary[2].connection_explanations['Микроконтроллер'], 'АЦП выполняет измерения');
});

test('adding a second explanation preserves the saved first explanation after reopening', () => {
    const dom = new JSDOM('<html><body></body></html>');
    const first = 'Аналого-цифровой преобразователь (АЦП)';
    const second = 'SPI (Serial Peripheral Interface)';
    const note = {dictionary: [
        {word: 'Микроконтроллер', definition: '', connections: first,
            connection_explanations: {[first]: 'АЦП выполняет измерения'}},
        {word: first, definition: '', connections: 'Микроконтроллер',
            connection_explanations: {'Микроконтроллер': 'АЦП выполняет измерения'}},
        {word: second, definition: '', connections: ''}
    ]};
    const ctx = context({document: dom.window.document, window: dom.window,
        AppState: {currentNote: note, updateNote: patch => Object.assign(note, patch)}});
    load(ctx, 'DictModalService');
    ctx.DictModalService.show();
    const document = dom.window.document;
    document.querySelector('.dict-edit').click();
    const input = document.querySelector('.dict-connections');
    input.value = `${first}, ${second}`;
    input.dispatchEvent(new dom.window.Event('input'));
    const fields = [...document.querySelectorAll('textarea[data-connection]')];
    assert.equal(fields[0].value, 'АЦП выполняет измерения');
    fields[1].value = 'Обмен данными по SPI';
    document.querySelector('.dict-save').click();
    assert.equal(note.dictionary[0].connection_explanations[first], 'АЦП выполняет измерения');
    assert.equal(note.dictionary[0].connection_explanations[second], 'Обмен данными по SPI');
    document.querySelector('.dict-edit').click();
    const reopened = [...document.querySelectorAll('textarea[data-connection]')];
    assert.deepEqual(reopened.map(field => field.value), ['АЦП выполняет измерения', 'Обмен данными по SPI']);
});
