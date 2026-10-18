const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('block generation requires confirmation before replacing content', async () => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockNormalBuilder from './fastapi_app/static/js/notes/BlockNormalBuilder.js';
        import NotesAPI from './fastapi_app/static/js/notes/api.js';
        import NoteStorageService from './fastapi_app/static/js/notes/NoteStorageService.js';
        import DOMPurify from 'dompurify';
        Object.assign(window, {AppState, BlockNormalBuilder, NotesAPI, NoteStorageService, DOMPurify});`,
        resolveDir: root}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        await page.setViewport({width: 1200, height: 850, isMobile: true, hasTouch: true});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const words = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script id="i18n-data" type="application/json">'
            + JSON.stringify(words) + '</script><main id="blocks-container"></main></body></html>');
        await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css/modals.css')});
        await page.addStyleTag({content: 'body{font:16px/1.5 sans-serif;margin:24px}.dialectics-block{padding:20px;border:1px solid #ddd;margin-bottom:20px}.btn-autofill-ai{width:32px;height:32px}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            window.katex = {render() {}};
            window.requests = 0;
            window.checkpoints = 0;
            NoteStorageService.saveCurrentNote = async () => AppState.currentNote;
            NotesAPI.fillBlock = async () => {window.requests++; return {content: 'Новый текст'};};
            NotesAPI.createCheckpoint = async () => {window.checkpoints++;};
            AppState.setNote({id: 1, title: 'Генерация', blocks: [
                {id: 'filled', title: 'Заполненный блок', html: '<p>Важный текст</p>'},
                {id: 'empty', title: 'Пустой блок', html: '<p><br></p>'},
            ]});
            window.renderBlocks = () => document.getElementById('blocks-container').replaceChildren(
                ...AppState.currentNote.blocks.map(block => BlockNormalBuilder.build(block, window.renderBlocks)));
            window.renderBlocks();
        });
        const icon = '#filled .btn-autofill-ai';
        const unchanged = async () => {
            assert.equal(await page.evaluate(() => window.requests), 0);
            assert.equal(await page.evaluate(() => window.checkpoints), 0);
            assert.equal(await page.$eval('#filled .block-content', el => el.textContent), 'Важный текст');
            assert.equal(await page.$('#ai-global-loader'), null);
        };
        for (const cancel of ['button', 'escape', 'close', 'backdrop', 'enter']) {
            await page.click(icon);
            await page.waitForSelector('.modal-dialog');
            assert.equal(await page.$eval('.modal-dialog h2 span:last-child', el => el.textContent), words.gen_replace_block_title);
            assert.equal(await page.$eval('.modal-dialog-body', el => el.textContent.trim()), words.gen_replace_block_message);
            assert.equal(await page.evaluate(() => document.activeElement.matches('.btn-cancel-dialog')), true);
            assert.equal(await page.$eval(icon, el => el.disabled), true);
            await page.$eval(icon, el => el.click());
            assert.equal(await page.$$eval('.modal-dialog', els => els.length), 1);
            await unchanged();
            if (cancel === 'button') await page.click('.btn-cancel-dialog');
            else if (cancel === 'escape') await page.keyboard.press('Escape');
            else if (cancel === 'enter') await page.keyboard.press('Enter');
            else if (cancel === 'close') await page.click('.btn-close-dialog');
            else await page.mouse.click(5, 5);
            await page.waitForSelector('.modal-dialog', {hidden: true});
            await page.waitForFunction(selector => !document.querySelector(selector).disabled, {}, icon);
            await unchanged();
        }
        await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
        await page.click(icon);
        await page.waitForSelector('.modal-dialog');
        assert.equal(await page.$eval('.modal-dialog', el => {
            const rect = el.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth;
        }), true);
        await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
        await page.screenshot({path: path.join(root, 'tmp/block-generation-confirm.png')});
        await page.click('.btn-confirm-dialog');
        await page.waitForFunction(() => AppState.getBlock('filled').html === '<p>Новый текст</p>');
        assert.equal(await page.evaluate(() => window.requests), 1);
        assert.equal(await page.evaluate(() => window.checkpoints), 1);
        await page.click('#empty .btn-autofill-ai');
        await page.waitForFunction(() => AppState.getBlock('empty').html === '<p>Новый текст</p>');
        assert.equal(await page.$('.modal-dialog'), null);
        assert.equal(await page.evaluate(() => window.requests), 2);
        assert.equal(await page.evaluate(() => window.checkpoints), 2);
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
