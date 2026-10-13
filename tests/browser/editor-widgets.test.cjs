const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('real drawing and text editor regression checks', async t => {
    const bundle = await esbuild.build({stdin: {contents: `
        import {EditorShapesTab} from './fastapi_app/static/js/notes/EditorShapesTab.js';
        import {EditorTiptapSetup} from './fastapi_app/static/js/notes/EditorTiptapSetup.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import {ActiveSelection} from 'fabric';
        window.widgets = {EditorShapesTab, EditorTiptapSetup, AppState, ActiveSelection};`,
        resolveDir: path.resolve(__dirname, '../..')}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.setRequestInterception(true);
        page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
        await page.setContent('<div id="modal" style="width:580px"><div id="tab-shapes">' +
            '<canvas id="shapes-canvas"></canvas>' + ['add-rect', 'add-circle', 'shape-undo', 'shape-copy',
                'shape-delete', 'shape-lock', 'clear-canvas', 'shape-grid'].map(id => `<button id="btn-${id}"></button>`).join('') +
            '<input id="shape-color-fill" type="color"><input id="shape-color-stroke" type="color">' +
            '<input id="shape-stroke-width" type="range"></div></div><div id="text"></div>');
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            widgets.AppState.setNote({blocks: [{id:'drawing'}]});
            window.tab = new widgets.EditorShapesTab(document.getElementById('modal'), 'drawing', () => null);
            tab.init();
        });
        await t.test('one undo reverses color change and preserves the shape', async () => {
            await page.click('#btn-add-rect');
            await page.evaluate(() => {
                tab.fabricCanvas.setActiveObject(tab.fabricCanvas.getObjects()[0]);
                const input = document.getElementById('shape-color-fill');
                input.value = '#ff0000'; input.dispatchEvent(new Event('change', {bubbles:true}));
            });
            assert.equal(await page.evaluate(() => JSON.parse(tab.getJSON()).objects[0].fill), '#ff0000');
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.deepEqual(await page.evaluate(() => JSON.parse(tab.getJSON()).objects.map(o => o.fill)), ['transparent']);
        });
        await t.test('duplicate and clear are each one undo operation', async () => {
            await page.evaluate(() => tab.fabricCanvas.setActiveObject(tab.fabricCanvas.getObjects()[0]));
            await page.click('#btn-shape-copy');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 2);
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 1);
            await page.click('#btn-add-circle');
            await page.click('#btn-clear-canvas');
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 2);
        });
        await t.test('selected shapes copy individually and undo multi-delete atomically', async () => {
            const selectAll = () => page.evaluate(() => {
                tab.fabricCanvas.setActiveObject(new widgets.ActiveSelection(tab.fabricCanvas.getObjects(), {canvas: tab.fabricCanvas}));
            });
            await selectAll();
            await page.click('#btn-shape-copy');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 4);
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 2);
            await selectAll();
            await page.click('#btn-shape-delete');
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 0);
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 2);
        });
        await t.test('locking survives serialization, reopening and undo', async () => {
            await page.evaluate(() => tab.fabricCanvas.setActiveObject(tab.fabricCanvas.getObjects()[0]));
            await page.click('#btn-shape-lock');
            assert.equal(await page.evaluate(() => JSON.parse(tab.getJSON()).objects[0].lockMovementX), true);
            const data = await page.evaluate(() => tab.getJSON());
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects()[0].lockMovementX), false);
            await page.evaluate(data => tab.fabricCanvas.loadFromJSON(data), data);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects()[0].lockMovementX), true);
        });
        await t.test('numbered lists, formatting, undo and redo survive the real editor', async () => {
            const result = await page.evaluate(() => {
                const editor = widgets.EditorTiptapSetup.createEditor(document.getElementById('text'),
                    '<ol start="3"><li><p>First</p></li><li><p>Second</p></li></ol>');
                const initial = editor.getHTML();
                editor.commands.selectAll(); editor.commands.toggleBold();
                const bold = editor.getHTML();
                editor.commands.undo(); const undone = editor.getHTML();
                editor.commands.redo(); const redone = editor.getHTML();
                editor.destroy();
                return {initial, bold, undone, redone};
            });
            assert.match(result.initial, /<ol start="3">/);
            assert.match(result.bold, /<strong>First<\/strong>/);
            assert.equal(result.undone, result.initial);
            assert.equal(result.redone, result.bold);
        });
        await t.test('one code control offers inline code and code blocks', async () => {
            await page.evaluate(() => {
                const host = document.createElement('div');
                host.id = 'code-fixture';
                host.innerHTML = '<div class="editor-code-control">'
                    + '<button class="format-btn" data-format="code">&lt;&gt;</button>'
                    + '<button class="editor-code-menu-button" aria-expanded="false">⌄</button>'
                    + '<div class="editor-code-menu" hidden><button data-code-action="inline">Inline</button>'
                    + '<button data-code-action="block">Block</button></div></div><div id="code-text"></div>';
                document.body.appendChild(host);
                window.codeEditor = widgets.EditorTiptapSetup.createEditor(host.querySelector('#code-text'), '<p>Example</p>');
                widgets.EditorTiptapSetup.bindFormatButtons(host, () => codeEditor);
                codeEditor.commands.setTextSelection({from:1, to:8});
            });
            await page.click('#code-fixture [data-format="code"]');
            assert.equal(await page.evaluate(() => codeEditor.getHTML()), '<p><code>Example</code></p>');
            await page.click('#code-fixture .editor-code-menu-button');
            assert.equal(await page.$eval('#code-fixture .editor-code-menu-button', el => el.getAttribute('aria-expanded')), 'true');
            await page.click('#code-fixture [data-code-action="block"]');
            assert.equal(await page.evaluate(() => codeEditor.state.doc.firstChild.type.name), 'codeBlock');
            assert.equal(await page.$eval('#code-fixture .editor-code-menu-button', el => el.getAttribute('aria-expanded')), 'false');
            await page.evaluate(() => {codeEditor.destroy(); document.getElementById('code-fixture').remove();});
        });
        await t.test('clear button removes headings, lists and all marks without selecting all text afterward', async () => {
            await page.evaluate(() => {
                const host = document.createElement('div');
                host.id = 'format-fixture';
                host.innerHTML = '<button class="format-btn" data-format="clear">Clear</button><div id="format-text"></div>';
                document.body.appendChild(host);
                window.formatEditor = widgets.EditorTiptapSetup.createEditor(host.querySelector('#format-text'),
                    '<h2><strong><span class="text-size-24" data-text-size="24">Heading</span></strong></h2>'
                    + '<ul><li><p><em>List entry</em></p></li></ul><pre><code>Code text</code></pre>'
                    + '<p><u>Underlined</u> <s>Strike</s> <a href="https://example.com">Link</a></p>'
                    + '<div class="math-callout"><div class="math-content"><p><span class="math-inline" formula="x^2">x^2</span></p></div></div>');
                widgets.EditorTiptapSetup.bindFormatButtons(host, () => formatEditor);
                window.formatBefore = formatEditor.getHTML();
                formatEditor.commands.setTextSelection(3);
            });
            await page.click('#format-fixture [data-format="clear"]');
            const cleared = await page.evaluate(() => ({html:formatEditor.getHTML(), empty:formatEditor.state.selection.empty}));
            assert(!/<(?:h[1-6]|ul|li|pre|code|strong|em|u|s|a)\b/.test(cleared.html), cleared.html);
            assert(!cleared.html.includes('text-size-'));
            assert.match(cleared.html, /formula="x\^2"/);
            assert.match(cleared.html, /<p>Heading<\/p>/);
            assert(cleared.empty, 'Next typing must not overwrite the whole block');
            await page.evaluate(() => formatEditor.commands.undo());
            assert.equal(await page.evaluate(() => formatEditor.getHTML()), await page.evaluate(() => formatBefore));
            await page.evaluate(() => {formatEditor.destroy(); document.getElementById('format-fixture').remove();});
        });
        await t.test('clear selection leaves other text formatting intact', async () => {
            const html = await page.evaluate(() => {
                const editor = widgets.EditorTiptapSetup.createEditor(document.getElementById('text'), '<p><strong>First Second</strong></p>');
                editor.commands.setTextSelection({from:1, to:6});
                widgets.EditorTiptapSetup.clearFormatting(editor);
                const html = editor.getHTML(); editor.destroy(); return html;
            });
            assert.equal(html, '<p>First<strong> Second</strong></p>');
        });
        await t.test('block format clearing removes marks and headings while keeping text', async () => {
            const html = await page.evaluate(() => widgets.EditorTiptapSetup.clearBlockHtml(
                '<h2><strong>Heading</strong></h2><p><span class="question-mark-text" data-question="Why?">Question</span> '
                + '<span data-type="hidden-phrase" data-hint="Hint">Hidden</span></p>'));
            assert.equal(html, '<p>Heading</p><p>Question Hidden</p>');
        });
        await t.test('text size supports selection, whole block, mixed sizes, undo and HTML reopening', async () => {
            await page.evaluate(() => {
                const host = document.createElement('div'); host.id = 'size-fixture';
                host.innerHTML = '<div class="editor-size-control"><button class="format-btn format-btn-size" id="btn-editor-text-size" aria-expanded="false">Aa</button><div class="editor-size-popover" hidden><button class="editor-size-option" data-size="">Auto</button><button class="editor-size-option" data-size="18">18</button><button class="editor-size-option" data-size="24">24</button></div></div><div id="size-text"></div>';
                document.body.appendChild(host);
                window.sizeEditor = widgets.EditorTiptapSetup.createEditor(host.querySelector('#size-text'), '<p>First Second</p>');
                widgets.EditorTiptapSetup.bindFormatButtons(host, () => sizeEditor);
                sizeEditor.commands.setTextSelection({from:1, to:6});
            });
            await page.click('#size-fixture #btn-editor-text-size');
            assert.equal(await page.$eval('#size-fixture #btn-editor-text-size', el => el.getAttribute('aria-expanded')), 'true');
            await page.click('#size-fixture [data-size="24"]');
            assert.equal(await page.evaluate(() => sizeEditor.getHTML()), '<p><span data-text-size="24" class="text-size-24">First</span> Second</p>');
            await page.evaluate(() => sizeEditor.commands.undo());
            assert.equal(await page.evaluate(() => sizeEditor.getHTML()), '<p>First Second</p>');
            await page.evaluate(() => sizeEditor.commands.redo());
            await page.evaluate(() => sizeEditor.commands.selectAll());
            assert.equal(await page.$eval('#size-fixture #btn-editor-text-size', el => el.dataset.currentSize), 'mixed');
            await page.evaluate(() => sizeEditor.commands.setTextSelection(3));
            await page.click('#size-fixture #btn-editor-text-size');
            await page.click('#size-fixture [data-size="18"]');
            assert.equal(await page.evaluate(() => sizeEditor.getHTML()), '<p><span data-text-size="18" class="text-size-18">First Second</span></p>');
            assert(await page.evaluate(() => sizeEditor.state.selection.empty));
            const saved = await page.evaluate(() => sizeEditor.getHTML());
            const reopened = await page.evaluate(html => {
                sizeEditor.destroy();
                sizeEditor = widgets.EditorTiptapSetup.createEditor(document.getElementById('size-text'), html);
                return sizeEditor.getHTML();
            }, saved);
            assert.equal(reopened, saved);
            await page.evaluate(() => {sizeEditor.destroy(); document.getElementById('size-fixture').remove();});
        });
        await t.test('hidden phrase explanation accepts and keeps multiple lines', async () => {
            await page.evaluate(() => {
                const host = document.createElement('div');
                host.id = 'hidden-phrase-fixture';
                document.body.appendChild(host);
                window.hiddenPhraseEditor = widgets.EditorTiptapSetup.createEditor(host, '<p>Term</p>');
                hiddenPhraseEditor.commands.setTextSelection({from:1, to:5});
                widgets.EditorTiptapSetup.openAddHiddenPhraseModal(hiddenPhraseEditor);
            });
            assert.equal(await page.$eval('#hp-explanation-input', el => el.tagName), 'TEXTAREA');
            await page.type('#hp-explanation-input', 'First line');
            await page.keyboard.press('Enter');
            await page.type('#hp-explanation-input', 'Second line');
            assert.equal(await page.$eval('#hp-explanation-input', el => el.value), 'First line\nSecond line');
            await page.click('.btn-save-hp');
            assert.match(await page.evaluate(() => hiddenPhraseEditor.getHTML()), /data-hint="First line\nSecond line"/);
            await page.evaluate(() => {hiddenPhraseEditor.destroy(); document.getElementById('hidden-phrase-fixture').remove();});
        });
        await t.test('question and hidden phrase can be removed without deleting text', async () => {
            await page.evaluate(() => {
                const host = document.createElement('div');
                host.id = 'mark-removal-fixture';
                host.innerHTML = '<button class="format-btn" data-format="question">?</button>'
                    + '<button class="format-btn" data-format="hidden">Eye</button><div id="mark-removal-text"></div>';
                document.body.appendChild(host);
                window.markRemovalEditor = widgets.EditorTiptapSetup.createEditor(host.querySelector('#mark-removal-text'),
                    '<p><span class="question-mark-text" data-question="Why?">Question</span> '
                    + '<span data-type="hidden-phrase" data-hint="Hint">Hidden</span></p>');
                widgets.EditorTiptapSetup.bindFormatButtons(host, () => markRemovalEditor);
                markRemovalEditor.commands.setTextSelection(4);
            });
            await page.click('#mark-removal-fixture [data-format="question"]');
            assert(await page.$('.btn-delete-dialog'));
            await page.click('.btn-delete-dialog');
            assert.equal(await page.evaluate(() => markRemovalEditor.getHTML().includes('question-mark-text')), false);
            assert.match(await page.evaluate(() => markRemovalEditor.getHTML()), /Question/);
            await page.evaluate(() => {
                const text = markRemovalEditor.state.doc.textContent;
                markRemovalEditor.commands.setTextSelection(text.indexOf('Hidden') + 2);
            });
            await page.click('#mark-removal-fixture [data-format="hidden"]');
            assert(await page.$('.btn-delete-hp'));
            await page.click('.btn-delete-hp');
            assert.equal(await page.evaluate(() => markRemovalEditor.getHTML()), '<p>Question Hidden</p>');
            await page.evaluate(() => {markRemovalEditor.destroy(); document.getElementById('mark-removal-fixture').remove();});
        });
        assert.deepEqual(errors, []);
    } finally {await browser.close();}
});
