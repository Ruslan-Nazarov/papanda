const {test} = require('node:test');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const {source} = require('../frontend/helpers.cjs');

test('isolated renderer security regressions', async t => {
    const browser = await puppeteer.launch({headless: true});
    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => request.abort());
        await page.setContent('<!doctype html><html><body></body></html>');
        await page.evaluate(() => {
            window.t = key => key;
            window.ALGORITHM_STEPS = [];
            window.BlockMathRenderer = {renderMath() {}};
            window.AppState = {currentNote: {blocks: []}, updateBlock() {}};
        });
        await page.addScriptTag({content: source('BlockNormalBuilder')});
        await t.test('section title must remain text', {todo: 'F01 / R1: title interpreted as HTML'}, async () => {
            const count = await page.evaluate(() => {
                const el = BlockNormalBuilder.build({
                    id: 'title-test', role: 'section', title: '<img src="blocked">',
                }, () => {});
                return el.querySelectorAll('h2 img').length;
            });
            assert.equal(count, 0);
        });
        await t.test('hint attribute must not become active HTML', {todo: 'F01 / R1: hint reinterpreted as HTML'}, async () => {
            const count = await page.evaluate(() => {
                const container = document.createElement('div');
                const phrase = document.createElement('span');
                phrase.setAttribute('data-type', 'hidden-phrase');
                phrase.setAttribute('data-hint', '<img src="blocked" onerror="window.untrusted=1">');
                container.appendChild(phrase);
                BlockNormalBuilder.setupHiddenPhrases(container);
                return container.querySelectorAll('.hp-content img').length;
            });
            assert.equal(count, 0);
        });
    } finally {
        await browser.close();
    }
});
