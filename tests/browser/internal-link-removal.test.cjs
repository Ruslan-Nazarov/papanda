const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('link menu removes links while preserving text and other formatting', async t => {
    const bundle = await esbuild.build({stdin: {contents: `
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import {EditorTiptapSetup} from './fastapi_app/static/js/notes/EditorTiptapSetup.js';
        window.widgets = {EditorManager, EditorTiptapSetup};`,
        resolveDir: path.resolve(__dirname, '../..')}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setRequestInterception(true);
        page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
        await page.setContent('<div id="fixture"></div>');
        await page.addStyleTag({path: path.resolve(__dirname, '../../fastapi_app/static/css/modals.css')});
        await page.addStyleTag({path: path.resolve(__dirname, '../../fastapi_app/static/css/editor.css')});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        const open = html => page.evaluate(html => {
            window.editor?.destroy();
            const host = document.getElementById('fixture');
            host.innerHTML = widgets.EditorManager.renderEditorHTML({top: 0, left: 0, currentTitle: '', currentTags: ''});
            window.editor = widgets.EditorTiptapSetup.createEditor(host.querySelector('.modal-tiptap-content'), html, false);
            widgets.EditorTiptapSetup.bindFormatButtons(host, () => editor);
        }, html);
        const removeLink = async () => {
            await page.click('[data-format="link"]');
            await page.waitForSelector('.internal-links-delete');
            await page.click('.internal-links-delete');
            await page.waitForSelector('.internal-links-dialog', {hidden: true});
        };

        await t.test('toolbar has one link button and the add menu has no deletion for plain text', async () => {
            await open('<p>Plain text</p>');
            assert.equal(await page.$$eval('[data-format="unlink"]', buttons => buttons.length), 0);
            await page.click('[data-format="link"]');
            assert.equal(await page.$$eval('.internal-links-delete', buttons => buttons.length), 0);
            await page.click('.internal-links-cancel');
        });

        await t.test('cursor removes the entire link across differently formatted text; undo and reopen work', async () => {
            await open('<p>Before <a href="internal://note/1/block/2">linked <strong>words</strong></a> after</p>');
            await page.click('.tiptap a strong');
            await page.waitForFunction(() => editor.isActive('link'));
            assert.equal(await page.$eval('[data-format="link"]', button => button.classList.contains('is-active')), true);
            await removeLink();
            const html = await page.evaluate(() => editor.getHTML());
            assert.equal(html, '<p>Before linked <strong>words</strong> after</p>');
            await page.evaluate(() => editor.commands.undo());
            assert.match(await page.evaluate(() => editor.getHTML()), /href="internal:\/\/note\/1\/block\/2"/);
            await open(html);
            assert.equal(await page.evaluate(() => editor.getHTML()), html);
        });

        await t.test('selection containing plain text and a link enables removal without touching another link', async () => {
            await open('<p>Before <a href="internal://note/1">first</a> after <a href="internal://note/2">second</a></p>');
            await page.evaluate(() => editor.commands.setTextSelection({from: 1, to: 19}));
            assert.equal(await page.evaluate(() => editor.isActive('link')), false);
            await removeLink();
            assert.equal(await page.$eval('.tiptap', element => element.textContent), 'Before first after second');
            assert.deepEqual(await page.$$eval('.tiptap a', links => links.map(link => link.getAttribute('href'))), ['internal://note/2']);
        });

        await t.test('existing link dialog offers deletion for a mixed selection, even when loading notes fails', async () => {
            await open('<p>Before <a href="internal://note/1">first</a> after</p>');
            await page.evaluate(() => editor.commands.selectAll());
            await page.click('[data-format="link"]');
            await page.waitForSelector('.internal-links-delete');
            await page.click('.internal-links-cancel');
            assert.equal(await page.$$eval('.tiptap a', links => links.length), 1);
            await page.click('[data-format="link"]');
            await page.click('.internal-links-delete');
            await page.waitForFunction(() => !document.querySelector('.tiptap a'));
            assert.equal(await page.evaluate(() => editor.getHTML()), '<p>Before first after</p>');
        });

        await t.test('external and multiple-destination links can also be removed', async () => {
            for (const href of ['https://example.com', 'internal://note/1']) {
                await open(`<p><a href="${href}">linked words</a></p>`);
                await page.evaluate(href => {
                    editor.commands.setTextSelection({from: 1, to: 13});
                    editor.commands.setLink({href, targets: [{url: href, text: 'One'}, {url: 'internal://note/2', text: 'Two'}]});
                    editor.commands.setTextSelection(5);
                }, href);
                await removeLink();
                assert.equal(await page.evaluate(() => editor.getHTML()), '<p>linked words</p>');
            }
        });
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
