const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawn, spawnSync} = require('node:child_process');
const {once} = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '../..');

test('dictionary keeps explanations and block links through browser save, reload and navigation', {timeout: 90_000}, async () => {
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
    let page;
    const errors = [];
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
        page = await browser.newPage();
        const hoverGraph = async selector => {
            await page.$eval(selector, element => element.scrollIntoView({block: 'center', inline: 'center', behavior: 'instant'}));
            // Let auto-scroll finish before hovering: scrolling dismisses previews.
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await page.hover(selector);
        };
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
                body: JSON.stringify({title: 'Проверка словаря', dictionary_tags: [
                    {id: 'electronics', name: 'Электроника', color: '#2563eb'},
                    {id: 'signals', name: 'Измерения', color: '#0d9488'}], blocks: [
                    {id: 'manual-1', side: 'left', title: 'Измерение', html: '<p>Микроконтроллер получает результаты измерений.</p>'}
                ], dictionary: [
                    {word: 'Микроконтроллер', tags: ['electronics'], definition: String.raw`Результат вычислений — \(\tanh\).`, connections: first,
                        connection_explanations: {[first]: 'АЦП выполняет измерения'}},
                    {word: first, tags: ['signals'], definition: '', connections: 'Микроконтроллер',
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
        assert.equal(await page.$eval('.dict-done', button => getComputedStyle(button).backgroundImage),
            await page.$eval('#btn-new-conspect', button => getComputedStyle(button).backgroundImage));
        await page.hover('.dict-done');
        assert.equal(await page.$eval('.dict-done', button => getComputedStyle(button).backgroundImage),
            'linear-gradient(135deg, rgb(249, 115, 22), rgb(194, 65, 12))');
        await page.click('.dict-tag-filters [data-tag-id="electronics"]');
        assert.equal(await page.$$eval('.dict-entry', items => items.length), 1);
        await page.click('.dict-tag-filters [data-tag-id=""]');
        await page.click('.dict-tag-settings summary');
        await page.$eval('.dict-tag-setting[data-tag-id="electronics"] input[type=text]', input => {input.value = 'Электронные компоненты';});
        await page.$eval('.dict-tag-setting[data-tag-id="electronics"] input[type=color]', input => {input.value = '#7c3aed';});
        await page.click('.dict-tag-setting[data-tag-id="electronics"] button[type=submit]');
        assert.equal(await page.$eval('.dict-entry .dict-tag', tag => tag.textContent), 'Электронные компоненты');
        if (process.env.DICTIONARY_SCREENSHOTS) await page.screenshot({path: path.join(root, 'output/dictionary-tags-settings.png')});
        await page.click('.dict-tag-settings summary');
        await page.click('.dict-view-graph');
        assert.equal(await page.$$eval('.dict-graph-detail p .katex', formulas => formulas.length), 1);
        await hoverGraph('.dict-graph-node.is-selected');
        await page.waitForSelector('.dict-graph-tooltip');
        assert.equal(await page.$eval('.dict-graph-tooltip strong', title => title.textContent), 'Микроконтроллер');
        assert.equal(await page.$$eval('.dict-graph-tooltip .katex', formulas => formulas.length), 1);
        if (process.env.DICTIONARY_SCREENSHOTS) {
            await page.screenshot({path: path.join(root, 'output/dictionary-graph-definition.png')});
        }
        await page.keyboard.press('Escape');
        assert.equal(await page.$('.dict-graph-tooltip'), null);
        assert.ok(await page.$('.dict-modal'));
        // Hover the actual stroke away from its midpoint marker and both node cards.
        const strokePoint = await page.evaluate(() => {
            const marker = document.querySelector('.dict-graph-edge-info').getBoundingClientRect();
            const neighbor = document.querySelector('.dict-graph-node:not(.is-selected)').getBoundingClientRect();
            return {x: (marker.right + neighbor.left) / 2, y: marker.top + marker.height / 2};
        });
        await page.mouse.move(strokePoint.x, strokePoint.y);
        await page.waitForSelector('.dict-graph-tooltip');
        assert.equal(await page.$eval('.dict-graph-tooltip p', content => content.textContent), 'АЦП выполняет измерения');
        await hoverGraph('.dict-graph-edge-info');
        await page.waitForSelector('.dict-graph-tooltip');
        assert.equal(await page.$eval('.dict-graph-tooltip p', content => content.textContent), 'АЦП выполняет измерения');
        if (process.env.DICTIONARY_SCREENSHOTS) {
            await page.screenshot({path: path.join(root, 'output/dictionary-graph-connection.png')});
        }
        await page.click('.dict-view-list');
        assert.equal(await page.$('.dict-graph-tooltip'), null);
        await page.click('.dict-edit');
        await page.click('.dict-tag-picker [data-tag-id="signals"]');
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
        await page.$eval('.dict-definition', field => {
            field.focus();
            field.setSelectionRange(0, 'Результат'.length);
        });
        await page.click('.dict-editor > .dict-text-field .dict-insert-link');
        await page.waitForSelector('.internal-links-note');
        await page.keyboard.press('Escape');
        await page.waitForSelector('.internal-links-dialog', {hidden: true});
        assert.equal(await page.$eval('.dict-editor', editor => editor.hidden), false);
        assert.deepEqual(await page.$$eval('textarea[data-connection]', fields => fields.map(field => field.value)),
            ['АЦП выполняет измерения', 'Обмен данными по SPI']);
        if (process.env.DICTIONARY_SCREENSHOTS) {
            await fs.mkdir(path.join(root, 'output'), {recursive: true});
            await page.screenshot({path: path.join(root, 'output/dictionary-block-links-editor.png')});
        }
        await page.click('.dict-editor > .dict-text-field .dict-insert-link');
        await page.waitForSelector('.internal-links-note');
        await page.click('.internal-links-expand');
        await page.waitForSelector('.internal-links-block');
        await page.click('.internal-links-block');
        await page.click('.internal-links-confirm');
        await page.waitForSelector('.internal-links-dialog', {hidden: true});
        const linkedDefinition = await page.$eval('.dict-definition', field => field.value);
        assert.ok(linkedDefinition.startsWith(`[Результат](internal://note/${noteId}/block/manual-1)`));
        await page.click('.dict-save');
        assert.equal(await page.$eval('.dict-entry p a', link => link.textContent), 'Результат');
        assert.equal(await page.$$eval('.dict-entry p .katex', formulas => formulas.length), 1);
        await page.click('.dict-view-graph');
        assert.equal(await page.$eval('.dict-graph-detail p a', link => link.getAttribute('href')),
            `internal://note/${noteId}/block/manual-1`);
        await page.click('.dict-view-list');
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
        assert.equal(await page.$eval('.dict-definition', field => field.value), linkedDefinition);
        assert.deepEqual(await page.$$eval('.dict-tag-picker [aria-pressed="true"]', tags => tags.map(tag => tag.dataset.tagId)), ['electronics', 'signals']);
        assert.equal(await page.$eval('.dict-tag-picker [data-tag-id="electronics"]', tag => tag.textContent), 'Электронные компоненты');
        assert.equal(await page.$eval('.dict-tag-picker [data-tag-id="electronics"]', tag => tag.style.getPropertyValue('--tag-color')), '#7c3aed');
        await page.click('.dict-cancel');
        if (process.env.DICTIONARY_SCREENSHOTS) {
            await page.screenshot({path: path.join(root, 'output/dictionary-block-links-reading.png')});
            await page.setViewport({width: 390, height: 844});
            await page.click('.dict-edit');
            assert.equal(await page.$eval('.dict-modal', dialog => dialog.scrollWidth <= dialog.clientWidth), true);
            await page.screenshot({path: path.join(root, 'output/dictionary-block-links-mobile.png')});
            await page.click('.dict-cancel');
        }
        await page.setViewport({width: 390, height: 844});
        await page.click('.dict-view-graph');
        await hoverGraph('.dict-graph-node.is-selected');
        await page.waitForSelector('.dict-graph-tooltip a');
        assert.equal(await page.$eval('.dict-graph-tooltip', tooltip => {
            const rect = tooltip.getBoundingClientRect();
            return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
        }), true);
        if (process.env.DICTIONARY_SCREENSHOTS) {
            await page.screenshot({path: path.join(root, 'output/dictionary-graph-mobile.png')});
        }
        await page.click('.dict-graph-tooltip a');
        await page.waitForSelector('.dict-modal', {hidden: true});
        await page.waitForFunction(() => document.getElementById('manual-1').style.boxShadow.includes('3px'));
        assert.equal(await page.evaluate(() => new URL(location.href).searchParams.get('note')), String(noteId));
        assert.deepEqual(errors, []);
    } catch (error) {
        if (page && process.env.DICTIONARY_SCREENSHOTS) {
            await fs.mkdir(path.join(root, 'output'), {recursive: true});
            await page.screenshot({path: path.join(root, 'output/dictionary-browser-failure.png')});
            console.error('Browser errors:', errors);
        }
        throw error;
    } finally {
        await browser?.close();
        if (process.platform === 'win32' && child.pid && child.exitCode === null) {
            spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
        } else child.kill();
    }
});
