const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('saving pasted blocks reuses other cards and refreshes dependent formula hints', {timeout: 60_000}, async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import MathSymbols from './fastapi_app/static/js/notes/MathSymbols.js';
        import MathSubstitutions from './fastapi_app/static/js/notes/MathSubstitutions.js';
        import katex from 'katex';
        import DOMPurify from 'dompurify';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {EditorManager, AppState, BlockDOMRenderer, MathSymbols,
            MathSubstitutions, katex, DOMPurify, renderMathInElement});`, resolveDir: root},
        bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setContent('<!doctype html><html><body><div id="modal-container"></div>'
            + '<main id="blocks-container" class="mode-no-dialectics"></main></body></html>');
        await page.addScriptTag({content: bundle.outputFiles[0].text});

        await t.test('a large rich paste saves only its card, preserves parked editors and reopens intact', async () => {
            const result = await page.evaluate(async () => {
                const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                const html = Array.from({length: 15}, (_, i) => `<p>Расчёт: <span class="math-inline" formula="q_${i}=${i}+2">q</span></p>`).join('');
                AppState.setNote({id: 1, blocks: Array.from({length: 30}, (_, i) => ({
                    id: 'b' + i, title: 'Block ' + i, side: 'left', html,
                }))});
                BlockDOMRenderer.renderAll();
                await settle();
                window.untouched = document.getElementById('b1');
                const untouchedFormula = untouched.querySelector('.katex');
                EditorManager.openModalEditor('b2', document.getElementById('b2'));
                const parked = EditorManager.currentEditor;
                parked.commands.setContent('<p>Несохранённый текст другого блока</p>');
                EditorManager.openModalEditor('b0', document.getElementById('b0'));
                EditorManager.currentEditor.commands.selectAll();
                const data = new DataTransfer();
                data.setData('text/plain', '# Вставленный текст\n\n'
                    + 'Длинное объяснение после вставки.\n\n'.repeat(80)
                    + '$u=a+b$\n\n$v=c+d$\n\n| Столбец | Значение |\n|---|---|\n| Пример | 7 |');
                EditorManager.currentEditor.view.dom.dispatchEvent(new ClipboardEvent('paste', {
                    bubbles: true, cancelable: true, clipboardData: data,
                }));
                const expected = EditorManager.currentEditor.getHTML();
                let renders = 0, sources = 0;
                const render = MathSymbols.render;
                const addSource = MathSubstitutions.addSource;
                MathSymbols.render = function(...args) {renders++; return render.apply(this, args);};
                MathSubstitutions.addSource = function(...args) {sources++; return addSource.apply(this, args);};
                const start = performance.now();
                await EditorManager.handleSave();
                const saveMs = performance.now() - start;
                await settle();
                MathSymbols.render = render;
                MathSubstitutions.addSource = addSource;
                const actual = AppState.getBlock('b0').html;
                const same = untouched === document.getElementById('b1');
                const sameFormula = untouchedFormula === untouched.querySelector('.katex');
                const count = document.querySelectorAll('#blocks-container .katex').length;
                const preservedDraft = !parked.isDestroyed && EditorManager.windows.get('b2').currentEditor === parked
                    && parked.getText() === 'Несохранённый текст другого блока';
                EditorManager.openModalEditor('b0', document.getElementById('b0'));
                const reopened = EditorManager.currentEditor.getHTML();
                EditorManager.closeAll();
                return {expected, actual, reopened, same, sameFormula, preservedDraft, count, renders, sources, saveMs};
            });
            assert.equal(result.actual, result.expected);
            assert.equal(result.reopened, result.expected);
            assert.match(result.actual, /<table/);
            assert.match(result.actual, /Вставленный текст/);
            assert.equal(result.same, true);
            assert.equal(result.sameFormula, true);
            assert.equal(result.preservedDraft, true);
            assert.equal(result.count, 29 * 15 + 2);
            assert(result.renders <= 6, `Only the two pasted formulas need rendering, got ${result.renders}`);
            assert(result.sources <= result.count + 2, `Previous formulas must be indexed once, got ${result.sources}`);
            t.diagnostic(`450-formula note: OK after a rich paste took ${result.saveMs.toFixed(0)} ms; ${result.renders} formula decorations.`);
        });

        await t.test('removing all source formulas clears stale hints in a reused later card', async () => {
            const result = await page.evaluate(async () => {
                const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                AppState.setNote({id: 2, blocks: [
                    {id: 'source', title: 'Source', html: '<p><span class="math-inline" formula="y=a+b">y</span></p>'},
                    {id: 'result', title: 'Result', html: '<p><span class="math-inline" formula="y=0.1+0.2=0.3">y</span></p>'},
                ]});
                BlockDOMRenderer.renderAll();
                await settle();
                const card = document.getElementById('result');
                const before = card.querySelectorAll('[data-math-value]').length;
                EditorManager.openModalEditor('source', document.getElementById('source'));
                EditorManager.currentEditor.commands.setContent('<p>Источник удалён</p>');
                await EditorManager.handleSave();
                await settle();
                return {before, after: card.querySelectorAll('[data-math-value]').length,
                    same: card === document.getElementById('result'),
                    original: !!card.querySelector('[data-math-original]'),
                    tex: card.querySelector('annotation').textContent};
            });
            assert.equal(result.before, 3);
            assert.equal(result.after, 1);
            assert.equal(result.same, true);
            assert.equal(result.original, false);
            assert.equal(result.tex, 'y=0.1+0.2=0.3');
        });
        assert.deepEqual(errors, []);
    } finally {await browser.close();}
});
