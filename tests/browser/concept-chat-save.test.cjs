const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('selected-fragment chats save at their original position and survive editor and storage round trips', {timeout: 60_000}, async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import ConceptSelectionMenu from './fastapi_app/static/js/notes/ConceptSelectionMenu.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import SaveCoordinator from './fastapi_app/static/js/notes/SaveCoordinator.js';
        import NotesAPI from './fastapi_app/static/js/notes/api.js';
        import SavedConceptChat from './fastapi_app/static/js/notes/SavedConceptChat.js';
        import katex from 'katex';
        import DOMPurify from 'dompurify';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {ConceptSelectionMenu, AppState, BlockDOMRenderer, EditorManager,
            SaveCoordinator, NotesAPI, SavedConceptChat, katex, DOMPurify, renderMathInElement});`, resolveDir: root},
        bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(5000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1000, height: 800});
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>'
            + '<body><script id="i18n-data" type="application/json">' + JSON.stringify(translations)
            + '</script><div id="modal-container" class="hidden"></div><main id="blocks-container" class="mode-no-dialectics"></main></body></html>');
        for (const file of ['node_modules/katex/dist/katex.min.css', 'fastapi_app/static/css/math.css',
            'fastapi_app/static/css/blocks.css', 'fastapi_app/static/css/modals.css', 'fastapi_app/static/css/editor.css']) {
            await page.addStyleTag({path: path.join(root, file)});
        }
        await page.addStyleTag({content: 'body{font:16px/1.5 sans-serif;margin:24px}.hidden{display:none}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            ConceptSelectionMenu.init();
            window.originalHTML = '<p>Первая матрица.</p><p>Формула <span class="math-inline" formula="Q=XW">Q=XW</span>'
                + ': вторая <strong>матрица</strong> и продолжение.</p><p>Последний абзац.</p>';
            window.setup = () => {
                AppState.setNote({id: 1, title: 'Внимание', blocks: [{id: 'current', title: 'Матрицы', side: 'left', html: originalHTML},
                    {id: 'other', title: 'Другой блок', side: 'right', html: '<p>Связанные данные.</p>'}]});
                BlockDOMRenderer.renderAll();
                window.untouched = document.getElementById('other');
                window.savedPayloads = [];
                window.chatRequests = 0;
                ConceptSelectionMenu._context = async () => [
                    {block_id: 'other', title: 'Другой блок', text: 'Связанные данные.'},
                    {kind: 'link', title: 'Внешний источник', url: 'https://example.com/reference', text: 'Пример'},
                    {kind: 'version', block_id: 'other', title: 'Старая версия', text: 'Прежний текст: $x^2$.'},
                ];
                NotesAPI.updateNote = async (id, payload) => {
                    savedPayloads.push(payload);
                    return {id, revision: savedPayloads.length, ...payload, content_json: payload.blocks};
                };
                NotesAPI.stream = async (_path, payload, update) => {
                    chatRequests++;
                    const answer = payload.question ? 'Уточнение: $q_1$ — элемент матрицы [1].'
                        : '## Объяснение\n\nМатрица $Q$ содержит **элементы** [1].\n\n| Элемент | Строка |\n|---|---|\n| $q_1$ | 1 |\n\n'
                            + 'Дополнительное пояснение о матрицах. '.repeat(50);
                    update('', answer);
                    return answer;
                };
            };
            window.selectWord = async () => {
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const range = document.createRange();
                range.selectNodeContents(document.querySelector('#current .block-content strong'));
                const selection = getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.querySelector('#current .block-content strong').dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                await new Promise(resolve => setTimeout(resolve, 50));
            };
            setup();
        });

        await t.test('closing does not write; the save control fits a narrow screen', async () => {
            await page.evaluate(() => selectWord());
            await page.waitForSelector('.concept-explain-btn');
            await page.click('.concept-explain-btn');
            await page.waitForFunction(() => !document.querySelector('.concept-explain-save').disabled);
            await page.setViewport({width: 360, height: 740});
            const layout = await page.$eval('.concept-explain-save', button => {
                const bounds = button.getBoundingClientRect();
                return {label: button.textContent, visible: bounds.left >= 0 && bounds.right <= innerWidth
                    && bounds.top >= 0 && bounds.bottom <= innerHeight,
                inputWidth: document.querySelector('.concept-explain-input').getBoundingClientRect().width};
            });
            assert.equal(layout.label, 'Сохранить чат');
            assert.equal(layout.visible, true);
            assert(layout.inputWidth > 100);
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            await page.screenshot({path: path.join(root, 'tmp/concept-chat-save-mobile.png')});
            await page.click('.concept-explain-modal .btn-close-modal');
            const state = await page.evaluate(() => ({html: AppState.getBlock('current').html, originalHTML,
                dirty: AppState.isDirty, writes: savedPayloads.length}));
            assert.equal(state.html, state.originalHTML);
            assert.equal(state.dirty, false);
            assert.equal(state.writes, 0);
            await page.setViewport({width: 1000, height: 800});
        });

        await t.test('save includes follow-ups, math and tables beside the second occurrence', async () => {
            await page.evaluate(() => selectWord());
            await page.waitForSelector('.concept-explain-btn');
            await page.click('.concept-explain-btn');
            await page.waitForFunction(() => !document.querySelector('.concept-explain-save').disabled);
            await page.type('.concept-explain-input', 'Что означает индекс?');
            await page.click('.concept-explain-send');
            await page.waitForFunction(() => !document.querySelector('.concept-explain-save').disabled);
            assert.equal(await page.evaluate(() => AppState.isDirty), false);
            await page.screenshot({path: path.join(root, 'tmp/concept-chat-save-desktop.png')});
            await page.click('.concept-explain-save');
            await page.waitForFunction(() => !document.querySelector('.concept-explain-modal'));
            const result = await page.evaluate(async () => {
                const html = AppState.getBlock('current').html;
                const content = document.querySelector('#current .block-content');
                const children = [...content.children];
                const sameOther = document.getElementById('other') === untouched;
                const displayErrors = content.querySelectorAll('.katex-error').length;
                await SaveCoordinator.saveCurrentNote();
                const stored = savedPayloads.at(-1).blocks.find(block => block.id === 'current').html;
                EditorManager.openModalEditor('current', document.getElementById('current'));
                const editorChat = SavedConceptChat.read(document.querySelector('.ProseMirror [data-type="concept-chat"]'));
                await EditorManager.handleSave();
                const reopened = AppState.getBlock('current').html;
                return {html, stored, editorChat, reopened, sameOther, displayErrors,
                    paragraphs: children.map(child => child.textContent),
                    markerCount: content.querySelectorAll('[data-type="concept-chat"]').length,
                    data: SavedConceptChat.read(content.querySelector('[data-type="concept-chat"]'))};
            });
            assert.equal(result.markerCount, 1);
            assert.equal(result.paragraphs[0], 'Первая матрица.');
            assert.match(result.paragraphs[1], /вторая матрица💬 и продолжение\.$/);
            assert.equal(result.paragraphs[2], 'Последний абзац.');
            assert.equal(result.data.turns[1].question, 'Что означает индекс?');
            assert.match(result.data.turns[1].answer, /Уточнение/);
            assert.match(result.data.turns[0].answer, /\| Элемент \|/);
            assert.equal(result.data.turns[0].sources[0].block_id, 'other');
            assert.equal(result.data.turns[0].sources[0].note_id, '1');
            assert.doesNotMatch(result.html, /class="katex|math-symbol|hp-arrow/);
            assert.equal(result.stored, result.html);
            assert.deepEqual(result.editorChat, result.data);
            assert.match(result.reopened, /data-type="concept-chat"/);
            assert.equal(result.sameOther, true);
            assert.equal(result.displayErrors, 0);
        });

        await t.test('saved chat reopens on mobile after reloading, with working citations and source previews', async () => {
            const requestsBefore = await page.evaluate(() => chatRequests);
            await page.evaluate(() => {
                const saved = savedPayloads.at(-1);
                AppState.setNote({id: 1, ...saved});
                AppState.updateBlock('other', {collapsed: true});
                BlockDOMRenderer.renderAll();
            });
            await page.setViewport({width: 360, height: 740});
            await page.click('#current .concept-chat-marker');
            await page.waitForSelector('.saved-concept-chat-modal');
            assert.equal(await page.evaluate(() => chatRequests), requestsBefore);
            assert.equal(await page.$$eval('.saved-concept-chat-modal table', els => els.length), 1);
            assert.equal(await page.$$eval('.saved-concept-chat-modal .katex-error', els => els.length), 0);
            assert.match(await page.$eval('.saved-concept-chat-modal', el => el.textContent), /Что означает индекс\?.*Уточнение/s);
            assert.equal(await page.$eval('.saved-concept-chat-modal a.concept-explain-source', el => el.href), 'https://example.com/reference');
            await page.$eval('.saved-concept-chat-modal .modal-dialog', async el => {
                await Promise.all(el.getAnimations().map(animation => animation.finished));
            });
            const bounds = await page.$eval('.saved-concept-chat-modal .modal-dialog', el => {
                const rect = el.getBoundingClientRect();
                return {fits: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
                    scrolls: el.querySelector('.modal-dialog-body').scrollHeight > el.querySelector('.modal-dialog-body').clientHeight};
            });
            assert.equal(bounds.fits, true, JSON.stringify(bounds));
            assert.equal(bounds.scrolls, true);
            await page.screenshot({path: path.join(root, 'tmp/saved-chat-mobile.png')});
            await page.click('.saved-concept-chat-modal .concept-explain-sources button:last-child');
            assert.match(await page.$eval('.concept-source-details', el => el.textContent), /Прежний текст/);
            await page.click('.saved-concept-chat-modal .concept-explain-citation');
            await page.waitForFunction(() => !document.querySelector('.saved-concept-chat-modal'));
            assert.equal(await page.$eval('#other', el => el.classList.contains('collapsed')), false);
            await page.focus('#current .concept-chat-marker');
            await page.keyboard.press('Enter');
            await page.waitForSelector('.saved-concept-chat-modal');
            await page.keyboard.press('Escape');
            assert.equal(await page.$eval('#current .concept-chat-marker', el => el === document.activeElement), true);
            await page.setViewport({width: 1000, height: 800});
            await page.screenshot({path: path.join(root, 'tmp/saved-chat-marker-desktop.png')});
        });

        await t.test('selecting a rendered formula inserts after the whole formula', async () => {
            await page.evaluate(async () => {
                setup();
                const range = document.createRange();
                range.selectNodeContents(document.querySelector('#current .katex-html'));
                await ConceptSelectionMenu._explain('Q=XW', document.getElementById('current'), range);
            });
            await page.waitForFunction(() => !document.querySelector('.concept-explain-save').disabled);
            await page.click('.concept-explain-save');
            const result = await page.evaluate(() => {
                const template = document.createElement('div');
                template.innerHTML = AppState.getBlock('current').html;
                const marker = template.querySelector('[data-type="concept-chat"]');
                return {prefix: marker.previousSibling.outerHTML, parent: marker.parentElement.tagName,
                    suffix: [...marker.parentElement.childNodes].slice([...marker.parentElement.childNodes].indexOf(marker) + 1)
                        .map(node => node.textContent).join(''), formula: template.querySelector('.math-inline').getAttribute('formula')};
            });
            assert.equal(result.parent, 'P');
            assert.equal(result.formula, 'Q=XW');
            assert.match(result.prefix, /<span class="math-inline" formula="Q=XW">Q=XW<\/span>$/);
            assert.equal(result.suffix, ': вторая матрица и продолжение.');
        });

        await t.test('an existing quote chat becomes a working marker and survives editing', async () => {
            await page.evaluate(() => {
                setup();
                AppState.updateBlock('current', {html: '<p>Нормирующий делитель.</p>'
                    + '<blockquote class="custom-quote"><div class="quote-content">'
                    + '<p><strong>Подробный разбор расчёта · ИИ: «x^2»</strong></p>'
                    + '<p>Результат [source 1]: <span class="math-inline" formula="x^2">x^2</span>.</p>'
                    + '<p><strong>Уточнение?</strong></p><p>Полный ответ.</p>'
                    + '<p>Связанные фрагменты конспекта:<br><span>[1] Другой блок</span></p>'
                    + '</div></blockquote>'});
                BlockDOMRenderer.renderAll();
            });
            assert.equal(await page.$$eval('#current blockquote', els => els.length), 0);
            await page.click('#current .concept-chat-marker');
            await page.waitForSelector('.saved-concept-chat-modal.calculation-explain-modal');
            assert.equal(await page.$$eval('.saved-concept-chat-modal .katex', els => els.length), 2);
            assert.match(await page.$eval('.saved-concept-chat-modal', el => el.textContent), /Уточнение\?.*Полный ответ/s);
            await page.click('.saved-concept-chat-modal .concept-explain-citation');
            await page.waitForFunction(() => !document.querySelector('.saved-concept-chat-modal'));
            await page.evaluate(async () => {
                EditorManager.openModalEditor('current', document.getElementById('current'));
                document.querySelector('.ProseMirror .concept-chat-marker').click();
            });
            await page.waitForSelector('.saved-concept-chat-modal');
            await page.click('.saved-concept-chat-modal .btn-close-modal');
            await page.evaluate(() => EditorManager.handleSave());
            await page.click('#current .concept-chat-marker');
            await page.waitForSelector('.saved-concept-chat-modal');
            assert.match(await page.$eval('.saved-concept-chat-modal', el => el.textContent), /Полный ответ/);
            await page.keyboard.press('Escape');
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
