const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(__dirname, '../../.cache/playwright-browsers');
const {chromium, firefox, webkit} = require('playwright');
const {startServer} = require('../support/local-server.cjs');

test('full export restores a separate, validated note in all three browsers', {timeout: 180_000}, async t => {
    const backend = await startServer();
    try {
        for (const [name, engine] of Object.entries({chromium, firefox, webkit})) {
            await t.test(name, async () => {
                const browser = await engine.launch({headless: true, ...(name === 'chromium'
                    ? {executablePath: await require('puppeteer').executablePath(),
                        args: process.env.CI ? ['--no-sandbox'] : []} : {})});
                try {
                    const context = await browser.newContext({viewport: {width: 1280, height: 900}});
                    await context.addInitScript(() => {
                        localStorage.setItem('dialectics_onboarding_seen', '1');
                        localStorage.setItem('papanda-cookie-consent', 'essential');
                        document.cookie = 'locale=ru; path=/';
                    });
                    const page = await context.newPage(), errors = [];
                    page.on('pageerror', error => errors.push(error.message));
                    await context.route('**/api/ai/**', route => route.fulfill({status: 503, json: {detail: 'AI disabled'}}));
                    await page.goto(backend.url, {waitUntil: 'networkidle'});
                    const fixture = {
                        title: 'Архив', note_notice: 'Замечание', status: 'in_progress',
                        blocks: [{id: 'archive-card', title: 'Проверка', side: 'center', role: 'explanation', status: 'in_progress',
                            html: '<p>Сохранённое содержимое.</p><p><span class="math-inline" formula="x^2"></span></p>',
                            sources: [{url: 'https://example.org', quote: '```json\nпример\n````'}],
                            derivations: [{source_id: 'archive-card', html: '<p>Вывод</p>'}],
                            stickers: [{id: 'block-sticker', title: 'Заметка', text: 'На полях', color: '#abcdef'}],
                            tabs: [{id: 'tab', title: 'Вкладка', html: '<p>Текст</p>'}],
                            math_symbols: [{symbol: 'x', definition: 'Число'}]}],
                        stickers: [{id: 'note-sticker', title: 'Важно', text: 'Не потерять', color: '#abcdef'}],
                        dictionary: [{word: 'x', definition: 'Переменная', tags: ['algebra']}],
                        dictionary_tags: [{id: 'algebra', name: 'Алгебра', color: '#abcdef'}],
                        math_symbols: [{symbol: 'x', definition: 'Число'}],
                    };
                    const created = await context.request.post(backend.url + '/api/dialectics/save', {data: fixture});
                    assert.equal(created.status(), 200, await created.text());
                    const original = await created.json();
                    await page.goto(`${backend.url}/?note=${original.id}`, {waitUntil: 'networkidle'});
                    await page.locator('#archive-card').waitFor();
                    await page.locator('#note-title').fill('Правки перед экспортом');
                    // Exercise the real export action, file chooser, preview and persistence.
                    const downloadEvent = page.waitForEvent('download');
                    await page.locator('#btn-main-menu').click();
                    await page.locator('.menu-submenu summary').click();
                    await page.locator('#menu-item-export-md-full').click();
                    const download = await downloadEvent;
                    const archive = path.join(backend.directory, `${name}-full.md`);
                    await download.saveAs(archive);
                    const selectFile = async input => {
                        const chooser = page.waitForEvent('filechooser');
                        await page.locator('#btn-main-menu').click();
                        await page.locator('#menu-item-import-snapshot').click();
                        await (await chooser).setFiles(input);
                    };
                    await selectFile(archive);
                    await page.locator('.btn-cancel-dialog').click();
                    assert.equal((await (await context.request.get(backend.url + '/api/dialectics')).json()).length, 1);
                    await selectFile(archive);
                    const savedEvent = page.waitForResponse(response => response.url().endsWith('/api/dialectics/save')
                        && response.request().method() === 'POST');
                    await page.locator('.btn-confirm-dialog').click();
                    const savedResponse = await savedEvent;
                    assert.equal(savedResponse.status(), 200, await savedResponse.text());
                    const imported = await savedResponse.json();
                    assert.notEqual(imported.id, original.id);
                    assert.equal(imported.category_id, null);
                    assert.equal(imported.title, 'Правки перед экспортом');
                    const old = await (await context.request.get(`${backend.url}/api/dialectics/${original.id}`)).json();
                    assert.equal(old.title, 'Правки перед экспортом', 'current changes saved before import');
                    for (const key of ['note_notice', 'stickers', 'dictionary', 'dictionary_tags', 'math_symbols', 'content_json']) {
                        assert.deepEqual(imported[key], old[key], `preserved ${key}`);
                    }
                    await page.waitForFunction(() => !new URLSearchParams(location.search).has('note'));
                    await page.goto(`${backend.url}/?note=${imported.id}`, {waitUntil: 'networkidle'});
                    await page.locator('#archive-card').waitFor();
                    assert.equal(await page.locator('#note-title').inputValue(), imported.title);
                    const invalid = {format: 'conspect-snapshot', version: 1,
                        note: {title: 'Invalid', blocks: [fixture.blocks[0], fixture.blocks[0]]}};
                    await selectFile({name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid))});
                    const invalidResponse = page.waitForResponse(response => response.url().endsWith('/api/dialectics/save')
                        && response.request().method() === 'POST');
                    await page.locator('.btn-confirm-dialog').click();
                    assert.equal((await invalidResponse).status(), 422, 'server rejects duplicate block identities');
                    await page.locator('.btn-close-dialog').waitFor();
                    assert.equal(await page.locator('#note-title').inputValue(), imported.title);
                    assert.equal((await (await context.request.get(backend.url + '/api/dialectics')).json()).length, 2);
                    assert.deepEqual(errors, []);
                } finally { await browser.close(); }
            });
        }
    } finally {
        await fs.writeFile(path.join(backend.directory, 'import-server.log'), backend.log());
        await backend.stop();
        console.log('Import evidence:', backend.directory);
    }
});
