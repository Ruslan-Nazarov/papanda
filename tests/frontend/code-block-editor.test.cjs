const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const {JSDOM} = require('jsdom');

const bundle = esbuild.buildSync({stdin: {
    contents: "import {EditorTiptapSetup} from './fastapi_app/static/js/notes/EditorTiptapSetup.js'; window.EditorTiptapSetup = EditorTiptapSetup;",
    resolveDir: path.resolve(__dirname, '../..'),
}, bundle: true, write: false, format: 'iife'}).outputFiles[0].text;

function editorDom() {
    const dom = new JSDOM('<div id="editor"></div>', {runScripts: 'outside-only', pretendToBeVisual: true});
    dom.window.Range.prototype.getClientRects = () => [];
    dom.window.Range.prototype.getBoundingClientRect = () => ({left: 0, right: 0, top: 0, bottom: 0});
    dom.window.eval(bundle);
    return dom;
}

test('selected code lines become one editable code block', () => {
    const dom = editorDom();
    const editor = dom.window.EditorTiptapSetup.createEditor(dom.window.document.getElementById('editor'),
        '<p>#include &lt;stdint.h&gt;</p><p>// Кадр АЦП</p><p>int32_t decode() {</p><p>    return 1;</p><p>}</p>', false);
    editor.commands.selectAll();
    const before = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n');
    dom.window.EditorTiptapSetup.toggleCodeBlock(editor);
    assert.equal(editor.state.doc.firstChild.type.name, 'codeBlock', editor.getHTML());
    assert.equal([...editor.state.doc.content.content].filter(node => node.type.name === 'codeBlock').length, 1);
    assert.equal(editor.state.doc.firstChild.textContent, before);
    editor.destroy();
    dom.window.close();
});

test('adjacent code blocks from older edits reopen as one block', () => {
    const dom = editorDom();
    const editor = dom.window.EditorTiptapSetup.createEditor(dom.window.document.getElementById('editor'),
        '<pre><code>#include &lt;stdint.h&gt;</code></pre><pre><code>// Кадр АЦП</code></pre>'
        + '<pre><code>int32_t decode()</code></pre>', false);
    assert.equal(editor.state.doc.childCount, 1, editor.getHTML());
    assert.equal(editor.state.doc.firstChild.textContent, '#include <stdint.h>\n// Кадр АЦП\nint32_t decode()');
    editor.destroy();
    dom.window.close();
});
