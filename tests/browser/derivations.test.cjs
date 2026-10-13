const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '../..');

test('pinned comparison geometry, rich editor, persistence and cleanup', {timeout: 120_000}, async () => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    await fs.mkdir(path.join(root, '.cache'), {recursive: true});
    const directory = await fs.mkdtemp(path.join(root, '.cache/derivations-'));
    const env = {...process.env, HOST: '127.0.0.1', PORT: String(port), UVICORN_RELOAD: '0', WEB_CONCURRENCY: '1', DEMO_MODE: 'false',
        SECRET_KEY: 'derivation-test-only', DATABASE_URL: 'sqlite+aiosqlite:///' + path.join(directory, 'test.db').replaceAll('\\', '/'),
        DATA_DIR: directory, DB_DIR: directory, DEMO_DIR: path.join(directory, 'demo')};
    for (const key of ['OPENAI_API_KEY', 'GROQ_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY', 'GIGACHAT_AUTH_KEY', 'LIBRARY_PUBLISH_URL', 'LIBRARY_PUBLISH_KEY']) env[key] = '';
    const python = process.env.TEST_PYTHON || path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const backend = spawn(python, ['run.py'], {cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    let log = '';
    backend.stdout.on('data', data => {log += data;}); backend.stderr.on('data', data => {log += data;});
    const url = `http://127.0.0.1:${port}`;
    let browser;
    try {
        let ready = false;
        for (let i = 0; i < 450; i++) {
            if (backend.exitCode !== null) throw new Error(log);
            if (await fetch(url + '/health').then(res => res.ok).catch(() => false)) {ready = true; break;}
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert(ready, log);
        browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
        const page = await browser.newPage();
        await page.setViewport({width: 1500, height: 900});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', dialog => dialog.accept());
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('dialectics_onboarding_seen', '1');
            localStorage.setItem('papanda-cookie-consent', 'essential');
            document.cookie = 'locale=ru; path=/';
        });
        await page.goto(url, {waitUntil: 'networkidle0'});
        const id = await page.evaluate(async () => {
            const blocks = [{id: 'basis', side: 'left', role: 'step1', title: 'Измеряем сигнал', html: '<p>Основание</p>', collapsed: true},
                ...Array.from({length: 8}, (_, i) => ({id: `right-${i}`, side: 'right', role: 'step2', title: `Развитие ${i + 1}`, html: '<p>Развитие процесса</p>', collapsed: true}))];
            const response = await fetch('/api/dialectics/save', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({title: 'Проверка связей', blocks})});
            if (!response.ok) throw new Error(await response.text());
            return (await response.json()).id;
        });
        const reopen = async () => {
            await page.goto(`${url}/?note=${id}`, {waitUntil: 'networkidle0'});
            await page.waitForSelector('#basis');
        };
        const align = async targetId => {
            await page.evaluate(target => {
                const rect = document.getElementById(target).getBoundingClientRect();
                const basis = document.getElementById('basis').getBoundingClientRect();
                const y = 90 + basis.height / 2;
                window.scrollBy(0, rect.top + rect.height / 2 - y);
            }, targetId);
            await page.waitForSelector(`.derivation-dot[data-target-id="${targetId}"]`, {visible: true});
        };
        const alignFrom = async (sourceId, targetId) => {
            await page.evaluate((source, target) => {
                const sourceRect = document.getElementById(source).getBoundingClientRect();
                const targetRect = document.getElementById(target).getBoundingClientRect();
                window.scrollBy(0, targetRect.top + targetRect.height / 2 - 90 - sourceRect.height / 2);
            }, sourceId, targetId);
            await page.waitForSelector(`.derivation-dot[data-source-id="${sourceId}"][data-target-id="${targetId}"]`, {visible: true});
        };
        const saveNote = async () => {
            await page.evaluate(() => document.getElementById('btn-save').click());
            await page.waitForFunction(() => !document.getElementById('btn-save').classList.contains('is-dirty'));
        };
        await reopen();
        await page.click('#basis .btn-pin-toggle');
        assert.equal(await page.$('.derivation-dot'), null, 'No line before the card sticks');
        await align('right-2');
        const geometry = await page.evaluate(() => {
            const source = document.getElementById('basis').getBoundingClientRect();
            const target = document.getElementById('right-2').getBoundingClientRect();
            const dot = document.querySelector('.derivation-dot').getBoundingClientRect();
            return {top: source.top, x: dot.left + dot.width / 2, expectedX: (source.right + target.left) / 2};
        });
        assert(Math.abs(geometry.top - 90) < 2);
        assert(Math.abs(geometry.x - geometry.expectedX) < 2);
        await page.screenshot({path: path.join(directory, 'line.png')});
        await page.click('.derivation-dot');
        await page.waitForSelector('.derivation-content .tiptap');
        await page.type('.derivation-content .tiptap', 'Сигнал нужно подготовить для измерения.');
        await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
        await page.click('.derivation-toolbar [data-format="bold"]');
        await page.screenshot({path: path.join(directory, 'editor.png')});
        await align('right-4'); // Editor retains the originally selected pair.
        await page.click('.derivation-save');
        await saveNote();
        await reopen();
        await align('right-2');
        assert(await page.$('.derivation-dot.has-derivation'));
        await page.click('.derivation-dot');
        assert.match(await page.$eval('.derivation-content', el => el.textContent), /Сигнал нужно подготовить/);
        assert.match(await page.$eval('.derivation-content strong', el => el.textContent), /Сигнал/);
        await page.focus('.derivation-save');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.className), 'derivation-close');
        await page.keyboard.press('Escape');
        assert.equal(await page.$('.derivation-dialog'), null);
        await align('right-4');
        await page.click('.derivation-dot');
        assert.equal(await page.$eval('.derivation-content .tiptap', el => el.textContent), '', 'Different pair has its own explanation');
        await page.type('.derivation-content .tiptap', 'Второе объяснение');
        await page.click('.derivation-cancel');
        await page.click('.derivation-dot');
        assert.equal(await page.$eval('.derivation-content .tiptap', el => el.textContent), '');
        await page.keyboard.press('Escape');
        // Resizing to one column hides the line; returning restores it.
        await page.setViewport({width: 600, height: 900});
        await page.waitForFunction(() => !document.querySelector('.derivation-dot'));
        await page.setViewport({width: 1500, height: 900});
        await align('right-2');
        await page.click('.derivation-dot');
        await page.click('.derivation-remove');
        await saveNote();
        await reopen(); await align('right-2');
        assert.equal(await page.$('.derivation-dot.has-derivation'), null);
        // Unpin through the actual UI; no ghost line remains after a frame.
        await page.click('#basis .btn-pin-toggle');
        await page.waitForFunction(() => !document.querySelector('.derivation-dot'));
        await saveNote();
        await page.click('#right-2 .btn-pin-toggle');
        await alignFrom('right-2', 'right-4');
        const rightGeometry = await page.evaluate(() => {
            const source = document.getElementById('right-2').getBoundingClientRect();
            const target = document.getElementById('right-4').getBoundingClientRect();
            const canvas = document.getElementById('blocks-container').getBoundingClientRect();
            return {sourceX: source.left, canvasX: canvas.left, targetX: target.left, sourceTop: source.top,
                moved: document.getElementById('right-2').classList.contains('pinned-as-source')};
        });
        assert(rightGeometry.moved);
        assert(rightGeometry.sourceX < rightGeometry.targetX);
        assert(Math.abs(rightGeometry.sourceX - rightGeometry.canvasX) < 2);
        assert(Math.abs(rightGeometry.sourceTop - 90) < 2);
        await page.screenshot({path: path.join(directory, 'right-line.png')});
        await page.click('.derivation-dot');
        await page.type('.derivation-content .tiptap', 'Верхнее раскрывается в нижнем.');
        await page.click('.derivation-save');
        await saveNote();
        await reopen();
        await alignFrom('right-2', 'right-4');
        assert(await page.$('.derivation-dot.has-derivation'));
        await page.click('.derivation-dot');
        assert.match(await page.$eval('.derivation-content', el => el.textContent), /Верхнее раскрывается в нижнем/);
        await page.keyboard.press('Escape');
        await page.click('#basis .btn-pin-toggle');
        await align('right-1');
        assert(await page.$('.derivation-dot[data-source-id="basis"]'));
        await alignFrom('right-2', 'right-4');
        assert(await page.$('#basis.pinned-inactive'));
        assert(await page.$('.derivation-dot[data-source-id="right-2"]'));
        await align('right-1');
        assert(await page.$('.derivation-dot[data-source-id="basis"]'));
        await page.click('#basis .btn-pin-toggle');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForFunction(() => !document.getElementById('right-2').classList.contains('pinned-as-source'));
        await alignFrom('right-2', 'right-4');
        await page.click('#right-2 .btn-pin-toggle');
        await page.waitForFunction(() => !document.querySelector('.derivation-dot'));
        assert.equal(await page.$('#right-2.pinned-as-source'), null);
        await saveNote();
        await page.evaluate(() => document.getElementById('btn-new-conspect').click());
        await page.waitForFunction(() => !document.getElementById('basis'));
        assert.equal(await page.$$('.pinned-derivations').then(items => items.length), 1);
        assert.deepEqual(errors, []);
        console.log('Visual checks:', directory);
    } finally {
        await browser?.close();
        backend.kill();
    }
});
