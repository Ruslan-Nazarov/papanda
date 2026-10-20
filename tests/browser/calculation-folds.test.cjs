const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('long calculations fold with keyboard and touch, persist, and remain complete in editing, copy, zoom and print', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import SaveCoordinator from './fastapi_app/static/js/notes/SaveCoordinator.js';
        import NoteExportService from './fastapi_app/static/js/notes/NoteExportService.js';
        import FormulaZoom from './fastapi_app/static/js/notes/FormulaZoom.js';
        import DOMPurify from 'dompurify';
        import katex from 'katex';
        import renderMathInElement from 'katex/contrib/auto-render';
        import './fastapi_app/static/js/notes/app.js';
        Object.assign(window, {AppState, BlockDOMRenderer, EditorManager, SaveCoordinator,
            NoteExportService, FormulaZoom, DOMPurify, katex, renderMathInElement});`, resolveDir: root},
    bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1100, height: 900, isMobile: true, hasTouch: true});
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script id="i18n-data" type="application/json">'
            + JSON.stringify(translations) + '</script><main id="blocks-container" class="mode-no-dialectics"></main><div id="modal-container" class="hidden"></div></body></html>');
        for (const file of ['blocks.css', 'editor.css', 'math.css', 'formula-zoom.css', 'modals.css', 'responsive.css']) {
            await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css', file)});
        }
        await page.addStyleTag({path: path.join(root, 'node_modules/katex/dist/katex.min.css')});
        const iconDir = path.join(root, 'node_modules/@phosphor-icons/web/src/regular');
        const iconFont = (await fs.readFile(path.join(iconDir, 'Phosphor.woff2'))).toString('base64');
        const iconCss = (await fs.readFile(path.join(iconDir, 'style.css'), 'utf8'))
            .replace('./Phosphor.woff2', `data:font/woff2;base64,${iconFont}`);
        await page.addStyleTag({content: iconCss});
        await page.addStyleTag({content: '#cookie-banner{display:none!important}'});
        const fontDir = path.join(root, 'node_modules/katex/dist/fonts');
        for (const file of (await fs.readdir(fontDir)).filter(name => name.endsWith('.woff2'))) {
            const match = /^KaTeX_(.+)-(Regular|Italic|Bold|BoldItalic)\.woff2$/.exec(file);
            if (!match) continue;
            const data = (await fs.readFile(path.join(fontDir, file))).toString('base64');
            await page.addStyleTag({content: `@font-face{font-family:KaTeX_${match[1]};font-style:${match[2].includes('Italic') ? 'italic' : 'normal'};font-weight:${match[2].includes('Bold') ? '700' : '400'};src:url(data:font/woff2;base64,${data}) format('woff2')}`});
        }
        await page.addStyleTag({content: 'body{margin:24px;background:#fff8ef;font:16px/1.6 sans-serif;color:#334155}#blocks-container{max-width:880px;margin:auto;display:block}.dialectics-block{width:100%;box-sizing:border-box;background:white;padding:20px;margin-bottom:24px}.hidden{display:none}.add-block-actions,.block-role-label,.block-stickers-panel{display:none!important}.block-toolbar-row{position:static!important;opacity:1!important}.block-header-left{min-width:0}.block-title{overflow-wrap:anywhere}@media(max-width:480px){body{margin:12px}.dialectics-block{padding:12px}}'});
        // The clipboard handler's app module reads CSRF cookies at import time.
        // This isolated about:blank fixture has no cookie origin or server.
        await page.evaluate(() => Object.defineProperty(document, 'cookie', {value: '', configurable: true}));
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        assert.deepEqual(errors, []);
        await page.evaluate(() => {
            window.example = String.raw`\begin{aligned}
                O_{0,0}&=\gamma^{(2)}_0\widehat R_{0,0}+\beta^{(2)}_0\\
                &\approx0.8\cdot(-0.886128226844)-0.02\\
                &\approx-0.708902581475-0.02\\
                &\approx-0.728902581475,\\[5pt]
                O_{0,1}&=\gamma^{(2)}_1\widehat R_{0,1}+\beta^{(2)}_1\\
                &\approx1.1\cdot1.397564424027+0.04\\
                &\approx1.53732086430+0.04\\
                &\approx1.57732086430,\\[5pt]
                O_{0,2}&=\gamma^{(2)}_2\widehat R_{0,2}+\beta^{(2)}_2\\
                &\approx0.9\cdot(-0.511436197183)+0.01\\
                &\approx-0.460292577465+0.01\\
                &\approx-0.450292577465.
            \end{aligned}`;
            const formulaHtml = formula => {
                const span = document.createElement('span');
                span.className = 'math-inline';
                span.setAttribute('formula', formula);
                return `<p>${span.outerHTML}</p>`;
            };
            window.originalHtml = '<p>Применяем обученные масштаб и смещение:</p>' + formulaHtml(example)
                + '<p>Следующий расчёт:</p>' + formulaHtml(example.replaceAll('O_{0,', 'O_{1,'))
                + '<p>Короткая формула:</p>' + formulaHtml(String.raw`\begin{aligned}x&=1+2\\&=3\end{aligned}`)
                + '<table><tr><th>Параметр</th><th>Значение</th></tr><tr><td>γ</td><td>0.8</td></tr></table>'
                + '<table><tr><th>Параметр</th><th>Значение</th></tr><tr><td>β</td><td>−0.02</td></tr></table>';
            AppState.setNote({id: 1, title: 'Трансформеры', blocks: [
                {id: 'a', title: 'Применяем функцию активации', side: 'center', html: originalHtml,
                    author: 'ai', rejected_drafts: [{id: 'draft', html: '<p>Черновик</p>'}]},
            ]});
            BlockDOMRenderer.renderAll();
            EditorManager.init();
            window.app.setupCopyHandler();
            Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async text => {window.copied = text;}}});
        });
        await page.evaluate(() => document.fonts.ready);
        await t.test('bulk actions share the block toolbar as compact icon buttons with accessible state', async () => {
            assert.equal(await page.$$eval('.block-toolbar-row .block-fold-controls > button', els => els.length), 2);
            assert.equal(await page.$('.block-content .table-fold-all, .block-content .calculation-fold-all'), null);
            assert.equal(await page.$$eval('.block-fold-controls > button', els => els.every(el => {
                const toolbar = el.closest('.block-toolbar-row').getBoundingClientRect();
                const rect = el.getBoundingClientRect();
                const copy = el.closest('.block-toolbar-row').querySelector('.btn-copy').getBoundingClientRect();
                return el.textContent === '' && el.querySelector('i[aria-hidden="true"]')
                    && el.getAttribute('aria-label') === el.title && el.getAttribute('aria-pressed') === 'false'
                    && rect.top >= toolbar.top && rect.bottom <= toolbar.bottom && rect.height === copy.height;
            })), true);
            await page.click('.table-fold-all');
            assert.equal(await page.$eval('.table-fold-all', el => el.getAttribute('aria-pressed')), 'true');
            assert.equal(await page.$eval('.table-fold-all', el => el.title), 'Развернуть все таблицы');
            assert.equal(await page.$$eval('.calculation-fold-body[hidden]', els => els.length), 0);
            await page.click('.table-fold-all');
        });
        await t.test('toolbar stays on one row at the reported card width and on phones', async () => {
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            for (const width of [707, 640, 390]) {
                await page.setViewport({width: width === 707 ? 1100 : width, height: 844, isMobile: true, hasTouch: true});
                await page.$eval('#a', (el, width) => { el.style.width = width === 707 ? '707px' : '100%'; }, width);
                const layout = await page.$eval('.block-toolbar-row', toolbar => {
                    const actions = toolbar.querySelector('.block-toolbar-actions');
                    const row = toolbar.getBoundingClientRect();
                    const author = toolbar.querySelector('.block-author-control').getBoundingClientRect();
                    const folds = toolbar.querySelector('.block-fold-controls').getBoundingClientRect();
                    const middle = (author.top + author.bottom) / 2;
                    return {
                        oneRow: [...toolbar.querySelectorAll('.block-action-btn, .block-author-control')].every(el => {
                            const rect = el.getBoundingClientRect();
                            return Math.abs((rect.top + rect.bottom) / 2 - middle) < 1;
                        }),
                        fits: row.left >= 0 && row.right <= innerWidth && author.right <= row.right
                            && folds.right <= author.left && actions.getBoundingClientRect().right <= folds.left,
                        pageFits: document.documentElement.scrollWidth <= innerWidth,
                        scrolls: actions.scrollWidth > actions.clientWidth,
                    };
                });
                assert.equal(layout.oneRow, true, `one row at ${width}px`);
                assert.equal(layout.fits, true, `controls stay inside the toolbar at ${width}px`);
                assert.equal(layout.pageFits, true, `no page overflow at ${width}px`);
                await (await page.$('.block-toolbar-row')).screenshot({path: path.join(root, `tmp/block-toolbar-${width}.png`)});
                if (width === 390) {
                    assert.equal(layout.scrolls, true);
                    await page.focus('.btn-delete');
                    assert.equal(await page.$eval('.block-toolbar-actions', el => {
                        const button = el.querySelector('.btn-delete').getBoundingClientRect();
                        const viewport = el.getBoundingClientRect();
                        return el.scrollLeft > 0 && button.left >= viewport.left && button.right <= viewport.right;
                    }), true, 'keyboard focus reveals tools in the scrollable row');
                }
            }
            await page.setViewport({width: 1100, height: 900, isMobile: true, hasTouch: true});
            await page.$eval('#a', el => { el.style.width = '100%'; });
            await page.$eval('.block-toolbar-actions', el => { el.scrollLeft = 0; });
        });
        await t.test('individual folds keep keyboard focus and rendered controls; repeated scans are safe', async () => {
            assert.equal(await page.$$eval('.calculation-fold-toggle', els => els.length), 2);
            assert.equal(await page.$eval('.calculation-fold-size', el => el.textContent), 'Строк: 12');
            await page.focus('.calculation-fold-toggle');
            await page.keyboard.press('Enter');
            assert.equal(await page.$$eval('.calculation-fold-body[hidden]', els => els.length), 1);
            assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-expanded')), 'false');
            await page.evaluate(() => { FormulaZoom.scan(document); BlockDOMRenderer.renderAll(); });
            assert.equal(await page.$$eval('.calculation-fold-toggle', els => els.length), 2);
            assert.equal(await page.$$eval('.calculation-fold-body[hidden]', els => els.length), 1);
            await page.keyboard.press('Space');
            await page.click('.math-expand-button');
            await page.waitForSelector('.formula-zoom-dialog[open]');
            assert.equal(await page.$eval('.formula-zoom-content annotation', el => el.textContent), await page.evaluate(() => example));
            await page.click('.formula-zoom-close');
            await page.waitForFunction(() => !document.querySelector('.formula-zoom-dialog'));
            await page.click('.calculation-fold-toggle', {clickCount: 2});
            assert.equal(await page.$('.modal-editor-floating'), null);
        });
        await t.test('all folds, copy, save and reopen keep the full calculation and source HTML', async () => {
            await page.click('.calculation-fold-all');
            assert.equal(await page.$$eval('.calculation-fold-body[hidden]', els => els.length), 2);
            assert.equal(await page.$eval('.calculation-fold-all', el => el.getAttribute('aria-pressed')), 'true');
            assert.equal(await page.$eval('.calculation-fold-all', el => el.title), 'Развернуть длинные вычисления');
            await page.click('.btn-copy');
            assert((await page.evaluate(() => copied)).includes('-0.450292577465'));
            const copy = await page.evaluate(() => {
                const range = document.createRange();
                range.selectNodeContents(document.querySelector('.block-content'));
                getSelection().removeAllRanges(); getSelection().addRange(range);
                const clipboard = new DataTransfer();
                document.dispatchEvent(new ClipboardEvent('copy', {clipboardData: clipboard, bubbles: true, cancelable: true}));
                getSelection().removeAllRanges();
                return {html: clipboard.getData('text/html'), text: clipboard.getData('text/plain')};
            });
            assert(copy.text.includes('-0.450292577465'));
            assert.doesNotMatch(copy.html + copy.text, /calculation-fold|math-calculation-button|Развернуть|Свернуть/);
            const saved = await page.evaluate(() => {
                SaveCoordinator._sync(AppState.currentNote);
                const payload = SaveCoordinator._payload(AppState.currentNote);
                AppState.acceptSaved(AppState.currentNote, {content_json: payload.blocks}, payload);
                AppState.setNote({id: 1, ...payload});
                BlockDOMRenderer.renderAll();
                return {html: payload.blocks[0].html, original: originalHtml,
                    folded: payload.blocks[0].collapsed_calculations.length,
                    markdown: NoteExportService.buildMarkdown(AppState.currentNote)};
            });
            assert.equal(saved.html, saved.original);
            assert.equal(saved.folded, 2);
            assert(saved.markdown.includes('-0.450292577465'));
            assert.equal(await page.$$eval('.calculation-fold-body[hidden]', els => els.length), 2);
        });
        await t.test('editor shows complete formulas without fold controls', async subtest => {
            subtest.after(() => page.evaluate(() => EditorManager.closeModal(false)));
            await page.click('.btn-edit');
            await page.waitForSelector('.tiptap .math-inline');
            assert.equal(await page.$$eval('.tiptap .math-inline', els => els.length), 3);
            assert.equal(await page.$eval('.tiptap .math-inline annotation', el => el.textContent), await page.evaluate(() => example));
            assert.equal(await page.$('.tiptap .calculation-fold'), null);
        });
        await t.test('printing includes collapsed equations and hides fold controls', async () => {
            await page.emulateMediaType('print');
            assert.equal(await page.$eval('.calculation-fold-toggle', el => getComputedStyle(el).display), 'none');
            assert.equal(await page.$eval('.calculation-fold-all', el => getComputedStyle(el).display), 'none');
            assert.equal(await page.$eval('.calculation-fold-body', el => getComputedStyle(el).display), 'block');
            assert.equal(await page.$eval('.calculation-fold-body .katex', el => el.getBoundingClientRect().height > 0), true);
            await page.emulateMediaType('screen');
        });
        await t.test('desktop and phone controls stay inside the page and expand by touch', async () => {
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            await (await page.$('#a')).screenshot({path: path.join(root, 'tmp/calculation-folds-desktop.png')});
            await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
            await page.tap('.calculation-fold-toggle');
            assert.equal(await page.$$eval('.calculation-fold-body[hidden]', els => els.length), 1);
            assert.equal(await page.$$eval('.calculation-fold-toggle', els => els.every(el => {
                const rect = el.getBoundingClientRect();
                return rect.left >= 0 && rect.right <= innerWidth && rect.height >= 44;
            })), true);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await (await page.$('#a')).screenshot({path: path.join(root, 'tmp/calculation-folds-mobile.png')});
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
