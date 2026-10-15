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
            'fastapi_app/static/css/math-symbols.css', 'fastapi_app/static/css/editor.css', 'fastapi_app/static/css/modals.css']) {
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
        const symbol = (block, value) => `#${block} [aria-label="${value}"][data-math-symbol]`;
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
        await t.test('outer editor cancel and OK have the same semantics for text and symbol drafts', async () => {
            const open = async () => page.evaluate(() => {
                EditorManager.openModalEditor('first', document.getElementById('first'));
                window.symbolPromise = FormulaModalService.open({initialFormula: formula,
                    symbolContext: EditorManager.currentEditor.storage.mathSymbols, selectedSymbol: 'h'});
            });
            await open(); await fill('Черновик'); await page.click('#btn-formula-save');
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
                const rows = await page.$$eval('.math-symbol-values li', nodes => nodes.map(el => ({
                    formula: el.querySelector('annotation').textContent, source: el.querySelector('small').textContent,
                })));
                assert.deepEqual(rows.map(row => row.formula), [String.raw`h_{t} \approx [0.2,0.3,0.4]`, String.raw`h_{t} \approx [0.5709,-0.3825,0.7647]`]);
                assert.match(rows[0].source, /Расчёт 1.*Обработка слов.*кошка/);
                assert.match(rows[1].source, /Расчёт 2.*четырёх/);
                assert.equal(await page.$$eval('.math-symbol-values .katex-error', nodes => nodes.length), 0);
                await page.keyboard.press('Escape');
                await page.evaluate(() => { AppState.updateBlock('computed', {html: '<p>Расчёты удалены</p>'}); BlockDOMRenderer.renderAll(); });
                await hover('usage', 'h_{t}');
                assert.equal(await page.$('.math-symbol-values'), null, 'deleted and future values must not survive in the tooltip');
                await page.keyboard.press('Escape');
            } finally {
                await page.evaluate(data => { AppState.setNote(JSON.parse(data)); BlockDOMRenderer.renderAll(); }, saved);
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
