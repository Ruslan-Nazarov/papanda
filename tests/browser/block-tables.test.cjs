const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('tables fold with keyboard and touch, persist through saves, and stay complete in the editor, copy and print', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import SaveCoordinator from './fastapi_app/static/js/notes/SaveCoordinator.js';
        import NoteExportService from './fastapi_app/static/js/notes/NoteExportService.js';
        import DOMPurify from 'dompurify';
        import katex from 'katex';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {AppState, BlockDOMRenderer, EditorManager, SaveCoordinator,
            NoteExportService, DOMPurify, katex, renderMathInElement});`, resolveDir: root},
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
        for (const file of ['blocks.css', 'editor.css', 'math.css', 'modals.css', 'responsive.css']) {
            await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css', file)});
        }
        await page.addStyleTag({path: path.join(root, 'node_modules/katex/dist/katex.min.css')});
        await page.addStyleTag({content: 'body{margin:24px;background:#fff8ef;font:16px/1.6 sans-serif;color:#334155}#blocks-container{max-width:880px;margin:auto;display:block}.dialectics-block{width:100%;box-sizing:border-box;background:white;padding:20px;margin-bottom:24px}.hidden{display:none}.add-block-actions,.block-role-label,.block-stickers-panel{display:none!important}.block-toolbar-row{position:static!important;opacity:1!important}.block-header-left{min-width:0}.block-title{overflow-wrap:anywhere}@media(max-width:480px){body{margin:12px}.dialectics-block{padding:12px}}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            const table = (n, name) => '<table><thead><tr><th>Элемент</th><th>Старое значение</th><th>Градиент</th><th>Новое значение</th></tr></thead><tbody>'
                + Array.from({length: n}, (_, i) => `<tr><td>${i + 1}</td><td>1</td><td>−0.280020</td><td>${name} ${i + 1}</td></tr>`).join('') + '</tbody></table>';
            window.originalHtml = '<p>Для матрицы $W_{dy}$:</p>' + table(9, 'W')
                + '<p>Для смещения кодера:</p>' + table(3, 'b')
                + '<p>Для $W_{dh}$, преобразующей вход декодера:</p>' + table(9, 'D');
            AppState.setNote({id: 1, title: 'Обучение модели', blocks: [
                {id: 'a', title: 'Обновление параметров', side: 'center', html: originalHtml},
            ]});
            BlockDOMRenderer.renderAll();
            EditorManager.init();
            Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async text => {window.copied = text;}}});
        });
        await t.test('each table folds independently without moving focus; math remains rendered', async () => {
            assert.equal(await page.$$eval('.table-fold-toggle', els => els.length), 3);
            assert.equal(await page.$eval('.table-fold-size', el => el.textContent), 'Строк: 9 · столбцов: 4');
            assert.equal(await page.$$eval('.block-content .katex', els => els.length), 2);
            await page.focus('.table-fold-toggle');
            await page.keyboard.press('Enter');
            assert.equal(await page.$$eval('.table-fold-body[hidden]', els => els.length), 1);
            assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-expanded')), 'false');
            await page.keyboard.press('Space');
            assert.equal(await page.$$eval('.table-fold-body[hidden]', els => els.length), 0);
            await page.click('.table-fold-toggle', {clickCount: 2});
            assert.equal(await page.$('.modal-editor-floating'), null, 'double-clicking a fold must not open the editor');
            await page.click('.table-fold-all');
            assert.equal(await page.$$eval('.table-fold-body[hidden]', els => els.length), 3);
            assert.equal(await page.$eval('.table-fold-all', el => el.title), 'Развернуть все таблицы');
            await page.click('.btn-copy');
            const copy = await page.evaluate(() => window.copied);
            assert(copy.includes('W 9') && copy.includes('b 3') && copy.includes('D 9'));
            assert(!copy.includes('Развернуть') && !copy.includes('Свернуть'));
        });
        await t.test('saving and reopening restore folds without view markup in saved content', async () => {
            const result = await page.evaluate(() => {
                SaveCoordinator._sync(AppState.currentNote);
                const payload = SaveCoordinator._payload(AppState.currentNote);
                AppState.acceptSaved(AppState.currentNote, {content_json: payload.blocks}, payload);
                AppState.setNote({id: 1, ...payload});
                BlockDOMRenderer.renderAll();
                return {html: payload.blocks[0].html, original: originalHtml,
                    markdown: NoteExportService.buildMarkdown(AppState.currentNote)};
            });
            assert.equal(result.html, result.original);
            assert(result.markdown.includes('W 9') && result.markdown.includes('D 9'));
            assert.equal(await page.$$eval('.table-fold-body[hidden]', els => els.length), 3);
        });
        await t.test('popup opens folded tables, traps focus, and closes without changing content or folds', async () => {
            const before = await page.evaluate(() => JSON.stringify(AppState.getBlock('a')));
            await page.focus('.table-view-open');
            await page.keyboard.press('Enter');
            await page.waitForSelector('.table-view-dialog[open]');
            assert.equal(await page.$$eval('.table-view-dialog tbody tr', els => els.length), 9);
            assert.equal(await page.$eval('.table-view-dialog', el => el.getBoundingClientRect().width > 1000), true);
            assert.equal(await page.$eval('.table-view-close', el => document.activeElement === el), true);
            await page.keyboard.press('Tab');
            await page.evaluate(() => document.querySelector('.table-view-open').focus());
            assert.equal(await page.evaluate(() => !!document.activeElement.closest('.table-view-dialog')), true);
            await page.keyboard.press('Escape');
            await page.waitForSelector('.table-view-dialog', {hidden: true});
            assert.equal(await page.$eval('.table-view-open', el => document.activeElement === el), true);
            assert.equal(await page.evaluate(() => JSON.stringify(AppState.getBlock('a'))), before);
            assert.equal(await page.$$eval('.table-fold-body[hidden]', els => els.length), 3);
            await page.click('.table-view-open', {clickCount: 2});
            assert.equal(await page.$('.modal-editor-floating'), null);
            await page.click('.table-view-close');
            await page.waitForSelector('.table-view-dialog', {hidden: true});
            await page.click('.table-view-open');
            await page.mouse.click(2, 2);
            await page.waitForSelector('.table-view-dialog', {hidden: true});
        });
        await t.test('editor shows all table rows and does not receive fold controls', async () => {
            await page.click('.btn-edit');
            await page.waitForSelector('.tiptap table');
            assert.equal(await page.$$eval('.tiptap table', els => els.length), 3);
            assert.equal(await page.$$eval('.tiptap tr', els => els.length), 24);
            assert.equal(await page.$('.tiptap .table-fold'), null);
            await page.evaluate(() => EditorManager.closeModal(false));
        });
        await t.test('print includes folded rows and hides controls', async () => {
            await page.emulateMediaType('print');
            assert.equal(await page.$eval('.table-fold-toggle', el => getComputedStyle(el).display), 'none');
            assert.equal(await page.$eval('.table-fold-all', el => getComputedStyle(el).display), 'none');
            assert.equal(await page.$eval('.table-fold-body', el => getComputedStyle(el).display), 'block');
            assert.equal(await page.$eval('.table-fold-body td', el => el.getBoundingClientRect().height > 0), true);
            await page.emulateMediaType('screen');
        });
        await t.test('controls fit a phone and can expand one table by touch', async () => {
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            await (await page.$('#a')).screenshot({path: path.join(root, 'tmp/table-folds-desktop.png')});
            await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
            await page.tap('.table-fold-toggle');
            assert.equal(await page.$$eval('.table-fold-body[hidden]', els => els.length), 2);
            assert.equal(await page.$$eval('.table-fold-toggle', els => els.every(el => {
                const rect = el.getBoundingClientRect();
                return rect.left >= 0 && rect.right <= innerWidth;
            })), true);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            assert.equal(await page.$eval('.table-fold-body', el => el.scrollWidth > el.clientWidth), true,
                'a wide table scrolls inside the block');
            await (await page.$('#a')).screenshot({path: path.join(root, 'tmp/table-folds-mobile.png')});
            await page.tap('.table-view-open');
            await page.waitForSelector('.table-view-dialog[open]');
            assert.equal(await page.$eval('.table-view-dialog', el => {
                const rect = el.getBoundingClientRect();
                return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
            }), true);
            assert.equal(await page.$eval('.table-view-viewport', el => el.scrollWidth > el.clientWidth), true);
            await page.screenshot({path: path.join(root, 'tmp/table-popup-mobile.png')});
            await page.tap('.table-view-close');
            await page.waitForSelector('.table-view-dialog', {hidden: true});
        });
        await t.test('large popup scrolls internally and is removed when its source block disappears', async () => {
            await page.setViewport({width: 1440, height: 900, isMobile: true, hasTouch: true});
            await page.evaluate(() => {
                const table = document.querySelector('.table-fold-body table');
                const row = table.rows[table.rows.length - 1];
                for (let i = 0; i < 100; i++) row.parentElement.append(row.cloneNode(true));
            });
            await page.click('.table-view-open');
            assert.equal(await page.$eval('.table-view-viewport', el => el.scrollHeight > el.clientHeight), true);
            assert.equal(await page.$eval('.table-view-dialog', el => el.getBoundingClientRect().bottom <= innerHeight), true);
            await page.screenshot({path: path.join(root, 'tmp/table-popup-desktop.png')});
            await page.evaluate(() => BlockDOMRenderer.renderAll({reuseUnchanged: false}));
            await page.waitForSelector('.table-view-dialog', {hidden: true});
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
