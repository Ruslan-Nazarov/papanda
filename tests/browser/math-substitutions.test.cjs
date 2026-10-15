const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('numeric substitutions recover original symbols on hover, touch and in the expanded formula', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import MathSymbolController from './fastapi_app/static/js/notes/MathSymbolController.js';
        import MathSymbols from './fastapi_app/static/js/notes/MathSymbols.js';
        import katex from 'katex';
        import DOMPurify from 'dompurify';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {AppState, BlockDOMRenderer, MathSymbolController, MathSymbols, katex, DOMPurify, renderMathInElement});`,
        resolveDir: root}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1024, height: 850, isMobile: true, hasTouch: true});
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><script id="i18n-data" type="application/json">'
            + JSON.stringify(translations) + '</script><main id="blocks-container" class="mode-no-dialectics"></main><div id="modal-container" class="hidden"></div></body></html>');
        for (const file of ['node_modules/katex/dist/katex.min.css', 'fastapi_app/static/css/math.css',
            'fastapi_app/static/css/math-symbols.css', 'fastapi_app/static/css/formula-zoom.css']) await page.addStyleTag({path: path.join(root, file)});
        const fontDir = path.join(root, 'node_modules/katex/dist/fonts');
        for (const file of (await fs.readdir(fontDir)).filter(name => name.endsWith('.woff2'))) {
            const match = /^KaTeX_(.+)-(Regular|Italic|Bold|BoldItalic)\.woff2$/.exec(file);
            if (!match) continue;
            const data = (await fs.readFile(path.join(fontDir, file))).toString('base64');
            await page.addStyleTag({content: `@font-face{font-family:KaTeX_${match[1]};font-style:${match[2].includes('Italic') ? 'italic' : 'normal'};font-weight:${match[2].includes('Bold') ? '700' : '400'};src:url(data:font/woff2;base64,${data}) format('woff2')}`});
        }
        await page.addStyleTag({content: 'body{margin:24px;font:18px/1.7 sans-serif;color:#334155;background:#f8fafc}.dialectics-block{box-sizing:border-box;max-width:850px;margin-bottom:20px;padding:20px;background:white;border:1px solid #e2e8f0;border-radius:14px}.block-toolbar-row,.block-header,.add-block-actions,.block-stickers-panel,.block-mobile-actions,.block-role-help{display:none!important}.hidden{display:none}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            const math = formula => {
                const span = document.createElement('span'); span.className = 'math-inline';
                span.setAttribute('formula', formula); span.textContent = formula;
                return span.outerHTML;
            };
            window.genericFormula = String.raw`v_{\text{новое}}=v_{\text{старое}}-\alpha g`;
            window.numericFormula = String.raw`v_{1,\text{новое}}\approx0.90-0.1\cdot0.5397=0.84603`;
            window.negativeFormula = String.raw`v_{2,\text{новое}}\approx-0.55-0.1\cdot(-0.6490)=-0.48510`;
            AppState.setNote({id: 1, revision: 1, math_symbols: [
                {symbol: String.raw`\alpha`, definition: 'Скорость обучения'},
                {symbol: 'g', definition: 'Градиент потерь'},
                {symbol: String.raw`v_{\text{старое}}`, definition: 'Параметр до шага'},
            ], blocks: [
                {id: 'rule', title: 'Градиентный спуск', side: 'center', html: '<p>Сделаем небольшой шаг против направления градиента:</p><p>' + math(genericFormula) + '</p><p>Выберем ' + math(String.raw`\alpha=0.1`) + '.</p>'},
                {id: 'example', title: 'Подставим значения', side: 'center', html: '<p>Для первой координаты:</p><p>' + math(numericFormula) + '</p><p>Для второй координаты:</p><p>' + math(negativeFormula) + '</p>'},
            ]});
            window.savedHtml = AppState.getBlock('example').html;
            BlockDOMRenderer.renderAll();
            MathSymbolController.init();
        });
        await page.waitForSelector('#example [data-math-value]');
        const point = async (value, scope = '#example') => page.$$eval(`${scope} [data-math-value]`, (nodes, wanted) => {
            const element = nodes.find(node => JSON.parse(MathSymbols.decode(node.dataset.mathValue)).value === wanted);
            if (!element) throw new Error('Missing numeric target: ' + wanted);
            const rect = element.getBoundingClientRect();
            return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
        }, value);
        const hover = async value => {
            await page.mouse.move(1, 1);
            const p = await point(value);
            await page.mouse.move(p.x, p.y);
            await page.waitForSelector('.math-symbol-tooltip');
        };
        await t.test('hovering a substituted coefficient shows its original symbol, meaning and full formula', async () => {
            await hover('0.1');
            assert.equal(await page.$eval('.math-symbol-tooltip-heading annotation', el => el.textContent), String.raw`\alpha = 0.1`);
            assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), 'Скорость обучения');
            assert.equal(await page.$eval('.math-symbol-original annotation', el => el.textContent), String.raw`v_{\text{новое}} = v_{\text{старое}}-\alpha g`);
            assert.equal(await page.$('.math-symbol-edit'), null);
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            await page.screenshot({path: path.join(root, 'tmp/math-substitutions-desktop.png')});
            await page.keyboard.press('Escape');
        });
        await t.test('signed operands preserve the whole numeric target and source text stays unchanged', async () => {
            await hover('(-0.6490)');
            assert.equal(await page.$eval('.math-symbol-tooltip-heading annotation', el => el.textContent), 'g = (-0.6490)');
            assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), 'Градиент потерь');
            assert.equal(await page.evaluate(() => AppState.getBlock('example').html === savedHtml), true);
            assert.equal(await page.$eval('#example annotation', el => el.textContent), String.raw`v_{1,\text{новое}}\approx0.90-0.1\cdot0.5397=0.84603`);
            await page.keyboard.press('Escape');
        });
        await t.test('the expanded viewer retains number hints inside its native dialog', async () => {
            await page.click('#example .math-expand-button');
            await page.waitForSelector('.formula-zoom-dialog[open]');
            const p = await point('0.1', '.formula-zoom-dialog');
            await page.mouse.move(p.x, p.y);
            await page.waitForSelector('.formula-zoom-dialog .math-symbol-tooltip');
            assert.equal(await page.$eval('.formula-zoom-dialog .math-symbol-definition', el => el.textContent), 'Скорость обучения');
            const position = await page.$eval('.math-symbol-tooltip', el => {
                const r = el.getBoundingClientRect();
                return {inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
                    visible: document.elementFromPoint(r.left + 20, r.top + 20)?.closest('.math-symbol-tooltip') === el};
            });
            assert.deepEqual(position, {inside: true, visible: true});
            await page.keyboard.press('Escape');
            assert.ok(await page.$('.formula-zoom-dialog[open]'));
            await page.click('.formula-zoom-close');
            await page.waitForSelector('.formula-zoom-dialog', {hidden: true});
        });
        await t.test('a mobile tap pins the original designation within the viewport', async () => {
            await page.setViewport({width: 360, height: 740, isMobile: true, hasTouch: true});
            const p = await point('0.1');
            await page.touchscreen.tap(p.x, p.y);
            await page.waitForSelector('.math-symbol-tooltip');
            assert.equal(await page.$eval('.math-symbol-tooltip-heading annotation', el => el.textContent), String.raw`\alpha = 0.1`);
            assert.equal(await page.$eval('.math-symbol-tooltip', el => {
                const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
            }), true);
            await page.screenshot({path: path.join(root, 'tmp/math-substitutions-mobile.png')});
            await page.keyboard.press('Escape');
        });
        await t.test('removing the symbolic source removes inferred hints and opening a note closes the tooltip', async () => {
            await page.setViewport({width: 1024, height: 850, isMobile: true, hasTouch: true});
            await page.evaluate(() => { AppState.updateBlock('rule', {html: '<p>Исходное правило удалено</p>'}); BlockDOMRenderer.renderAll(); });
            await page.waitForFunction(() => !document.querySelector('#example [data-math-original]'));
            const mappings = await page.$$eval('#example [data-math-value]', nodes => nodes.map(node => JSON.parse(MathSymbols.decode(node.dataset.mathValue)).symbol));
            assert.deepEqual(mappings, [String.raw`v_{1,\text{новое}}`, String.raw`v_{2,\text{новое}}`]);
            await hover('0.84603');
            await page.evaluate(() => AppState.setNote({id: 2, blocks: []}));
            assert.equal(await page.$('.math-symbol-tooltip'), null);
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
