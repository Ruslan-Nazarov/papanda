const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('canvas actions update affected controls and preserve unrelated cards and formulas', {timeout: 60_000}, async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
        import BlockDnDManager from './fastapi_app/static/js/notes/BlockDnDManager.js';
        import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
        import ModeManager from './fastapi_app/static/js/notes/ModeManager.js';
        import TOCManager from './fastapi_app/static/js/notes/TOCManager.js';
        import MathSymbols from './fastapi_app/static/js/notes/MathSymbols.js';
        import katex from 'katex';
        import DOMPurify from 'dompurify';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {AppState, BlockDOMRenderer, BlockDnDManager, EditorManager,
            ModeManager, TOCManager, MathSymbols, katex, DOMPurify, renderMathInElement});`, resolveDir: root},
        bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setContent('<!doctype html><main id="blocks-container" class="mode-no-dialectics"></main>'
            + '<div id="modal-container" class="hidden"></div><div id="toc-dropdown-menu"></div>'
            + '<input id="toggle-autofill-step" type="checkbox">');
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(async () => {
            window.settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const html = '<p>Текст для выделения</p><span data-type="hidden-phrase" data-hint="Подробности">Объяснение</span>'
                + Array.from({length: 15}, (_, i) => `<p><span class="math-inline" formula="x_${i}+y_${i}">x</span></p>`).join('');
            AppState.setNote({id: 1, blocks: Array.from({length: 30}, (_, i) => ({
                id: 'b' + i, title: 'Block ' + i, side: 'left', html: html
                    + (i === 5 ? '<table><tbody><tr><td>Таблица</td></tr></tbody></table>' : ''),
            }))});
            BlockDOMRenderer.renderAll();
            ModeManager.init();
            EditorManager.init();
            await settle();
            window.renders = 0;
            const render = MathSymbols.render;
            MathSymbols.render = function(...args) {window.renders++; return render.apply(this, args);};
            window.capture = () => {
                window.renders = 0;
                return {cards: [...document.querySelectorAll('.dialectics-block')],
                    formulas: [...document.querySelectorAll('#blocks-container .katex')],
                    overlay: document.querySelector('.pinned-derivations')};
            };
            window.compare = before => ({
                sameCards: before.cards.every(card => document.getElementById(card.id) === card),
                sameFormulas: before.formulas.every(formula => formula.isConnected),
                sameOverlay: before.overlay === document.querySelector('.pinned-derivations'), renders: window.renders,
            });
        });
        const preserved = result => {
            assert.equal(result.sameCards, true);
            assert.equal(result.sameFormulas, true);
            assert.equal(result.sameOverlay, true);
            assert.equal(result.renders, 0);
        };
        await t.test('repeated rendering is a DOM no-op', async () => {
            const result = await page.evaluate(async () => {
                const before = capture();
                let mutations = 0;
                const observer = new MutationObserver(records => {mutations += records.length;});
                observer.observe(document.getElementById('blocks-container'), {subtree: true, attributes: true, childList: true, characterData: true});
                BlockDOMRenderer.renderAll();
                BlockDOMRenderer.renderAll();
                await settle();
                observer.disconnect();
                return {...compare(before), mutations};
            });
            preserved(result);
            assert.equal(result.mutations, 0);
        });
        await t.test('metadata, mode and hint changes preserve reading state and selection', async () => {
            const result = await page.evaluate(async () => {
                const before = capture();
                const reader = document.getElementById('b8');
                reader.querySelector('[data-type="hidden-phrase"]').click();
                reader.querySelector('.btn-reading-view').click();
                const range = document.createRange();
                range.selectNodeContents(reader.querySelector('.block-content p'));
                getSelection().removeAllRanges();
                getSelection().addRange(range);
                const start = performance.now();
                AppState.updateBlock('b10', {title: 'Новый заголовок', side: 'right', collapsed: true,
                    status: 'ready', author: 'human', is_pinned: true, border_color: '#ef4444',
                    math_symbols: [{symbol: 'x', definition: 'Новое определение'}]});
                BlockDOMRenderer.renderAll();
                ModeManager.setMode('ai', false);
                ModeManager.setMode('manual', false);
                const checkbox = document.getElementById('toggle-autofill-step');
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change'));
                document.getElementById('blocks-container').classList.remove('mode-no-dialectics');
                BlockDOMRenderer.renderAll();
                const hint = document.querySelector('.dialectics-hint-block');
                BlockDOMRenderer.renderAll();
                const elapsed = performance.now() - start;
                await settle();
                const card = document.getElementById('b10');
                return {...compare(before), elapsed, selection: getSelection().toString(),
                    reading: reader.classList.contains('reading-centered'),
                    expanded: reader.querySelector('[data-type="hidden-phrase"]').classList.contains('is-expanded'),
                    title: card.querySelector('.block-title').textContent, side: card.classList.contains('block-right'),
                    collapsed: card.querySelector('.block-content').style.display === 'none',
                    pinned: card.querySelector('.btn-pin-toggle').getAttribute('aria-pressed'),
                    status: card.querySelector('.block-status-dot').dataset.status,
                    author: card.querySelector('.block-author-select').value, color: card.style.borderLeftColor,
                    sameHint: hint === document.querySelector('.dialectics-hint-block')};
            });
            preserved(result);
            assert.equal(result.selection, 'Текст для выделения');
            for (const key of ['reading', 'expanded', 'side', 'collapsed', 'sameHint']) assert.equal(result[key], true, key);
            assert.equal(result.title, 'Новый заголовок');
            assert.equal(result.pinned, 'true');
            assert.equal(result.status, 'ready');
            assert.equal(result.author, 'human');
            assert.equal(result.color, 'rgb(239, 68, 68)');
            t.diagnostic(`450-formula note: metadata and mode changes took ${result.elapsed.toFixed(0)} ms; zero formula decorations.`);
        });
        await t.test('cancelling an editor preserves the canvas and stored text', async () => {
            const result = await page.evaluate(async () => {
                const html = AppState.getBlock('b1').html;
                EditorManager.openModalEditor('b1', document.getElementById('b1'));
                EditorManager.currentEditor.commands.setContent('<p>Отменённый текст</p>');
                const before = capture();
                EditorManager.closeModal(false);
                await settle();
                return {...compare(before), sameHtml: AppState.getBlock('b1').html === html};
            });
            preserved(result);
            assert.equal(result.sameHtml, true);
        });
        await t.test('table folds, badges, definitions and autosave defaults do not rebuild formulas', async () => {
            const result = await page.evaluate(async () => {
                const before = capture();
                document.querySelector('#b5 .table-fold-toggle').click();
                AppState.updateBlock('b5', {sources: [{title: 'Источник', url: 'https://example.com'}],
                    stickers: [{id: 's', text: 'Заметка'}], math_number_definitions: [],
                    generation_data: {report: 'Метаданные генерации'}});
                AppState.updateNote({dictionary: [{word: 'Слово', definition: 'Определение'}],
                    math_symbols: [{symbol: 'x', definition: 'Общее определение'}]});
                BlockDOMRenderer.renderAll();
                const payload = JSON.parse(JSON.stringify(AppState.currentNote));
                AppState.acceptSaved(AppState.currentNote, {content_json: payload.blocks.map(block => ({...block,
                    sourceGoal: block.sourceGoal || null, sourceTitle: block.sourceTitle || null,
                    shapesData: block.shapesData || null, request_document: block.request_document || null,
                    attached_conspects: block.attached_conspects || [], isDraft: false}))}, payload);
                BlockDOMRenderer.renderAll();
                const folded = document.querySelector('#b5 .table-fold-body').hidden;
                AppState.updateBlock('b5', {collapsed_tables: []});
                BlockDOMRenderer.renderAll();
                const expanded = !document.querySelector('#b5 .table-fold-body').hidden;
                document.querySelector('#b5 .table-fold-toggle').click();
                await settle();
                return {...compare(before), folded, expanded, foldedAgain: document.querySelector('#b5 .table-fold-body').hidden,
                    source: document.querySelector('#b5 .sources-badge').textContent,
                    sticker: document.querySelector('#b5 .sticker-badge').textContent,
                    dictionary: [...document.querySelectorAll('.dict-badge')].map(badge => badge.textContent)};
            });
            preserved(result);
            assert.equal(result.folded, true);
            assert.equal(result.expanded, true);
            assert.equal(result.foldedAgain, true);
            assert.equal(result.source, '1');
            assert.equal(result.sticker, '1');
            assert.deepEqual(result.dictionary, Array(30).fill('1'));
        });
        await t.test('reordering from the TOC and canvas keeps controls bound to current blocks', async () => {
            const result = await page.evaluate(async () => {
                const before = capture();
                TOCManager.render();
                const target = document.querySelector('.toc-item[data-id="b0"]');
                const dataTransfer = new DataTransfer();
                dataTransfer.setData('text/plain', 'b29');
                target.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true,
                    dataTransfer, clientY: target.getBoundingClientRect().top}));
                const first = AppState.currentNote.blocks[0].id;
                const dragged = document.getElementById('b10');
                window._draggedBlock = dragged;
                const indicator = document.createElement('div');
                indicator.className = 'drop-indicator';
                document.getElementById('blocks-container').append(indicator);
                BlockDnDManager.handleDrop({preventDefault() {}, clientX: 0});
                BlockDnDManager.handleDragEnd({target: dragged});
                // This card was retained through two bulk changes. Its closure
                // must read the current ready/pinned/collapsed state.
                dragged.querySelector('.block-status-dot').click();
                dragged.querySelector('.btn-pin-toggle').click();
                dragged.querySelector('.btn-collapse-toggle').click();
                await settle();
                return {...compare(before), first, side: AppState.getBlock('b10').side,
                    status: AppState.getBlock('b10').status, pinned: AppState.getBlock('b10').is_pinned,
                    collapsed: AppState.getBlock('b10').collapsed};
            });
            preserved(result);
            assert.equal(result.first, 'b29');
            assert.equal(result.side, 'left');
            assert.equal(result.status, 'in_progress');
            assert.equal(result.pinned, false);
            assert.equal(result.collapsed, false);
        });
        await t.test('adding, removing, editing and undoing rebuild only affected content', async () => {
            const result = await page.evaluate(async () => {
                const before = capture();
                AppState.addBlock({id: 'new', side: 'left', title: 'Новый блок', html: '<p>Новый текст</p>'}, 2);
                BlockDOMRenderer.renderAll();
                document.querySelector('#new .btn-delete').click();
                AppState.updateBlock('b2', {html: '<p>Изменён только этот блок</p>'});
                BlockDOMRenderer.renderAll();
                document.querySelector('#b2 .btn-block-undo').click();
                await settle();
                const otherCards = before.cards.filter(card => card.id !== 'b2');
                return {sameCards: otherCards.every(card => document.getElementById(card.id) === card),
                    renders: window.renders, restored: AppState.getBlock('b2').html.includes('formula='),
                    removed: !AppState.getBlock('new'), sameOverlay: before.overlay === document.querySelector('.pinned-derivations')};
            });
            assert.equal(result.sameCards, true);
            assert.equal(result.sameOverlay, true);
            assert.equal(result.restored, true);
            assert.equal(result.removed, true);
            assert(result.renders <= 30, `Only the restored card's 15 formulas need decoration, got ${result.renders}`);
        });
        await t.test('reordering and deleting a formula source refresh dependent hints in retained cards', async () => {
            const result = await page.evaluate(async () => {
                const math = formula => `<p><span class="math-inline" formula="${formula}">y</span></p>`;
                AppState.setNote({id: 3, blocks: [
                    {id: 'source', html: math('y=a+b')},
                    {id: 'result', html: math('y=0.1+0.2=0.3')},
                    {id: 'unrelated', html: math('u+v')},
                ]});
                BlockDOMRenderer.renderAll();
                await settle();
                const card = document.getElementById('result');
                const otherFormula = document.querySelector('#unrelated .katex');
                const count = () => card.querySelectorAll('[data-math-value]').length;
                const initial = count();
                const [source, example, unrelated] = AppState.currentNote.blocks;
                AppState.updateNote({blocks: [example, source, unrelated]});
                BlockDOMRenderer.renderAll();
                await settle();
                const beforeSource = count();
                AppState.updateNote({blocks: [source, example, unrelated]});
                BlockDOMRenderer.renderAll();
                await settle();
                const afterSource = count();
                document.querySelector('#source .btn-delete').click();
                await settle();
                return {initial, beforeSource, afterSource, deletedSource: count(),
                    sameCard: card === document.getElementById('result'),
                    sameOtherFormula: otherFormula === document.querySelector('#unrelated .katex')};
            });
            assert.equal(result.initial, 3);
            assert.equal(result.beforeSource, 1);
            assert.equal(result.afterSource, 3);
            assert.equal(result.deletedSource, 1);
            assert.equal(result.sameCard, true);
            assert.equal(result.sameOtherFormula, true);
        });
        await t.test('a new document with the same block id gets new handlers and content', async () => {
            const result = await page.evaluate(async () => {
                const oldCard = document.getElementById('b0');
                AppState.setNote({id: 2, blocks: [{id: 'b0', title: 'Другой документ', html: '<p>Другой текст</p>', status: 'ready'}]});
                BlockDOMRenderer.renderAll();
                document.querySelector('#b0 .block-status-dot').click();
                await settle();
                return {replaced: document.getElementById('b0') !== oldCard,
                    title: document.querySelector('#b0 .block-title').textContent, status: AppState.getBlock('b0').status};
            });
            assert.equal(result.replaced, true);
            assert.equal(result.title, 'Другой документ');
            assert.equal(result.status, 'in_progress');
        });
        assert.deepEqual(errors, []);
    } finally {await browser.close();}
});
