const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('provenance connects exact matrix cells, coordinate rules and calculations on desktop, touch and zoom', async t => {
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
        const page = await browser.newPage(), errors = [], requests = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => { if (/\/ai\//.test(request.url())) requests.push(request.url()); });
        await page.setViewport({width: 1100, height: 900, isMobile: true, hasTouch: true});
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><script id="i18n-data" type="application/json">'
            + JSON.stringify(translations) + '</script><main id="blocks-container" class="mode-no-dialectics"></main><div id="modal-container" class="hidden"></div></body></html>');
        for (const file of ['node_modules/katex/dist/katex.min.css', 'fastapi_app/static/css/math-symbols.css', 'fastapi_app/static/css/formula-zoom.css', 'fastapi_app/static/css/blocks.css']) {
            await page.addStyleTag({path: path.join(root, file)});
        }
        const fontDir = path.join(root, 'node_modules/katex/dist/fonts');
        for (const file of (await fs.readdir(fontDir)).filter(name => name.endsWith('.woff2'))) {
            const match = /^KaTeX_(.+)-(Regular|Italic|Bold|BoldItalic)\.woff2$/.exec(file);
            if (!match) continue;
            const data = (await fs.readFile(path.join(fontDir, file))).toString('base64');
            await page.addStyleTag({content: `@font-face{font-family:KaTeX_${match[1]};font-style:${match[2].includes('Italic') ? 'italic' : 'normal'};font-weight:${match[2].includes('Bold') ? '700' : '400'};src:url(data:font/woff2;base64,${data}) format('woff2')}`});
        }
        await page.addStyleTag({content: 'body{margin:20px;font:16px/1.7 sans-serif;color:#334155;background:#f8fafc}.dialectics-block{box-sizing:border-box;max-width:850px;margin-bottom:20px;padding:20px;background:white;border:1px solid #e2e8f0;border-radius:14px}.block-toolbar-row,.block-header,.add-block-actions,.block-stickers-panel,.block-mobile-actions,.block-role-help{display:none!important}.hidden{display:none}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            const math = formula => {
                const span = document.createElement('span'); span.className = 'math-inline';
                span.setAttribute('formula', formula); span.textContent = formula; return span.outerHTML;
            };
            window.provenanceFormulas = [
                String.raw`Y=\begin{bmatrix}-0.958428857&1.221831603&-0.549004597\end{bmatrix}`,
                String.raw`W_1=\begin{bmatrix}0.2&-0.4&0.1&0.3\\-0.3&0.2&0.5&-0.1\\0.4&0.1&-0.2&-0.6\end{bmatrix}`,
                String.raw`W_2=\begin{bmatrix}0.2&0.1\\0.1&0.2\end{bmatrix}`,
                'b_1=[0.05;-0.02;0.03;0.04]', 'A=YW_1+b_1',
                String.raw`\begin{aligned}A_{0,0}&=(-0.958428857)\cdot0.2+1.221831603\cdot(-0.3)\\&+(-0.549004597)\cdot0.4+0.05\\&=-0.7278370911\end{aligned}`,
                String.raw`B=\operatorname{ReLU}(A)`,
                String.raw`B_{0,0}=\max(0,-0.7278370911)=0`,
                String.raw`B_{0,1}=\max(0,0.5528374037)=0.5528374037`,
                String.raw`B_{1,0}=\max(0,-0.8576358675)=0`,
                String.raw`B=\begin{bmatrix}0&0.5528374037\\0&0.2\end{bmatrix}`,
                '0.123+0.123',
            ];
            AppState.setNote({id: 901, revision: 1, blocks: [
                {id: 'sources', title: 'Исходные значения', side: 'center', html: provenanceFormulas.slice(0, 4).map((f, i) => '<p id="eq' + i + '">' + math(f) + '</p>').join('')},
                {id: 'calculation', title: 'Вычисление', side: 'center', html: provenanceFormulas.slice(4).map((f, i) => '<p id="eq' + (i + 4) + '">' + math(f) + '</p>').join('')},
            ]});
            window.originalBlocks = AppState.currentNote.blocks.map(block => block.html);
            BlockDOMRenderer.renderAll(); MathSymbolController.init();
        });
        const select = async (scope, value, occurrence = 0) => {
            await page.$$eval(`${scope} [data-math-number]`, (nodes, {value, occurrence}) => {
                const ordered = nodes.map(el => ({el, n: JSON.parse(MathSymbols.decode(el.dataset.mathNumber))})).sort((a, b) => a.n.start - b.n.start);
                const target = ordered.filter(({n}) => n.value === value)[occurrence]?.el;
                if (!target) throw new Error('Missing number: ' + value);
                target.scrollIntoView({block: 'center'}); target.focus();
            }, {value, occurrence});
            await page.waitForSelector('.math-symbol-tooltip');
        };
        await t.test('the coefficient shows a rule, coordinate expansion and its exact source cell', async () => {
            await select('#eq5', '0.2');
            assert.equal(await page.$eval('.math-symbol-tooltip-heading annotation', el => el.textContent), '(W_{1})_{0,0} = 0.2');
            assert.deepEqual(await page.$$eval('.math-provenance li', nodes => nodes.map(node => node.dataset.provenanceKind)), ['rule', 'expansion', 'source']);
            assert.equal(await page.$$eval('#eq1 .math-provenance-match', nodes => nodes.length), 1);
            assert.equal(await page.$$eval('#eq2 .math-provenance-match', nodes => nodes.length), 0);
            assert.equal(await page.$$eval('.math-number-match', nodes => nodes.length), 2);
            assert.equal(await page.$eval('#eq1 .math-provenance-match', el => JSON.parse(MathSymbols.decode(el.dataset.mathNumber)).start), provenanceSourceOffset());
            assert.equal(await page.$eval('.math-highlight-provenance', el => el.textContent.trim()), 'Связь с источником');
            const sourceColor = await page.$eval('#eq1 .math-provenance-match', el => getComputedStyle(el).borderBottomColor);
            assert.equal(await page.$eval('#eq5 .math-number-match.math-provenance-match', el => getComputedStyle(el).borderBottomColor), sourceColor);
            assert.equal(await page.$eval('.math-provenance-focus', el => getComputedStyle(el).borderBottomColor), sourceColor);
            assert.deepEqual(await page.$eval('#eq5 .math-number-match.math-provenance-match', el => ({outline: getComputedStyle(el).outlineStyle, underline: getComputedStyle(el).borderBottomStyle})), {outline: 'dashed', underline: 'solid'});
            assert.equal(await page.$eval('#eq10 .math-number-match', el => el.classList.contains('math-provenance-match')), false, 'an unrelated equal number has only the value marker');
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            await page.screenshot({path: path.join(root, 'tmp/math-provenance-desktop.png')});
            await page.keyboard.press('Escape');
            await select('#eq11', '0.123');
            assert.equal(await page.$$eval('.math-number-match', nodes => nodes.length), 2);
            assert.equal(await page.$$eval('.math-provenance-match', nodes => nodes.length), 0, 'source highlights clear when selecting a value match');
            assert.equal(await page.$eval('.math-highlight-value', el => el.textContent.trim()), 'Совпадение чисел');
            assert.equal(await page.$eval('input[data-highlight-kind="provenance"]', el => el.disabled), true);
            assert.equal(await page.$eval('.math-number-match', el => getComputedStyle(el).outlineStyle), 'dashed');
            await page.keyboard.press('Escape');
            assert.equal(await page.$('.math-number-match, .math-provenance-match'), null);
            await select('#eq5', '0.2');
        });
        await t.test('both markers can coexist and each layer can be toggled independently', async () => {
            await page.click('input[data-highlight-kind="value"]');
            assert.equal(await page.$$eval('.math-number-match', nodes => nodes.length), 0);
            assert.equal(await page.$$eval('#eq1 .math-provenance-match', nodes => nodes.length), 1);
            await page.click('input[data-highlight-kind="provenance"]');
            assert.equal(await page.$('.math-provenance-match, .math-number-match'), null);
            await page.focus('input[data-highlight-kind="value"]'); await page.keyboard.press('Space');
            assert.equal(await page.$$eval('.math-number-match', nodes => nodes.length), 2);
            assert.equal(await page.$('.math-provenance-match'), null);
            await page.click('input[data-highlight-kind="provenance"]');
            assert.ok(await page.$('#eq5 .math-number-match.math-provenance-match'));
        });
        await t.test('source navigation focuses the exact cell and provides a return to the selected number', async () => {
            await page.click('.math-provenance li[data-provenance-kind="source"] .math-provenance-jump');
            await page.waitForSelector('#eq1 .math-provenance-destination');
            assert.equal(await page.$eval('#eq1 .math-provenance-destination', el => JSON.parse(MathSymbols.decode(el.dataset.mathNumber)).symbol), '(W_{1})_{0,0}');
            await page.click('.math-provenance-return');
            assert.equal(await page.evaluate(() => document.activeElement.closest('#eq5') !== null), true);
            await page.keyboard.press('Escape');
        });
        await t.test('each matrix zero points to its own calculation and thresholds have a separate role', async () => {
            await select('#eq10', '0', 0);
            assert.equal(await page.$eval('.math-provenance li[data-provenance-kind="calculation"] annotation', el => el.textContent), String.raw`B_{0,0}=\max(0,-0.7278370911)=0`);
            await page.keyboard.press('Escape');
            await select('#eq10', '0', 1);
            assert.equal(await page.$eval('.math-provenance li[data-provenance-kind="calculation"] annotation', el => el.textContent), String.raw`B_{1,0}=\max(0,-0.8576358675)=0`);
            await page.keyboard.press('Escape');
            await select('#eq7', '0', 0);
            assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), 'Постоянная, заданная в формуле.');
            await page.keyboard.press('Escape');
        });
        await t.test('zoom retains provenance and source navigation exits the modal', async () => {
            await page.click('#eq5 .math-expand-button');
            await page.waitForSelector('.formula-zoom-dialog[open]');
            await select('.formula-zoom-dialog', '0.2');
            assert.equal(await page.$$eval('.formula-zoom-dialog .math-provenance li', nodes => nodes.length), 3);
            await page.click('.formula-zoom-dialog .math-provenance li[data-provenance-kind="source"] .math-provenance-jump');
            await page.waitForSelector('.formula-zoom-dialog[open]', {hidden: true});
            await page.waitForSelector('.math-provenance-return');
            await page.click('.math-provenance-return');
            assert.equal(await page.evaluate(() => document.activeElement.closest('#eq5') !== null), true);
            await page.keyboard.press('Escape');
        });
        await t.test('a 360px touch viewport can open and navigate the provenance without clipping', async () => {
            await page.setViewport({width: 360, height: 740, isMobile: true, hasTouch: true});
            const point = await page.$$eval('#eq10 [data-math-number]', async nodes => {
                const el = nodes.find(node => JSON.parse(MathSymbols.decode(node.dataset.mathNumber)).symbol === '(B)_{0,0}');
                el.scrollIntoView({block: 'center'}); await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
                const r = el.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2};
            });
            await page.touchscreen.tap(point.x, point.y);
            await page.waitForSelector('.math-symbol-tooltip');
            assert.equal(await page.$eval('.math-symbol-tooltip', el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }), true);
            await page.screenshot({path: path.join(root, 'tmp/math-provenance-mobile.png')});
            await page.keyboard.press('Escape');
        });
        await t.test('rendering and navigation preserve note text and do not call AI', async () => {
            assert.equal(await page.evaluate(() => AppState.currentNote.blocks.every((block, i) => block.html === originalBlocks[i])), true);
            assert.equal(await page.$$eval('.katex-error', nodes => nodes.length), 0);
            assert.deepEqual(requests, []); assert.deepEqual(errors, []);
        });
        await t.test('navigation expands a collapsed source block and changing the definition clears old links', async () => {
            await page.setViewport({width: 1100, height: 900, isMobile: true, hasTouch: true});
            await page.evaluate(() => { AppState.updateBlock('sources', {collapsed: true}); BlockDOMRenderer.renderAll({reuseUnchanged: true}); });
            await select('#eq5', '0.2');
            await page.click('.math-provenance li[data-provenance-kind="source"] .math-provenance-jump');
            assert.equal(await page.evaluate(() => AppState.getBlock('sources').collapsed), false);
            await page.waitForSelector('#eq1 .math-provenance-destination', {visible: true});
            await page.click('.math-provenance-return'); await page.keyboard.press('Escape');
            await page.evaluate(() => {
                AppState.updateBlock('sources', {html: originalBlocks[0].replaceAll('0.2', '0.9')});
                BlockDOMRenderer.renderAll();
            });
            await page.waitForFunction(() => [...document.querySelectorAll('#eq5 [data-math-number]')].some(node => {
                const n = JSON.parse(MathSymbols.decode(node.dataset.mathNumber)); return n.value === '0.2' && !n.provenance;
            }));
            await select('#eq10', '0');
            await page.evaluate(() => AppState.setNote({id: 902, blocks: []}));
            assert.equal(await page.$('.math-symbol-tooltip, .math-provenance-return, .math-number-match, .math-provenance-match'), null);
        });
    } finally { await browser.close(); }
});

function provenanceSourceOffset() { return String.raw`W_1=\begin{bmatrix}`.length; }
