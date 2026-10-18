const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('symbol definitions work across blocks, preserve drafts, and remain usable on narrow screens', async t => {
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import FormulaModalService from './fastapi_app/static/js/notes/FormulaModalService.js';
        import MathSymbolController from './fastapi_app/static/js/notes/MathSymbolController.js';
        import MathSymbols from './fastapi_app/static/js/notes/MathSymbols.js';
        import katex from 'katex';
        import DOMPurify from 'dompurify';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {AppState, BlockDOMRenderer, EditorManager, FormulaModalService, MathSymbolController, MathSymbols, katex, DOMPurify, renderMathInElement});`,
        resolveDir: path.resolve(__dirname, '../..')}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 980, height: 860, isMobile: true, hasTouch: true});
        const translations = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><script id="i18n-data" type="application/json">'
            + JSON.stringify(translations) + '</script><div id="blocks-container" class="mode-no-dialectics"></div><div id="modal-container" class="hidden"></div></body></html>');
        for (const file of ['node_modules/katex/dist/katex.min.css', 'fastapi_app/static/css/math.css',
            'fastapi_app/static/css/math-symbols.css', 'fastapi_app/static/css/formula-zoom.css',
            'fastapi_app/static/css/editor.css', 'fastapi_app/static/css/modals.css']) {
            await page.addStyleTag({path: path.resolve(__dirname, '../..', file)});
        }
        await page.addStyleTag({content: '.hidden{display:none}body{font:18px/1.5 sans-serif;margin:24px}.dialectics-block{margin-bottom:24px;padding:16px;border:1px solid #ddd}.block-toolbar,.block-header,.add-block-actions,.block-stickers-panel,.block-mobile-actions,.block-role-help{display:none}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            window.formula = String.raw`h_k=\tanh(h_{k-1}+x_k)`;
            const span = document.createElement('span'); span.className = 'math-inline'; span.setAttribute('formula', formula); span.textContent = formula;
            AppState.setNote({id: 1, revision: 1, math_symbols: [{symbol: 'h', definition: 'Состояние сети'}],
                blocks: ['first', 'second'].map(id => ({id, side: 'center', role: 'step1', title: id, html: '<p>' + span.outerHTML + '</p>'}))});
            BlockDOMRenderer.renderAll();
            EditorManager.init();
            MathSymbolController.init();
        });
        const symbol = (block, value) => `#${block} [aria-label=${JSON.stringify(value)}][data-math-symbol]`;
        const point = async (block, value) => page.$eval(symbol(block, value), el => {
            const glyph = el.querySelector('.mathnormal, .mop, .mrel, .mbin') || el;
            const rect = glyph.getBoundingClientRect();
            return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
        });
        const clickSymbol = async (block, value) => {
            const {x, y} = await point(block, value);
            await page.mouse.click(x, y);
        };
        const hover = async (block, value) => {
            await page.mouse.move(1, 1);
            const {x, y} = await point(block, value);
            await page.mouse.move(x, y);
            await page.waitForSelector('.math-symbol-tooltip');
        };
        const openDefinition = async (block, value) => {
            await hover(block, value);
            await clickSymbol(block, value);
            await page.click('.math-symbol-edit');
            await page.waitForSelector('.formula-definition-text');
        };
        const fill = async value => {
            await page.$eval('.formula-definition-text', (input, text) => {
                input.value = text; input.dispatchEvent(new Event('input', {bubbles: true}));
            }, value);
        };
        await t.test('indexed atoms inherit common definitions; opening a tooltip keeps source intact', async () => {
            await hover('first', 'h_{k-1}');
            assert.equal(await page.$eval('.math-symbol-tooltip .math-symbol-definition', el => el.textContent), 'Состояние сети');
            assert.equal(await page.$eval('#first annotation', el => el.textContent), String.raw`h_k=\tanh(h_{k-1}+x_k)`);
            assert.equal(await page.$eval('#first .katex-error', el => el.textContent).catch(() => null), null);
            await page.keyboard.press('Escape');
            assert.equal(await page.$('.math-symbol-tooltip'), null);
        });
        await t.test('enlarged formulas open the selected definition editor for adding, changing and cancelling on desktop and mobile', async () => {
            const saved = await page.evaluate(() => JSON.stringify(AppState.currentNote));
            const formula = String.raw`\tanh(a)=\frac{e^a-e^{-a}}{e^a+e^{-a}}`;
            const openFromZoom = async label => {
                await page.tap('#first .math-expand-button');
                await page.waitForSelector('.formula-zoom-dialog[open]');
                await page.focus('.formula-zoom-content [aria-label="a"][data-math-symbol]');
                await page.keyboard.press('Enter');
                await page.waitForSelector('.math-symbol-tooltip .math-symbol-edit', {visible: true});
                assert.equal(await page.$eval('.math-symbol-edit', el => el.textContent), label);
                assert.equal(await page.$eval('.math-symbol-tooltip', el => {
                    const rect = el.getBoundingClientRect();
                    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
                }), true);
                await page.tap('.math-symbol-edit');
                await page.waitForSelector('.formula-definition-text', {visible: true});
                assert.equal(await page.$('.formula-zoom-dialog'), null);
                assert.equal(await page.$eval('#formula-input', el => el.readOnly && el.value === window.zoomFormula), true);
                assert.equal(await page.$eval('.formula-definition-chips [aria-pressed="true"]', el => el.dataset.symbol), 'a');
                assert.equal(await page.evaluate(() => document.activeElement.matches('.formula-definition-text')), true);
            };
            try {
                for (const width of [980, 360]) {
                    await page.setViewport({width, height: 860, isMobile: true, hasTouch: true});
                    const html = await page.evaluate(formula => {
                        window.zoomFormula = formula;
                        const span = document.createElement('span');
                        span.className = 'math-inline'; span.setAttribute('formula', formula);
                        const html = '<p>' + span.outerHTML + '</p>';
                        AppState.setNote({id: 17, math_symbols: [], blocks: ['first', 'second'].map(id => ({id, side: 'center', html}))});
                        BlockDOMRenderer.renderAll();
                        return html;
                    }, formula);
                    await openFromZoom('Добавить определение');
                    await page.select('.formula-definition-scope', 'block');
                    await fill('Аргумент гиперболического тангенса');
                    await page.tap('#btn-formula-save');
                    await page.waitForSelector('#formula-editor-modal', {hidden: true});
                    assert.deepEqual(await page.evaluate(() => JSON.parse(JSON.stringify({note: AppState.currentNote.math_symbols,
                        first: AppState.getBlock('first').math_symbols, second: AppState.getBlock('second').math_symbols || []}))),
                    {note: [], first: [{symbol: 'a', definition: 'Аргумент гиперболического тангенса'}], second: []});
                    await openFromZoom('Изменить определение');
                    assert.equal(await page.$eval('.formula-definition-text', el => el.value), 'Аргумент гиперболического тангенса');
                    await fill('Отменённая правка');
                    await page.keyboard.press('Escape');
                    await page.waitForSelector('#formula-editor-modal', {hidden: true});
                    assert.equal(await page.evaluate(() => AppState.getBlock('first').math_symbols[0].definition), 'Аргумент гиперболического тангенса');
                    await openFromZoom('Изменить определение');
                    await fill('Обновлённый аргумент');
                    await page.tap('#btn-formula-save');
                    await page.waitForSelector('#formula-editor-modal', {hidden: true});
                    assert.equal(await page.evaluate(() => AppState.getBlock('first').math_symbols[0].definition), 'Обновлённый аргумент');
                    assert.deepEqual(await page.evaluate(() => AppState.currentNote.blocks.map(block => block.html)), [html, html]);
                    assert.equal(await page.$eval('#first annotation', el => el.textContent), formula);
                }
            } finally {
                await page.evaluate(data => { AppState.setNote(JSON.parse(data)); BlockDOMRenderer.renderAll(); }, saved);
                await page.setViewport({width: 980, height: 860, isMobile: true, hasTouch: true});
            }
        });
        await t.test('block 12 output formulas expose definitions for operands and an unbraced transpose', async () => {
            const saved = await page.evaluate(() => JSON.stringify(AppState.getBlock('first')));
            try {
                await page.evaluate(() => {
                    const formulas = [String.raw`W_{\mathrm{out}}=E^{\mathsf T},`, String.raw`z=h_{\mathrm{att}}E^{\mathsf T}.`];
                    const html = formulas.map(formula => {
                        const span = document.createElement('span');
                        span.className = 'math-inline'; span.setAttribute('formula', formula);
                        return span.outerHTML;
                    }).join(' ');
                    AppState.updateBlock('first', {html: '<p>' + html + '</p>', math_symbols: [
                        {symbol: String.raw`W_{\mathrm{out}}`, definition: 'Output matrix'},
                        {symbol: 'E', definition: 'Embedding matrix'},
                        {symbol: String.raw`h_{\mathrm{att}}`, definition: 'Attention state'},
                        {symbol: String.raw`\mathsf{T}`, definition: 'Transpose'},
                        {symbol: 'z', definition: 'Logits'},
                    ]});
                    BlockDOMRenderer.renderAll();
                });
                for (const [symbol, definition] of [[String.raw`W_{\mathrm{out}}`, 'Output matrix'],
                    ['E', 'Embedding matrix'], [String.raw`h_{\mathrm{att}}`, 'Attention state'],
                    [String.raw`\mathsf{T}`, 'Transpose'], ['z', 'Logits']]) {
                    await hover('first', symbol);
                    assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), definition);
                    await page.keyboard.press('Escape');
                }
                assert.deepEqual(await page.$$eval('#first annotation', els => els.map(el => el.textContent)),
                    [String.raw`W_{\mathrm{out}}=E^{\mathsf T},`, String.raw`z=h_{\mathrm{att}}E^{\mathsf T}.`]);
            } finally {
                await page.evaluate(data => { AppState.updateBlock('first', {math_symbols: [], ...JSON.parse(data)}); BlockDOMRenderer.renderAll(); }, saved);
            }
        });
        await t.test('reading-view edit updates every repetition and local override wins only in its block', async () => {
            await openDefinition('first', 'h_{k-1}');
            await fill('Общее состояние');
            await page.click('#btn-formula-save');
            await hover('second', 'h_{k}');
            assert.equal(await page.$eval('.math-symbol-tooltip .math-symbol-definition', el => el.textContent), 'Общее состояние');
            await page.keyboard.press('Escape');
            await openDefinition('first', 'h_{k-1}');
            await page.select('.formula-definition-scope', 'block');
            await fill('Локальное состояние');
            await page.click('#btn-formula-save');
            await hover('first', 'h_{k}');
            assert.equal(await page.$eval('.math-symbol-tooltip .math-symbol-definition', el => el.textContent), 'Локальное состояние');
            await page.keyboard.press('Escape');
            await hover('second', 'h_{k}');
            assert.equal(await page.$eval('.math-symbol-tooltip .math-symbol-definition', el => el.textContent), 'Общее состояние');
            await page.keyboard.press('Escape');
        });
        await t.test('removing local meaning restores inheritance and formula cancellation discards edits', async () => {
            await openDefinition('first', 'h_{k}');
            await page.click('.formula-definition-delete');
            await page.click('#btn-formula-save');
            await hover('first', 'h_{k}');
            assert.equal(await page.$eval('.math-symbol-tooltip .math-symbol-definition', el => el.textContent), 'Общее состояние');
            await page.keyboard.press('Escape');
            await openDefinition('first', 'h_{k}');
            await fill('Отменённая правка');
            await page.click('#btn-formula-cancel');
            assert.equal(await page.evaluate(() => AppState.currentNote.math_symbols[0].definition), 'Общее состояние');
        });
        await t.test('definition conflicts show saved meanings and other blocks and can reuse them on mobile', async () => {
            const saved = await page.evaluate(() => JSON.stringify(AppState.currentNote));
            try {
                await page.evaluate(() => AppState.updateBlock('second', {
                    title: 'Механизм внимания', math_symbols: [{symbol: 'h', definition: 'Вектор контекста'}],
                }));
                await openDefinition('first', 'h_{k}');
                assert.match(await page.$eval('.formula-definition-check', el => el.textContent), /Механизм внимания/);
                await fill('Новое состояние');
                assert.equal(await page.$eval('.formula-definition-check', el => el.dataset.state), 'conflict');
                assert.match(await page.$eval('.formula-definition-check', el => el.textContent), /Общее состояние/);
                assert.equal(await page.evaluate(() => AppState.currentNote.math_symbols[0].definition), 'Общее состояние');
                await page.click('.formula-definition-reuse');
                assert.equal(await page.$eval('.formula-definition-text', el => el.value), 'Общее состояние');
                await page.select('.formula-definition-scope', 'block');
                await fill('Общее состояние');
                assert.equal(await page.$eval('.formula-definition-check', el => el.dataset.state), 'info',
                    'a definition confined to another block does not conflict with this block');
                await fill('Локальное состояние');
                await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
                await page.$eval('.formula-definition-check', el => el.scrollIntoView({block: 'center'}));
                assert.equal(await page.$eval('.formula-definition-check', el => {
                    const rect = el.getBoundingClientRect();
                    return rect.left >= 0 && rect.right <= innerWidth && el.scrollWidth <= el.clientWidth;
                }), true);
                await fs.mkdir(path.resolve(__dirname, '../../tmp'), {recursive: true});
                await page.screenshot({path: path.resolve(__dirname, '../../tmp/math-symbol-conflicts-mobile.png')});
                await page.click('#btn-formula-cancel');
                assert.equal(await page.evaluate(() => AppState.getBlock('first').math_symbols.length), 0);
            } finally {
                await page.evaluate(data => { AppState.setNote(JSON.parse(data)); BlockDOMRenderer.renderAll(); }, saved);
                await page.setViewport({width: 980, height: 860, isMobile: true, hasTouch: true});
            }
        });
        await t.test('outer editor cancel and OK have the same semantics for text and symbol drafts', async () => {
            const open = async () => page.evaluate(() => {
                EditorManager.openModalEditor('first', document.getElementById('first'));
                window.symbolPromise = FormulaModalService.open({initialFormula: formula,
                    symbolContext: EditorManager.currentEditor.storage.mathSymbols, selectedSymbol: 'h'});
            });
            await open();
            assert.equal(await page.evaluate(() => EditorManager.currentEditor.storage.mathSymbols.blocks.length), 2);
            await fill('Черновик'); await page.click('#btn-formula-save');
            assert.equal(await page.evaluate(() => EditorManager.currentEditor.storage.mathSymbols.note[0].definition), 'Черновик');
            assert.equal(await page.evaluate(() => AppState.currentNote.math_symbols[0].definition), 'Общее состояние');
            await page.evaluate(() => EditorManager.closeModal(false));
            assert.equal(await page.evaluate(() => AppState.currentNote.math_symbols[0].definition), 'Общее состояние');
            await open(); await fill('Сохранённый черновик'); await page.click('#btn-formula-save');
            await page.evaluate(() => EditorManager.handleSave());
            assert.equal(await page.evaluate(() => AppState.currentNote.math_symbols[0].definition), 'Сохранённый черновик');
            await hover('second', 'h_{k}');
            assert.equal(await page.$eval('.math-symbol-tooltip .math-symbol-definition', el => el.textContent), 'Сохранённый черновик');
            await page.keyboard.press('Escape');
        });
        await t.test('hovering t inside h_{t-1} shows t and definitions render inline and display TeX', async () => {
            await page.evaluate(() => {
                AppState.updateNote({math_symbols: [
                    {symbol: 'h_{t-1}', definition: String.raw`Предыдущее состояние перед шагом \(t\).`},
                    {symbol: 't', definition: String.raw`Номер текущего шага. \[t = 1, 2, 3\]`},
                ]});
                AppState.updateBlock('first', {html: '<p><span class="math-inline" formula="h_{t-1}">h_{t-1}</span></p>'});
                BlockDOMRenderer.renderAll();
            });
            try {
                // Select the h glyph, rather than the bounding box shared with t.
                await hover('first', 'h_{t-1}');
                assert.equal(await page.$eval('.math-symbol-definition .katex annotation', el => el.textContent), 't');
                assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent.includes('\\(')), false);
                await page.keyboard.press('Escape');
                await hover('first', 't');
                assert.match(await page.$eval('.math-symbol-definition', el => el.textContent), /Номер текущего шага/);
                assert.equal(await page.$eval('.math-symbol-definition .katex-display annotation', el => el.textContent.trim()), 't = 1, 2, 3');
                await clickSymbol('first', 't');
                await page.click('.math-symbol-edit');
                assert.equal(await page.$eval('.formula-definition-chips [aria-pressed="true"]', el => el.dataset.symbol), 't');
                assert.match(await page.$eval('.formula-definition-text', el => el.value), /Номер текущего шага/);
                await page.click('#btn-formula-cancel');
            } finally {
                await page.evaluate(() => {
                    const span = document.createElement('span'); span.className = 'math-inline'; span.setAttribute('formula', formula); span.textContent = formula;
                    AppState.updateBlock('first', {html: '<p>' + span.outerHTML + '</p>'});
                    BlockDOMRenderer.renderAll();
                });
            }
        });
        await t.test('computed vectors appear at later uses, keep every distinct result and track edits', async () => {
            const saved = await page.evaluate(() => JSON.stringify(AppState.currentNote));
            await page.evaluate(() => {
                const math = formula => {
                    const span = document.createElement('span'); span.className = 'math-inline';
                    span.setAttribute('formula', formula); span.textContent = formula;
                    return '<p>' + span.outerHTML + '</p>';
                };
                window.resultHtml = '<p>После слова «кошка»:</p>'
                    + math(String.raw`h_t=\tanh(x_t+h_{t-1})\approx[0.2,0.3,0.4]`)
                    + '<p>После четырёх прочитанных слов:</p>'
                    + math(String.raw`h_t=\tanh([0.90,-0.55,0.21]+h_{t-1})\approx[0.5709,-0.3825,0.7647]`);
                AppState.setNote({id: 10, revision: 1, math_symbols: [{symbol: 'h_t', definition: 'Скрытое состояние'}], blocks: [
                    {id: 'computed', title: 'Обработка слов', side: 'center', html: resultHtml},
                    {id: 'usage', title: 'Оценки следующих слов', side: 'center', html: math(String.raw`z=h_t^\top W+b`)},
                    {id: 'future', title: 'Следующий расчёт', side: 'center', html: math('h_t=[9,9,9]')},
                ]});
                BlockDOMRenderer.renderAll();
            });
            try {
                await hover('usage', 'h_{t}');
                assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), 'Скрытое состояние');
                assert.equal(await page.$eval('.math-symbol-values', el => el.open), false);
                assert.equal(await page.$eval('.math-symbol-values > summary', el => el.textContent), 'Вычисленные значения (2)');
                assert.equal(await page.$eval('.math-symbol-values li', el => el.checkVisibility()), false);
                await page.click('.math-symbol-values > summary');
                await page.waitForFunction(() => document.querySelector('.math-symbol-values')?.open);
                const rows = await page.$$eval('.math-symbol-values li', nodes => nodes.map(el => ({
                    formula: el.querySelector('annotation').textContent, source: el.querySelector('small').textContent,
                })));
                assert.deepEqual(rows.map(row => row.formula), [String.raw`h_{t} \approx [0.2,0.3,0.4]`, String.raw`h_{t} \approx [0.5709,-0.3825,0.7647]`]);
                assert.deepEqual(rows.map(row => row.source), ['Блок 1: Обработка слов', 'Блок 1: Обработка слов']);
                assert.equal(await page.$$eval('.math-symbol-values .katex-error', nodes => nodes.length), 0);
                await page.click('.math-symbol-values > summary');
                await page.waitForFunction(() => !document.querySelector('.math-symbol-values')?.open);
                await page.keyboard.press('Escape');
                await page.evaluate(() => { AppState.updateBlock('computed', {html: '<p>Расчёты удалены</p>'}); BlockDOMRenderer.renderAll(); });
                await hover('usage', 'h_{t}');
                assert.equal(await page.$('.math-symbol-values'), null, 'deleted and future values must not survive in the tooltip');
                await page.keyboard.press('Escape');
            } finally {
                await page.evaluate(data => { AppState.setNote(JSON.parse(data)); BlockDOMRenderer.renderAll(); }, saved);
            }
        });
        await t.test('a single computed value is collapsible and names its source block without adjacent prose', async () => {
            const saved = await page.evaluate(() => JSON.stringify(AppState.currentNote));
            await page.evaluate(() => {
                const span = document.createElement('span'); span.className = 'math-inline';
                span.setAttribute('formula', String.raw`h_4\approx[0.533425,-0.325720,0.732975]`);
                AppState.setNote({id: 11, revision: 1, math_symbols: [{symbol: 'h', definition: 'скрытое состояние'}], blocks: [
                    {id: 'single-result', title: 'Возникают проблемы с длинными текстами, которые пытаются решить механизмом внимания',
                        side: 'center', html: '<p>Соседний абзац не относится к значению.</p><ul><li>после «кошка сидит на»; '
                            + span.outerHTML + '</li></ul>'},
                ]});
                BlockDOMRenderer.renderAll();
            });
            try {
                await hover('single-result', 'h_{4}');
                assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), 'скрытое состояние');
                assert.equal(await page.$eval('.math-symbol-values > summary', el => el.textContent), 'Вычисленное значение (1)');
                assert.equal(await page.$eval('.math-symbol-values', el => el.open), false);
                await page.focus('.math-symbol-values > summary');
                await page.keyboard.press('Enter');
                await page.waitForFunction(() => document.querySelector('.math-symbol-values')?.open);
                assert.equal(await page.$eval('.math-symbol-values annotation', el => el.textContent),
                    String.raw`h_{4} \approx [0.533425,-0.325720,0.732975]`);
                assert.equal(await page.$eval('.math-symbol-values small', el => el.textContent),
                    'Блок 1: Возникают проблемы с длинными текстами, которые пытаются решить механизмом внимания');
                const text = await page.$eval('.math-symbol-tooltip', el => el.textContent);
                for (const prose of ['Соседний абзац', 'кошка сидит на']) {
                    assert.equal(text.includes(prose), false, prose);
                }
                await page.keyboard.press('Escape');
            } finally {
                await page.evaluate(data => { AppState.setNote(JSON.parse(data)); BlockDOMRenderer.renderAll(); }, saved);
            }
        });
        await t.test('a long computed history stays compact and expands within desktop and mobile viewports', async () => {
            const saved = await page.evaluate(() => JSON.stringify(AppState.currentNote));
            await page.evaluate(() => {
                const math = formula => {
                    const span = document.createElement('span'); span.className = 'math-inline';
                    span.setAttribute('formula', formula);
                    return '<p>' + span.outerHTML + '</p>';
                };
                const results = Array.from({length: 20}, (_, i) => math(`h_{${i}}=[${i},0,1]`));
                AppState.setNote({id: 12, revision: 1, math_symbols: [{symbol: 'h', definition: 'Скрытое состояние'}], blocks: [
                    {id: 'early-results', title: 'Начальные шаги', side: 'center', html: results.slice(0, 10).join('')},
                    {id: 'later-results', title: 'Последующие шаги', side: 'center', html: results.slice(10).join('')},
                    {id: 'many-use', side: 'center', html: math('z=h_t+b')},
                ]});
                BlockDOMRenderer.renderAll();
            });
            try {
                for (const width of [980, 360]) {
                    await page.setViewport({width, height: 740, isMobile: true, hasTouch: true});
                    await page.$eval('#many-use', el => el.scrollIntoView({block: 'center'}));
                    await hover('many-use', 'h_{t}');
                    await clickSymbol('many-use', 'h_{t}');
                    assert.equal(await page.$eval('.math-symbol-values > summary', el => el.textContent), 'Вычисленные значения (20)');
                    assert.equal(await page.$eval('.math-symbol-tooltip', el => el.getBoundingClientRect().height < 280), true);
                    if (width === 360) await page.screenshot({path: path.resolve(__dirname, '../../tmp/math-computed-values-collapsed-mobile.png')});
                    await page.tap('.math-symbol-values > summary');
                    await page.waitForFunction(() => document.querySelector('.math-symbol-values')?.open, {timeout: 5000});
                    await page.waitForFunction(() => {
                        const rect = document.querySelector('.math-symbol-tooltip').getBoundingClientRect();
                        return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
                    }, {timeout: 5000});
                    assert.equal(await page.$eval('.math-symbol-tooltip', el => {
                        const rect = el.getBoundingClientRect();
                        return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight
                            && el.scrollWidth <= el.clientWidth && el.scrollHeight > el.clientHeight;
                    }), true);
                    const sources = await page.$$eval('.math-symbol-values small', els => els.map(el => el.textContent));
                    assert.deepEqual(sources, Array(10).fill('Блок 1: Начальные шаги').concat(Array(10).fill('Блок 2: Последующие шаги')));
                    if (width === 360) await page.screenshot({path: path.resolve(__dirname, '../../tmp/math-computed-values-expanded-mobile.png')});
                    await page.tap('.math-symbol-values > summary');
                    await page.waitForFunction(() => !document.querySelector('.math-symbol-values')?.open
                        && document.querySelector('.math-symbol-tooltip').getBoundingClientRect().height < 280);
                    await page.keyboard.press('Escape');
                }
            } finally {
                await page.evaluate(data => { AppState.setNote(JSON.parse(data)); BlockDOMRenderer.renderAll(); }, saved);
                await page.setViewport({width: 980, height: 860, isMobile: true, hasTouch: true});
            }
        });
        await t.test('mobile tap pins an inert definition and the popover stays inside the viewport', async () => {
            await page.setViewport({width: 360, height: 740, isMobile: true, hasTouch: true});
            await page.evaluate(() => { AppState.updateNote({math_symbols: [{symbol: 'h', definition: '<img src=x onerror="window.attacked=1">'}]}); BlockDOMRenderer.renderAll(); });
            const {x, y} = await point('first', 'h_{k}');
            await page.touchscreen.tap(x, y);
            await page.waitForSelector('.math-symbol-tooltip');
            const result = await page.$eval('.math-symbol-tooltip', el => {
                const rect = el.getBoundingClientRect();
                return {inViewport: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
                    images: el.querySelectorAll('img').length, text: el.querySelector('.math-symbol-definition').textContent};
            });
            assert.deepEqual(result, {inViewport: true, images: 0, text: '<img src=x onerror="window.attacked=1">'});
            await fs.mkdir(path.resolve(__dirname, '../../tmp'), {recursive: true});
            await page.screenshot({path: path.resolve(__dirname, '../../tmp/math-symbols-mobile.png')});
            await page.keyboard.press('Escape');
        });
        await t.test('opening another note closes its definition editor without modifying the destination', async () => {
            await page.setViewport({width: 980, height: 860, isMobile: true, hasTouch: true});
            await openDefinition('first', 'h_{k}');
            await fill('Не переносить');
            await page.evaluate(() => AppState.setNote({id: 2, blocks: []}));
            assert.equal(await page.$('#formula-editor-modal'), null);
            assert.deepEqual(await page.evaluate(() => [...AppState.currentNote.math_symbols]), []);
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
