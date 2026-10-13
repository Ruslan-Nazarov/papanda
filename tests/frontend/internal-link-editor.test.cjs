const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');
const {JSDOM} = require('jsdom');

test('editor keeps internal links on selected text and inserts one without selection', () => {
    const dom = new JSDOM('<html><body><div id="editor"></div></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.requestAnimationFrame = callback => setTimeout(callback, 0);
    const entry = path.resolve(__dirname, '../../fastapi_app/static/js/notes/EditorTiptapSetup.js');
    const bundle = esbuild.buildSync({entryPoints: [entry], bundle: true, platform: 'node',
        format: 'cjs', write: false});
    const compiled = new Module(entry, module);
    compiled.filename = entry;
    compiled.paths = module.paths;
    compiled._compile(bundle.outputFiles[0].text, entry);
    const {EditorTiptapSetup} = compiled.exports;
    const editor = EditorTiptapSetup.createEditor(document.getElementById('editor'), '<p>ЭКГ</p>', false);
    const url = 'internal://note/1/block/2';
    editor.commands.setTextSelection({from: 1, to: 4});
    assert.equal(editor.chain().focus().setLink({href: url}).run(), true);
    assert.match(editor.getHTML(), /href="internal:\/\/note\/1\/block\/2">ЭКГ<\/a>/);
    editor.commands.setTextSelection(4);
    assert.equal(editor.chain().focus().insertContent({type: 'text', text: ' прибор',
        marks: [{type: 'link', attrs: {href: url}}]}).run(), true);
    assert.match(editor.getHTML(), /href="internal:\/\/note\/1\/block\/2"/);
    const savedHtml = editor.getHTML();
    editor.destroy();
    const reopened = EditorTiptapSetup.createEditor(document.getElementById('editor'), savedHtml, false);
    assert.match(reopened.getHTML(), /href="internal:\/\/note\/1\/block\/2"/);
    reopened.destroy();
    dom.window.close();
});

test('editor retains multiple destinations on one selected text after reopening', () => {
    const dom = new JSDOM('<html><body><div id="editor"></div></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.Node = dom.window.Node;
    global.requestAnimationFrame = callback => setTimeout(callback, 0);
    const entry = path.resolve(__dirname, '../../fastapi_app/static/js/notes/EditorTiptapSetup.js');
    const bundle = esbuild.buildSync({entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', write: false});
    const compiled = new Module(entry, module);
    compiled.filename = entry;
    compiled.paths = module.paths;
    compiled._compile(bundle.outputFiles[0].text, entry);
    const editor = compiled.exports.EditorTiptapSetup.createEditor(document.getElementById('editor'), '<p>ЭКГ</p>', false);
    const targets = [
        {url: 'internal://note/1', text: 'ЭКГ', label: 'ЭКГ'},
        {url: 'internal://note/2/block/3', text: 'Блок', label: 'ЭКГ 2 → Блок'}
    ];
    editor.commands.setTextSelection({from: 1, to: 4});
    assert.equal(editor.chain().focus().setLink({href: targets[0].url, targets}).run(), true);
    const html = editor.getHTML();
    assert.match(html, /data-internal-links=/);
    editor.destroy();
    const reopened = compiled.exports.EditorTiptapSetup.createEditor(document.getElementById('editor'), html, false);
    reopened.commands.setTextSelection(2);
    assert.deepEqual(JSON.parse(JSON.stringify(reopened.getAttributes('link').targets)), targets);
    reopened.destroy();
    dom.window.close();
});
