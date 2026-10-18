const {test} = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function setup() {
    const ctx = context();
    for (const name of ['NoteText', 'MathSymbols', 'NoteContextSearch', 'MathDefinitionContext']) load(ctx, name);
    return ctx;
}

test('single-letter symbols find distant definitions, including the end of long blocks', () => {
    const {MathDefinitionContext: search} = setup();
    const note = {title: 'Сеть', blocks: [
        {id: 'local', html: '<p><span formula="h_t=x_t+h_{t-1}"></span></p>'},
        {id: 'unrelated', html: '<p>История математики.</p>'},
        {id: 'distant', html: '<p>' + 'Введение. '.repeat(700) + '$h_t$ — скрытое состояние сети.</p>'},
        {id: 'plain', html: '<p>h_t — обозначение текущего скрытого состояния.</p>'},
        {id: 'draft', isDraft: true, html: '<p>$h_t$ — неверное определение.</p>'},
    ]};
    const result = search.build(note, 'local', {symbol: 'h_t', value: '', formula: 'h_t=x_t+h_{t-1}'});
    assert.ok(result.passages.some(item => item.block_id === 'local'));
    assert.ok(result.passages.some(item => item.block_id === 'distant' && item.text.includes('скрытое состояние')));
    assert.ok(result.passages.some(item => item.block_id === 'plain'));
    assert.ok(!result.passages.some(item => item.block_id === 'draft'));
    assert.ok(result.passages.every(item => item.text.length <= 1200));
});

test('bounded context includes existing definitions and hidden hints as plain text', () => {
    const {MathDefinitionContext: search} = setup();
    const note = {math_symbols: [{symbol: 'a', definition: 'Коэффициент'}], blocks: Array.from({length: 20}, (_, i) => ({
        id: String(i), html: '<p><span data-type="hidden-phrase" data-hint="Норма вектора">0.002154433</span></p>',
    }))};
    const result = search.build(note, '0', {symbol: '', value: '0.002154433', formula: 'a/0.002154433', start: 2, end: 13});
    assert.ok(result.passages.length <= 8);
    assert.ok(result.passages.some(item => item.text.includes('Норма вектора')));
    assert.ok(result.passages.some(item => item.text.includes('Коэффициент')));
    assert.ok(result.passages.every(item => !item.text.includes('<span')));
});

test('a number definition applies only to the same formula and position, with undo support', () => {
    const ctx = setup();
    load(ctx, 'AppState');
    const target = {formula: '0.2+0.2', start: 0, end: 3, value: '0.2'};
    assert.equal(ctx.MathDefinitionContext.sameNumber(target, {...target}), true);
    assert.equal(ctx.MathDefinitionContext.sameNumber(target, {...target, start: 4, end: 7}), false);
    assert.equal(ctx.MathDefinitionContext.sameNumber(target, {...target, formula: '0.2-0.2'}), false);
    ctx.AppState.setNote({blocks: [{id: 'b', html: 'text'}]});
    ctx.AppState.updateBlock('b', {math_number_definitions: [{...target, definition: 'Первое слагаемое'}]});
    ctx.AppState.restoreBlockVersion('b', 'undo');
    assert.equal(ctx.AppState.getBlock('b').math_number_definitions, undefined);
    ctx.AppState.restoreBlockVersion('b', 'redo');
    assert.equal(ctx.AppState.getBlock('b').math_number_definitions[0].definition, 'Первое слагаемое');
});
