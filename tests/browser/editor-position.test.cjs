const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('double click opens the editor at the clicked paragraph and caret', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import katex from 'katex';
        import DOMPurify from 'dompurify';
        Object.assign(window, {AppState, BlockDOMRenderer, EditorManager, katex, DOMPurify});`,
        resolveDir: root}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1100, height: 900});
        await page.setContent('<!doctype html><div id="blocks-container" class="mode-no-dialectics"></div><div id="modal-container" class="hidden"></div>');
        for (const file of ['editor.css', 'responsive.css']) {
            await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css', file)});
        }
        await page.addStyleTag({content: '.hidden{display:none}body{font:18px/1.5 sans-serif;margin:24px}.block-content{width:700px}.block-content p{margin:18px 0}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => EditorManager.init());

        const render = html => page.evaluate(html => {
            EditorManager.closeModal(false);
            AppState.setNote({id: 1, blocks: [{id: 'example', side: 'left', title: 'Example', html}]});
            BlockDOMRenderer.renderAll();
        }, html);
        const doubleClick = async (selector, offset = 0) => {
            await page.$eval(selector, el => el.scrollIntoView({block: 'center'}));
            const point = await page.$eval(selector, (el, offset) => {
                const range = document.createRange();
                range.setStart(el.firstChild, offset);
                range.setEnd(el.firstChild, offset + 1);
                const rect = range.getBoundingClientRect();
                return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
            }, offset);
            const before = await page.evaluate(() => scrollY);
            await page.mouse.click(point.x, point.y, {count: 2});
            await page.waitForFunction(() => EditorManager.currentEditor?.isFocused, {timeout: 3000})
                .catch(error => {throw new Error(`${error.message}; browser errors: ${errors.join('; ')}`);});
            const result = await page.evaluate(() => {
                const editor = EditorManager.currentEditor;
                const caret = editor.view.coordsAtPos(editor.state.selection.from);
                const pane = document.querySelector('.modal-tiptap-content').getBoundingClientRect();
                const body = document.querySelector('.modal-body').getBoundingClientRect();
                return {text: editor.state.selection.$from.parent.textContent,
                    offset: editor.state.selection.$from.parentOffset,
                    topIndex: editor.state.selection.$from.index(0),
                    visible: caret.top >= Math.max(pane.top, body.top) && caret.bottom <= Math.min(pane.bottom, body.bottom),
                    scroll: scrollY, empty: editor.state.selection.empty};
            });
            assert.equal(result.scroll, before, 'opening must preserve the reading page scroll');
            assert.equal(result.visible, true, 'clicked text must be visible within both editor panes');
            assert.equal(result.empty, true, 'typing must not replace the double-clicked word');
            return result;
        };

        await t.test('long block opens near the end and typing edits that paragraph', async () => {
            await render(Array.from({length: 45}, (_, i) => `<p>Paragraph ${i}: some editable text.</p>`).join(''));
            const result = await doubleClick('#example .block-content p:nth-child(39)', 13);
            assert.equal(result.text, 'Paragraph 38: some editable text.');
            assert(result.offset >= 13 && result.offset <= 14);
            await page.keyboard.type('INSERT');
            assert.match(await page.evaluate(() => EditorManager.currentEditor.state.selection.$from.parent.textContent), /INSERT/);
            await page.evaluate(() => EditorManager.closeModal(false));
            assert(!await page.evaluate(() => AppState.getBlock('example').html.includes('INSERT')));
            const reopened = await doubleClick('#example .block-content p:nth-child(5)');
            assert.equal(reopened.text, 'Paragraph 4: some editable text.');
        });

        await t.test('headings, lists, quotes, tables, repeated paragraphs and formulas', async () => {
            await render('<h2>Heading</h2><p>Repeated</p><ul><li><p>List entry</p></li></ul>'
                + '<blockquote><p>Quoted paragraph</p></blockquote><table><tbody><tr><td><p>Table entry</p></td></tr></tbody></table>'
                + '<p>Formula <span class="math-inline" formula="h_t">h_t</span> after formula</p><p>Repeated</p>');
            for (const [selector, text] of [['h2', 'Heading'], ['li p', 'List entry'], ['blockquote p', 'Quoted paragraph'],
                ['td p', 'Table entry'], ['> p:last-child', 'Repeated']]) {
                const result = await doubleClick(`#example .block-content ${selector}`);
                assert.equal(result.text, text);
                if (selector === '> p:last-child') assert.equal(result.topIndex, 6);
                await page.evaluate(() => EditorManager.closeModal(false));
            }
            const result = await doubleClick('#example .block-content > p:nth-last-child(2)');
            assert.equal(result.text, 'Formula  after formula');
        });

        await t.test('paragraph after automatically combined code still maps correctly', async () => {
            await render('<p>const x = 0;</p><p>return x;</p><p>Target after code</p><p>Last paragraph</p>');
            const result = await doubleClick('#example .block-content > p');
            assert.equal(result.text, 'Target after code');
        });

        await t.test('pencil opens normally without reusing the last double click', async () => {
            await page.evaluate(() => EditorManager.closeModal(false));
            await page.click('#example .btn-edit');
            assert.equal(await page.evaluate(() => EditorManager.currentEditor.state.selection.from), 1);
        });

        await t.test('text after a formula and hidden hint keeps its cursor position', async () => {
            await render('<p>Before <span class="math-inline" formula="x">x</span> '
                + '<span data-type="hidden-phrase" data-hint="Long explanation">hidden</span> <strong>Target word</strong></p>');
            const result = await doubleClick('#example .block-content strong');
            assert.equal(result.text, 'Before  hidden Target word');
            assert.equal(result.offset, 16);
        });

        await t.test('an existing phrase selection still prevents editor opening', async () => {
            await render('<p>Selected phrase stays available for quoting</p>');
            await page.evaluate(() => {
                const paragraph = document.querySelector('#example .block-content p');
                const range = document.createRange();
                range.selectNodeContents(paragraph);
                getSelection().removeAllRanges();
                getSelection().addRange(range);
                paragraph.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
            });
            assert.equal(await page.evaluate(() => EditorManager.currentEditor === null), true);
        });

        await t.test('narrow viewport keeps the clicked paragraph visible', async () => {
            await page.setViewport({width: 390, height: 700});
            await render(Array.from({length: 30}, (_, i) => `<p>Mobile paragraph ${i}</p>`).join(''));
            assert.equal((await doubleClick('#example .block-content p:nth-child(25)')).text, 'Mobile paragraph 24');
        });
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
