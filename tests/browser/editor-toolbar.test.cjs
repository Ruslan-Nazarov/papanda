const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('toolbar actions work in the styled floating editor', {timeout: 60_000}, async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import NotesAPI from './fastapi_app/static/js/notes/api.js';
        import DOMPurify from 'dompurify';
        NotesAPI.getNotes = async () => [{id: 1, title: 'Example'}];
        Object.assign(window, {EditorManager, AppState, BlockDOMRenderer, DOMPurify});`, resolveDir: root},
        bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1100, height: 900});
        await page.setContent('<!doctype html><div id="blocks-container"></div><div id="modal-container" class="hidden"></div>');
        for (const file of ['base.css', 'components.css', 'editor.css', 'modals.css', 'math.css', 'responsive.css']) {
            await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css', file)});
        }
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        const open = () => page.evaluate(() => {
            EditorManager.closeAll();
            AppState.setNote({id: 1, blocks: [{id: 'toolbar', title: 'Example',
                html: '<p>Для дальнейшего расчёта <strong>умножаем преобразующие матрицы справа.</strong></p><p>Следующий абзац.</p>'}]});
            BlockDOMRenderer.renderAll();
            EditorManager.openModalEditor('toolbar', document.getElementById('toolbar'));
        });
        const select = async () => {
            const points = await page.$eval('.tiptap strong', element => {
                const text = element.firstChild;
                const point = (from, to) => {
                    const range = document.createRange();
                    range.setStart(text, from); range.setEnd(text, to);
                    const rect = range.getBoundingClientRect();
                    return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
                };
                return {start: point(0, 0), end: point(text.length, text.length)};
            });
            await page.mouse.move(points.start.x, points.start.y);
            await page.mouse.down();
            await page.mouse.move(points.end.x, points.end.y, {steps: 10});
            await page.mouse.up();
        };
        const click = format => page.click(`.modal-toolbar [data-format="${format}"]`);

        await t.test('question uses the visible selection before selectionchange has been delivered', async () => {
            await open();
            await page.evaluate(() => {
                const text = document.querySelector('.tiptap strong').firstChild;
                window.getSelection().setBaseAndExtent(text, 0, text, text.length);
                document.querySelector('[data-format="question"]').click();
            });
            await page.waitForSelector('#dialog-prompt-input', {visible: true, timeout: 2000});
            await page.type('#dialog-prompt-input', 'Почему справа?');
            await page.click('.btn-confirm-dialog');
            assert.equal(await page.$eval('.tiptap .question-mark-text', el => el.textContent), 'умножаем преобразующие матрицы справа.');
        });
        await t.test('question opens, saves to the selected phrase and can be edited and removed', async () => {
            await open();
            await select();
            await click('question');
            await page.waitForSelector('#dialog-prompt-input', {visible: true, timeout: 2000});
            await page.type('#dialog-prompt-input', 'Почему справа?');
            await page.click('.btn-confirm-dialog');
            assert.equal(await page.$eval('.tiptap .question-mark-text', el => el.textContent), 'умножаем преобразующие матрицы справа.');
            assert.equal(await page.$eval('.tiptap .question-mark-text', el => el.dataset.question), 'Почему справа?');
            await click('question');
            assert.equal(await page.$eval('#dialog-prompt-input', el => el.value), 'Почему справа?');
            await page.click('.btn-delete-dialog');
            assert.equal(await page.$('.tiptap .question-mark-text'), null);
        });
        await t.test('bold, italic, underline and strike apply only to the selection', async () => {
            for (const [format, tag] of [['bold', 'strong'], ['italic', 'em'], ['underline', 'u'], ['strike', 's']]) {
                await open();
                await page.evaluate(() => EditorManager.currentEditor.commands.setContent('<p>First Second</p>'));
                await page.evaluate(() => EditorManager.currentEditor.commands.setTextSelection({from: 1, to: 6}));
                await click(format);
                assert.equal(await page.evaluate(() => EditorManager.currentEditor.getHTML()), `<p><${tag}>First</${tag}> Second</p>`);
                await click(format);
                assert.equal(await page.evaluate(() => EditorManager.currentEditor.getHTML()), '<p>First Second</p>');
            }
        });
        await t.test('formatting uses a pending backwards DOM selection', async () => {
            for (const [format, tag] of [['bold', 'strong'], ['italic', 'em'], ['underline', 'u'], ['strike', 's']]) {
                await open();
                const html = await page.evaluate(format => {
                    const editor = EditorManager.currentEditor;
                    editor.commands.setContent('<p>First Second</p>');
                    const text = editor.view.dom.querySelector('p').firstChild;
                    window.getSelection().setBaseAndExtent(text, 5, text, 0);
                    document.querySelector(`[data-format="${format}"]`).click();
                    return editor.getHTML();
                }, format);
                assert.equal(html, `<p><${tag}>First</${tag}> Second</p>`);
            }
        });
        await t.test('hidden phrase opens, saves and can be removed', async () => {
            await open();
            await select();
            await click('hidden');
            await page.waitForSelector('#hp-explanation-input', {visible: true, timeout: 2000});
            await page.type('#hp-explanation-input', 'Пояснение');
            await page.click('.btn-save-hp');
            assert.equal(await page.$eval('.tiptap [data-type="hidden-phrase"]', el => el.dataset.hint), 'Пояснение');
            await click('hidden');
            await page.click('.btn-delete-hp');
            assert.equal(await page.$('.tiptap [data-type="hidden-phrase"]'), null);
        });
        await t.test('link picker attaches and removes a link on the selected phrase', async () => {
            await open();
            await select();
            await click('link');
            await page.waitForSelector('.internal-links-target', {visible: true});
            await page.click('.internal-links-target');
            await page.click('.internal-links-confirm');
            assert.equal(await page.$eval('.tiptap a', el => el.getAttribute('href')), 'internal://note/1');
            assert.equal(await page.$eval('.tiptap a', el => el.textContent), 'умножаем преобразующие матрицы справа.');
            await click('link');
            await page.click('.internal-links-delete');
            assert.equal(await page.$('.tiptap a'), null);
        });
        await t.test('math callout toggles and LaTeX replaces only the selected phrase', async () => {
            await open();
            await select();
            await click('math');
            assert(await page.$('.tiptap .math-callout'));
            await click('math');
            assert.equal(await page.$('.tiptap .math-callout'), null);
            await click('latex');
            await page.waitForSelector('#formula-input', {visible: true});
            await page.$eval('#formula-input', el => {el.value = 'x^2'; el.dispatchEvent(new Event('input', {bubbles: true}));});
            await page.click('#btn-formula-save');
            assert.equal(await page.$eval('.tiptap .math-inline', el => el.dataset.formula), 'x^2');
            const text = await page.evaluate(() => EditorManager.currentEditor.getText());
            assert.match(text, /Для дальнейшего расчёта/);
            assert.match(text, /Следующий абзац/);
            assert.doesNotMatch(text, /умножаем/);
        });
        await t.test('size menu and clear use the selected phrase', async () => {
            await open();
            await select();
            await page.click('#btn-editor-text-size');
            await page.click('[data-size="24"]');
            assert.equal(await page.$eval('.tiptap [data-text-size="24"]', el => el.textContent), 'умножаем преобразующие матрицы справа.');
            await click('clear');
            assert.equal(await page.$('.tiptap [data-text-size]'), null);
            assert.equal(await page.$('.tiptap strong'), null);
            assert.match(await page.evaluate(() => EditorManager.currentEditor.getText()), /умножаем преобразующие матрицы справа/);
        });
        await t.test('cancelling question and formula dialogs preserves the text and editor', async () => {
            for (const [format, input] of [['question', '#dialog-prompt-input'], ['latex', '#formula-input']]) {
                await open();
                await select();
                const before = await page.evaluate(() => EditorManager.currentEditor.getHTML());
                await click(format);
                await page.waitForSelector(input, {visible: true});
                await page.keyboard.press('Escape');
                assert.equal(await page.$(input), null);
                assert(await page.$('.modal-editor-floating'));
                assert.equal(await page.evaluate(() => EditorManager.currentEditor.getHTML()), before);
            }
        });
        assert.deepEqual(errors, []);
    } finally {await browser.close();}
});
