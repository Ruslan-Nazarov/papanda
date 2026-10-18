const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('streamed dialogs preserve rendered math and stay responsive while typing', {timeout: 60_000}, async t => {
    const root = path.resolve(__dirname, '../..');
    const bundle = await esbuild.build({stdin: {contents: `
        import StreamMarkdownRenderer from './fastapi_app/static/js/notes/StreamMarkdownRenderer.js';
        import PasteMathTransformer from './fastapi_app/static/js/notes/PasteMathTransformer.js';
        import {renderStreamMarkdown} from './fastapi_app/static/js/notes/ConceptExplainManager.js';
        import ConceptSelectionMenu from './fastapi_app/static/js/notes/ConceptSelectionMenu.js';
        import AICheckModalService from './fastapi_app/static/js/notes/AICheckModalService.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import NotesAPI from './fastapi_app/static/js/notes/api.js';
        import MathSubstitutions from './fastapi_app/static/js/notes/MathSubstitutions.js';
        import katex from 'katex';
        import renderMathInElement from 'katex/contrib/auto-render';
        Object.assign(window, {StreamMarkdownRenderer, PasteMathTransformer, renderStreamMarkdown,
            ConceptSelectionMenu, AICheckModalService, AppState, NotesAPI, MathSubstitutions,
            katex, renderMathInElement});`, resolveDir: root},
        bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setContent('<!doctype html><html><body><div id="answer"></div><div id="reference"></div>'
            + '<div class="dialectics-block" data-id="block"><div class="block-title">Вычисления</div>'
            + '<div class="block-content">Вероятность</div></div></body></html>');
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            window.parseCount = 0;
            const transform = PasteMathTransformer.transformTextToHTML.bind(PasteMathTransformer);
            PasteMathTransformer.transformTextToHTML = text => {parseCount++; return transform(text);};
            window.renderCount = 0;
            const render = katex.render.bind(katex);
            katex.render = (...args) => {renderCount++; return render(...args);};
            window.noteRefreshes = 0;
            const refresh = MathSubstitutions.refresh.bind(MathSubstitutions);
            MathSubstitutions.refresh = target => {if (target === document) noteRefreshes++; return refresh(target);};
        });

        await t.test('coalesces bursts and reuses completed paragraphs instead of rendering their formulas again', async () => {
            const result = await page.evaluate(async () => {
                const target = document.getElementById('answer');
                const paragraphs = Array.from({length: 30}, (_, i) => `Абзац ${i}: $x_${i}=a^2+b^2$.`).join('\n\n');
                const renderer = new StreamMarkdownRenderer(target);
                renderer.update(paragraphs);
                // Measure updates only after the initial render has completed;
                // a fixed delay includes unfinished initial work on slower hosts.
                const deadline = performance.now() + 5000;
                while (renderer.parts.length === 0 || renderer.painting || renderer.timer != null) {
                    if (performance.now() > deadline) throw new Error('Initial stream render timed out');
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
                const first = target.querySelector('.katex');
                const before = renderCount, parsesBefore = parseCount;
                for (let i = 1; i <= 200; i++) renderer.update(paragraphs + '\n\nНовый текст: ' + 'а'.repeat(i));
                await renderer.finish(paragraphs + '\n\nНовый текст: готово.');
                const incrementalRenders = renderCount - before;
                const parses = parseCount - parsesBefore;
                const same = first === target.querySelector('.katex');
                const oldStart = renderCount;
                const start = performance.now();
                for (let i = 0; i < 10; i++) renderStreamMarkdown(document.getElementById('reference'),
                    paragraphs + '\n\nНовый текст: ' + i);
                return {same, parses, incrementalRenders, oldRenders: renderCount - oldStart,
                    oldDuration: performance.now() - start, finalText: target.textContent,
                    formulas: target.querySelectorAll('.katex').length, noteRefreshes};
            });
            assert.equal(result.same, true);
            assert.equal(result.incrementalRenders, 0);
            assert.equal(result.parses, 1);
            assert.equal(result.formulas, 30);
            assert.match(result.finalText.trim(), /Новый текст: готово\.$/);
            assert.equal(result.noteRefreshes, 0);
            assert.equal(result.oldRenders, 300);
            t.diagnostic(`Unchanged formulas: ${result.oldRenders} renders in the previous path (${result.oldDuration.toFixed(0)} ms), ${result.incrementalRenders} in the incremental path.`);
        });

        await t.test('unfinished math, tables, code and references recover to the complete safe Markdown', async () => {
            const result = await page.evaluate(async () => {
                const target = document.getElementById('answer');
                const renderer = new StreamMarkdownRenderer(target);
                const text = '**Ответ**\n\n\\[x=\\frac{a}{b}\\]\n\n'
                    + '| Переменная | Значение |\n|---|---|\n| $x_i$ | 2 |\n\n'
                    + '```tex\n$raw$\n```\n\n[Источник][ref]\n\n[ref]: https://example.com\n\n'
                    + '<img src=x onerror="window.attacked=true">';
                renderer.update(text.slice(0, text.indexOf('\\]')));
                await new Promise(resolve => setTimeout(resolve, 150));
                await renderer.finish(text);
                renderStreamMarkdown(document.getElementById('reference'), text);
                const summary = root => ({formulas: [...root.querySelectorAll('annotation')].map(node => node.textContent),
                    code: root.querySelector('code').textContent, link: root.querySelector('a').href,
                    table: root.querySelectorAll('td .katex').length, bold: root.querySelector('strong').textContent});
                return {actual: summary(target), expected: summary(document.getElementById('reference')),
                    unsafe: !!target.querySelector('script, [onerror]'), attacked: !!window.attacked,
                    mathErrors: target.querySelectorAll('.katex-error, .katex .katex').length};
            });
            assert.deepEqual(result.actual, result.expected);
            assert.equal(result.unsafe, false);
            assert.equal(result.attacked, false);
            assert.equal(result.mathErrors, 0);
        });

        await t.test('typing a follow-up during a long What is this answer defers work and keeps the draft and focus', async () => {
            await page.evaluate(async () => {
                AppState.setNote({id: 1, title: 'Тема', blocks: []});
                ConceptSelectionMenu._context = async () => [];
                NotesAPI.stream = (_path, _payload, delta, _event, {signal}) => new Promise((resolve, reject) => {
                    const base = Array.from({length: 60}, (_, i) => `Формула ${i}: $x_${i}=a^2+b^2$.`).join('\n\n');
                    let n = 0;
                    const timer = setInterval(() => {
                        const text = base + '\n\nОтвет: ' + 'продолжение '.repeat(++n);
                        delta('', text);
                        if (n === 100) {clearInterval(timer); resolve(text + 'Готово.');}
                    }, 10);
                    signal.addEventListener('abort', () => {clearInterval(timer); reject(new DOMException('Cancelled', 'AbortError'));}, {once: true});
                });
                await ConceptSelectionMenu._explain('Вероятность', document.querySelector('.dialectics-block'));
                window.parsesAtTyping = parseCount;
            });
            const draft = 'Следующий вопрос о формулах и вычислениях';
            await page.type('.concept-explain-input', draft, {delay: 8});
            const typing = await page.evaluate(() => ({
                parses: parseCount - parsesAtTyping,
                value: document.querySelector('.concept-explain-input').value,
                focused: document.activeElement.matches('.concept-explain-input'),
                busy: document.querySelector('.concept-explain-send').disabled,
            }));
            assert.equal(typing.value, draft);
            assert.equal(typing.focused, true);
            assert.equal(typing.busy, true);
            assert.equal(typing.parses, 0, 'no Markdown/math work runs between continuous keystrokes');
            await page.waitForFunction(() => !document.querySelector('.concept-explain-send').disabled);
            assert.equal(await page.$eval('.concept-explain-input', input => input.value), draft);
            assert.equal(await page.$$eval('.concept-explain-answer .katex', nodes => nodes.length), 60);
            assert.match(await page.$eval('.concept-explain-answer', node => node.textContent.trim()), /Готово\.$/);
            await page.click('.modal-overlay .btn-close-modal');
        });

        await t.test('AI check prevents duplicate requests and aborts both pending rendering and the stream on close', async () => {
            await page.evaluate(async () => {
                AppState.setNote({id: 1, blocks: [{id: 'check', title: 'Блок', html: '<p>Текст</p>'}]});
                window.requests = 0;
                NotesAPI.stream = (_path, _payload, delta, _event, {signal}) => new Promise((resolve, reject) => {
                    requests++;
                    window.checkSignal = signal;
                    delta('', '$x_i=a^2$');
                    signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), {once: true});
                });
                await AICheckModalService.show('check');
                document.querySelector('#ai-check-query-input').value = 'Следующий вопрос';
                document.querySelector('#ai-check-query-input').dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
                window.parsesAtClose = parseCount;
                document.querySelector('.ai-check-modal .btn-close-modal').click();
            });
            await new Promise(resolve => setTimeout(resolve, 250));
            assert.deepEqual(await page.evaluate(() => ({requests, aborted: checkSignal.aborted,
                parsed: parseCount - parsesAtClose, closed: !document.querySelector('.ai-check-modal')})),
            {requests: 1, aborted: true, parsed: 0, closed: true});
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
