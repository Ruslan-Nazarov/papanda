const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('readiness toggles preserve all cards and rendered formulas in a large note', {timeout: 60_000}, async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import MathSymbols from './fastapi_app/static/js/notes/MathSymbols.js';
        import katex from 'katex';
        import DOMPurify from 'dompurify';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {AppState, BlockDOMRenderer, MathSymbols, katex, DOMPurify, renderMathInElement});`, resolveDir: root},
        bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setContent('<!doctype html><main id="blocks-container" class="mode-no-dialectics"></main>');
        await page.addStyleTag({path: path.join(root, 'fastapi_app/static/css/blocks.css')});
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        const result = await page.evaluate(async () => {
            const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const html = Array.from({length: 15}, (_, i) => `<p>Расчёт: <span class="math-inline" formula="q_${i}=${i}+2">q</span></p>`).join('');
            AppState.setNote({id: 1, blocks: Array.from({length: 30}, (_, i) => ({
                id: 'b' + i, title: 'Block ' + i, side: 'left', html, status: 'in_progress',
            }))});
            BlockDOMRenderer.renderAll();
            await settle();
            const cards = [...document.querySelectorAll('.dialectics-block')];
            const formulas = [...document.querySelectorAll('#blocks-container .katex')];
            const contents = AppState.currentNote.blocks.map(block => block.html);
            let renders = 0, dirtyEvents = 0;
            const progress = [], statuses = [], colors = [], titles = [];
            document.addEventListener('stateDirty', () => dirtyEvents++);
            document.addEventListener('progressUpdated', event => progress.push(event.detail.percent));
            const render = MathSymbols.render;
            MathSymbols.render = function(...args) {renders++; return render.apply(this, args);};
            const start = performance.now();
            for (let i = 0; i < 3; i++) {
                document.querySelector('#b21 .block-status-dot').click();
                const dot = document.querySelector('#b21 .block-status-dot');
                statuses.push(dot.dataset.status);
                colors.push(getComputedStyle(dot).backgroundColor);
                titles.push(dot.title);
            }
            const toggleMs = performance.now() - start;
            await settle();
            MathSymbols.render = render;
            const currentFormulas = [...document.querySelectorAll('#blocks-container .katex')];
            return {renders, dirtyEvents, progress, statuses, colors, titles, toggleMs,
                sameCards: cards.every(card => document.getElementById(card.id) === card),
                sameFormulas: formulas.every((formula, i) => currentFormulas[i] === formula),
                sameContents: contents.every((html, i) => AppState.currentNote.blocks[i].html === html),
                status: AppState.getBlock('b21').status, dirty: AppState.isDirty,
                history: AppState.blockHistory('b21'), formulaCount: formulas.length};
        });
        t.diagnostic(`${result.formulaCount}-formula note: three readiness toggles took ${result.toggleMs.toFixed(0)} ms; ${result.renders} formula decorations.`);
        assert.equal(result.sameCards, true, 'Changing readiness must keep every card connected');
        assert.equal(result.sameFormulas, true);
        assert.equal(result.renders, 0, 'Changing readiness must not render formulas again');
        assert.equal(result.sameContents, true);
        assert.deepEqual(result.statuses, ['ready', 'in_progress', 'ready']);
        assert.deepEqual(result.colors, ['rgb(34, 197, 94)', 'rgb(245, 158, 11)', 'rgb(34, 197, 94)']);
        assert(result.titles.every((title, i) => title.endsWith(result.statuses[i])));
        assert.deepEqual(result.progress, [52, 50, 52]);
        assert.equal(result.status, 'ready');
        assert.equal(result.dirty, true);
        assert.equal(result.dirtyEvents, 3);
        assert.deepEqual(result.history, {undo: 0, redo: 0, position: 1, total: 1});
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
