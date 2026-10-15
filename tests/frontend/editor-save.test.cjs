const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const {JSDOM} = require('jsdom');

const bundle = esbuild.buildSync({stdin: {contents: `
    import EditorManager from './fastapi_app/static/js/notes/EditorManager.js';
    import AppState from './fastapi_app/static/js/notes/AppState.js';
    import BlockDOMRenderer from './fastapi_app/static/js/notes/BlockDOMRenderer.js';
    window.fixture = {EditorManager, AppState, BlockDOMRenderer};`,
    resolveDir: path.resolve(__dirname, '../..')}, bundle: true, write: false, format: 'iife'}).outputFiles[0].text;

test('OK saves a block with numeric formulas and an archived variant, and it reopens intact', async () => {
    const dom = new JSDOM('<div id="modal-container"></div><div id="block"></div>',
        {url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true});
    dom.window.eval(bundle);
    const {EditorManager, AppState} = dom.window.fixture;
    const formulas = ['1', '-1', '0', '0.90', '+2', 'true', 'false', 'h_t'];
    try {
        AppState.setNote({id: 1, blocks: [{id: 'b', title: 'Prediction',
            html: '<p>State: ' + formulas.map(value => `<span class="math-inline" formula="${value}">${value}</span>`).join(' ') + '</p>',
            rejected_drafts: [{id: 'old', html: '<p>Previous version</p>', reason: '', created_at: '2026-10-14T12:00:00Z'}]}]});
        const open = () => EditorManager.openModalEditor('b', dom.window.document.getElementById('block'));
        open();
        await EditorManager.handleSave();
        assert.equal(EditorManager.session, null, 'OK closes the editor');
        assert.equal(AppState.isDirty, true);
        assert.equal(AppState.getBlock('b').rejected_drafts.length, 1);
        open();
        const actual = [];
        EditorManager.currentEditor.state.doc.descendants(node => {
            if (node.type.name === 'mathInline') actual.push(node.attrs.formula);
        });
        assert.deepEqual(actual, formulas);
        EditorManager.draftArchive.archive();
        assert.equal(EditorManager.draftArchive.drafts.length, 2, 'Rewrite can serialize the same formulas');
        EditorManager.draftArchive.undoArchive();
        await EditorManager.handleSave();
        assert.equal(EditorManager.session, null);
        assert.equal(AppState.getBlock('b').rejected_drafts.length, 1);
    } finally {
        EditorManager.dispose();
        dom.window.close();
    }
});

for (const status of ['in_progress', 'ready']) {
    for (const html of ['<p>Edited text</p>', '<p></p>']) {
        test(`saving ${html === '<p></p>' ? 'empty' : 'nonempty'} content preserves ${status} until the status dot is clicked`, async () => {
            const dom = new JSDOM('<div id="modal-container"></div><div id="blocks-container" class="mode-no-dialectics"></div>',
                {url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true});
            dom.window.ResizeObserver = class {observe() {} disconnect() {}};
            dom.window.eval(bundle);
            const {EditorManager, AppState, BlockDOMRenderer} = dom.window.fixture;
            const document = dom.window.document;
            const dot = () => document.querySelector('[data-id="b"] .block-status-dot');
            const open = () => EditorManager.openModalEditor('b', document.getElementById('b'));
            try {
                AppState.setNote({id: 1, blocks: [{id: 'b', side: 'left', title: 'Block',
                    html: '<p>Original text</p>', status}]});
                BlockDOMRenderer.renderAll();
                assert.equal(dot().dataset.status, status);
                open();
                EditorManager.currentEditor.commands.setContent(html);
                await EditorManager.handleSave();
                assert.equal(AppState.getBlock('b').html, html);
                assert.equal(AppState.getBlock('b').status, status);
                assert.equal(dot().dataset.status, status);

                // Reopening the saved note must keep the same readiness indicator.
                AppState.setNote(JSON.parse(JSON.stringify(AppState.currentNote)));
                BlockDOMRenderer.renderAll();
                assert.equal(dot().dataset.status, status);
                dot().click();
                const next = status === 'ready' ? 'in_progress' : 'ready';
                assert.equal(AppState.getBlock('b').status, next);
                assert.equal(dot().dataset.status, next);
                open();
                await EditorManager.handleSave();
                assert.equal(AppState.getBlock('b').status, next);
                assert.equal(dot().dataset.status, next);
            } finally {
                EditorManager.dispose();
                dom.window.close();
            }
        });
    }
}
