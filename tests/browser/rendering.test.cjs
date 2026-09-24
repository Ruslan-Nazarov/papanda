const {test} = require('node:test');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const path = require('node:path');
const {source} = require('../frontend/helpers.cjs');

test('isolated renderer security regressions', async t => {
    const browser = await puppeteer.launch({headless: true});
    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => request.abort());
        await page.setContent('<!doctype html><html><body></body></html>');
        await page.addScriptTag({path: path.resolve(__dirname, '../../node_modules/dompurify/dist/purify.min.js')});
        await page.addScriptTag({path: path.resolve(__dirname, '../../node_modules/marked/lib/marked.umd.js')});
        await page.addScriptTag({content: source('HtmlSafety')});
        await page.evaluate(() => {
            window.t = key => key;
            window.ALGORITHM_STEPS = [];
            window.BlockMathRenderer = {renderMath() {}};
            window.AppState = {currentNote: {blocks: []}, updateBlock() {}};
        });
        await page.addScriptTag({content: source('BlockNormalBuilder')});
        await t.test('section title must remain text', async () => {
            const count = await page.evaluate(() => {
                const el = BlockNormalBuilder.build({
                    id: 'title-test', role: 'section', title: '<img src="blocked">',
                }, () => {});
                return el.querySelectorAll('h2 img').length;
            });
            assert.equal(count, 0);
        });
        await t.test('hint attribute must not become active HTML', async () => {
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
        await t.test('normal title, tags, status and legacy block HTML are safe', async () => {
            const result = await page.evaluate(() => {
                const attack = '<img src="blocked" onerror="window.untrusted=1">';
                const el = BlockNormalBuilder.build({id: 'normal', title: attack,
                    tags: attack, status: '\"><img onerror="window.untrusted=1">',
                    html: '<p><strong>Keep me</strong><img src=x onerror="window.untrusted=1"></p>'}, () => {});
                return {inHeader: el.querySelectorAll('.block-title img, .block-tags img').length,
                    handlers: el.querySelectorAll('[onerror]').length,
                    strong: el.querySelector('strong')?.textContent};
            });
            assert.deepEqual(result, {inHeader: 0, handlers: 0, strong: 'Keep me'});
        });
        await page.addScriptTag({content: source('AIController')});
        await t.test('embedded drawing survives display sanitization', async () => {
            const result = await page.evaluate(() => {
                const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
                const el = BlockNormalBuilder.build({id: 'drawing', title: 'Drawing',
                    html: `<img src="${png}" alt="drawing" onerror="bad()">`}, () => {});
                const img = el.querySelector('img');
                return {preserved: img?.getAttribute('src') === png, handler: img?.hasAttribute('onerror')};
            });
            assert.deepEqual(result, {preserved: true, handler: false});
        });
        await t.test('math is safe after markdown and final sanitization preserves formulas', async () => {
            const result = await page.evaluate(() => {
                const container = document.createElement('div');
                container.innerHTML = AIController.contentToHtml(
                    '**Bold** $<img src=x onerror="window.untrusted=1">$\n\n$$x^2+y^2=z^2$$');
                return {images: container.querySelectorAll('img').length,
                    bold: container.querySelector('strong')?.textContent,
                    formula: container.querySelector('[formula]')?.getAttribute('formula'),
                    text: container.textContent};
            });
            assert.equal(result.images, 0);
            assert.equal(result.bold, 'Bold');
            assert.equal(result.formula, 'x^2+y^2=z^2');
            assert.match(result.text, /<img/);
        });
        await t.test('source URLs reject script schemes and escape attribute quotes', async () => {
            const result = await page.evaluate(() => ({
                unsafe: HtmlSafety.link('javascript:alert(1)'),
                normal: HtmlSafety.link('https://example.com/source'),
                quoted: HtmlSafety.escape('https://example.com/" onclick="bad'),
            }));
            assert.equal(result.unsafe, '');
            assert.equal(result.normal, 'https://example.com/source');
            assert.equal(result.quoted.includes('"'), false);
        });
    } finally {
        await browser.close();
    }
});
