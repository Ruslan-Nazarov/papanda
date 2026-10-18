const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('multiple minimized editors retain independent buffers and widgets', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        Object.assign(window, {EditorManager, AppState});`, resolveDir: root},
    bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1360, height: 768});
        await page.setRequestInterception(true);
        page.on('request', request => request.url() === 'http://localhost/editor-minimize-test'
            ? request.respond({status: 200, contentType: 'text/html', body: '<!doctype html>'}) : request.abort());
        await page.goto('http://localhost/editor-minimize-test');
        const translations = JSON.parse(fs.readFileSync(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><body><script id="i18n-data" type="application/json">'
            + JSON.stringify(translations) + '</script><div id="target" style="margin:140px 40px">Конспект</div>'
            + '<div id="modal-container" class="hidden"></div><button class="scroll-top-fab visible">↑</button></body></html>');
        for (const file of ['editor.css', 'layout.css', 'responsive.css']) {
            await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css', file)});
        }
        await page.addStyleTag({content: '.hidden{display:none}body{font:16px sans-serif;background:#fff8f0}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            EditorManager.init();
            AppState.setNote({id: 1, math_symbols: [{symbol: 'x', definition: 'Original'}], blocks: [
                {id: 'a', title: 'Первый блок', html: '<p>Original A</p>'},
                {id: 'b', title: 'Второй блок', html: '<p>Original B</p>'},
                {id: 'c', title: '', html: '<p>Original C</p>', isDraft: true},
            ]});
        });
        const open = id => page.evaluate(id => EditorManager.openModalEditor(id, document.getElementById('target')), id);
        const parked = () => page.$$eval('.editor-dock-item', buttons => buttons.map(button => button.dataset.blockId));

        await t.test('minimize keeps title, tags, rewrite archive, selection, graph and drawing', async () => {
            await open('a');
            await page.evaluate(() => {
                window.first = EditorManager.active;
                first.draftArchive.archive();
                first.currentEditor.commands.insertContent('<p>New A</p>');
                first.currentEditor.commands.setTextSelection(3);
                first.currentEditor.storage.mathSymbols.note[0].definition = 'Changed in A';
                document.querySelector('.modal-title-input').value = '<img src=x onerror=alert(1)> Title';
                document.querySelector('.modal-tags-input').value = 'draft,a';
            });
            await page.click('[data-tab="graphs"]');
            await page.evaluate(() => { document.getElementById('graph-function').value = 'sin(x)'; });
            await page.click('#btn-draw-graph');
            await page.click('[data-tab="shapes"]');
            await page.click('#btn-add-rect');
            await page.click('[data-tab="text"]');
            await page.evaluate(() => first.currentEditor.view.focus());
            await page.click('.btn-expand');
            await page.evaluate(() => first.currentEditor.view.focus());
            // Expansion moves the header; wait for its real hit target to settle.
            await page.locator('.btn-min').click();
            assert.deepEqual(await parked(), ['a']);
            assert.equal(await page.$('.modal-editor-floating'), null);
            assert.equal(await page.$('.editor-dock img'), null, 'a title is displayed as text');
            assert.equal(await page.evaluate(() => first.currentEditor.isDestroyed), false);
            assert.equal(await page.evaluate(() => AppState.getBlock('a').html), '<p>Original A</p>', 'minimize does not commit');
            await page.keyboard.press('Escape');
            assert.deepEqual(await parked(), ['a'], 'Escape on the reading page leaves parked editors intact');
        });

        await t.test('several blocks minimize, duplicate opening restores, switching parks the current editor', async () => {
            await open('b');
            await page.evaluate(() => {
                window.second = EditorManager.active;
                second.currentEditor.commands.selectAll();
                second.currentEditor.commands.insertContent('New B');
                second.currentEditor.storage.mathSymbols.note.push({symbol: 'y', definition: 'Saved in B'});
            });
            await page.click('.btn-min');
            await open('c');
            await page.click('.btn-min');
            assert.deepEqual(await parked(), ['a', 'b', 'c']);
            if (process.env.EDITOR_MINIMIZE_SCREENSHOTS) {
                fs.mkdirSync(path.join(root, 'output'), {recursive: true});
                await page.screenshot({path: path.join(root, 'output/editor-minimize-desktop.png')});
            }
            assert.equal(await page.$eval('[data-block-id="c"]', button => button.textContent), 'Блок без названия⤢');
            await page.click('.editor-dock-item[data-block-id="b"]');
            await open('a');
            assert.deepEqual(await parked(), ['b', 'c']);
            assert.equal(await page.evaluate(() => EditorManager.windows.size), 3);
            assert.equal(await page.evaluate(() => EditorManager.active === first), true);
            assert.equal(await page.$eval('.modal-title-input', input => input.value), '<img src=x onerror=alert(1)> Title');
            assert.equal(await page.$eval('.modal-tags-input', input => input.value), 'draft,a');
            assert.equal(await page.evaluate(() => first.currentEditor.state.selection.from), 3);
            const nativeCaret = await page.evaluate(async () => {
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                return first.currentEditor.view.dom.contains(getSelection().anchorNode);
            });
            assert.equal(nativeCaret, true, 'a delayed blur must not clear the restored editor selection');
            assert.equal(await page.evaluate(() => first.draftArchive.drafts.length), 1);
            assert.equal(await page.evaluate(() => first.shapesTab.fabricCanvas.getObjects().length), 1);
            assert.equal(await page.$eval('#graph-function', input => input.value), 'sin(x)');
            assert.equal(await page.$eval('#graph-canvas svg', svg => svg.getAttribute('aria-label')), 'sin(x)');
            assert(await page.$('.modal-editor-floating.expanded'));
            await page.waitForFunction(() => document.getElementById('btn-modal-ok').getBoundingClientRect().bottom
                <= document.querySelector('.editor-dock').getBoundingClientRect().top);
            await page.evaluate(() => first.currentEditor.commands.undo());
            assert.notEqual(await page.evaluate(() => first.currentEditor.getText()), 'New A', 'TipTap undo history survives parking');
            await page.evaluate(() => first.currentEditor.commands.redo());
            assert.equal(await page.evaluate(() => first.currentEditor.getText()), 'New A');
        });

        await t.test('saving one window leaves other buffers and shared definitions intact', async () => {
            await page.click('.editor-dock-item[data-block-id="b"]');
            await page.click('#btn-modal-ok');
            await page.waitForSelector('#modal-container.hidden');
            assert.equal(await page.evaluate(() => AppState.getBlock('b').html), '<p>New B</p>');
            assert.deepEqual(await parked(), ['a', 'c']);
            await page.click('.editor-dock-item[data-block-id="a"]');
            await page.click('#btn-modal-ok');
            await page.waitForSelector('#modal-container.hidden');
            assert.equal(await page.evaluate(() => AppState.getBlock('a').html), '<p>New A</p>');
            assert.equal(await page.evaluate(() => AppState.getBlock('a').rejected_drafts.length), 1);
            assert.equal(await page.evaluate(() => AppState.currentNote.math_symbols.find(item => item.symbol === 'y').definition), 'Saved in B');
            assert.equal(await page.evaluate(() => AppState.currentNote.math_symbols.find(item => item.symbol === 'x').definition), 'Changed in A');
            await page.click('.editor-dock-item[data-block-id="c"]');
            await page.click('#btn-modal-close');
            assert.equal(await page.evaluate(() => AppState.getBlock('c') === undefined), true, 'cancelling the resumed draft removes it');
            assert.equal(await page.$('.editor-dock'), null);
        });

        await t.test('a delayed drawing save belongs to its own window after switching editors', async () => {
            await page.evaluate(async () => {
                AppState.setNote({id: 77, blocks: [
                    {id: 'p', title: 'P', html: '<p>Original P</p>'},
                    {id: 'q', title: 'Q', html: '<p>Original Q</p>'},
                ]});
                EditorManager.openModalEditor('p', document.getElementById('target'));
                EditorManager.currentEditor.commands.setContent('<p>Saved P</p>');
                let finishDrawing;
                EditorManager.shapesTab.ready = new Promise(resolve => { finishDrawing = resolve; });
                const saving = EditorManager.handleSave();
                EditorManager.openModalEditor('q', document.getElementById('target'));
                EditorManager.currentEditor.commands.setContent('<p>Pending Q</p>');
                finishDrawing();
                await saving;
            });
            assert.equal(await page.evaluate(() => AppState.getBlock('p').html), '<p>Saved P</p>');
            assert.equal(await page.evaluate(() => AppState.getBlock('q').html), '<p>Original Q</p>');
            assert.equal(await page.evaluate(() => EditorManager.currentEditor.getText()), 'Pending Q');
            assert.equal(await page.evaluate(() => EditorManager.currentBlockId), 'q');
            assert.equal(await page.$('.editor-dock'), null);
            await page.keyboard.press('Escape');
            assert.equal(await page.evaluate(() => AppState.getBlock('q').html), '<p>Original Q</p>');
        });

        await t.test('many parked blocks stay reachable on narrow screens', async () => {
            await page.evaluate(() => {
                AppState.setNote({id: 2, blocks: Array.from({length: 8}, (_, i) =>
                    ({id: `m${i}`, title: `Блок ${i + 1}: длинный заголовок`, html: '<p>Text</p>'}))});
                for (const block of AppState.currentNote.blocks) {
                    EditorManager.openModalEditor(block.id, document.getElementById('target'));
                    EditorManager.minimize();
                }
            });
            await page.setViewport({width: 390, height: 700});
            const bounds = await page.$eval('.editor-dock', dock => {
                const rect = dock.getBoundingClientRect();
                return {left: rect.left, right: rect.right, overflow: dock.scrollWidth > dock.clientWidth};
            });
            assert(bounds.left >= 0 && bounds.right <= 390);
            assert.equal(bounds.overflow, true);
            if (process.env.EDITOR_MINIMIZE_SCREENSHOTS) {
                await page.screenshot({path: path.join(root, 'output/editor-minimize-mobile.png')});
            }
            await page.click('.editor-dock-item[data-block-id="m7"]');
            assert.equal(await page.evaluate(() => EditorManager.currentBlockId), 'm7');
            assert.equal(await page.evaluate(() => document.getElementById('btn-modal-ok').getBoundingClientRect().bottom
                <= document.querySelector('.editor-dock').getBoundingClientRect().top), true, 'the dock leaves mobile OK accessible');
            await page.click('.btn-min');
            assert.equal((await parked()).length, 8);
            await page.setViewport({width: 1360, height: 768});
            await page.click('.editor-dock-item[data-block-id="m0"]');
        });

        await t.test('deleting blocks and changing notes dispose every parked widget', async () => {
            await page.evaluate(() => AppState.removeBlock('m1'));
            assert.equal((await parked()).includes('m1'), false);
            await page.evaluate(() => {
                window.sessions = [...EditorManager.windows.values()].map(window => ({session: window.session, editor: window.currentEditor}));
                AppState.setNote({id: 3, blocks: [{id: 'a', html: '<p>Other note</p>'}]});
            });
            assert.equal(await page.$('.editor-dock'), null);
            assert.equal(await page.$('.modal-editor-floating'), null);
            assert.equal(await page.evaluate(() => sessions.every(({session, editor}) => session.disposed && editor.isDestroyed)), true);
            assert.equal(await page.evaluate(() => EditorManager.windows.size), 0);
        });
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
