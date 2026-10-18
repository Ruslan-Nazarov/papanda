const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('calculation action uses a dedicated AI dialog on desktop and mobile', {timeout: 30_000}, async () => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import BlockMathRenderer from './fastapi_app/static/js/notes/BlockMathRenderer.js';
        import FormulaZoom from './fastapi_app/static/js/notes/FormulaZoom.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import NotesAPI from './fastapi_app/static/js/notes/api.js';
        import katex from 'katex';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {BlockMathRenderer, FormulaZoom, AppState, NotesAPI, katex, renderMathInElement});`,
        resolveDir: root}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(5000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>'
            + '<body><script id="i18n-data" type="application/json">' + JSON.stringify(translations) + '</script></body></html>');
        for (const file of ['node_modules/katex/dist/katex.min.css', 'fastapi_app/static/css/math.css',
            'fastapi_app/static/css/math-symbols.css', 'fastapi_app/static/css/formula-zoom.css',
            'fastapi_app/static/css/modals.css']) {
            await page.addStyleTag({path: path.join(root, file)});
        }
        const fontDir = path.join(root, 'node_modules/katex/dist/fonts');
        for (const file of (await fs.readdir(fontDir)).filter(name => name.endsWith('.woff2'))) {
            const match = /^KaTeX_(.+)-(Regular|Italic|Bold|BoldItalic)\.woff2$/.exec(file);
            if (!match) continue;
            const data = (await fs.readFile(path.join(fontDir, file))).toString('base64');
            await page.addStyleTag({content: `@font-face{font-family:KaTeX_${match[1]};font-style:${match[2].includes('Italic') ? 'italic' : 'normal'};font-weight:${match[2].includes('Bold') ? '700' : '400'};src:url(data:font/woff2;base64,${data}) format('woff2')}`});
        }
        await page.addStyleTag({content: 'body{margin:24px;font:18px/1.6 sans-serif;color:#334155}section{max-width:880px;margin:auto}.block-content{min-width:0}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
        await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css/modals.css')});
        await page.evaluate(() => {
            window.calculationFormula = String.raw`\begin{aligned}\frac{\hat S_{p,0}^2+\hat S_{p,1}^2+\hat S_{p,2}^2}{3}&=\frac{(S_{p,0}-\mu_p)^2+(S_{p,1}-\mu_p)^2+(S_{p,2}-\mu_p)^2}{3(v_p+\varepsilon)}\\&=\frac{3v_p}{3(v_p+\varepsilon)}\\&=\frac{v_p}{v_p+\varepsilon}.\end{aligned}`;
            const section = document.createElement('section');
            section.className = 'dialectics-block';
            section.id = 'calculation-block'; section.dataset.id = 'calculation-block';
            const title = document.createElement('h3'); title.className = 'block-title'; title.textContent = 'Нормировка';
            const content = document.createElement('div'); content.className = 'block-content';
            const span = document.createElement('span'); span.className = 'math-inline';
            span.setAttribute('formula', calculationFormula);
            const p = document.createElement('p'); p.append(span); content.append(p);
            const small = document.createElement('p'); small.innerHTML = '<span class="math-inline" formula="x^2"></span>';
            content.append(small); section.append(title, content); document.body.append(section);
            AppState.setNote({title: 'Нормировка', blocks: [{id: section.id, title: title.textContent, html: content.innerHTML,
                math_symbols: [{symbol: 'v_p', definition: 'Средний квадрат отклонений'}]}]});
            window.calculationRequests = [];
            NotesAPI.stream = async (url, data, update) => {
                calculationRequests.push(JSON.parse(JSON.stringify({url, data})));
                const text = data.question ? 'Тройка — число слагаемых.'
                    : 'Нужда: развернуть определение дисперсии.\n\n$$3v_p=(S_{p,0}-\\mu_p)^2+(S_{p,1}-\\mu_p)^2+(S_{p,2}-\\mu_p)^2.$$';
                update('', text); return text;
            };
            BlockMathRenderer.renderMath(section);
            FormulaZoom.scan(section);
        });
        assert.equal(await page.$$eval('#calculation-block .math-calculation-button', els => els.length), 1);
        await page.evaluate(() => FormulaZoom.scan(document.getElementById('calculation-block')));
        assert.equal(await page.$$eval('#calculation-block .math-calculation-button', els => els.length), 1);
        await page.evaluate(() => document.fonts.ready);
        for (const width of [1000, 390]) {
            await page.setViewport({width, height: 844});
            await page.evaluate(() => FormulaZoom.scan(document));
            assert.equal(await page.$eval('#calculation-block .math-calculation-button', el => {
                const rect = el.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth;
            }), true);
            await (await page.$('#calculation-block')).screenshot({path: path.join(root, `tmp/calculation-button-${width}.png`)});
            await page.click('#calculation-block .math-calculation-button');
            await page.waitForSelector('.calculation-explain-modal');
            await page.waitForFunction(() => !document.querySelector('.concept-explain-save').disabled);
            const request = await page.evaluate(() => calculationRequests.at(-1));
            assert.equal(request.url, '/ai/dialectics/explain-calculation/stream');
            assert.equal(request.data.formula, await page.evaluate(() => calculationFormula));
            assert.equal(request.data.math_symbols[0].definition, 'Средний квадрат отклонений');
            assert.equal(await page.$eval('.calculation-explain-modal h2', el => el.textContent), 'Подробный разбор расчёта · ИИ');
            assert.equal(await page.$eval('.concept-explain-fragment annotation', el => el.textContent), request.data.formula);
            await page.click('.concept-explain-fragment .math-expand-button');
            await page.waitForSelector('.formula-zoom-dialog[open]');
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.querySelector('.formula-zoom-dialog'));
            assert.ok(await page.$('.calculation-explain-modal'));
            await page.type('.concept-explain-input', 'Откуда берётся тройка?');
            await page.click('.concept-explain-send');
            await page.waitForFunction(() => !document.querySelector('.concept-explain-save').disabled);
            assert.match(await page.evaluate(() => calculationRequests.at(-1).data.history[1].content), /3v_p/);
            assert.equal(await page.$eval('.calculation-explain-modal .modal-dialog', el => {
                const rect = el.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
            }), true);
            await page.screenshot({path: path.join(root, `tmp/calculation-dialog-${width}.png`)});
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.querySelector('.calculation-explain-modal'));
            assert.equal(await page.$eval('#calculation-block annotation', el => el.textContent), request.data.formula);
        }
        await page.evaluate(async () => {
            NotesAPI.stream = async (_url, _payload, _update, _cb, {signal}) => {
                window.calculationSignal = signal;
                return new Promise(resolve => signal.addEventListener('abort', () => resolve(''), {once: true}));
            };
        });
        await page.click('#calculation-block .math-calculation-button');
        await page.waitForFunction(() => !!window.calculationSignal);
        await page.click('.calculation-explain-modal .btn-close-modal');
        assert.equal(await page.evaluate(() => calculationSignal.aborted), true);
        await page.evaluate(() => document.getElementById('calculation-block').remove());
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
