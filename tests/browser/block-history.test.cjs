const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('block versions work from the reading toolbar, across editor saves and on mobile, and disappear on reopen', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import SaveCoordinator from './fastapi_app/static/js/notes/SaveCoordinator.js';
        import DOMPurify from 'dompurify';
        Object.assign(window, {AppState, BlockDOMRenderer, EditorManager, SaveCoordinator, DOMPurify});`,
        resolveDir: root}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1200, height: 850, isMobile: true, hasTouch: true});
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script id="i18n-data" type="application/json">'
            + JSON.stringify(translations) + '</script><main id="blocks-container" class="mode-no-dialectics"></main><div id="modal-container" class="hidden"></div></body></html>');
        for (const file of ['blocks.css', 'editor.css', 'modals.css', 'responsive.css']) {
            await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css', file)});
        }
        const iconCss = await fs.readFile(path.join(root, 'node_modules/@phosphor-icons/web/src/regular/style.css'), 'utf8');
        const iconFont = (await fs.readFile(path.join(root, 'node_modules/@phosphor-icons/web/src/regular/Phosphor.woff2'))).toString('base64');
        await page.addStyleTag({content: iconCss.replace(/url\([^)]+\)/g, `url(data:font/woff2;base64,${iconFont})`)});
        await page.addStyleTag({content: 'body{margin:24px;background:#f8fafc;font:16px/1.6 sans-serif;color:#334155}#blocks-container{max-width:850px;margin:auto;display:block}.dialectics-block{width:100%;box-sizing:border-box;background:white;padding:20px;margin-bottom:24px}.hidden{display:none}.add-block-actions,.block-role-label,.block-stickers-panel{display:none!important}.block-toolbar-row{position:static!important;opacity:1!important}.block-header-left{min-width:0}.block-title{overflow-wrap:anywhere}@media(max-width:480px){body{margin:12px}.dialectics-block{padding:12px}}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            // No formulas in this fixture: leave KaTeX out of the bundle.
            window.katex = {render() {}};
            AppState.setNote({id: 1, revision: 1, title: 'История блока', blocks: [
                {id: 'a', title: 'Как менялось объяснение', side: 'center', html: '<p>Версия 0</p>'},
                {id: 'b', title: 'Другой блок', side: 'center', html: '<p>Без изменений</p>'},
            ]});
            BlockDOMRenderer.renderAll();
            EditorManager.init();
        });
        await t.test('each confirmed editor save creates one version; cancel and an open editor cannot overwrite history', async () => {
            assert.equal(await page.$eval('#a .btn-block-undo', el => el.disabled), true);
            for (let i = 1; i <= 2; i++) {
                await page.click('#a .btn-edit');
                await page.waitForSelector('.tiptap');
                await page.evaluate(value => EditorManager.currentEditor.commands.setContent(`<p>Версия ${value}</p>`), i);
                await page.click('#btn-modal-ok');
                await page.waitForSelector('.modal-editor-floating', {hidden: true});
                assert.equal(await page.$eval('#a .block-version-controls output', el => el.textContent), `${i + 1} / ${i + 1}`);
            }
            await page.click('#a .btn-edit');
            await page.evaluate(() => EditorManager.currentEditor.commands.setContent('<p>Несохранённый черновик</p>'));
            await page.evaluate(() => document.querySelector('#a .btn-block-undo').click());
            assert.equal(await page.evaluate(() => AppState.getBlock('a').html), '<p>Версия 2</p>');
            await page.click('#btn-modal-close');
            assert.equal(await page.$eval('#a .block-version-controls output', el => el.textContent), '3 / 3');
            await page.click('#a .btn-block-undo');
            assert.equal(await page.$eval('#a .block-content', el => el.textContent), 'Версия 1');
            assert.equal(await page.$eval('#b .block-content', el => el.textContent), 'Без изменений');
            assert.equal(await page.evaluate(() => document.activeElement.matches('#a .btn-block-undo')), true);
            await page.click('#a .btn-block-redo');
            assert.equal(await page.$eval('#a .block-content', el => el.textContent), 'Версия 2');
        });
        await t.test('five undo steps are available, a fresh edit clears redo, and the toolbar fits a phone', async () => {
            await page.evaluate(() => {
                for (let i = 3; i <= 8; i++) AppState.updateBlock('a', {html: `<p>Версия ${i}</p>`});
                BlockDOMRenderer.renderAll();
            });
            assert.equal(await page.$eval('#a .block-version-controls output', el => el.textContent), '6 / 6');
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            await (await page.$('#a')).screenshot({path: path.join(root, 'tmp/block-history-desktop.png')});
            for (let i = 7; i >= 3; i--) {
                await page.click('#a .btn-block-undo');
                assert.equal(await page.$eval('#a .block-content', el => el.textContent), `Версия ${i}`);
            }
            assert.equal(await page.$eval('#a .btn-block-undo', el => el.disabled), true);
            assert.equal(await page.$eval('#a .block-version-controls output', el => el.textContent), '1 / 6');
            await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
            await page.tap('#a .btn-block-redo');
            assert.equal(await page.$eval('#a .block-content', el => el.textContent), 'Версия 4');
            const fits = await page.$eval('#a .block-version-controls', el => {
                const rect = el.getBoundingClientRect();
                return rect.left >= 0 && rect.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth;
            });
            assert.equal(fits, true);
            await (await page.$('#a')).screenshot({path: path.join(root, 'tmp/block-history-mobile.png')});
            await page.evaluate(() => {AppState.updateBlock('a', {html: '<p>Новая ветка</p>'}); BlockDOMRenderer.renderAll();});
            assert.equal(await page.$eval('#a .btn-block-redo', el => el.disabled), true);
        });
        await t.test('autosave payload contains only current content; reopening starts with an empty history', async () => {
            const payload = await page.evaluate(() => SaveCoordinator._payload(AppState.currentNote));
            assert.equal(payload.blocks[0].html, '<p>Новая ветка</p>');
            assert.equal(JSON.stringify(payload).includes('Версия 8'), false);
            await page.evaluate(saved => {
                AppState.acceptSaved(AppState.currentNote, {content_json: saved.blocks}, saved);
                AppState.setNote({id: 1, ...saved});
                BlockDOMRenderer.renderAll();
            }, payload);
            assert.equal(await page.$eval('#a .block-version-controls output', el => el.textContent), '1 / 1');
            assert.equal(await page.$eval('#a .btn-block-undo', el => el.disabled), true);
            assert.equal(await page.$eval('#a .btn-block-redo', el => el.disabled), true);
            assert.equal(await page.$eval('#a .block-content', el => el.textContent), 'Новая ветка');
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
