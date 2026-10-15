const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');
const {source} = require('../frontend/helpers.cjs');

test('hidden explanations render TeX in editor tooltips and expanded blocks without changing saved text', async t => {
    const bundle = await esbuild.build({stdin: {contents: `
        import {EditorTiptapSetup} from './fastapi_app/static/js/notes/EditorTiptapSetup.js';
        import HiddenPhraseTooltip from './fastapi_app/static/js/notes/HiddenPhraseTooltip.js';
        import katex from 'katex';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {EditorTiptapSetup, HiddenPhraseTooltip, katex, renderMathInElement});`,
        resolveDir: path.resolve(__dirname, '../..')}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        await page.setViewport({width: 750, height: 660});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setContent('<!doctype html><body><div id="modal"><h2>Редактор</h2><div id="editor"></div></div></body>');
        await page.addStyleTag({path: path.resolve(__dirname, '../../node_modules/katex/dist/katex.min.css')});
        await page.addStyleTag({path: path.resolve(__dirname, '../../fastapi_app/static/css/blocks.css')});
        await page.addStyleTag({content: 'body {font: 18px/1.5 sans-serif; margin: 20px;} #modal {border: 1px solid #ddd; border-radius: 18px; padding: 22px;} #editor {height: 170px; overflow: hidden;} .tiptap {outline: none;}'});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            window.hint = String.raw`Координаты — отдельные числа вектора.
Чтобы получить одно новое число, каждую исходную координату умножают на свой коэффициент — вес, а затем складывают результаты.
Например, для вектора \([2,\;3,\;4]\) и весов \((0.5,\;-1,\;2)\):
\[
2\cdot0.5+3\cdot(-1)+4\cdot2=6.
\]
Так получается одна координата нового вектора.`;
            const phrase = document.createElement('span');
            phrase.dataset.type = 'hidden-phrase';
            phrase.dataset.hint = hint;
            phrase.textContent = 'взвешенная сумма исходных координат';
            window.hintHtml = `<p>В результате получается ${phrase.outerHTML}.</p>`;
            window.editor = EditorTiptapSetup.createEditor(document.getElementById('editor'), hintHtml, false);
            window.saved = editor.getHTML();
        });
        await t.test('hover renders inline and display formulas outside the clipped editor', async () => {
            await page.hover('#editor [data-type="hidden-phrase"]');
            await page.waitForSelector('.hidden-phrase-tooltip .katex-display');
            const result = await page.evaluate(() => {
                const tooltip = document.querySelector('.hidden-phrase-tooltip');
                const rect = tooltip.getBoundingClientRect();
                return {formulas: tooltip.querySelectorAll('.katex').length,
                    errors: tooltip.querySelectorAll('.katex-error').length,
                    outside: tooltip.parentElement === document.body,
                    inViewport: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
                    savedUnchanged: editor.getHTML() === saved,
                    pseudo: getComputedStyle(document.querySelector('#editor [data-type="hidden-phrase"]'), '::before').content};
            });
            assert.deepEqual(result, {formulas: 3, errors: 0, outside: true, inViewport: true, savedUnchanged: true, pseudo: 'none'});
            const output = path.resolve(__dirname, '../../tmp/hidden-phrase-math.png');
            await fs.mkdir(path.dirname(output), {recursive: true});
            await page.screenshot({path: output});
            await page.keyboard.press('Escape');
            assert.equal(await page.$('.hidden-phrase-tooltip'), null);
        });
        await t.test('hint HTML stays inert and long hints fit and scroll', async () => {
            await page.evaluate(() => {
                editor.commands.setTextSelection({from: 25, to: 30});
                editor.commands.extendMarkRange('hiddenPhrase');
                editor.commands.setHiddenPhrase({hint: '<img src=x onerror="window.attacked=true">\n' + 'Длинное пояснение.\n'.repeat(100)});
            });
            await page.mouse.move(2, 2);
            await page.hover('#editor [data-type="hidden-phrase"]');
            const result = await page.$eval('.hidden-phrase-tooltip', el => ({
                images: el.querySelectorAll('img').length,
                text: el.textContent.startsWith('<img'),
                scrollable: el.scrollHeight > el.clientHeight,
                bottom: el.getBoundingClientRect().bottom <= innerHeight,
            }));
            assert.deepEqual(result, {images: 0, text: true, scrollable: true, bottom: true});
            await page.evaluate(() => editor.destroy());
            assert.equal(await page.$('.hidden-phrase-tooltip'), null);
        });
        await page.addScriptTag({path: path.resolve(__dirname, '../../node_modules/dompurify/dist/purify.min.js')});
        await page.addScriptTag({content: source('HtmlSafety')});
        await page.evaluate(() => Object.assign(window, {
            t: key => key, ALGORITHM_STEPS: [], ALGORITHM_TEXTS: {},
            AppState: {currentNote: {}}, BlockStickersManager: {_updateBadge() {}},
            BlockCodeRenderer: {render() {}}, BlockMathRenderer: {renderMath() {}},
        }));
        await page.addScriptTag({content: source('BlockNormalBuilder')});
        await t.test('reading view renders expanded formulas and removes detached tooltips', async () => {
            await page.evaluate(() => document.body.appendChild(BlockNormalBuilder.build({id: 'hint-block', title: 'Блок', html: hintHtml})));
            await page.hover('#hint-block [data-type="hidden-phrase"]');
            assert.equal(await page.$$eval('.hidden-phrase-tooltip .katex', nodes => nodes.length), 3);
            await page.click('#hint-block [data-type="hidden-phrase"]');
            await page.waitForFunction(() => !document.querySelector('.hidden-phrase-tooltip'));
            assert.equal(await page.$$eval('#hint-block .hp-content .katex', nodes => nodes.length), 3);
            await page.click('#hint-block [data-type="hidden-phrase"]');
            await page.mouse.move(2, 2);
            await page.hover('#hint-block [data-type="hidden-phrase"]');
            await page.waitForSelector('.hidden-phrase-tooltip');
            await page.evaluate(() => document.getElementById('hint-block').remove());
            await page.waitForFunction(() => !document.querySelector('.hidden-phrase-tooltip'));
        });
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
