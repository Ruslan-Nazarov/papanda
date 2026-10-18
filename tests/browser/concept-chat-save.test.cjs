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
        import katex from 'katex';
        import DOMPurify from 'dompurify';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {ConceptSelectionMenu, AppState, BlockDOMRenderer, EditorManager,
            SaveCoordinator, NotesAPI, katex, DOMPurify, renderMathInElement});`, resolveDir: root},
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
                NotesAPI.updateNote = async (id, payload) => {
                    savedPayloads.push(payload);
                    return {id, revision: savedPayloads.length, ...payload, content_json: payload.blocks};
                };
                NotesAPI.stream = async (_path, payload, update) => {
                    const answer = payload.question ? 'Уточнение: $q_1$ — элемент матрицы.'
                        : '## Объяснение\n\nМатрица $Q$ содержит **элементы**.\n\n| Элемент | Строка |\n|---|---|\n| $q_1$ | 1 |';
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
                const editorText = EditorManager.currentEditor.getText();
                await EditorManager.handleSave();
                const reopened = AppState.getBlock('current').html;
                return {html, stored, editorText, reopened, sameOther, displayErrors,
                    before: children.slice(0, 2).map(child => child.textContent),
                    chat: children[2].tagName, after: children.slice(3).map(child => child.textContent)};
            });
            assert.equal(result.chat, 'BLOCKQUOTE');
            assert.equal(result.before[0], 'Первая матрица.');
            assert.match(result.before[1], /вторая матрица$/);
            assert.deepEqual(result.after, [' и продолжение.', 'Последний абзац.']);
            assert.match(result.html, /Что означает индекс\?.*Уточнение/s);
            assert.match(result.html, /<table>/);
            assert.match(result.html, /formula="q_1"/);
            assert.doesNotMatch(result.html, /class="katex|math-symbol|hp-arrow/);
            assert.equal(result.stored, result.html);
            assert.match(result.editorText, /Что означает индекс/);
            assert.match(result.reopened, /<blockquote class="custom-quote"/);
            assert.match(result.reopened, /<table/);
            assert.equal(result.sameOther, true);
            assert.equal(result.displayErrors, 0);
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
                return {prefix: template.children[1].innerHTML, chat: template.children[2].tagName,
                    suffix: template.children[3].textContent, formula: template.querySelector('.math-inline').getAttribute('formula')};
            });
            assert.equal(result.chat, 'BLOCKQUOTE');
            assert.equal(result.formula, 'Q=XW');
            assert.match(result.prefix, /<span class="math-inline" formula="Q=XW">Q=XW<\/span>$/);
            assert.equal(result.suffix, ': вторая матрица и продолжение.');
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
