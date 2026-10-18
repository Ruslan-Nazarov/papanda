const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('formulas render in streamed answers, related passages and AI checks', async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import {renderStreamMarkdown} from './fastapi_app/static/js/notes/ConceptExplainManager.js';
        import ConceptSelectionMenu from './fastapi_app/static/js/notes/ConceptSelectionMenu.js';
        import AICheckModalService from './fastapi_app/static/js/notes/AICheckModalService.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import NotesAPI from './fastapi_app/static/js/notes/api.js';
        import NoteText from './fastapi_app/static/js/notes/NoteText.js';
        import NoteContextSearch from './fastapi_app/static/js/notes/NoteContextSearch.js';
        import katex from 'katex';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {renderStreamMarkdown, ConceptSelectionMenu, AICheckModalService,
            AppState, NotesAPI, NoteText, NoteContextSearch, katex, renderMathInElement});`, resolveDir: root},
        bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({width: 1000, height: 800});
        const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8')).ru;
        await page.setContent('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>'
            + '<body><script id="i18n-data" type="application/json">' + JSON.stringify(translations)
            + '</script><div id="answer"></div><div class="dialectics-block collapsed" data-id="source">'
            + '<button class="btn-collapse-toggle">Блок</button></div></body></html>');
        for (const file of ['node_modules/katex/dist/katex.min.css', 'fastapi_app/static/css/math.css',
            'fastapi_app/static/css/blocks.css', 'fastapi_app/static/css/modals.css', 'fastapi_app/static/css/formula-zoom.css']) {
            await page.addStyleTag({path: path.join(root, file)});
        }
        await page.addStyleTag({content: 'body{font:16px/1.5 sans-serif;margin:24px}#answer{max-width:620px}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            window.softmax = String.raw`p_i=\frac{e^{z_i}}{\displaystyle\sum_{j=0}^{5}e^{z_j}}`;
            window.matrix = String.raw`M=\begin{pmatrix}1&2\\3&4\end{pmatrix}`;
            window.answer = '**Как получить вероятности**\n\nВектор \\(h_t\\), логит $z_i$.\n\n\\['
                + softmax + '\\]\n\n$$' + matrix + '$$\n\n| Слово | Вероятность |\n|---|---|\n| кошка | $p_i$ |\n\n'
                + '`$raw_1$`\n\n```tex\n\\[raw_2\\]\n```\n\n<img src=x onerror="window.attacked=1">';
        });
        await t.test('streaming preserves all delimiters, matrices, tables and code through repeated updates', async () => {
            const result = await page.evaluate(() => {
                const target = document.getElementById('answer');
                // An incomplete stream must recover when the closing delimiter arrives.
                renderStreamMarkdown(target, answer.slice(0, answer.indexOf('\\]')));
                renderStreamMarkdown(target, answer);
                renderStreamMarkdown(target, answer);
                return {formulas: [...target.querySelectorAll('annotation')].map(el => el.textContent),
                    errors: target.querySelectorAll('.katex-error, .katex .katex').length,
                    display: target.querySelectorAll('.katex-display').length,
                    code: [...target.querySelectorAll('code')].map(el => el.textContent.trim()),
                    table: target.querySelectorAll('td .katex').length,
                    unsafe: !!target.querySelector('[onerror], script'), attacked: !!window.attacked};
            });
            assert.deepEqual(result.formulas, ['h_t', 'z_i', await page.evaluate(() => softmax), await page.evaluate(() => matrix), 'p_i']);
            assert.equal(result.display, 2);
            assert.deepEqual(result.code, ['$raw_1$', String.raw`\[raw_2\]`]);
            assert.equal(result.errors, 0);
            assert.equal(result.table, 1);
            assert.equal(result.unsafe, false);
            assert.equal(result.attacked, false);
        });
        await t.test('multiline single-dollar calculations survive extraction, chunking and source preview rendering', async () => {
            const result = await page.evaluate(() => {
                const formula = String.raw`\begin{aligned}s_2&=h_4\cdot h_2\\
                    &\approx 0.533425\cdot(-0.406597)\\
                    &\quad+(-0.325720)\cdot0.478142\\
                    &\quad+0.732975\cdot0.371809\\
                    &\approx-0.100103.\end{aligned}`;
                const target = document.getElementById('answer');
                renderStreamMarkdown(target, 'Расчёт: $' + formula + '$. Результат.');
                const extracted = NoteText.fromHtml(target.innerHTML);
                const search = new NoteContextSearch([{id: 'long', title: 'Расчёт',
                    html: '<p>' + 'Вводный текст. '.repeat(70) + '</p>' + target.innerHTML}]);
                return {formula, extracted, annotations: [...target.querySelectorAll('annotation')].map(el => el.textContent),
                    errors: target.querySelectorAll('.katex-error').length,
                    excerpts: search.chunks.filter(chunk => chunk.text.includes('begin')).map(chunk => chunk.text)};
            });
            assert.equal(result.errors, 0);
            assert.deepEqual(result.annotations, [result.formula]);
            assert(result.extracted.includes('$' + result.formula + '$'));
            assert(result.excerpts.length);
            assert(result.excerpts.every(text => text.includes('$' + result.formula + '$')));
        });
        await t.test('source previews render formulas and remain scrollable inside desktop and mobile viewports', async () => {
            await page.evaluate(() => {
                window.modal = ConceptSelectionMenu._modal(String.raw`Вероятность \(p_i\)`);
                modal.target.textContent = 'Ответ находится в конспекте.';
                ConceptSelectionMenu._showSources(modal.target, [{block_id: 'source', title: 'Оценки $z_i$',
                    text: 'Применяем softmax.\n\\[' + softmax + '\\]\n\n' + 'Дополнительное пояснение.\n'.repeat(45)}], modal.close);
                window.expanded = false;
                document.querySelector('[data-id="source"] button').onclick = () => {window.expanded = true;};
            });
            assert.equal(await page.$('.concept-explain-source[title]'), null);
            assert.equal(await page.$eval('.concept-explain-fragment annotation', el => el.textContent), 'p_i');
            assert.equal(await page.$eval('.concept-explain-source annotation', el => el.textContent), 'z_i');
            for (const width of [1000, 360]) {
                await page.setViewport({width, height: 740});
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                await page.focus('.concept-explain-source');
                // Resizing dismisses the old preview; refocusing opens a new one.
                await page.$eval('.concept-explain-source', el => {el.blur(); el.focus();});
                await page.waitForSelector('.hidden-phrase-tooltip .katex-display');
                const result = await page.$eval('.hidden-phrase-tooltip', el => {
                    const r = el.getBoundingClientRect();
                    const anchor = document.querySelector('.concept-explain-source').getBoundingClientRect();
                    return {inViewport: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
                        clearOfButton: r.bottom <= anchor.top || r.top >= anchor.bottom,
                        scrollable: el.scrollHeight > el.clientHeight,
                        formula: el.querySelector('annotation').textContent, errors: el.querySelectorAll('.katex-error').length};
                });
                assert.equal(result.inViewport, true);
                assert.equal(result.clearOfButton, true);
                assert.equal(result.scrollable, true);
                assert.equal(result.formula, await page.evaluate(() => softmax));
                assert.equal(result.errors, 0);
                await page.keyboard.press('Escape');
                assert.equal(await page.$('.hidden-phrase-tooltip'), null);
            }
            await page.setViewport({width: 1000, height: 800});
            await page.hover('.concept-explain-source');
            await page.waitForSelector('.hidden-phrase-tooltip');
            await fs.mkdir(path.join(root, 'tmp'), {recursive: true});
            await page.screenshot({path: path.join(root, 'tmp/math-source-preview.png')});
            await page.click('.concept-explain-source');
            assert.equal(await page.evaluate(() => expanded), true);
            assert.equal(await page.$('.modal-overlay'), null);
            assert.equal(await page.$('.hidden-phrase-tooltip'), null);
        });
        await t.test('AI checking uses the same formula renderer', async () => {
            await page.evaluate(async () => {
                AppState.setNote({id: 1, blocks: [{id: 'check', title: 'Вероятности', html: '<p>Проверка</p>'}]});
                NotesAPI.stream = async (_path, _payload, delta) => {delta('', answer); return answer;};
                await AICheckModalService.show('check');
            });
            await page.waitForSelector('#ai-check-stream-body .katex-display');
            assert.equal(await page.$$eval('#ai-check-stream-body .katex', els => els.length), 5);
            assert.equal(await page.$$eval('#ai-check-stream-body .katex-error', els => els.length), 0);
            await page.click('.ai-check-modal .btn-close-modal');
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
