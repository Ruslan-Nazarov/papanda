const {test} = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function search(blocks, options) {
    const ctx = context();
    load(ctx, 'NoteText');
    load(ctx, 'NoteContextSearch');
    return new ctx.NoteContextSearch(blocks, options);
}

test('finds inflected terms in a distant block, including the end of a long block', () => {
    const index = search([
        {id: 'local', title: 'Пример', html: '<p>Изменение скрытых состояний</p>'},
        {id: 'unrelated', title: 'История', html: '<p>История вычислительной техники</p>'},
        {id: 'definition', title: 'Векторы', html: '<p>' + 'Введение. '.repeat(700) +
            'Скрытое состояние — вектор, хранящий информацию о предыдущих словах.</p>'},
        {id: 'draft', isDraft: true, html: '<p>Скрытые состояния — неверный черновик</p>'},
    ]);
    const hits = index.search({text: 'скрытых состояний', blockId: 'local'});
    const definition = hits.find(hit => hit.block_id === 'definition');
    assert.match(definition.text, /хранящий информацию/);
    assert.equal(hits.find(hit => hit.block_id === 'draft').kind, 'draft');
    assert(hits.every(hit => ['definition', 'draft'].includes(hit.block_id)));
});

test('follow-up question searches again and prioritizes the new topic', () => {
    const index = search([
        {id: 'state', title: 'Hidden state', html: '<p>A hidden state represents previous inputs.</p>'},
        {id: 'mask', title: 'Causal masking', html: '<p>A causal mask prevents attention to future positions.</p>'},
    ]);
    assert.equal(index.search({text: 'hidden states'})[0].block_id, 'state');
    assert.equal(index.search({text: 'hidden states', question: 'Why use causal masking?'})[0].block_id, 'mask');
});

test('bounded excerpts preserve formulas and hidden explanations without sending markup', () => {
    const index = search(Array.from({length: 15}, (_, i) => ({id: String(i + 1), title: 'Определение вектора',
        html: '<p><span formula="h_t = f(h_{t-1})">duplicate</span>' +
            '<span data-type="hidden-phrase" data-hint="Вектор хранит память">Состояние</span></p>' +
            '<script>private script</script>' + '<p>Вектор состояния. </p>'.repeat(200)})));
    const hits = index.search({text: 'вектор состояния', question: 'память h_t'});
    assert.equal(hits.length, 5);
    assert(hits.every(hit => hit.text.length <= 1200 && hit.title.length <= 500));
    assert(hits.every(hit => !/private script|duplicate|<p>/.test(hit.text)));
    assert.match(hits[0].text, /h_t = f\(h_\{t-1\}\)/);
    assert.match(hits[0].text, /Вектор хранит память/);
    for (const id of new Set(hits.map(hit => hit.block_id))) assert(hits.filter(hit => hit.block_id === id).length <= 2);
});

test('empty and unrelated notes return no passages and indexes never share note content', () => {
    assert.equal(search([]).search({text: 'hidden states'}).length, 0);
    search([{id: 'private', html: '<p>Hidden states</p>'}]);
    const other = search([{id: 'other', html: '<p>Архитектура компьютера</p>'}]);
    assert.equal(other.search({text: 'hidden states'}).length, 0);
    assert.equal(other.search({text: 'Что это и как?'}).length, 0);
});

test('overlapping excerpts keep complete formulas at both boundaries', () => {
    const formula = 'h_t=' + 'x_1+'.repeat(90) + 'x_2';
    const index = search([{id: 'formula', title: 'Оценка состояния',
        html: '<p>' + 'Вводный текст. '.repeat(68) + '</p><p><span formula="' + formula + '"></span></p>'
            + '<p>' + 'Оценка состояния. '.repeat(100) + '</p>'}]);
    const containing = index.chunks.filter(chunk => chunk.text.includes('h_t='));
    assert.ok(containing.length);
    for (const chunk of index.chunks) {
        assert.ok(chunk.text.length <= 1200);
        if (chunk.text.includes('$')) assert.ok(chunk.text.includes('$' + formula + '$'), chunk.text);
        assert.equal(chunk.text.startsWith('x_1+'), false);
    }
});

test('search combines dictionary relations, links, rejected drafts and previous versions with explicit provenance', () => {
    const index = search([{id: 'local', title: 'Attention', html: '<p>Attention uses a hidden state. '
        + '<a href="https://example.org/attention">Attention paper</a></p>',
        rejected_drafts: [{id: 'd1', html: '<p>Attention reads future tokens.</p>', reason: 'Causal masking was missing'}]},
    {id: 'other', title: 'Attention mechanism', html: '<p>Attention combines values.</p>'}], {
        dictionary: [{word: 'Attention', definition: 'Weighted combination of values', connections: 'Query',
            connection_explanations: {Query: 'The query determines the attention weights'}}],
        versions: [{block_id: 'local', snapshots: [{title: 'Attention', html: '<p>Attention uses one value.</p>'}]}],
    });
    const hits = index.search({text: 'Attention', blockId: 'local'});
    assert.equal(hits.length, 5);
    assert.deepEqual(new Set(hits.map(hit => hit.kind || 'block')), new Set(['block', 'dictionary', 'link', 'draft', 'version']));
    assert.match(hits.find(hit => hit.kind === 'dictionary').text, /query determines/);
    assert.equal(hits.find(hit => hit.kind === 'link').url, 'https://example.org/attention');
    assert.equal(hits.find(hit => hit.kind === 'draft').reason, 'Causal masking was missing');
    assert.equal(hits.find(hit => hit.kind === 'version').reference, '1');
});

test('multiline single-dollar equations and oversized formulas never become partial TeX excerpts', () => {
    const formula = String.raw`\begin{aligned} s_1&=h_1\cdot h_2\\
        &\approx 0.207221+0.038900+0.366869\\
        &\approx 0.612990.\end{aligned}`;
    const text = 'Attention. '.repeat(105) + '$' + formula + '$' + ' Attention output. '.repeat(100);
    const index = search([{id: 'math', title: 'Attention', html: '<p>' + text + '</p>'}]);
    const formulas = index.chunks.filter(chunk => chunk.text.includes('begin'));
    assert(formulas.length);
    for (const chunk of formulas) assert(chunk.text.includes('$' + formula + '$'));
    const huge = search([{id: 'huge', title: 'Attention',
        html: '<p>$\\begin{aligned}x=' + 'x+'.repeat(1200) + 'y\\end{aligned}$ Attention after.</p>'}]);
    assert(huge.chunks.every(chunk => !chunk.text.includes('x+') && !chunk.text.includes('end{aligned}')));
});

test('attached block sources contribute saved quotes and URLs even without inline anchors', () => {
    const index = search([{id: 'local', title: 'Attention', sources: [
        {title: 'Attention paper', url: 'https://example.org/paper', quote: 'Attention combines values.'},
        {title: 'Attention note', quote: 'Attention without a URL.'}]}]);
    const hits = index.search({text: 'Attention', blockId: 'local'});
    assert.equal(hits.length, 2);
    assert(hits.every(hit => hit.kind === 'link' && hit.reference === 'saved_quote'));
    assert(hits.some(hit => hit.url === 'https://example.org/paper' && hit.text.includes('combines values')));
    assert(hits.some(hit => !hit.url && hit.text.includes('without a URL')));
});
