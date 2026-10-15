const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const puppeteer = require('puppeteer');
const {source} = require('../frontend/helpers.cjs');

test('mouse click preserves a block selection and opens a quoted sticker with comment focus', async () => {
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        await page.setViewport({width: 1100, height: 900});
        await page.setContent('<!doctype html><html><body></body></html>');
        await page.addScriptTag({path: path.resolve(__dirname, '../../node_modules/dompurify/dist/purify.min.js')});
        await page.addScriptTag({content: source('HtmlSafety')});
        await page.evaluate(() => {
            window.t = key => ({stk_title_ph: 'Заголовок', stk_text_ph: 'Напишите что-нибудь...',
                stk_block_notes: 'Заметки к блоку', stk_empty: 'Пока нет стикеров'}[key] || key);
            window.ALGORITHM_STEPS = [];
            window.ALGORITHM_TEXTS = {};
            window.BlockCodeRenderer = {render() {}};
            window.BlockMathRenderer = {renderMath() {}};
            window.AppState = {currentNote: {blocks: [], dictionary: []},
                updateBlock(id, patch) {Object.assign(this.currentNote.blocks.find(block => block.id === id), patch);}};
            window.showToast = () => {};
        });
        await page.addScriptTag({content: source('BlockStickersManager')});
        await page.addScriptTag({content: source('HiddenPhraseTooltip')});
        await page.addScriptTag({content: source('BlockNormalBuilder')});
        await page.addStyleTag({path: path.resolve(__dirname, '../../fastapi_app/static/css/components.css')});
        await page.addStyleTag({content: 'body {font: 16px sans-serif; padding: 24px;} .dialectics-block {width: 550px;}'});
        await page.evaluate(() => {
            const block = {id: 'quoted', title: 'Пример блока', html: '<p>Первое предложение.</p><p>Выделенный фрагмент для цитаты.</p>'};
            AppState.currentNote.blocks.push(block);
            const el = BlockNormalBuilder.build(block);
            document.body.appendChild(el);
            const range = document.createRange();
            range.selectNodeContents(el.querySelector('.block-content p:last-child'));
            window.getSelection().addRange(range);
        });
        await page.click('.btn-sticker');
        assert.deepEqual(await page.evaluate(() => ({
            quote: document.querySelector('.sticker-panel-quote').textContent,
            comment: document.querySelector('.sticker-panel-text-input').value,
            focused: document.activeElement.className,
            selection: window.getSelection().toString(),
        })), {quote: 'Выделенный фрагмент для цитаты.', comment: '',
            focused: 'sticker-panel-text-input', selection: ''});
        await page.type('.sticker-panel-text-input', 'Мой комментарий к этому фрагменту.');
        await page.click('.sticker-add-btn');
        assert.equal(await page.evaluate(() => AppState.currentNote.blocks[0].stickers[0].text),
            '> Выделенный фрагмент для цитаты.\n\nМой комментарий к этому фрагменту.');
        await page.click('.btn-sticker');
        assert.equal(await page.$('.sticker-panel'), null);
        await page.click('.btn-sticker');
        assert.deepEqual(await page.evaluate(() => ({
            hidden: document.querySelector('.sticker-panel-quote').hidden,
            focused: document.activeElement.className,
            savedQuote: document.querySelector('.sticker-card blockquote').textContent,
        })), {hidden: true, focused: 'sticker-panel-title-input', savedQuote: 'Выделенный фрагмент для цитаты.'});
    } finally {
        await browser.close();
    }
});
