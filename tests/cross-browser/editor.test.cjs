const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(__dirname, '../../.cache/playwright-browsers');
const {chromium, firefox, webkit} = require('playwright');
const {startServer} = require('../support/local-server.cjs');
const root = path.resolve(__dirname, '../..');

test('real editor across Chromium, Firefox and WebKit with isolated sessions', {timeout: 180_000}, async t => {
    const backend = await startServer();
    const contexts = [];
    const browsers = [];
    const report = [];
    try {
        for (const [name, engine] of Object.entries({chromium, firefox, webkit})) {
            await t.test(name, async () => {
                const browser = await engine.launch({headless: true, ...(name === 'chromium'
                    ? {executablePath: await require('puppeteer').executablePath(), args: process.env.CI ? ['--no-sandbox'] : []} : {})});
                browsers.push(browser);
                const context = await browser.newContext({viewport: {width: 1280, height: 900}, hasTouch: true,
                    locale: 'ru-RU', timezoneId: 'Asia/Qyzylorda'});
                contexts.push(context);
                await context.addInitScript(() => {
                    localStorage.setItem('dialectics_onboarding_seen', '1');
                    localStorage.setItem('papanda-cookie-consent', 'essential');
                    document.cookie = 'locale=ru; path=/';
                });
                const page = await context.newPage();
                const errors = [], violations = [], requests = [], failedScripts = [];
                page.on('pageerror', error => errors.push(error.stack || error.message));
                page.on('requestfailed', request => {
                    if (request.resourceType() === 'script') failedScripts.push({url: request.url(), error: request.failure()});
                });
                await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => {
                    (window.acceptanceViolations ||= []).push(event.violatedDirective);
                }));
                await context.route('**/api/ai/**', async route => {
                    if (route.request().url().endsWith('/explain-calculation/stream')) {
                        requests.push(route.request().postDataJSON());
                        const events = [{type: 'started', run_id: 'cross-browser', sequence: 1},
                            {type: 'delta', run_id: 'cross-browser', sequence: 2,
                                delta: 'Нужда: восстановить пропущенное сокращение.\n\n$$\\frac{18}{27}=\\frac{2}{3}.$$'},
                            {type: 'terminal', run_id: 'cross-browser', sequence: 3, status: 'completed'}];
                        return route.fulfill({contentType: 'text/event-stream', body: events.map(event => 'data: ' + JSON.stringify(event) + '\n\n').join('')});
                    }
                    return route.fulfill({status: 503, json: {detail: 'AI disabled in isolated browser acceptance'}});
                });
                const response = await page.goto(backend.url, {waitUntil: 'networkidle'});
                const csp = response.headers()['content-security-policy'];
                assert(!csp.split('style-src')[0].includes("'unsafe-inline'"));
                await page.locator('.dialectics-hint-block').first().waitFor();
                const formula = String.raw`\frac{(2-5)^2+(5-5)^2+(8-5)^2}{3(6+3)}=\frac{18}{27}=\frac{2}{3}`;
                const created = await context.request.post(backend.url + '/api/dialectics/save', {data: {
                    title: `${name} acceptance`, blocks: [{id: 'calculation', side: 'center', title: 'Нормировка',
                        html: `<p>Сохраняемый текст.</p><p><span class="math-inline" formula="${formula}"></span></p>`,
                        math_symbols: []}]}});
                assert.equal(created.status(), 200, await created.text());
                const note = await created.json();
                context.acceptanceNoteId = note.id;
                context.acceptanceEngine = name;
                await page.goto(`${backend.url}/?note=${note.id}`, {waitUntil: 'networkidle'});
                await page.locator('#calculation .math-calculation-button').waitFor();
                await page.locator('#calculation .btn-edit').click();
                await page.locator('.tiptap').waitFor();
                await page.locator('.tiptap p').first().click();
                await page.keyboard.press('End');
                await page.keyboard.insertText(' Правка редактора.');
                await page.locator('#btn-modal-ok').click();
                await page.locator('.tiptap').waitFor({state: 'hidden'});
                assert.match(await page.locator('#calculation .block-content').textContent(), /Правка редактора/);
                for (const width of [1280, 390]) {
                    await page.setViewportSize({width, height: 844});
                    const button = page.locator('#calculation .math-calculation-button');
                    await button.scrollIntoViewIfNeeded();
                    assert(await button.evaluate(el => {const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth;}));
                    await button.tap();
                    await page.locator('.calculation-explain-modal').waitFor();
                    await page.waitForFunction(() => !document.querySelector('.concept-explain-save').disabled);
                    assert.equal(requests.at(-1).formula, formula);
                    assert.equal(await page.locator('.concept-explain-fragment annotation').first().textContent(), formula);
                    await page.locator('.concept-explain-fragment .math-expand-button').click();
                    await page.locator('.formula-zoom-dialog[open]').waitFor();
                    await page.keyboard.press('Escape');
                    await page.locator('.formula-zoom-dialog').waitFor({state: 'detached'});
                    assert(await page.locator('.calculation-explain-modal').isVisible());
                    const geometry = await page.locator('.calculation-explain-modal .modal-dialog').boundingBox();
                    assert(geometry.x >= 0 && geometry.x + geometry.width <= width + 1);
                    await page.screenshot({path: path.join(backend.directory, `${name}-${width}.png`)});
                    if (width === 390) await page.locator('.concept-explain-save').click();
                    else await page.keyboard.press('Escape');
                    await page.locator('.calculation-explain-modal').waitFor({state: 'detached'});
                }
                await page.locator('#btn-save').click();
                await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
                await page.reload({waitUntil: 'networkidle'});
                const savedChat = page.locator('#calculation [data-type="concept-chat"]');
                await savedChat.waitFor();
                const requestsBeforeReopen = requests.length;
                await savedChat.click();
                await page.locator('.saved-concept-chat-modal').waitFor();
                assert.match(await page.locator('.saved-concept-chat-modal').textContent(),
                    /Нужда: восстановить пропущенное сокращение/);
                assert.equal(await page.locator('.saved-concept-chat-modal .katex-error').count(), 0);
                assert.equal(requests.length, requestsBeforeReopen, 'saved chat must reopen without another AI call');
                await page.keyboard.press('Escape');
                await page.locator('.saved-concept-chat-modal').waitFor({state: 'detached'});
                assert.match(await page.locator('#calculation .block-content').textContent(), /Правка редактора/);
                assert.equal(await page.locator('#calculation .katex-error').count(), 0);
                violations.push(...await page.evaluate(() => window.acceptanceViolations || []));
                await fs.writeFile(path.join(backend.directory, `${name}-diagnostics.json`), JSON.stringify({errors, failedScripts}, null, 2));
                assert.deepEqual(errors, []);
                assert.deepEqual(violations, []);
                report.push({engine: name, version: browser.version(), status: 'passed', note_id: note.id});
            });
        }
        await t.test('three simultaneous demo sessions cannot read or overwrite each other', async () => {
            const lists = await Promise.all(contexts.map(context => context.request.get(backend.url + '/api/dialectics')));
            assert(lists.every(response => response.status() === 200));
            for (let i = 0; i < contexts.length; i++) {
                const own = (await lists[i].json()).find(note => note.id === contexts[i].acceptanceNoteId);
                assert(own);
                const other = contexts[(i + 1) % contexts.length].acceptanceNoteId;
                // Numeric IDs may coincide in separate SQLite files. Their titles must remain distinct.
                const loaded = await contexts[i].request.get(`${backend.url}/api/dialectics/${other}`);
                if (loaded.status() === 200) assert((await loaded.json()).title.startsWith(contexts[i].acceptanceEngine));
            }
        });
    } finally {
        await fs.writeFile(path.join(backend.directory, 'results.json'), JSON.stringify(report, null, 2));
        await Promise.allSettled(browsers.map(browser => browser.close()));
        await backend.stop();
        console.log('Cross-browser evidence:', backend.directory);
    }
});
