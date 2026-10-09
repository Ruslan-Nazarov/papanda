const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

test('real drawing and text editor regression checks', async t => {
    const bundle = await esbuild.build({stdin: {contents: `
        import {EditorShapesTab} from './fastapi_app/static/js/notes/EditorShapesTab.js';
        import {EditorTiptapSetup} from './fastapi_app/static/js/notes/EditorTiptapSetup.js';
        import AppState from './fastapi_app/static/js/notes/AppState.js';
        import {ActiveSelection} from 'fabric';
        window.widgets = {EditorShapesTab, EditorTiptapSetup, AppState, ActiveSelection};`,
        resolveDir: path.resolve(__dirname, '../..')}, bundle: true, write: false, format: 'iife'});
    const browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.setRequestInterception(true);
        page.on('request', request => /^https?:/.test(request.url()) ? request.abort() : request.continue());
        await page.setContent('<div id="modal" style="width:580px"><div id="tab-shapes">' +
            '<canvas id="shapes-canvas"></canvas>' + ['add-rect', 'add-circle', 'shape-undo', 'shape-copy',
                'shape-delete', 'shape-lock', 'clear-canvas', 'shape-grid'].map(id => `<button id="btn-${id}"></button>`).join('') +
            '<input id="shape-color-fill" type="color"><input id="shape-color-stroke" type="color">' +
            '<input id="shape-stroke-width" type="range"></div></div><div id="text"></div>');
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(() => {
            widgets.AppState.setNote({blocks: [{id:'drawing'}]});
            window.tab = new widgets.EditorShapesTab(document.getElementById('modal'), 'drawing', () => null);
            tab.init();
        });
        await t.test('one undo reverses color change and preserves the shape', async () => {
            await page.click('#btn-add-rect');
            await page.evaluate(() => {
                tab.fabricCanvas.setActiveObject(tab.fabricCanvas.getObjects()[0]);
                const input = document.getElementById('shape-color-fill');
                input.value = '#ff0000'; input.dispatchEvent(new Event('change', {bubbles:true}));
            });
            assert.equal(await page.evaluate(() => JSON.parse(tab.getJSON()).objects[0].fill), '#ff0000');
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.deepEqual(await page.evaluate(() => JSON.parse(tab.getJSON()).objects.map(o => o.fill)), ['transparent']);
        });
        await t.test('duplicate and clear are each one undo operation', async () => {
            await page.evaluate(() => tab.fabricCanvas.setActiveObject(tab.fabricCanvas.getObjects()[0]));
            await page.click('#btn-shape-copy');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 2);
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 1);
            await page.click('#btn-add-circle');
            await page.click('#btn-clear-canvas');
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 2);
        });
        await t.test('selected shapes copy individually and undo multi-delete atomically', async () => {
            const selectAll = () => page.evaluate(() => {
                tab.fabricCanvas.setActiveObject(new widgets.ActiveSelection(tab.fabricCanvas.getObjects(), {canvas: tab.fabricCanvas}));
            });
            await selectAll();
            await page.click('#btn-shape-copy');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 4);
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 2);
            await selectAll();
            await page.click('#btn-shape-delete');
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 0);
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects().length), 2);
        });
        await t.test('locking survives serialization, reopening and undo', async () => {
            await page.evaluate(() => tab.fabricCanvas.setActiveObject(tab.fabricCanvas.getObjects()[0]));
            await page.click('#btn-shape-lock');
            assert.equal(await page.evaluate(() => JSON.parse(tab.getJSON()).objects[0].lockMovementX), true);
            const data = await page.evaluate(() => tab.getJSON());
            await page.click('#btn-shape-undo');
            await page.evaluate(() => tab.ready);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects()[0].lockMovementX), false);
            await page.evaluate(data => tab.fabricCanvas.loadFromJSON(data), data);
            assert.equal(await page.evaluate(() => tab.fabricCanvas.getObjects()[0].lockMovementX), true);
        });
        await t.test('numbered lists, formatting, undo and redo survive the real editor', async () => {
            const result = await page.evaluate(() => {
                const editor = widgets.EditorTiptapSetup.createEditor(document.getElementById('text'),
                    '<ol start="3"><li><p>First</p></li><li><p>Second</p></li></ol>');
                const initial = editor.getHTML();
                editor.commands.selectAll(); editor.commands.toggleBold();
                const bold = editor.getHTML();
                editor.commands.undo(); const undone = editor.getHTML();
                editor.commands.redo(); const redone = editor.getHTML();
                editor.destroy();
                return {initial, bold, undone, redone};
            });
            assert.match(result.initial, /<ol start="3">/);
            assert.match(result.bold, /<strong>First<\/strong>/);
            assert.equal(result.undone, result.initial);
            assert.equal(result.redone, result.bold);
        });
        assert.deepEqual(errors, []);
    } finally {await browser.close();}
});
