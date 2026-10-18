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
                tanh: String.raw`\tanh(a)=\frac{e^a-e^{-a}}{e^a+e^{-a}}.`,
                indexedFraction: String.raw`\frac{x_i}{y_j}`,
                softmax: String.raw`p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}`,
                nested: String.raw`\frac{1}{1+\frac{a}{b}}`, matrix: String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`,
                adaptive: 'a+b+c+d+e+f', wide: 'a+b+c+d+e+f+g+h+i+j+k+l+m+n',
                attention: String.raw`R^{(1)}=\frac{Q^{(1)}(K^{(1)})^{\mathsf T}}{\sqrt2}.`,
            };
            window.sourceHtml = Object.entries(formulas).map(([id, formula]) => {
                const span = document.createElement('span');
                span.className = 'math-inline'; span.setAttribute('formula', formula);
                return `<p id="${id}">${id}: ${span.outerHTML}</p>`;
            }).join('');
            document.getElementById('note').innerHTML = sourceHtml;
            document.getElementById('editor').innerHTML = '<span class="math-inline" formula="' + formulas.softmax + '"></span>';
            BlockMathRenderer.renderMath(document.body);
            MathSymbolTooltip.bind(document, {getContext: element => element.closest('#note, .formula-zoom-dialog')
                ? {note: [{symbol: 'p', definition: 'Вероятность'}, {symbol: 'R', definition: 'Матрица оценок'},
                    {symbol: 'Q', definition: 'Матрица запросов'}, {symbol: 'K', definition: 'Матрица ключей'},
                    {symbol: String.raw`\mathsf{T}`, definition: 'Транспонирование'}], block: []} : null});
        });
        await t.test('threshold uses structure and rendered size; rerendering is idempotent', async () => {
            await page.evaluate(() => document.fonts.ready);
            for (const id of ['simple', 'fraction', 'formatted', 'editor']) assert.equal(await page.$(`#${id} .math-expand-button`), null, id);
            for (const id of ['tanh', 'indexedFraction', 'softmax', 'nested', 'matrix', 'wide']) assert.ok(await page.$(`#${id} .math-expand-button`), id);
            await page.evaluate(() => { BlockMathRenderer.renderMath(document.body); FormulaZoom.scan(document); });
            assert.equal(await page.$$eval('#softmax .math-expand-button', els => els.length), 1);
            assert.equal(await page.$eval('#softmax annotation', el => el.textContent), String.raw`p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}`);
        });
        await t.test('compact fractions with small scripts expand on desktop and mobile', async () => {
            for (const width of [1000, 390]) {
                await page.setViewport({width, height: 844, isMobile: true, hasTouch: true});
                await page.evaluate(() => FormulaZoom.scan(document));
                assert.equal(await page.$('#tanh.math-formula-wide, #tanh .math-formula-wide'), null);
                await page.tap('#tanh .math-expand-button');
                await page.waitForSelector('.formula-zoom-dialog[open]');
                assert.equal(await page.$eval('.formula-zoom-content annotation', el => el.textContent), String.raw`\tanh(a)=\frac{e^a-e^{-a}}{e^a+e^{-a}}.`);
                assert.equal(await page.evaluate(() => {
                    const small = document.querySelector('#tanh .katex-html .msupsub .mord');
                    const enlarged = document.querySelector('.formula-zoom-content .katex-html .msupsub .mord');
                    return parseFloat(getComputedStyle(enlarged).fontSize) > parseFloat(getComputedStyle(small).fontSize);
                }), true);
                await page.click('.formula-zoom-close');
                await page.waitForFunction(() => !document.querySelector('.formula-zoom-dialog'));
            }
            await page.setViewport({width: 1000, height: 800, isMobile: true, hasTouch: true});
        });
        await t.test('size-dependent controls appear and disappear as the column changes width', async () => {
            assert.equal(await page.$('#adaptive .math-expand-button'), null);
            await page.evaluate(() => { document.getElementById('note').style.width = '150px'; FormulaZoom.scan(document); });
            assert.ok(await page.$('#adaptive .math-expand-button'));
            await page.evaluate(() => { document.getElementById('note').style.width = ''; FormulaZoom.scan(document); });
            assert.equal(await page.$('#adaptive .math-expand-button'), null);
            assert.equal(await page.$eval('#adaptive annotation', el => el.textContent), 'a+b+c+d+e+f');
            assert.equal(await page.$('#adaptive .math-formula-wide'), null);
        });
        await t.test('long inline calculations have a separate readable row and preserve source formulas', async () => {
            await page.setViewport({width: 1226, height: 800, isMobile: true, hasTouch: true});
            await page.evaluate(() => {
                const chain = document.createElement('section');
                chain.id = 'chain';
                chain.className = 'block-content';
                chain.innerHTML = '<p>Теперь выбранное «на» нужно обработать как новое входное слово:</p><p id="calculation"></p>';
                chain.style.cssText = 'box-sizing:border-box;padding:24px;max-width:1160px;background:white;border-left:4px solid #ec4899;margin-top:24px';
                const formulas = [String.raw`x_{\text{на}}=[0.15;\,-0.33;\,0.72].`,
                    String.raw`h_5=\tanh(h_4+x_{\text{на}})`,
                    String.raw`\approx[\tanh(0.533425+0.15);\,\tanh(-0.325720-0.33);\,\tanh(0.732975+0.72)]`,
                    String.raw`\approx[0.593742;\,-0.575508;\,0.896280].`];
                formulas.forEach((formula, index) => {
                    const span = document.createElement('span');
                    span.className = 'math-inline';
                    span.id = `step-${index}`;
                    span.setAttribute('formula', formula);
                    chain.lastElementChild.append(span, ' ');
                });
                document.body.append(chain);
                BlockMathRenderer.renderMath(chain);
            });
            await page.evaluate(() => document.fonts.ready);
            await page.evaluate(() => FormulaZoom.scan(document));
            const geometry = () => page.evaluate(() => {
                const rect = id => document.getElementById(id).getBoundingClientRect();
                return {separate: rect('step-2').top >= rect('step-1').bottom,
                    resultBelow: rect('step-3').top >= rect('step-2').bottom,
                    fits: rect('step-2').right <= rect('calculation').right + 1,
                    shortInline: !document.getElementById('step-1').classList.contains('math-formula-wide'),
                    pageFits: document.documentElement.scrollWidth <= innerWidth};
            });
            assert.deepEqual(await geometry(), {separate: true, resultBelow: true, fits: true, shortInline: true, pageFits: true});
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            await (await page.$('#chain')).screenshot({path: path.join(root, 'tmp/long-formulas-desktop.png')});
            await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
            await page.evaluate(() => FormulaZoom.scan(document));
            const mobile = await geometry();
            assert.equal(mobile.fits && mobile.pageFits && mobile.separate && mobile.resultBelow, true);
            assert.equal(await page.$eval('#step-2', el => el.querySelector('annotation').textContent === el.getAttribute('formula')), true);
            assert.equal(await page.$eval('#step-2 .katex', el => el.scrollWidth > el.clientWidth), true);
            await (await page.$('#chain')).screenshot({path: path.join(root, 'tmp/long-formulas-mobile.png')});
            await page.setViewport({width: 1000, height: 800, isMobile: true, hasTouch: true});
            await page.evaluate(() => document.getElementById('chain').remove());
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
            await page.waitForFunction(() => !document.querySelector('.formula-zoom-dialog'));
            assert.equal(await page.evaluate(() => document.activeElement.matches('#softmax .math-expand-button')), true);
            assert.equal(await page.$eval('#softmax .math-inline', el => el.getAttribute('formula')), String.raw`p_i=\frac{e^{z_i}}{\sum_{j=0}^{5}e^{z_j}}`);
        });
        await t.test('keyboard focus opens symbol definitions without expanding the formula', async () => {
            await page.focus('#softmax [aria-label="p_{i}"]');
            await page.waitForSelector('.math-symbol-tooltip');
            assert.equal(await page.$eval('.math-symbol-definition', el => el.textContent), 'Вероятность');
            assert.equal(await page.$('.formula-zoom-dialog'), null);
            await page.keyboard.press('Escape');
        });
        await t.test('attention operands and bare root numbers can be clicked in the note and enlarged view', async subtest => {
            subtest.after(async () => {
                await page.evaluate(() => { MathSymbolTooltip.hide(); FormulaZoom.active?.close(); });
                await page.waitForFunction(() => !document.querySelector('.formula-zoom-dialog'));
            });
            for (const width of [1000, 390]) {
                await page.setViewport({width, height: 844, isMobile: true, hasTouch: true});
                for (const enlarged of [false, true]) {
                    if (enlarged) {
                        await page.tap('#attention .math-expand-button');
                        await page.waitForSelector('.formula-zoom-dialog[open]');
                    }
                    const scope = enlarged ? '.formula-zoom-content' : '#attention';
                    await page.$eval(scope, el => el.scrollIntoView({block: 'center', inline: 'nearest'}));
                    // Complete the scroll before tapping; a pending scroll event
                    // correctly dismisses tooltips and must not race the next tap.
                    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                    for (const [label, definition] of [['R^{(1)}', 'Матрица оценок'], ['Q^{(1)}', 'Матрица запросов'],
                        ['K^{(1)}', 'Матрица ключей'], [String.raw`\mathsf{T}`, 'Транспонирование'], ['2', translations.ms_number_unassigned]]) {
                        const selector = `${scope} [aria-label=${JSON.stringify(label)}]`;
                        // Hit the actual glyph, since the surrounding scripts can
                        // make the expression's bounding-box centre fall on whitespace.
                        const point = await page.$eval(selector, el => {
                            const glyph = el.querySelector('.mathnormal, .mord') || el;
                            const rect = glyph.getBoundingClientRect();
                            return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
                        });
                        await page.touchscreen.tap(point.x, point.y);
                        await page.waitForFunction(selector => MathSymbolTooltip.active?.element.matches(selector)
                            && MathSymbolTooltip.active.pinned, {}, selector);
                        assert.ok((await page.$eval('.math-symbol-definition', el => el.textContent)).includes(definition), label);
                        if (enlarged) assert.ok(await page.$('.formula-zoom-dialog .math-symbol-tooltip'));
                        if (enlarged && label === 'Q^{(1)}') await page.screenshot({path: path.join(root, `tmp/attention-definition-${width}.png`)});
                        await page.keyboard.press('Escape');
                        if (enlarged) assert.ok(await page.$('.formula-zoom-dialog[open]'));
                    }
                    assert.equal(await page.$eval(`${scope} annotation`, el => el.textContent),
                        String.raw`R^{(1)}=\frac{Q^{(1)}(K^{(1)})^{\mathsf T}}{\sqrt2}.`);
                    if (enlarged) {
                        await page.click('.formula-zoom-close');
                        await page.waitForFunction(() => !document.querySelector('.formula-zoom-dialog'));
                    }
                }
            }
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
            await page.waitForFunction(() => !document.querySelector('.formula-zoom-hint').hidden);
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
