const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

const markdown = [
    '# Закон движения',
    '',
    'Первый абзац с $F=ma$ и суммой $10 and $20.',
    '',
    'Второй абзац.',
    '',
    '- Первая строка',
    '- Вторая строка',
    '',
    '$$E=mc^2$$',
    '',
    '| Величина | Значение |',
    '| --- | --- |',
    '| Масса | $m=2$ |',
    '| Сила | 4 Н |',
    '',
    'Код: `$100$`.',
].join('\n');
const katex = formula => `<span class="katex"><span class="katex-mathml"><math><semantics><mrow></mrow><annotation encoding="application/x-tex">`
    + formula + `</annotation></semantics></math></span><span class="katex-html">rendered</span></span>`;
const html = `<h1>Закон движения</h1><p>Первый абзац с ` + katex('F=ma') + ` и суммой $10 and $20.</p>`
    + `<p>Второй абзац.</p><ul><li>Первая строка</li><li>Вторая строка</li></ul>`
    + `<p><span class="katex-display">` + katex('E=mc^2') + `</span></p>`
    + `<table><thead><tr><th>Величина</th><th>Значение</th></tr></thead>`
    + `<tbody><tr><td>Масса</td><td>$m=2$</td></tr><tr><td>Сила</td><td>4 Н</td></tr></tbody></table>`
    + `<p>Код: <code>$100$</code>.</p><script>window.clipboardExecuted=true</script>`
    + `<img src="bad" onerror="window.clipboardExecuted=true">`;

test('rich clipboard blocks survive editor HTML round trip and Markdown export', async t => {
    const bundle = await esbuild.build({stdin: {contents:
        "import {EditorTiptapSetup} from './fastapi_app/static/js/notes/EditorTiptapSetup.js';" +
        "import NoteExportService from './fastapi_app/static/js/notes/NoteExportService.js';" +
        "import AppState from './fastapi_app/static/js/notes/AppState.js';" +
        "import NotesAPI from './fastapi_app/static/js/notes/api.js';" +
        "import NoteStorageService from './fastapi_app/static/js/notes/NoteStorageService.js';" +
        "import FormulaModalService from './fastapi_app/static/js/notes/FormulaModalService.js';" +
        "window.pasteTest = {EditorTiptapSetup, NoteExportService, AppState, NotesAPI, NoteStorageService, FormulaModalService};",
    resolveDir: path.resolve(__dirname, '../..')}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        await page.setContent('<div id="editor"></div><div id="reopened"></div>');
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        for (const [kind, payload] of [['text', markdown], ['html', html]]) {
            await t.test(kind + ' clipboard', async () => {
                await page.evaluate(() => {
                    document.getElementById('editor').innerHTML = '';
                    window.currentPasteEditor?.destroy();
                    window.currentPasteEditor = pasteTest.EditorTiptapSetup.createEditor(
                        document.getElementById('editor'), '', false);
                    currentPasteEditor.commands.focus();
                });
                await page.evaluate(({kind, payload}) => {
                    const data = new DataTransfer();
                    data.setData(kind === 'html' ? 'text/html' : 'text/plain', payload);
                    const event = new ClipboardEvent('paste', {bubbles: true, cancelable: true, clipboardData: data});
                    currentPasteEditor.view.dom.dispatchEvent(event);
                }, {kind, payload});
                const state = await page.evaluate(async () => {
                    const saved = currentPasteEditor.getHTML();
                    const rows = [...currentPasteEditor.view.dom.querySelectorAll('table tr')]
                        .map(row => [...row.children].map(cell => cell.textContent));
                    currentPasteEditor.destroy();
                    pasteTest.AppState.setNote({id: 1, revision: 1, title: 'Проверка',
                        blocks: [{id: 'paste', title: 'Блок', html: ''}]});
                    pasteTest.AppState.updateBlock('paste', {html: saved});
                    let stored;
                    pasteTest.NotesAPI.updateNote = async (id, payload) => {
                        stored = JSON.parse(JSON.stringify(payload));
                        return {id, revision: payload.revision + 1, content_json: stored.blocks, ...stored};
                    };
                    await pasteTest.NoteStorageService.saveCurrentNote();
                    pasteTest.AppState.setNote({id: 1, revision: 2, ...stored});
                    const persisted = pasteTest.AppState.getBlock('paste').html;
                    window.currentPasteEditor = pasteTest.EditorTiptapSetup.createEditor(
                        document.getElementById('reopened'), persisted, false);
                    const reopened = currentPasteEditor.getHTML();
                    const md = pasteTest.NoteExportService.buildMarkdown({
                        title: 'Проверка', blocks: [{title: 'Блок', html: reopened}],
                    });
                    return {saved, reopened, rows, md, editable: currentPasteEditor.view.dom.querySelector('td p')?.getAttribute('contenteditable'),
                        formulas: [...currentPasteEditor.view.dom.querySelectorAll('.math-inline')]
                            .map(el => el.getAttribute('data-formula')),
                        paragraphs: currentPasteEditor.view.dom.querySelectorAll('p').length,
                        listItems: currentPasteEditor.view.dom.querySelectorAll('li').length,
                        scriptRan: window.clipboardExecuted === true,
                        unsafeAttributes: /onerror|<script/i.test(saved)};
                });
                assert.deepEqual(state.rows, [['Величина', 'Значение'], ['Масса', 'm=2'], ['Сила', '4 Н']]);
                assert.deepEqual(state.formulas, ['F=ma', 'E=mc^2', 'm=2']);
                assert.equal(state.listItems, 2);
                assert(state.paragraphs >= 5);
                assert.match(state.reopened, /<table/);
                assert.match(state.md, /\| Величина \| Значение \|/);
                assert.match(state.md, /\| Масса \| \$m=2\$ \|/);
                assert.match(state.md, /\$\$\nE=mc\^2\n\$\$/);
                assert.match(state.md, /\$10 and \$20/);
                assert.match(state.md, /`\$100\$`/);
                assert.equal(state.scriptRan, false);
                assert.equal(state.unsafeAttributes, false);
                await page.evaluate(() => {
                    pasteTest.FormulaModalService.open = async ({initialFormula}) =>
                        initialFormula === 'F=ma' ? 'F=ma+1' : initialFormula;
                });
                await page.click('#reopened .math-inline-rendered');
                await page.waitForFunction(() => currentPasteEditor.getHTML().includes('F=ma+1'));
                // The table is still a real editor table after reopening.
                await page.click('#reopened table tr:last-child td:last-child');
                await page.keyboard.type('!');
                const edited = await page.evaluate(() => {
                    const changed = currentPasteEditor.getHTML();
                    currentPasteEditor.commands.undo();
                    const undone = currentPasteEditor.getHTML();
                    currentPasteEditor.commands.redo();
                    const redone = currentPasteEditor.getHTML();
                    currentPasteEditor.destroy();
                    window.currentPasteEditor = pasteTest.EditorTiptapSetup.createEditor(
                        document.getElementById('reopened'), redone, false);
                    return {changed, undone, redone, reopened: currentPasteEditor.getHTML()};
                });
                assert.match(edited.changed, /!/);
                assert.doesNotMatch(edited.undone, /!/);
                assert.match(edited.redone, /!/);
                assert.match(edited.reopened, /!/);
            });
        }
    } finally {
        await browser.close();
    }
});
