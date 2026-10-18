const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('AI formula hints search context, require acceptance, support numbers and cancel stale requests', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import MathSymbols from './fastapi_app/static/js/notes/MathSymbols.js';
        import MathSymbolController from './fastapi_app/static/js/notes/MathSymbolController.js';
        import NotesAPI from './fastapi_app/static/js/notes/api.js';
        import FormulaZoom from './fastapi_app/static/js/notes/FormulaZoom.js';
        import katex from 'katex';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {AppState, MathSymbols, MathSymbolController, NotesAPI, FormulaZoom, katex, renderMathInElement});
    `, resolveDir: root}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 360, height: 800});
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><body><script id="i18n-data" type="application/json">'
            + JSON.stringify(translations) + '</script><main></main></body></html>');
        for (const file of ['node_modules/katex/dist/katex.min.css', 'fastapi_app/static/css/math-symbols.css',
            'fastapi_app/static/css/formula-zoom.css']) {
            await page.addStyleTag({path: path.join(root, file)});
        }
        // This serverless fixture needs embedded fonts for realistic formula layout.
        const fontDir = path.join(root, 'node_modules/katex/dist/fonts');
        for (const file of (await fs.readdir(fontDir)).filter(name => name.endsWith('.woff2'))) {
            const match = /^KaTeX_(.+)-(Regular|Italic|Bold|BoldItalic)\.woff2$/.exec(file);
            if (!match) continue;
            const data = (await fs.readFile(path.join(fontDir, file))).toString('base64');
            await page.addStyleTag({content: `@font-face{font-family:KaTeX_${match[1]};font-style:${match[2].includes('Italic') ? 'italic' : 'normal'};font-weight:${match[2].includes('Bold') ? '700' : '400'};src:url(data:font/woff2;base64,${data}) format('woff2')}`});
        }
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        const reset = async formula => page.evaluate(formula => {
            AppState.setNote({id: 1, title: 'Нормировка', blocks: [
                {id: 'local', html: `<p>$${formula}$ — расчёт отношения.</p>`},
                {id: 'distant', title: 'Определение', html: '<p>$q$ — знаменатель отношения, норма вектора 0.002154433.</p>'},
            ]});
            document.querySelector('main').innerHTML = `<div class="dialectics-block" data-id="local" id="local">${MathSymbols.render(formula)}</div>`;
            window.requests = [];
            window.mode = 'success';
            window.reply = {status: 'found', definition: 'Норма вектора.', reason: '', sources: [
                {block_id: 'distant', title: 'Определение', quote: 'норма вектора 0.002154433'}]};
            NotesAPI.request = async (endpoint, method, body, signal) => {
                requests.push({endpoint, method, body});
                window.requestSignal = signal;
                if (mode === 'pending') return new Promise(resolve => { window.finishRequest = resolve; });
                if (mode === 'error') throw new Error('Unavailable');
                return reply;
            };
            MathSymbolController.init();
        }, formula);
        const open = async selector => {
            await page.focus(selector);
            await page.keyboard.press('Enter');
            await page.waitForSelector('.math-symbol-tooltip');
        };
        const search = async () => {
            await page.click('.math-symbol-suggest');
            await page.waitForSelector('.math-definition-preview', {visible: true});
        };
        await t.test('symbol suggestions carry distant context and stay unsaved until edited and accepted', async () => {
            await reset('p/q');
            await open('#local [aria-label="q"]');
            assert.equal(await page.evaluate(() => requests.length), 0);
            await search();
            assert.equal(await page.evaluate(() => requests[0].endpoint), '/ai/dialectics/math-definition');
            assert.ok(await page.evaluate(() => requests[0].body.passages.some(item => item.block_id === 'distant')));
            assert.equal(await page.evaluate(() => AppState.getBlock('local').math_symbols?.length || 0), 0);
            assert.equal(await page.$eval('.math-symbol-tooltip', el => {
                const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
            }), true);
            if (process.env.MATH_HINT_SCREENSHOT) await page.screenshot({path: process.env.MATH_HINT_SCREENSHOT});
            await page.click('.math-definition-edit');
            await page.$eval('.math-definition-proposal', el => {
                el.value = 'Знаменатель — норма вектора.'; el.dispatchEvent(new Event('input', {bubbles: true}));
            });
            await page.click('.math-definition-accept');
            assert.deepEqual(await page.evaluate(() => JSON.parse(JSON.stringify(AppState.getBlock('local').math_symbols))),
                [{symbol: 'q', definition: 'Знаменатель — норма вектора.'}]);
            await open('#local [aria-label="q"]');
            assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), 'Знаменатель — норма вектора.');
            assert.equal(await page.$('.math-symbol-suggest'), null);
            await page.keyboard.press('Escape');
        });
        await t.test('readable math previews, sources and editing fit desktop and narrow screens', async () => {
            await reset(String.raw`W_{Q}^{(1)}`);
            await page.evaluate(() => {
                window.reply = {status: 'found',
                    definition: '$W_{Q}^{(1)}$ — матрица весов, которая преобразует входные данные в запросы первой головы механизма внимания. Она используется в формуле $Q^{(1)} = XW_{Q}^{(1)}$.',
                    reason: 'В конспекте указана формула $Q^{(1)} = XW_{Q}^{(1)}$.',
                    sources: [{block_id: 'distant', title: 'Матрицы запросов', quote: 'Вычисляем $Q^{(1)} = XW_{Q}^{(1)}$.'}]};
            });
            await open('#local [data-math-symbol]');
            await search();
            assert.equal(await page.$eval('.math-definition-proposal', el => el.checkVisibility()), false);
            assert.equal(await page.$$eval('.math-definition-preview .katex', els => els.length), 2);
            assert.equal(await page.$eval('.math-symbol-definition', el => el.checkVisibility()), false);
            assert.equal(await page.$eval('.math-symbol-edit', el => el.checkVisibility()), false);
            for (const width of [1000, 360, 280]) {
                await page.setViewport({width, height: 800});
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                // Resizing dismisses a tooltip, so reopen it at the new size.
                await open('#local [data-math-symbol]');
                await search();
                assert.equal(await page.$eval('.math-symbol-tooltip', el => {
                    const rect = el.getBoundingClientRect();
                    return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight
                        && el.scrollWidth <= el.clientWidth + 1;
                }), true, `tooltip fits ${width}px`);
                assert.equal(await page.$eval('.math-definition-preview', el => el.scrollHeight <= el.clientHeight + 1), true);
                if (process.env.MATH_HINT_SCREENSHOT && width === 1000) {
                    await page.evaluate(() => document.fonts.ready);
                    const clip = await page.$eval('.math-symbol-tooltip', el => {
                        const {x, y, width, height} = el.getBoundingClientRect();
                        return {x, y, width, height};
                    });
                    await page.screenshot({path: process.env.MATH_HINT_SCREENSHOT, clip, captureBeyondViewport: false});
                }
                await page.keyboard.press('Escape');
            }
            await page.setViewport({width: 360, height: 800});
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await open('#local [data-math-symbol]');
            await search();
            await page.click('.math-definition-sources > summary');
            assert.equal(await page.$$eval('.math-definition-sources .katex', els => els.length), 2);
            await page.click('.math-definition-edit');
            assert.equal(await page.$eval('.math-definition-proposal', el => document.activeElement === el), true);
            await page.$eval('.math-definition-proposal', el => {
                el.value = 'Исправлено: $Q = XW$.'; el.dispatchEvent(new Event('input', {bubbles: true}));
            });
            await page.click('.math-definition-edit');
            assert.equal(await page.$$eval('.math-definition-preview .katex', els => els.length), 1);
            assert.match(await page.$eval('.math-definition-preview', el => el.textContent), /Исправлено/);
            // A failed repeat search must not discard the reader's edits.
            await page.evaluate(() => { window.mode = 'error'; });
            await page.click('.math-symbol-suggest');
            assert.equal(await page.$eval('.math-definition-proposal', el => el.value), 'Исправлено: $Q = XW$.');
            await page.click('.math-definition-accept');
            assert.equal(await page.evaluate(() => AppState.getBlock('local').math_symbols[0].definition), 'Исправлено: $Q = XW$.');
        });
        await t.test('raw numbers are scoped to their selected occurrence and remain editable', async () => {
            await reset('0.002154433+0.002154433');
            await open('#local [data-math-number]');
            await search();
            await page.click('.math-definition-accept');
            assert.equal(await page.evaluate(() => AppState.getBlock('local').math_number_definitions.length), 1);
            await open('#local [data-math-number]');
            assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), 'Норма вектора.');
            await page.click('.math-symbol-suggest');
            assert.equal(await page.$eval('.math-definition-proposal', el => el.value), 'Норма вектора.');
            await page.keyboard.press('Escape');
            await page.evaluate(() => {
                const nodes = document.querySelectorAll('#local [data-math-number]');
                nodes[1].focus(); nodes[1].click();
            });
            assert.match(await page.$eval('.math-symbol-definition', el => el.textContent), /обозначение не указано/);
            await page.keyboard.press('Escape');
            await open('#local [data-math-number]');
            await page.click('.math-symbol-suggest');
            await page.click('.math-definition-result .formula-definition-delete');
            assert.equal(await page.evaluate(() => AppState.getBlock('local').math_number_definitions.length), 0);
        });
        await t.test('the AI proposal stays usable inside an expanded formula dialog', async () => {
            await reset('p/q');
            await page.evaluate(() => {
                const formula = document.querySelector('#local .katex');
                const host = document.createElement('div');
                host.className = 'math-expandable';
                formula.before(host); host.append(formula);
                const trigger = document.createElement('button');
                host.append(trigger);
                FormulaZoom.open('p/q', trigger);
            });
            await open('.formula-zoom-content [aria-label="q"]');
            await search();
            assert.equal(await page.$eval('.math-symbol-tooltip', el => !!el.closest('dialog[open]')), true);
            await page.click('.math-definition-accept');
            assert.equal(await page.evaluate(() => AppState.getBlock('local').math_symbols[0].definition), 'Норма вектора.');
            await page.waitForSelector('.formula-zoom-dialog', {hidden: true});
        });
        await t.test('empty results and errors allow retry; late replies cannot affect a different note', async () => {
            await reset('p/q');
            await open('#local [aria-label="q"]');
            await page.evaluate(() => { window.reply = {status: 'not_found', definition: '', sources: []}; });
            await page.click('.math-symbol-suggest');
            await page.waitForFunction(() => document.querySelector('.math-definition-status').textContent.includes('недостаточно'));
            assert.equal(await page.$('.math-definition-accept'), null);
            await page.evaluate(() => { window.mode = 'error'; });
            await page.click('.math-symbol-suggest');
            await page.waitForFunction(() => document.querySelector('.math-definition-status').textContent.includes('Не удалось'));
            await page.evaluate(() => { window.mode = 'pending'; });
            await page.click('.math-symbol-suggest');
            await page.waitForFunction(() => !!window.finishRequest);
            await page.evaluate(() => {
                AppState.setNote({id: 2, blocks: [{id: 'local', html: 'Другой конспект'}]});
                finishRequest({status: 'found', definition: 'Старый ответ', sources: []});
            });
            assert.equal(await page.evaluate(() => requestSignal.aborted), true);
            assert.equal(await page.$('.math-symbol-tooltip'), null);
            assert.equal(await page.evaluate(() => AppState.getBlock('local').math_symbols?.length || 0), 0);
        });
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
