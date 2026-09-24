const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '../..');

async function server() {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const directory = await fs.mkdtemp(path.join(root, '.cache/browser-r5-'));
    const env = {...process.env, HOST: '127.0.0.1', PORT: String(port), UVICORN_RELOAD: '0', DEMO_MODE: 'false',
        DATABASE_URL: 'sqlite+aiosqlite:///' + path.join(directory, 'test.db').replaceAll('\\','/'),
        DATA_DIR: directory, DB_DIR: directory, DEMO_DIR: path.join(directory, 'demo')};
    for (const key of ['GROQ_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY', 'GIGACHAT_AUTH_KEY']) env[key] = '';
    env.SECRET_KEY = 'browser-test-only';
    const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const child = spawn(python, ['run.py'], {cwd: root, env, windowsHide: true, stdio: ['ignore','pipe','pipe']});
    let log = '';
    child.stdout.on('data', data => {log += data;});
    child.stderr.on('data', data => {log += data;});
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 120; i++) {
        if (child.exitCode !== null) throw new Error(log);
        if (await fetch(url+'/health').then(res => res.ok).catch(() => false)) return {child, url, log: () => log};
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    child.kill();
    throw new Error('Test server did not start: '+log);
}

test('local editor user flows, lifecycle and CSP', {timeout: 120_000}, async t => {
    const backend = await server();
    let browser;
    try {
        browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
        const page = await browser.newPage();
        const errors = [], external = [], violations = [];
        let generated = 0;
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {if (message.text().includes('Content Security Policy')) violations.push(message.text());});
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (/^https?:/.test(request.url()) && !request.url().startsWith(backend.url)) {external.push(request.url()); return request.abort();}
            if (request.url().endsWith('/api/ai/dialectics/conspectus/generate-full/stream')) {
                generated++;
                const payload = JSON.parse(request.postData());
                const result = {run_id: 'browser-mock', status: 'completed', source_revision: payload.source_revision,
                    replace_bases: ['1','2','3','4','5'], updated_steps: {step1: {content: '**Mock generated step**', status: 'ready'}}};
                const events = [{type:'started', run_id:result.run_id, sequence:1},
                    {type:'terminal', run_id:result.run_id, sequence:2, status:result.status, result}];
                return request.respond({status:200, contentType:'text/event-stream',
                    body:events.map(event => 'data: '+JSON.stringify(event)+'\n\n').join('')});
            }
            if (request.url().includes('/api/ai/')) return request.respond({status:503, contentType:'application/json',
                body:JSON.stringify({detail:'Unexpected AI call in browser test'})});
            return request.continue();
        });
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('dialectics_onboarding_seen', '1');
            localStorage.setItem('papanda-cookie-consent', 'essential');
            document.cookie = 'locale=ru; path=/';
        });
        const response = await page.goto(backend.url, {waitUntil: 'networkidle0'});
        assert(!response.headers()['content-security-policy'].includes("'unsafe-eval'"));
        assert(!response.headers()['content-security-policy'].split('style-src')[0].includes("'unsafe-inline'"));
        await page.waitForSelector('#mode-master-toggle button[data-mode="manual"].active');
        // New scratch note, through the same public UI action as the menu.
        await page.click('#btn-new-conspect');
        await page.waitForSelector('.dialectics-hint-block[data-role="anchor"]');
        await t.test('manual keyboard entry, save and reload', async () => {
            await page.focus('.dialectics-hint-block[data-role="anchor"]');
            await page.keyboard.press('Enter');
            await page.waitForSelector('.tiptap');
            await page.type('.tiptap', 'Ручной текст контрольного конспекта');
            await page.click('#btn-modal-ok');
            await page.waitForSelector('.dialectics-block .block-content');
            await page.focus('#note-title');
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.type('#note-title', 'R5 browser control');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await page.reload({waitUntil: 'networkidle0'});
            assert.match(await page.$eval('#blocks-container', el => el.textContent), /Ручной текст контрольного конспекта/);
            assert.equal(await page.$eval('#note-title', el => el.value), 'R5 browser control');
        });
        await t.test('opening and closing editor releases document listeners', async () => {
            const session = await page.createCDPSession();
            const documentRef = await session.send('Runtime.evaluate', {expression: 'document'});
            const listeners = async () => (await session.send('DOMDebugger.getEventListeners', {objectId: documentRef.result.objectId})).listeners.length;
            const initial = await listeners();
            for (let i = 0; i < 5; i++) {
                await page.click('.dialectics-block .btn-edit');
                await page.waitForSelector('.tiptap');
                await page.keyboard.press('Escape');
                await page.waitForSelector('#modal-container.hidden');
            }
            assert.equal(await listeners(), initial);
            await session.detach();
        });
        await t.test('note stickers render as text and survive save/reload', async () => {
            await page.click('#btn-note-stickers');
            await page.waitForSelector('#note-stickers-dropdown-menu:not(.hidden)');
            await page.type('#note-stickers-dropdown-menu .sticker-panel-title-input', '<img src=x onerror=alert(1)>');
            await page.type('#note-stickers-dropdown-menu .sticker-panel-text-input', 'R6 private sticker');
            assert(await page.$eval('#note-stickers-dropdown-menu', el => el.getBoundingClientRect().right <= innerWidth));
            await page.click('#note-stickers-dropdown-menu .sticker-add-btn');
            assert.equal(await page.$$eval('#note-stickers-dropdown-menu .sticker-card img', els => els.length), 0);
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await page.reload({waitUntil:'networkidle0'});
            await page.click('#btn-note-stickers');
            assert.match(await page.$eval('#note-stickers-dropdown-menu', el => el.textContent), /R6 private sticker/);
            await page.click('#btn-note-stickers');
        });
        await t.test('local formula, graph and drawing widgets work under CSP', async () => {
            await page.click('.dialectics-block .btn-edit');
            await page.waitForSelector('.tiptap');
            await page.click('[data-format="latex"]');
            await page.waitForSelector('#formula-input');
            await page.type('#formula-input', '\\frac{1}{2}');
            await page.waitForSelector('#formula-preview .katex');
            await page.click('#btn-formula-save');
            await page.waitForSelector('.tiptap .math-inline');
            await page.click('[data-tab="graphs"]');
            await page.waitForSelector('#graph-canvas svg');
            await page.$eval('#graph-function', el => {el.value = 'sin(x)';});
            await page.click('#btn-draw-graph');
            assert.equal(await page.$eval('#graph-canvas svg', el => el.getAttribute('aria-label')), 'sin(x)');
            await page.$eval('#graph-function', el => {el.value = 'x = 2';});
            await page.click('#btn-draw-graph');
            assert.equal(await page.$$('#graph-canvas svg').then(els => els.length), 0, 'Assignments must be rejected');
            await page.click('[data-tab="shapes"]');
            await page.click('#btn-add-rect');
            await page.click('#btn-insert-shapes');
            await page.waitForSelector('.tiptap img[src^="data:image/png"]');
            await page.click('#btn-modal-ok');
            await page.waitForSelector('.dialectics-block img[src^="data:image/png"]');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await page.reload({waitUntil:'networkidle0'});
            await page.click('.dialectics-block .btn-edit');
            await page.click('[data-tab="shapes"]');
            await page.click('#btn-modal-ok');
            await page.waitForSelector('#modal-container.hidden');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            const shapes = await page.evaluate(async () => {
                const id = localStorage.getItem('papanda_last_note_id');
                const note = await (await fetch(`/api/dialectics/${id}`)).json();
                return JSON.parse(note.content_json.find(block => block.role === 'anchor').shapesData);
            });
            assert.equal(shapes.objects.length, 1, 'Reopening and saving must preserve drawing objects');
        });
        await t.test('versions use event handlers and restore saved content', async () => {
            const id = await page.evaluate(() => localStorage.getItem('papanda_last_note_id'));
            const checkpoint = await page.evaluate(async id => (await fetch(`/api/dialectics/${id}/checkpoint`, {method:'POST',
                headers:{'Content-Type':'application/json'}, body:JSON.stringify({title:'R5 checkpoint',is_manual:true})})).json(), id);
            assert(checkpoint.id);
            assert(await page.$eval('#btn-versions', el => el.getBoundingClientRect().right <= innerWidth));
            await page.click('#btn-versions');
            await page.waitForSelector('[data-version-action="restore"]');
            assert.equal(await page.$$eval('.version-history-modal [onclick]', els => els.length), 0);
            await page.click(`[data-version-action="restore"][data-version-id="${checkpoint.id}"]`);
            await page.waitForSelector('.btn-confirm-dialog');
            await page.click('.btn-confirm-dialog');
            await page.waitForFunction(() => document.querySelector('.toast')?.textContent.includes('восстанов'), {timeout: 5000});
        });
        await t.test('public share opens without editor state', async () => {
            const id = await page.evaluate(() => localStorage.getItem('papanda_last_note_id'));
            const share = await page.evaluate(async id => (await fetch(`/api/dialectics/${id}/share`, {method:'POST'})).json(), id);
            assert(share.token || share.share_token || share.url, JSON.stringify(share));
            const context = await browser.createBrowserContext();
            const viewer = await context.newPage();
            const publicUrl = share.url || `/s/${share.token || share.share_token}`;
            await viewer.goto(new URL(publicUrl, backend.url).href, {waitUntil:'networkidle0'});
            assert.match(await viewer.$eval('body', el => el.textContent), /Ручной текст контрольного конспекта/);
            await context.close();
        });
        await t.test('narrow screen editor and keyboard dismissal', async () => {
            await page.reload({waitUntil:'networkidle0'});
            await page.setViewport({width:390, height:844});
            await page.click('.dialectics-block .btn-edit');
            await page.waitForSelector('.tiptap');
            const bounds = await page.$eval('.modal-editor-floating', el => ({left:el.getBoundingClientRect().left, right:el.getBoundingClientRect().right}));
            assert(bounds.left >= 0 && bounds.right <= 390, JSON.stringify(bounds));
            await page.keyboard.press('Escape');
            await page.waitForSelector('#modal-container.hidden');
        });
        await t.test('explicit AI mode applies a mock SSE result and persists it', async () => {
            await page.setViewport({width:1280, height:900});
            await page.click('#btn-new-conspect');
            await page.click('#mode-master-toggle button[data-mode="ai"]');
            await page.waitForSelector('.anchor-topic-input');
            await page.type('.anchor-topic-input', 'A controlled test topic');
            await page.click('.btn-anchor-generate');
            await page.waitForFunction(() => document.querySelector('#blocks-container')?.textContent.includes('Mock generated step'));
            assert.equal(generated, 1);
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await page.reload({waitUntil:'networkidle0'});
            assert.match(await page.$eval('#blocks-container', el => el.textContent), /Mock generated step/);
            await page.click('#mode-master-toggle button[data-mode="manual"]');
        });
        assert.deepEqual(external, [], 'Editor tried to load remote assets');
        assert.deepEqual(violations, [], 'CSP violations');
        assert.deepEqual(errors, [], 'Uncaught browser errors');
    } finally {
        await browser?.close();
        if (backend.child.exitCode === null) {
            const exited = once(backend.child, 'exit');
            backend.child.kill();
            await exited;
        }
    }
});
