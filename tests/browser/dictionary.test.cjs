const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawn, spawnSync} = require('node:child_process');
const {once} = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '../..');

test('dictionary keeps both explanations through browser save and reload', {timeout: 90_000}, async () => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    await fs.mkdir(path.join(root, '.cache'), {recursive: true});
    const directory = await fs.mkdtemp(path.join(root, '.cache/browser-dictionary-'));
    const env = {...process.env, HOST: '127.0.0.1', PORT: String(port), UVICORN_RELOAD: '0', DEMO_MODE: 'false',
        DATABASE_URL: 'sqlite+aiosqlite:///' + path.join(directory, 'test.db').replaceAll('\\', '/'),
        DATA_DIR: directory, DB_DIR: directory, DEMO_DIR: path.join(directory, 'demo'), SECRET_KEY: 'browser-test-only'};
    for (const key of ['OPENAI_API_KEY', 'GROQ_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY', 'GIGACHAT_AUTH_KEY']) env[key] = '';
    const python = process.env.TEST_PYTHON || path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const child = spawn(python, ['run.py'], {cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    let log = '';
    child.stdout.on('data', data => {log += data;});
    child.stderr.on('data', data => {log += data;});
    const url = `http://127.0.0.1:${port}`;
    let browser;
    try {
        let ready = false;
        const deadline = Date.now() + 45_000;
        while (Date.now() < deadline) {
            if (child.exitCode !== null) throw new Error(log);
            if (await fetch(url + '/health', {signal: AbortSignal.timeout(2000)})
                .then(response => response.ok).catch(() => false)) {ready = true; break;}
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert(ready, 'Test server did not start: ' + log);
        browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('dialectics_onboarding_seen', '1');
            localStorage.setItem('papanda-cookie-consent', 'essential');
            document.cookie = 'locale=ru; path=/';
        });
        await page.goto(url, {waitUntil: 'networkidle0'});
        const first = 'Аналого-цифровой преобразователь (АЦП)';
        const second = 'SPI (Serial Peripheral Interface)';
        const noteId = await page.evaluate(async ({first, second}) => {
            const response = await fetch('/api/dialectics/save', {method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title: 'Проверка словаря', blocks: [
                    {id: 'manual-1', side: 'left', title: 'Измерение', html: '<p>Микроконтроллер получает результаты измерений.</p>'}
                ], dictionary: [
                    {word: 'Микроконтроллер', definition: String.raw`Результат вычислений — \(\tanh\).`, connections: first,
                        connection_explanations: {[first]: 'АЦП выполняет измерения'}},
                    {word: first, definition: '', connections: 'Микроконтроллер',
                        connection_explanations: {'Микроконтроллер': 'АЦП выполняет измерения'}},
                    {word: second, definition: '', connections: ''}
                ]})});
            if (!response.ok) throw new Error(await response.text());
            return (await response.json()).id;
        }, {first, second});
        await page.goto(`${url}/?note=${noteId}`, {waitUntil: 'networkidle0'});
        await page.waitForSelector('.dialectics-block .btn-dict');
        await page.click('.dialectics-block .btn-dict');
        assert.equal(await page.$$eval('.dict-entry p .katex', formulas => formulas.length), 1);
        assert.equal(await page.$eval('.dict-done', button => getComputedStyle(button).backgroundColor), 'rgb(234, 88, 12)');
        await page.hover('.dict-done');
        assert.equal(await page.$eval('.dict-done', button => getComputedStyle(button).backgroundColor), 'rgb(194, 65, 12)');
        await page.click('.dict-view-graph');
        assert.equal(await page.$$eval('.dict-graph-detail p .katex', formulas => formulas.length), 1);
        await page.click('.dict-view-list');
        await page.click('.dict-edit');
        assert.deepEqual(await page.$$eval('textarea[data-connection]', fields => fields.map(field => field.value)),
            ['АЦП выполняет измерения']);
        await page.$eval('.dict-connections', (input, names) => {
            input.value = names.join(', ');
            input.dispatchEvent(new Event('input', {bubbles: true}));
        }, [first, second]);
        await page.$eval('textarea[data-connection="SPI (Serial Peripheral Interface)"]', field => {
            field.value = 'Обмен данными по SPI';
            field.dispatchEvent(new Event('input', {bubbles: true}));
        });
        // Temporary replacement of the connection text must retain both drafts.
        for (const names of [[], [first, second]]) {
            await page.$eval('.dict-connections', (input, names) => {
                input.value = names.join(', ');
                input.dispatchEvent(new Event('input', {bubbles: true}));
            }, names);
        }
        assert.deepEqual(await page.$$eval('textarea[data-connection]', fields => fields.map(field => field.value)),
            ['АЦП выполняет измерения', 'Обмен данными по SPI']);
        await page.click('.dict-save');
        await page.click('.dict-done');
        const saveResponse = page.waitForResponse(response => response.url() === `${url}/api/dialectics/${noteId}`
            && response.request().method() === 'PATCH');
        await page.click('#btn-save');
        const saved = await saveResponse;
        assert.equal(saved.status(), 200, await saved.text());
        await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
        await page.goto(`${url}/?note=${noteId}`, {waitUntil: 'networkidle0'});
        await page.waitForSelector('.dialectics-block .btn-dict');
        await page.click('.dialectics-block .btn-dict');
        await page.click('.dict-edit');
        assert.deepEqual(await page.$$eval('textarea[data-connection]', fields => fields.map(field => field.value)),
            ['АЦП выполняет измерения', 'Обмен данными по SPI']);
        assert.deepEqual(errors, []);
    } finally {
        await browser?.close();
        if (process.platform === 'win32' && child.pid && child.exitCode === null) {
            spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
        } else child.kill();
    }
});
