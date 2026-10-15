const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('complex formulas expand accessibly without interrupting simple formulas, symbols or editing', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import BlockMathRenderer from './fastapi_app/static/js/notes/BlockMathRenderer.js';
        import FormulaZoom from './fastapi_app/static/js/notes/FormulaZoom.js';
        import MathSymbolTooltip from './fastapi_app/static/js/notes/MathSymbolTooltip.js';
        import katex from 'katex';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {BlockMathRenderer, FormulaZoom, MathSymbolTooltip, katex, renderMathInElement});`,
        resolveDir: root}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1000, height: 800, isMobile: true, hasTouch: true});
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><script id="i18n-data" type="application/json">'
            + JSON.stringify(translations) + '</script><main class="block-content" id="note"></main><div class="tiptap" id="editor"></div></body></html>');
        for (const file of ['node_modules/katex/dist/katex.min.css', 'fastapi_app/static/css/math.css',
            'fastapi_app/static/css/math-symbols.css', 'fastapi_app/static/css/formula-zoom.css']) {
            await page.addStyleTag({path: path.join(root, file)});
        }
        // Embed the real math fonts in this isolated, serverless fixture.
        const fontDir = path.join(root, 'node_modules/katex/dist/fonts');
        for (const file of (await fs.readdir(fontDir)).filter(name => name.endsWith('.woff2'))) {
            const match = /^KaTeX_(.+)-(Regular|Italic|Bold|BoldItalic)\.woff2$/.exec(file);
            if (!match) continue;
            const data = (await fs.readFile(path.join(fontDir, file))).toString('base64');
            await page.addStyleTag({content: `@font-face{font-family:KaTeX_${match[1]};font-style:${match[2].includes('Italic') ? 'italic' : 'normal'};font-weight:${match[2].includes('Bold') ? '700' : '400'};src:url(data:font/woff2;base64,${data}) format('woff2')}`});
        }
        await page.addStyleTag({content: 'body{margin:32px;font:18px/1.7 sans-serif;color:#334155;background:#f8fafc}main{box-sizing:border-box;max-width:650px;padding:24px;background:white;border:1px solid #e2e8f0;border-radius:16px}p{margin:16px 0}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            window.formulas = {
                simple: 'x^2', fraction: String.raw`\frac{a}{b}`, formatted: String.raw`\displaystyle\mathcal{A}=\mathbf{x}`,
                softmax: String.raw`p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}`,
                nested: String.raw`\frac{1}{1+\frac{a}{b}}`, matrix: String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`,
                adaptive: 'a+b+c+d+e+f', wide: 'a+b+c+d+e+f+g+h+i+j+k+l+m+n',
            };
            window.sourceHtml = Object.entries(formulas).map(([id, formula]) => {
                const span = document.createElement('span');
                span.className = 'math-inline'; span.setAttribute('formula', formula);
                return `<p id="${id}">${id}: ${span.outerHTML}</p>`;
            }).join('');
            document.getElementById('note').innerHTML = sourceHtml;
            document.getElementById('editor').innerHTML = '<span class="math-inline" formula="' + formulas.softmax + '"></span>';
            BlockMathRenderer.renderMath(document.body);
            MathSymbolTooltip.bind(document, {getContext: element => element.closest('#note')
                ? {note: [{symbol: 'p', definition: 'Вероятность'}], block: []} : null});
        });
        await t.test('threshold uses structure and rendered size; rerendering is idempotent', async () => {
            await page.evaluate(() => document.fonts.ready);
            for (const id of ['simple', 'fraction', 'formatted', 'editor']) assert.equal(await page.$(`#${id} .math-expand-button`), null, id);
            for (const id of ['softmax', 'nested', 'matrix', 'wide']) assert.ok(await page.$(`#${id} .math-expand-button`), id);
            await page.evaluate(() => { BlockMathRenderer.renderMath(document.body); FormulaZoom.scan(document); });
            assert.equal(await page.$$eval('#softmax .math-expand-button', els => els.length), 1);
            assert.equal(await page.$eval('#softmax annotation', el => el.textContent), String.raw`p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}`);
        });
        await t.test('size-dependent controls appear and disappear as the column changes width', async () => {
            assert.equal(await page.$('#adaptive .math-expand-button'), null);
            await page.evaluate(() => { document.getElementById('note').style.width = '150px'; FormulaZoom.scan(document); });
            assert.ok(await page.$('#adaptive .math-expand-button'));
            await page.evaluate(() => { document.getElementById('note').style.width = ''; FormulaZoom.scan(document); });
            assert.equal(await page.$('#adaptive .math-expand-button'), null);
            assert.equal(await page.$eval('#adaptive annotation', el => el.textContent), 'a+b+c+d+e+f');
        });
        await t.test('button opens a native modal; scale, keyboard focus, Escape and source remain correct', async () => {
            await page.click('#softmax .math-expand-button');
            await page.waitForSelector('.formula-zoom-dialog[open]');
            assert.equal(await page.$eval('.formula-zoom-content annotation', el => el.textContent), String.raw`p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}`);
            assert.equal(await page.$eval('.formula-zoom-toolbar output', el => el.textContent), '150%');
            await page.click('[aria-label="Увеличить"]');
            assert.equal(await page.$eval('.formula-zoom-toolbar output', el => el.textContent), '175%');
            for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
            assert.equal(await page.evaluate(() => !!document.activeElement.closest('.formula-zoom-dialog')), true);
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            await page.screenshot({path: path.join(root, 'tmp/formula-zoom-desktop.png')});
            await page.keyboard.press('Escape');
            await page.waitForSelector('.formula-zoom-dialog', {hidden: true});
            assert.equal(await page.evaluate(() => document.activeElement.matches('#softmax .math-expand-button')), true);
            assert.equal(await page.$eval('#softmax .math-inline', el => el.getAttribute('formula')), String.raw`p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}`);
        });
        await t.test('symbol definitions retain their separate interaction', async () => {
            await page.hover('#softmax [aria-label="p_{i}"] .mathnormal');
            await page.waitForSelector('.math-symbol-tooltip');
            assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), 'Вероятность');
            assert.equal(await page.$('.formula-zoom-dialog'), null);
            await page.keyboard.press('Escape');
        });
        await t.test('mobile formulas fit the page and long expanded formulas scroll inside the dialog', async () => {
            await page.setViewport({width: 360, height: 740, isMobile: true, hasTouch: true});
            await page.tap('#wide .math-expand-button');
            await page.waitForSelector('.formula-zoom-dialog[open]');
            const layout = await page.evaluate(() => {
                const dialog = document.querySelector('.formula-zoom-dialog').getBoundingClientRect();
                const viewport = document.querySelector('.formula-zoom-viewport');
                return {fits: dialog.left >= 0 && dialog.right <= innerWidth && dialog.top >= 0 && dialog.bottom <= innerHeight,
                    scrolls: viewport.scrollWidth > viewport.clientWidth, pageFits: document.documentElement.scrollWidth <= innerWidth};
            });
            assert.deepEqual(layout, {fits: true, scrolls: true, pageFits: true});
            assert.equal(await page.$eval('.formula-zoom-hint', el => el.hidden), false);
            await page.screenshot({path: path.join(root, 'tmp/formula-zoom-mobile.png')});
            await page.mouse.click(3, 3);
            await page.waitForSelector('.formula-zoom-dialog', {hidden: true});
        });
        await t.test('removing the source and switching notes close the popup', async () => {
            await page.click('#softmax .math-expand-button');
            await page.evaluate(() => document.getElementById('softmax').remove());
            await page.waitForSelector('.formula-zoom-dialog', {hidden: true});
            await page.click('#matrix .math-expand-button');
            await page.evaluate(() => document.dispatchEvent(new Event('noteOpened')));
            await page.waitForSelector('.formula-zoom-dialog', {hidden: true});
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
