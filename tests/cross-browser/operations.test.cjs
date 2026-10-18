const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(__dirname, '../../.cache/playwright-browsers');
const {chromium} = require('playwright');
const {startServer} = require('../support/local-server.cjs');

test('long generation cancellation and persistent session quotas against an isolated real server', {timeout: 60_000}, async t => {
    const backend = await startServer({SESSION_DAILY_GENERATION_CAP: '2', IP_DAILY_GENERATION_CAP: '50', GLOBAL_DAILY_GENERATION_CAP: '100'});
    const browser = await chromium.launch({headless: true, executablePath: await require('puppeteer').executablePath(),
        args: process.env.CI ? ['--no-sandbox'] : []});
    try {
        const context = await browser.newContext({locale: 'ru-RU'});
        await context.addInitScript(() => {
            localStorage.setItem('dialectics_onboarding_seen', '1');
            localStorage.setItem('papanda-cookie-consent', 'essential');
            document.cookie = 'locale=ru; path=/';
        });
        const page = await context.newPage();
        await page.goto(backend.url, {waitUntil: 'networkidle'});
        await t.test('elapsed time stays visible during a delayed request and cancel restores editing', async () => {
            await context.route('**/api/ai/dialectics/conspectus/generate-full/stream', async route => {
                await new Promise(resolve => setTimeout(resolve, 3000));
                await route.fulfill({status: 503, json: {detail: 'Delayed synthetic provider response'}}).catch(() => {});
            });
            await page.locator('#mode-master-toggle button[data-mode="ai"]').click();
            await page.locator('.anchor-topic-input').fill('Долгий контрольный запрос');
            await page.locator('.btn-anchor-generate').click();
            await page.waitForFunction(() => /0:0[1-9]/.test(document.querySelector('.loader-elapsed')?.textContent || ''));
            await page.locator('#ai-global-loader button').click();
            await page.locator('#ai-global-loader').waitFor({state: 'hidden'});
            await page.locator('.dialectics-block .btn-edit').waitFor();
            assert.match(await page.locator('#blocks-container').textContent(), /Долгий контрольный запрос/);
            assert.equal(await page.locator('.btn-anchor-generate:disabled').count(), 0);
            await page.locator('.dialectics-block .btn-edit').click();
            await page.locator('.tiptap').waitFor();
            assert.match(await page.locator('.tiptap').textContent(), /Долгий контрольный запрос/);
            await page.keyboard.press('Escape');
            await context.unroute('**/api/ai/dialectics/conspectus/generate-full/stream');
        });
        await t.test('failed requests consume the configured quota; a separate session retains its own allowance', async () => {
            const payload = {action: 'generate_full', context_state: {target_goal: 'Контроль квоты без настроенного ИИ'}};
            const endpoint = backend.url + '/api/ai/dialectics/conspectus/route';
            for (let i = 0; i < 2; i++) {
                const response = await context.request.post(endpoint, {data: payload});
                assert.equal(response.status(), 200, await response.text());
                assert.equal((await response.json()).status, 'failed');
            }
            const denied = await context.request.post(endpoint, {data: payload});
            assert.equal(denied.status(), 429, await denied.text());
            const independent = await browser.newContext();
            await independent.request.get(backend.url);
            const allowed = await independent.request.post(endpoint, {data: payload});
            assert.equal(allowed.status(), 200, await allowed.text());
            assert.equal((await allowed.json()).status, 'failed');
            await independent.close();
        });
    } finally {
        await browser.close();
        await backend.stop();
    }
});
