const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('source exposition opens above sources, renders math, and fits desktop and mobile', {timeout: 60_000}, async () => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import BlockMetaModalService from './fastapi_app/static/js/notes/BlockMetaModalService.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import SaveCoordinator from './fastapi_app/static/js/notes/SaveCoordinator.js';
        import katex from 'katex';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {BlockMetaModalService, AppState, SaveCoordinator, katex, renderMathInElement});`, resolveDir: root},
        bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(5000);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1100, height: 850, isMobile: true, hasTouch: true});
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
            + '<body><script id="i18n-data" type="application/json">' + JSON.stringify(translations)
            + '</script><main><h1>Устройство декодера</h1><div class="dialectics-block" data-id="b1"><button class="btn-connections">Источники</button></div></main></body></html>');
        for (const file of ['fastapi_app/static/css/base.css', 'fastapi_app/static/css/math.css',
            'fastapi_app/static/css/modals.css', 'fastapi_app/static/css/responsive.css', 'node_modules/katex/dist/katex.min.css']) {
            await page.addStyleTag({path: path.join(root, file)});
        }
        await page.addStyleTag({content: 'body{margin:24px;font:16px/1.6 sans-serif;background:#fff8ef;color:#334155}main{max-width:880px;margin:auto}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            window.calls = [];
            window.saves = 0;
            SaveCoordinator.saveCurrentNote = async () => {window.saves++;};
            window.fetch = async (url, options) => {
                calls.push({url, payload: JSON.parse(options.body)});
                const answer = '## Задача статьи\n\nАвторы строят преобразование последовательности. '
                    + 'Покажем, какие операции связывают вход с выходом.\n\n## Необходимость следующего шага\n\n'
                    + 'Один вектор не содержит связей между позициями. Для выбора нужных связей сравнивают запросы и ключи:\n\n'
                    + '$$A=\\operatorname{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$\n\n'
                    + 'Так каждая позиция получает взвешенную сумму значений. '
                    + 'Это пример ответа для проверки интерфейса.\n\n## Предел реконструкции\n\n'
                    + 'Историческое влияние в доступном тексте не установлено.';
                const events = [{type: 'started'}, {type: 'status', status: 'article_loaded', source_scope: 'article'},
                    {type: 'delta', delta: answer}, {type: 'terminal', status: 'completed'}];
                return new Response(events.map((event, index) => 'data: ' + JSON.stringify({
                    ...event, run_id: 'article-test', sequence: index + 1,
                }) + '\n\n').join(''), {headers: {'Content-Type': 'text/event-stream'}});
            };
            AppState.setNote({id: 1, title: 'Трансформер', blocks: [{id: 'b1', title: 'Декодер', sources: [
                {title: 'Attention Is All You Need — Ashish Vaswani и соавторы', url: 'https://arxiv.org/html/1706.03762v7',
                    quote: 'Пересказ. Разделы 3.1–3.3 описывают устройство слоя декодера, масштабированное скалярное и многоголовое внимание.'},
                {title: 'Dive into Deep Learning — 11.7. The Transformer Architecture',
                    url: 'https://d2l.ai/chapter_attention-mechanisms-and-transformers/transformer.html', quote: 'Пересказ раздела 11.7.'},
            ]}]});
            BlockMetaModalService.showSourcesModal('b1');
        });
        const preview = path.join(root, '.cache/article-exposition-preview');
        await fs.mkdir(preview, {recursive: true});
        await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
        await page.screenshot({path: path.join(preview, 'sources.png')});
        assert.equal(await page.$eval('.btn-explain-src', el => el.getBoundingClientRect().width <= 28
            && el.textContent.trim() === '✦'), true);
        await page.click('.btn-explain-src');
        await page.waitForFunction(() => !document.querySelector('.article-exposition-copy').disabled);
        assert.equal(await page.$eval('.article-exposition-status', el => el.textContent), translations.article_exposition_full);
        assert.equal(await page.$$eval('.article-exposition-answer .katex', els => els.length), 1);
        assert.equal(await page.$eval('.block-sources-modal', el => el.closest('.modal-overlay').inert), true);
        assert.equal(await page.evaluate(() => calls[0].payload.url), 'https://arxiv.org/html/1706.03762v7');
        assert.equal(await page.evaluate(() => calls[0].payload.note_title), 'Трансформер');
        assert.equal(await page.evaluate(() => saves), 0);
        await page.click('.article-exposition-save');
        await page.waitForSelector('.btn-cancel-dialog');
        await page.click('.btn-cancel-dialog');
        assert.equal(await page.evaluate(() => saves), 0);
        await page.click('.article-exposition-save');
        await page.waitForSelector('.btn-confirm-dialog');
        await page.click('.btn-confirm-dialog');
        await page.waitForFunction(() => !document.querySelector('.article-exposition-saved').hidden);
        assert.equal(await page.evaluate(() => saves), 1);
        assert.equal(await page.evaluate(() => AppState.getBlock('b1').sources[0].exposition.scope), 'article');
        await page.click('.article-exposition-close');
        assert.equal(await page.$eval('.btn-explain-src', el => el.classList.contains('has-exposition')), true);
        await page.click('.btn-explain-src');
        await page.waitForSelector('.article-exposition-answer .katex');
        assert.equal(await page.evaluate(() => calls.length), 1);
        await page.focus('.article-exposition-close');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('btn-close-modal')), true);
        await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
        await page.screenshot({path: path.join(preview, 'desktop.png')});
        await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
        const fits = await page.$eval('.article-exposition-modal', el => {
            const rect = el.getBoundingClientRect();
            const body = el.querySelector('.modal-dialog-body');
            return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight
                && body.scrollWidth <= body.clientWidth + 1;
        });
        assert.equal(fits, true, 'dialog and contents must fit the mobile viewport');
        await page.screenshot({path: path.join(preview, 'mobile.png')});
        await page.keyboard.press('Escape');
        assert.equal(await page.$('.article-exposition-overlay'), null);
        assert.equal(await page.$eval('.block-sources-modal', el => el.closest('.modal-overlay').inert), false);
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('btn-explain-src')), true);
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
