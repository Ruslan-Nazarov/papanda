const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('reading cards minimize into bottom bookmarks and restore independently of editors', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import DOMPurify from 'dompurify';
        Object.assign(window, {AppState, BlockDOMRenderer, EditorManager, DOMPurify});`, resolveDir: root},
    bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1265, height: 730, isMobile: true, hasTouch: true});
        await page.setRequestInterception(true);
        page.on('request', request => request.url() === 'http://localhost/reading-minimize-test'
            ? request.respond({status: 200, contentType: 'text/html', body: '<!doctype html>'}) : request.abort());
        await page.goto('http://localhost/reading-minimize-test');
        const translations = JSON.parse(fs.readFileSync(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
            + '<script id="i18n-data" type="application/json">' + JSON.stringify(translations) + '</script>'
            + '<div class="canvas-area"><main id="blocks-container" class="dialectics-canvas mode-no-dialectics"></main></div>'
            + '<div id="modal-container" class="hidden"></div><button class="scroll-top-fab visible">↑</button></body></html>');
        for (const file of ['base.css', 'layout.css', 'blocks.css', 'components.css', 'editor.css', 'responsive.css']) {
            await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css', file)});
        }
        await page.addStyleTag({content: '.hidden{display:none}html{scroll-behavior:auto!important}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            AppState.setNote({id: 1, title: 'Конспект', blocks: [
                {id: 'a', side: 'right', title: 'Пользуемся обученными матрицами для ответов', collapsed: true,
                    html: '<p>Теперь проверим, как модель использует собственные ответы.</p>'
                        + '<span data-type="hidden-phrase" data-hint="Пояснение">Подробности</span>'
                        + '<p>Продолжаем чтение.</p>'.repeat(35)},
                {id: 'b', side: 'left', title: 'Следующий шаг', html: '<p>Второй блок конспекта.</p>'},
                {id: 'c', side: 'right', title: 'Проверяем результат', html: '<p>Третий блок конспекта.</p>'},
            ]});
            BlockDOMRenderer.renderAll();
            EditorManager.init();
            window.original = JSON.stringify(AppState.currentNote);
        });
        const parked = () => page.$$eval('.reading-dock-item', buttons => buttons.map(button => button.dataset.blockId));

        await t.test('a distinct minus button parks the whole card and preserves reading state', async () => {
            await page.evaluate(() => {
                const card = document.getElementById('a');
                card.querySelector('.btn-reading-view').click();
                card.querySelector('[data-type="hidden-phrase"]').click();
                window.originalCard = card;
            });
            await page.waitForFunction(() => Math.abs(document.getElementById('a').getBoundingClientRect().top - 96) < 2);
            assert.equal(await page.$eval('#a .btn-minimize-reading', button => button.title), 'Свернуть вниз в закладку');
            if (process.env.READING_MINIMIZE_SCREENSHOTS) {
                fs.mkdirSync(path.join(root, 'output'), {recursive: true});
                await page.screenshot({path: path.join(root, 'output/reading-minimize-button.png')});
            }
            await page.click('#a .btn-minimize-reading');
            assert.deepEqual(await parked(), ['a']);
            assert.equal(await page.$eval('#a', card => getComputedStyle(card).display), 'none');
            assert.equal(await page.$eval('.reading-dock', dock => getComputedStyle(dock).position), 'fixed');
            assert.equal(await page.evaluate(() => JSON.stringify(AppState.currentNote) === original), true);
            assert.equal(await page.$eval('#a', card => getComputedStyle(card.previousElementSibling).counterIncrement), 'block-number 1');
            await page.keyboard.press('Enter');
            assert.deepEqual(await parked(), []);
            assert.equal(await page.evaluate(() => document.getElementById('a') === originalCard), true);
            assert.equal(await page.$eval('#a', card => card.classList.contains('reading-centered')), true);
            assert.equal(await page.$eval('#a [data-type="hidden-phrase"]', phrase => phrase.classList.contains('is-expanded')), true);
            assert.equal(await page.$eval('#a .block-content', content => getComputedStyle(content).display), 'block');
            assert(await page.$eval('#a', card => Math.abs(card.getBoundingClientRect().top - 96) < 2));
            await page.evaluate(() => document.getElementById('a').querySelector('.btn-reading-view').click());
            assert.equal(await page.$eval('#a', card => card.classList.contains('reading-centered')), false);
            assert.equal(await page.$eval('#a .block-content', content => getComputedStyle(content).display), 'none');
        });

        await t.test('bookmarks survive rendering, remain separate from editor drafts and are complete in print', async () => {
            await page.click('#a .btn-minimize-reading');
            await page.click('#b .btn-minimize-reading');
            await page.evaluate(() => {
                BlockDOMRenderer.renderAll();
                EditorManager.openModalEditor('c', document.getElementById('c'));
            });
            await page.click('.btn-min');
            assert.deepEqual(await parked(), ['a', 'b']);
            assert.equal(await page.$eval('#a', card => getComputedStyle(card).display), 'none');
            const bounds = await page.evaluate(() => ({reading: document.querySelector('.reading-dock').getBoundingClientRect().bottom,
                editor: document.querySelector('.editor-dock').getBoundingClientRect().top}));
            assert(bounds.reading <= bounds.editor, 'reading bookmarks and editor drafts must not overlap');
            if (process.env.READING_MINIMIZE_SCREENSHOTS) {
                await page.screenshot({path: path.join(root, 'output/reading-minimize-desktop.png')});
            }
            await page.emulateMediaType('print');
            assert.equal(await page.$eval('#a', card => getComputedStyle(card).display), 'block');
            assert.equal(await page.$eval('.reading-dock', dock => getComputedStyle(dock).display), 'none');
            await page.emulateMediaType('screen');
            await page.click('.reading-dock-item[data-block-id="b"]');
            assert.deepEqual(await parked(), ['a']);
            assert.equal(await page.$eval('#b', card => card.classList.contains('reading-centered')), true);
            assert.equal(await page.$eval('.editor-dock-item', button => button.dataset.blockId), 'c');
            await page.evaluate(() => AppState.updateBlock('a', {title: '<img src=x onerror=alert(1)>'}));
            assert.equal(await page.$('.reading-dock img'), null);
            assert.equal(await page.$eval('.reading-dock-item > span', span => span.textContent), '<img src=x onerror=alert(1)>');
            await page.evaluate(() => {
                AppState.removeBlock('a');
                BlockDOMRenderer.renderAll();
            });
            assert.deepEqual(await parked(), []);
            await page.click('#b .btn-minimize-reading');
            await page.evaluate(() => {
                AppState.setNote({id: 2, title: 'Другой конспект', blocks: []});
                BlockDOMRenderer.renderAll();
            });
            assert.equal(await page.$('.reading-dock, .editor-dock'), null);
        });

        await t.test('several bookmarks fit a phone viewport and restore by touch', async () => {
            await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
            await page.evaluate(() => {
                AppState.setNote({id: 3, title: 'Мобильный конспект', blocks: Array.from({length: 6}, (_, i) => ({
                    id: `m${i}`, title: `Блок ${i + 1} — длинное название`, side: 'left', html: '<p>Текст для чтения.</p>',
                }))});
                BlockDOMRenderer.renderAll();
                for (const button of document.querySelectorAll('.btn-minimize-reading')) button.click();
            });
            assert.equal((await parked()).length, 6);
            const bounds = await page.$eval('.reading-dock', dock => ({left: dock.getBoundingClientRect().left,
                right: dock.getBoundingClientRect().right, overflow: dock.scrollWidth > dock.clientWidth}));
            assert(bounds.left >= 0 && bounds.right <= 390);
            assert(bounds.overflow);
            if (process.env.READING_MINIMIZE_SCREENSHOTS) {
                await page.screenshot({path: path.join(root, 'output/reading-minimize-mobile.png')});
            }
            await page.$eval('.reading-dock-item[data-block-id="m5"]', button => button.scrollIntoView({block: 'nearest', inline: 'nearest'}));
            await page.tap('.reading-dock-item[data-block-id="m5"]');
            assert.equal(await page.$eval('#m5', card => card.classList.contains('reading-centered')), true);
            assert.equal((await parked()).length, 5);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        });
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
