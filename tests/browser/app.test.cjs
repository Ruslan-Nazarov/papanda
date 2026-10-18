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
    await fs.mkdir(path.join(root, '.cache'), {recursive: true});
    const directory = await fs.mkdtemp(path.join(root, '.cache/browser-r5-'));
    const env = {...process.env, HOST: '127.0.0.1', PORT: String(port), UVICORN_RELOAD: '0', DEMO_MODE: 'false',
        DATABASE_URL: 'sqlite+aiosqlite:///' + path.join(directory, 'test.db').replaceAll('\\','/'),
        DATA_DIR: directory, DB_DIR: directory, DEMO_DIR: path.join(directory, 'demo'),
        PAPANDA_LIBRARY_FILE: path.join(directory, 'library_notes.json')};
    for (const key of ['OPENAI_API_KEY', 'GROQ_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY', 'GIGACHAT_AUTH_KEY', 'LIBRARY_PUBLISH_URL', 'LIBRARY_PUBLISH_KEY']) env[key] = '';
    env.SECRET_KEY = 'browser-test-only';
    const python = process.env.TEST_PYTHON || path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const child = spawn(python, ['run.py'], {cwd: root, env, windowsHide: true, stdio: ['ignore','pipe','pipe']});
    let log = '';
    child.stdout.on('data', data => {log += data;});
    child.stderr.on('data', data => {log += data;});
    const url = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) throw new Error(log);
        if (await fetch(url+'/health', {signal: AbortSignal.timeout(2000)})
            .then(res => res.ok).catch(() => false)) return {child, url, directory, log: () => log};
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
        await page.emulateTimezone('Asia/Qyzylorda');
        let testSavedNoteId;
        const reopenSavedNote = async () => {
            const id = await page.evaluate(() => localStorage.getItem('papanda_last_note_id')) || testSavedNoteId;
            assert(id);
            testSavedNoteId = id;
            await page.goto(`${backend.url}/?note=${encodeURIComponent(id)}`, {waitUntil: 'networkidle0'});
        };
        const errors = [], external = [], violations = [];
        let generated = 0;
        let generatedReference;
        const documentText = 'Создание одноканального ЭКГ\n' + 'Полное условие ТЗ. '.repeat(1700)
            + '\nПоследний пункт <img src=x onerror=alert(1)>';
        page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', async dialog => {
            if (dialog.type() === 'beforeunload') await dialog.accept();
            else { errors.push('Unexpected dialog: ' + dialog.message()); await dialog.dismiss(); }
        });
        page.on('console', message => {if (message.text().includes('Content Security Policy')) violations.push(message.text());});
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (/^https?:/.test(request.url()) && !request.url().startsWith(backend.url)) {external.push(request.url()); return request.abort();}
            if (request.url().endsWith('/api/ai/dialectics/conspectus/generate-full/stream')) {
                generated++;
                const payload = JSON.parse(request.postData());
                generatedReference = payload.context_state.reference;
                const result = {run_id: 'browser-mock', status: 'completed', source_revision: payload.source_revision,
                    replace_bases: ['1','2','3','4','5'], updated_steps: {step1: {content: '**Mock generated step**', status: 'ready'}}};
                const events = [{type:'started', run_id:result.run_id, sequence:1},
                    {type:'terminal', run_id:result.run_id, sequence:2, status:result.status, result}];
                return request.respond({status:200, contentType:'text/event-stream',
                    body:events.map(event => 'data: '+JSON.stringify(event)+'\n\n').join('')});
            }
            if (request.url().endsWith('/api/ai/dialectics/documents/extract')) return request.continue();
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
        const initialLocale = await page.$eval('html', el => el.lang);
        const initialTranslations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8'));
        assert((await page.$eval('.dialectics-hint-block[data-role="anchor"]', el => el.textContent))
            .includes(initialTranslations[initialLocale].hint_anchor_title));
        await t.test('collapsed left column stays visible and can be restored', async () => {
            assert.equal(await page.$('#toggle-show-hints'), null);
            await page.locator('#btn-mode').click();
            await page.locator('#toggle-hide-left + .toggle-slider').click();
            assert.equal(await page.$eval('#toggle-hide-left', el => el.checked), true);
            assert.equal(await page.$eval('#left-column-collapsed-notice', el => el.hidden), false);
            assert.equal(await page.$eval('.dialectics-hint-block.block-left', el => getComputedStyle(el).display), 'none');
            assert.equal(await page.$eval('#blocks-container', el => getComputedStyle(el, '::before').display), 'none');
            await page.click('#btn-restore-left');
            assert.equal(await page.$eval('#toggle-hide-left', el => el.checked), false);
            assert.equal(await page.$eval('#left-column-collapsed-notice', el => el.hidden), true);
            assert.notEqual(await page.$eval('.dialectics-hint-block.block-left', el => getComputedStyle(el).display), 'none');
        });
        await t.test('manual entry opens through a direct link while the root reload starts fresh', async () => {
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
            assert.equal(await page.$eval('#note-title', el => el.value), '');
            assert.equal(new URL(page.url()).searchParams.get('note'), null);
            const lastOpenedId = await page.evaluate(() => localStorage.getItem('papanda_last_note_id'));
            await page.click('#btn-main-menu');
            assert.equal(await page.$eval('#menu-item-last-note', el => el.disabled), false);
            await page.click('#menu-item-last-note');
            await page.waitForFunction(id => document.querySelector('#note-title').value === 'R5 browser control'
                && localStorage.getItem('papanda_last_note_id') === id, {}, lastOpenedId);
            await page.click('#btn-main-menu');
            await page.click('#menu-item-new-note');
            await page.waitForFunction(() => document.querySelector('#note-title').value === 'Новый конспект');
            assert.equal(await page.evaluate(() => localStorage.getItem('papanda_last_note_id')), lastOpenedId);
            await page.click('#btn-main-menu');
            assert.equal(await page.$eval('#menu-item-last-note', el => el.disabled), false);
            await page.click('#menu-item-last-note');
            await page.waitForFunction(() => document.querySelector('#note-title').value === 'R5 browser control');
            await reopenSavedNote();
            assert.match(await page.$eval('#blocks-container', el => el.textContent), /Ручной текст контрольного конспекта/);
            assert.equal(await page.$eval('#note-title', el => el.value), 'R5 browser control');
        });
        await t.test('question toolbar dialog saves, reloads, appears in Questions and removes its mark', async () => {
            await page.click('.dialectics-block .btn-edit');
            await page.focus('.tiptap');
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.click('[data-format="question"]');
            await page.waitForSelector('#dialog-prompt-input', {visible: true});
            await page.type('#dialog-prompt-input', 'Что нужно уточнить?');
            await page.screenshot({path: path.join(root, '.cache/editor-question-dialog.png')});
            await page.click('.btn-confirm-dialog');
            assert.equal(await page.$eval('.tiptap .question-mark-text', el => el.dataset.question), 'Что нужно уточнить?');
            await page.click('#btn-modal-ok');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$eval('.block-content .question-mark-text', el => el.dataset.question), 'Что нужно уточнить?');
            await page.click('#btn-questions');
            assert.match(await page.$eval('.questions-item', el => el.textContent), /Что нужно уточнить/);
            await page.click('.questions-close');
            await page.click('.dialectics-block .btn-edit');
            await page.click('.tiptap .question-mark-text');
            await page.click('[data-format="question"]');
            await page.click('.btn-delete-dialog');
            await page.click('#btn-modal-ok');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$('.block-content .question-mark-text'), null);
            assert.equal(await page.$eval('#btn-questions .questions-count', el => el.hidden), true);
        });
        await t.test('note dictionary is shared and survives editing and reload', async () => {
            assert.equal(await page.$$('.dialectics-block .btn-dict').then(items => items.length), 1);
            assert.equal(await page.$$('.dialectics-block .dict-badge').then(items => items.length), 0);
            await page.click('.dialectics-block .btn-dict');
            assert.equal(await page.$eval('.dict-add', el => getComputedStyle(el).backgroundImage),
                await page.$eval('#btn-new-conspect', el => getComputedStyle(el).backgroundImage));
            await page.click('.dict-add');
            await page.type('.dict-word', 'ЭКГ');
            await page.type('.dict-definition', 'Электрокардиограмма');
            await page.click('.dict-save');
            assert.equal(await page.$eval('.dialectics-block .dict-badge', el => el.textContent), '1');
            assert.match(await page.$eval('.dict-list', el => el.textContent), /Электрокардиограмма/);
            await page.click('.dict-done');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$eval('.dialectics-block .dict-badge', el => el.textContent), '1');
            await page.click('.dialectics-block .btn-dict');
            assert.match(await page.$eval('.dict-list', el => el.textContent), /Электрокардиограмма/);
            await page.click('.dict-edit');
            await page.$eval('.dict-definition', el => { el.value = 'Запись электрической активности сердца'; });
            await page.click('.dict-save');
            assert.match(await page.$eval('.dict-list', el => el.textContent), /Запись электрической активности сердца/);
            await page.click('.dict-done');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            await page.click('.dialectics-block .btn-dict');
            assert.match(await page.$eval('.dict-list', el => el.textContent), /Запись электрической активности сердца/);
            await page.click('.dict-done');
        });
        await t.test('materials panel attaches, previews and removes other AI notes', async () => {
            const filePath = path.join(backend.directory, 'other-ai.txt');
            await fs.writeFile(filePath, 'Внешний конспект по ЭКГ', 'utf8');
            await page.click('#btn-note-materials');
            assert.match(await page.$eval('#note-materials-panel', el => el.textContent), /Конспекты других ИИ/);
            assert(await page.$eval('#note-materials-panel', el => {
                const rect = el.getBoundingClientRect();
                return rect.left >= 0 && rect.right <= innerWidth;
            }));
            await (await page.$('#note-materials-panel input[type=file]')).uploadFile(filePath);
            await page.waitForSelector('.materials-card');
            assert.match(await page.$eval('.materials-name', el => el.textContent), /other-ai\.txt/);
            await page.click('.materials-preview summary');
            assert.match(await page.$eval('.materials-preview pre', el => el.textContent), /Внешний конспект по ЭКГ/);
            await page.screenshot({path: path.join(root, '.cache/materials-panel.png')});
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            await page.click('#btn-note-materials');
            assert.match(await page.$eval('.materials-name', el => el.textContent), /other-ai\.txt/);
            await page.click('.materials-remove');
            await page.waitForFunction(() => !document.querySelector('.materials-card'));
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            await page.click('#btn-note-materials');
            assert.equal(await page.$$('.materials-card').then(items => items.length), 0);
            await page.click('#btn-note-materials');
        });
        await t.test('block check reports an AI failure instead of a made-up review', async () => {
            await page.click('.dialectics-block .btn-ai-check');
            await page.waitForFunction(() => document.querySelector('#ai-check-response-area')?.textContent.includes('Не удалось проверить блок'));
            assert.doesNotMatch(await page.$eval('#ai-check-response-area', el => el.textContent), /Диалектический анализ блока|Структура соответствует/);
            await page.click('.ai-check-modal .btn-close-modal');
        });
        await t.test('block authorship labels can be chosen and survive saving', async () => {
            const select = '.dialectics-block .block-author-select';
            const assertAuthorStats = async () => {
                const {expected, actual} = await page.evaluate(() => {
                    const expected = {ai: 0, ai_checked: 0, ai_edited: 0, human: 0, unset: 0};
                    document.querySelectorAll('.dialectics-block:not(.block-section) .block-author-select').forEach(el => {
                        expected[el.value || 'unset']++;
                    });
                    const actual = Object.fromEntries([...document.querySelectorAll('[data-author-stat]')]
                        .map(el => [el.dataset.authorStat, Number(el.querySelector('strong').textContent)]));
                    return {expected, actual};
                });
                assert.deepEqual(actual, expected);
            };
            await assertAuthorStats();
            for (const value of ['ai', 'ai_checked', 'ai_edited', 'human']) {
                await page.select(select, value);
                assert.equal(await page.$eval('.block-author-control', el => el.dataset.author), value);
                await assertAuthorStats();
            }
            assert(await page.$eval('.block-author-control', el => {
                const badge = el.getBoundingClientRect();
                const block = el.closest('.dialectics-block').getBoundingClientRect();
                return badge.left >= block.left && badge.right <= block.right;
            }), 'The authorship label must remain inside a narrow block');
            await page.click('.block-author-help-button');
            assert.match(await page.$eval('.block-author-explainer', el => el.textContent), /ИИ.*проверено.*исправлено.*Мой текст/s);
            assert.equal(await page.$eval('.block-author-help-button', el => el.getAttribute('aria-expanded')), 'true');
            assert(await page.$eval('.block-author-explainer', el => {
                const rect = el.getBoundingClientRect();
                return rect.top >= 8 && rect.bottom <= innerHeight - 8 && rect.left >= 8 && rect.right <= innerWidth - 8;
            }), 'The label explanation must fit inside the viewport');
            await page.screenshot({path: path.join(root, '.cache/block-author-help.png')});
            await page.click('.block-author-help-close');
            assert(await page.$eval('.block-author-explainer', el => el.hidden));
            await page.click('.block-author-help-button');
            await page.keyboard.press('Escape');
            assert(await page.$eval('.block-author-explainer', el => el.hidden));
            await (await page.$('.dialectics-block')).screenshot({path: path.join(root, '.cache/block-author-label.png')});
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$eval(select, el => el.value), 'human');
            await assertAuthorStats();
            await page.select(select, '');
            await assertAuthorStats();
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$eval(select, el => el.value), '');
            await assertAuthorStats();
        });
        await t.test('statistics dropdown is compact, fits the viewport and closes with Escape or outside click', async () => {
            const viewport = page.viewport();
            for (const [name, size] of [['desktop', {width:1440, height:1000}], ['mobile', {width:390, height:844}]]) {
                await page.setViewport(size);
                assert.equal(await page.$eval('#statistics-panel', el => getComputedStyle(el).display), 'none');
                await page.click('#btn-statistics');
                await page.waitForFunction(() => document.querySelector('.note-sub-bar').getAnimations({subtree:true})
                    .every(animation => animation.playState !== 'running'));
                assert.equal(await page.$eval('#btn-statistics', el => el.getAttribute('aria-expanded')), 'true');
                assert(await page.$eval('#statistics-panel', el => {
                    const rect = el.getBoundingClientRect();
                    const anchor = document.querySelector('#btn-statistics').getBoundingClientRect();
                    return rect.left >= 12 && rect.right <= innerWidth - 12 && rect.bottom <= innerHeight - 12
                        && Math.abs(rect.top - anchor.bottom - 8) < 1;
                }), 'Statistics must stay within the viewport: ' + JSON.stringify(await page.$eval('#statistics-panel', el => ({
                    panel: el.getBoundingClientRect().toJSON(),
                    anchor: document.querySelector('#btn-statistics').getBoundingClientRect().toJSON(),
                    viewport: {width: innerWidth, height: innerHeight},
                }))));
                assert.equal(await page.$eval('#statistics-total', el => el.textContent), '1');
                assert.equal(await page.$eval('#statistics-words', el => el.textContent), '4');
                assert.equal(await page.$eval('[data-author-stat="unset"] small', el => el.textContent), '100%');
                await page.screenshot({path: path.join(root, `.cache/statistics-${name}.png`)});
                await page.keyboard.press('Escape');
                assert.equal(await page.$eval('#btn-statistics', el => el.getAttribute('aria-expanded')), 'false');
                assert.equal(await page.$eval('#btn-statistics', el => el === document.activeElement), true);
            }
            await page.setViewport({width:1440, height:1000});
            await page.screenshot({path: path.join(root, '.cache/statistics-toolbar.png')});
            await page.click('#btn-statistics');
            await page.click('#note-title');
            assert.equal(await page.$eval('#btn-statistics', el => el.getAttribute('aria-expanded')), 'false');
            await page.setViewport(viewport);
        });
        await t.test('text size persists in note and editor, and clear removes it from the entire block', async () => {
            await page.click('.dialectics-block .btn-edit');
            await page.waitForSelector('#btn-editor-text-size');
            assert.equal(await page.$$('.editor-text-options').then(els => els.length), 0);
            await page.click('#btn-editor-text-size');
            await page.waitForSelector('.editor-size-popover:not([hidden])');
            await page.screenshot({path: path.join(root, '.cache/editor-text-size-menu.png')});
            await page.click('.editor-size-option[data-size="24"]');
            assert.equal(await page.$eval('#btn-editor-text-size', el => el.dataset.currentSize), '24');
            assert.equal(await page.$eval('.tiptap .text-size-24', el => getComputedStyle(el).fontSize), '24px');
            await page.screenshot({path: path.join(root, '.cache/editor-text-size.png')});
            await page.click('#btn-modal-ok');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$eval('.block-content .text-size-24', el => getComputedStyle(el).fontSize), '24px');
            await page.click('.dialectics-block .btn-edit');
            await page.waitForSelector('.tiptap .text-size-24');
            await page.click('.format-btn-clear');
            assert.equal(await page.$$('.tiptap [data-text-size]').then(els => els.length), 0);
            await page.click('#btn-modal-ok');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$$('.block-content [data-text-size]').then(els => els.length), 0);
            await page.click('.dialectics-block .btn-edit');
            await page.click('#btn-editor-text-size');
            await page.click('.editor-size-option[data-size="24"]');
            await page.click('#btn-modal-ok');
            assert(await page.$('.block-content [data-text-size="24"]'));
            await page.click('.dialectics-block .btn-clear-format');
            await page.waitForFunction(() => !document.querySelector('.block-content [data-text-size]'));
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$$('.block-content [data-text-size]').then(els => els.length), 0);
        });
        await t.test('rewrite archives rich text, supports undo and cancel, and persists reasons', async () => {
            await page.setViewport({width: 1440, height: 1000});
            await page.click('.dialectics-block .btn-edit');
            await page.waitForSelector('.tiptap');
            const original = await page.$eval('.tiptap', el => el.innerText);
            await page.click('#btn-editor-rewrite');
            assert.equal(await page.$eval('.tiptap', el => el.innerText.trim()), '');
            assert(await page.$eval('#btn-editor-rewrite', el => el.disabled));
            assert.equal(await page.$$('.draft-archive-item').then(items => items.length), 1);
            await page.click('#btn-editor-rewrite-undo');
            assert.equal(await page.$eval('.tiptap', el => el.innerText), original);
            assert.equal(await page.$$('.draft-archive-item').then(items => items.length), 0);
            await page.click('#btn-editor-rewrite');
            await page.click('.draft-archive-item summary');
            await page.type('.draft-archive-reason textarea', 'Описан результат, а нужен процесс. <img src=x onerror=alert(1)>');
            await page.type('.tiptap', original);
            await page.click('#btn-modal-ok');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            await page.click('.dialectics-block .btn-edit');
            await page.waitForSelector('.draft-archive-item');
            await page.click('.draft-archive-item summary');
            assert.equal(await page.$eval('.draft-archive-content', el => el.innerText.trim()), original.trim());
            assert.match(await page.$eval('.draft-archive-reason textarea', el => el.value), /Описан результат/);
            assert.equal(await page.$$('.editor-draft-archive img').then(items => items.length), 0);
            await page.screenshot({path: path.join(root, '.cache/rejected-drafts-desktop.png')});
            await page.setViewport({width: 390, height: 844});
            assert(await page.$eval('.modal-editor-floating', el => el.getBoundingClientRect().right <= innerWidth));
            assert(await page.$eval('.editor-draft-archive', el => el.scrollWidth <= el.clientWidth));
            await page.screenshot({path: path.join(root, '.cache/rejected-drafts-mobile.png')});
            await page.click('#btn-editor-rewrite');
            await page.keyboard.press('Escape');
            await page.setViewport({width: 1280, height: 900});
            await page.click('.dialectics-block .btn-edit');
            await page.waitForSelector('.tiptap');
            assert.equal(await page.$$('.draft-archive-item').then(items => items.length), 1, 'Cancel must discard the uncommitted archive entry');
            assert.equal(await page.$eval('.tiptap', el => el.innerText), original);
            await page.keyboard.press('Escape');
        });
        await t.test('attached material renders as text and survives save and reload', async () => {
            assert(await page.$('.dialectics-block > .request-documents'));
            assert.equal(await page.$('#canvas-area > .request-documents'), null);
            const fixture = path.join(backend.directory, 'material.txt');
            await fs.writeFile(fixture, documentText, 'utf8');
            await (await page.$('#request-document-input')).uploadFile(fixture);
            await page.waitForFunction(() => document.querySelector('#request-document-name').textContent === 'material.txt');
            await page.click('#request-document-preview summary');
            assert.equal(await page.$eval('#request-document-text', el => el.textContent), documentText);
            assert.equal(await page.$$eval('#request-document-text img', els => els.length), 0);
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            await page.waitForFunction(() => document.querySelector('#request-document-name').textContent === 'material.txt');
            assert.equal(await page.$eval('#request-document-text', el => el.textContent), documentText);
            await page.screenshot({path: path.join(root, '.cache/request-documents-browser.png')});
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
            assert(await page.$('#btn-note-stickers .ph-sticker'));
            await page.click('#btn-note-stickers');
            await page.waitForSelector('#note-stickers-dropdown-menu:not(.hidden)');
            assert(await page.$('#note-stickers-dropdown-menu .sticker-panel-header .ph-sticker'));
            await page.type('#note-stickers-dropdown-menu .sticker-panel-title-input', '<img src=x onerror=alert(1)>');
            await page.type('#note-stickers-dropdown-menu .sticker-panel-text-input', 'R6 private sticker');
            assert(await page.$eval('#note-stickers-dropdown-menu', el => el.getBoundingClientRect().right <= innerWidth));
            await page.click('#note-stickers-dropdown-menu .sticker-add-btn');
            assert(await page.$('#btn-note-stickers .ph-sticker'));
            assert.equal(await page.$eval('#btn-note-stickers', el => el.textContent.includes('🟨')), false);
            assert.equal(await page.$$eval('#note-stickers-dropdown-menu .sticker-card img', els => els.length), 0);
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert(await page.$('#btn-note-stickers .ph-sticker'));
            await page.click('#btn-note-stickers');
            assert.match(await page.$eval('#note-stickers-dropdown-menu', el => el.textContent), /R6 private sticker/);
            const stickerId = await page.$eval('#note-stickers-dropdown-menu .sticker-edit-btn', el => el.dataset.id);
            await page.click('#note-stickers-dropdown-menu .sticker-edit-btn');
            assert.equal(await page.$eval('#note-stickers-dropdown-menu .sticker-panel-text-input', el => el.value), 'R6 private sticker');
            await page.$eval('#note-stickers-dropdown-menu .sticker-panel-text-input', el => {el.value = 'R6 private sticker edited';});
            await page.click('#note-stickers-dropdown-menu .sticker-color-btn[data-color="#dbeafe"]');
            await page.click('#note-stickers-dropdown-menu .sticker-add-btn');
            assert.equal(await page.$eval('#note-stickers-dropdown-menu .sticker-edit-btn', el => el.dataset.id), stickerId);
            assert.match(await page.$eval('#note-stickers-dropdown-menu .sticker-card', el => el.textContent), /R6 private sticker edited/);
            await page.click('#btn-note-stickers');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            await page.click('#btn-note-stickers');
            assert.match(await page.$eval('#note-stickers-dropdown-menu .sticker-card', el => el.textContent), /R6 private sticker edited/);
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
            await reopenSavedNote();
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
            const changed = await page.evaluate(async id => {
                const note = await (await fetch(`/api/dialectics/${id}`)).json();
                const blocks = note.content_json.map(block => block.role === 'anchor'
                    ? {...block, html: '<p>Changed after checkpoint</p>'} : block);
                const response = await fetch(`/api/dialectics/${id}`, {method:'PATCH',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({revision:note.revision, blocks})});
                return response.status;
            }, id);
            assert.equal(changed, 200);
            await reopenSavedNote();
            assert.match(await page.$eval('#blocks-container', el => el.textContent), /Changed after checkpoint/);
            assert(await page.$eval('#btn-versions', el => el.getBoundingClientRect().right <= innerWidth));
            await page.click('#btn-versions');
            await page.waitForSelector('[data-version-action="restore"]');
            assert.equal(await page.$$eval('.version-history-modal [onclick]', els => els.length), 0);
            await page.click(`[data-version-action="restore"][data-version-id="${checkpoint.id}"]`);
            await page.waitForSelector('.btn-confirm-dialog');
            await page.click('.btn-confirm-dialog');
            await page.waitForFunction(() => document.querySelector('.toast')?.textContent.includes('восстанов'), {timeout: 5000});
            assert.equal(await page.$('.version-history-modal'), null);
            assert.match(await page.$eval('#blocks-container', el => el.textContent), /Ручной текст контрольного конспекта/);
            assert(!/Changed after checkpoint/.test(await page.$eval('#blocks-container', el => el.textContent)));
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
            assert(await viewer.$('.blk-body .katex'), 'Saved formula is rendered on the public page');
            await context.close();
        });
        await t.test('narrow screen editor and keyboard dismissal', async () => {
            await reopenSavedNote();
            await page.setViewport({width:390, height:844});
            await page.click('.dialectics-block .btn-edit');
            await page.waitForSelector('.tiptap');
            const bounds = await page.$eval('.modal-editor-floating', el => ({left:el.getBoundingClientRect().left, right:el.getBoundingClientRect().right}));
            assert(bounds.left >= 0 && bounds.right <= 390, JSON.stringify(bounds));
            await page.keyboard.press('Escape');
            await page.waitForSelector('#modal-container.hidden');
        });
        await t.test('internal block link scrolls within the note without reloading it', async () => {
            await page.evaluate(() => {
                const target = document.querySelector('.dialectics-block');
                window.internalLinkScrolled = false;
                window.internalLinkReloaded = false;
                target.scrollIntoView = () => { window.internalLinkScrolled = true; };
                document.addEventListener('noteOpened', () => {window.internalLinkReloaded = true;}, {once: true});
                const link = document.createElement('a');
                link.href = `internal://note/${new URL(location.href).searchParams.get('note')}/block/${target.dataset.id}`;
                document.body.append(link); link.click(); link.remove();
            });
            await page.waitForFunction(() => window.internalLinkScrolled, {timeout: 3000});
            assert.equal(await page.evaluate(() => window.internalLinkReloaded), false);
        });
        await t.test('full AI answer is saved directly in the current note', async () => {
            await page.setViewport({width:1280, height:900});
            await page.click('#btn-new-conspect');
            await page.click('#mode-master-toggle button[data-mode="ai"]');
            await page.waitForSelector('.anchor-topic-input');
            assert(await page.$('.block-anchor-starter > .anchor-topic-input + .request-documents'));
            await page.type('.anchor-topic-input', 'A controlled test topic');
            await (await page.$('#request-document-input')).uploadFile(path.join(backend.directory, 'material.txt'));
            await page.waitForFunction(() => document.querySelector('#request-document-name').textContent === 'material.txt');
            assert.equal(await page.$eval('.anchor-topic-input', el => el.value), 'A controlled test topic');
            await page.screenshot({path: path.join(root, '.cache/request-documents-starter.png')});
            await page.click('.btn-anchor-generate');
            await page.waitForFunction(() => document.querySelector('#blocks-container')?.textContent.includes('Mock generated step'));
            assert.equal(generated, 1);
            assert.equal(generatedReference, documentText);
            assert.equal(await page.$eval('.dialectics-block .block-author-select', el => el.value), 'ai');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.match(await page.$eval('#blocks-container', el => el.textContent), /Mock generated step/);
            await page.click('#btn-note-materials');
            assert.equal(await page.$$('.materials-app-card').then(items => items.length), 0,
                'Generated blocks must not be included automatically');
            await page.click('.materials-add-app');
            await page.waitForSelector('.materials-picker-choice');
            await page.evaluate(() => [...document.querySelectorAll('.materials-picker-choice')]
                .find(button => button.textContent.includes('R5 browser control')).click());
            assert.match(await page.$eval('.materials-open-app', el => el.textContent), /R5 browser control/);
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            await page.click('#btn-note-materials');
            assert.match(await page.$eval('.materials-open-app', el => el.textContent), /R5 browser control/);
            await page.click('#btn-note-materials');
            const savedId = await page.evaluate(() => localStorage.getItem('papanda_last_note_id'));
            await page.reload({waitUntil:'networkidle0'});
            assert.match(await page.$eval('#blocks-container', el => el.textContent), /Mock generated step/);
            assert.equal(new URL(page.url()).searchParams.get('note'), savedId);
            await page.goto(backend.url, {waitUntil:'networkidle0'});
            assert.doesNotMatch(await page.$eval('#blocks-container', el => el.textContent), /Mock generated step/);
            assert.equal(new URL(page.url()).searchParams.get('note'), null);
            assert.equal(await page.evaluate(() => localStorage.getItem('papanda_last_note_id')), savedId);
            await reopenSavedNote();
            await page.click('#mode-master-toggle button[data-mode="manual"]');
        });
        await t.test('removing request material persists without deleting the goal', async () => {
            await page.click('#btn-remove-request-document');
            assert.equal(await page.$eval('#request-document-preview', el => el.hidden), true);
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$eval('#request-document-preview', el => el.hidden), true);
            assert.match(await page.$eval('#blocks-container', el => el.textContent), /A controlled test topic/);
        });
        await t.test('diary keeps requests and answers without learning modes', async () => {
            assert.equal(await page.$('#btn-learning-variants, #btn-learning-ask, #menu-item-learning-demo, #user-role-selector, .btn-fork-step'), null);
            assert(await page.$('.note-header-bar #btn-ai-diary'));
            await page.evaluate(async () => {
                const post = (url, data) => fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)}).then(r => r.json());
                const id = localStorage.getItem('papanda_last_note_id');
                await post(`/api/dialectics/${id}/activity`, {kind:'ai_request', step:2, status:'partial',
                    request:'Проверка измерения ЭКГ', text:'step2.1: Уточнить измерительный процесс',
                    started_at:'2026-10-09T03:51:26Z', duration_ms:12500});
                const other = await post('/api/dialectics/save', {title:'Other diary note', blocks:[]});
                await post(`/api/dialectics/${other.id}/activity`, {kind:'ai_request', status:'completed',
                    request:'OTHER NOTE SECRET', text:'Must not appear'});
            });
            await page.click('#btn-ai-diary');
            await page.waitForSelector('.ai-diary-entries article');
            const history = await page.$eval('.ai-diary-entries', el => el.textContent);
            assert.match(history, /A controlled test topic/);
            assert.match(history, /Mock generated step/);
            assert(!history.includes('OTHER NOTE SECRET'));
            assert.match(history, /08:51/);
            assert.match(history, /12,5 с/);
            assert.match(await page.$eval('.ai-diary-zone', el => el.textContent), /\+5/);
            await page.select('.ai-diary-filter', 'issues');
            assert.equal(await page.$$('.ai-diary-entry').then(entries => entries.length), 1);
            await page.type('.ai-diary-search input', 'ничего не найдено');
            assert.equal(await page.$$('.ai-diary-entry').then(entries => entries.length), 0);
            await page.$eval('.ai-diary-search input', el => {el.value=''; el.dispatchEvent(new Event('input', {bubbles:true}));});
            await page.select('.ai-diary-filter', 'all');
            await page.screenshot({path:path.join(root, '.cache/ai-diary-desktop.png')});
            await page.setViewport({width:390, height:844});
            assert(await page.$eval('.ai-diary-dialog', el => el.getBoundingClientRect().right <= innerWidth));
            await page.screenshot({path:path.join(root, '.cache/ai-diary-mobile.png')});
            await page.focus('.ai-diary-close');
            await page.keyboard.press('Tab');
            assert.equal(await page.$eval('.ai-diary-search input', el => document.activeElement === el), true);
            await page.keyboard.press('Escape');
            assert.equal(await page.$('.ai-diary-overlay'), null);
            await page.setViewport({width:1280, height:900});
            await page.click('#btn-new-conspect');
            await page.click('#btn-ai-diary');
            await page.waitForSelector('.ai-diary-message:not([hidden])');
            assert.equal(await page.$$('.ai-diary-entry').then(entries => entries.length), 0);
            assert.match(await page.$eval('.ai-diary-message', el => el.textContent), /Запросов к ИИ пока нет/);
            await page.click('.ai-diary-close');
            await reopenSavedNote();
        });
        await t.test('diary follows the language switch', async () => {
            const translations = JSON.parse(await fs.readFile(path.join(root, 'fastapi_app/i18n_data.json'), 'utf8'));
            for (const locale of ['en', 'kz', 'ru']) {
                const words = translations[locale];
                await page.click('#btn-lang-menu');
                await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}), page.click(`[data-lang="${locale}"]`)]);
                assert((await page.$eval('#btn-ai-diary', el => el.textContent)).includes(words.ai_diary_button));
                assert.equal(await page.$eval('html', el => el.lang), locale);
                assert.equal(await page.$eval('[data-mode="manual"]', el => el.getAttribute('aria-label')), words.mode_manual);
                assert.equal(await page.$eval('[data-mode="ai"]', el => el.getAttribute('aria-label')), words.mode_ai);
                if (locale === 'en') {
                    const chromeText = await page.$$eval('header, footer', els => els.map(el => el.innerText).join(' '));
                    assert(!/[А-Яа-яЁё]/.test(chromeText), 'English navigation contains Russian text');
                    await page.click('#btn-note-stickers');
                    await page.waitForSelector('#note-stickers-dropdown-menu:not(.hidden)');
                    assert((await page.$eval('#note-stickers-dropdown-menu', el => el.textContent)).includes(words.stk_note_notes));
                    await page.click('#btn-note-stickers');
                }
                await page.click('#btn-ai-diary');
                await page.waitForSelector('#ai-diary-title');
                await page.waitForSelector('.ai-diary-entry');
                assert.equal(await page.$eval('#ai-diary-title', el => el.textContent), words.ai_diary_title);
                assert.match(await page.$eval('.ai-diary-entries', el => el.textContent), /Mock generated step/);
                await page.click('.ai-diary-close');
            }
        });
        await t.test('deployment selection preserves the full editor and permanent link', async () => {
            await reopenSavedNote();
            await page.click('#btn-note-stickers');
            await page.waitForSelector('#note-stickers-dropdown-menu:not(.hidden)');
            await page.type('#note-stickers-dropdown-menu .sticker-panel-title-input', '<img src=x onerror=alert(1)>');
            await page.type('#note-stickers-dropdown-menu .sticker-panel-text-input', 'Public reader sticker');
            await page.click('#note-stickers-dropdown-menu .sticker-add-btn');
            await page.click('#btn-note-stickers');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            await page.click('#btn-library-publish');
            await page.waitForSelector('.library-publisher[open]');
            await page.click('#library-publish');
            await page.waitForSelector('.library-publisher a[href*="conspect="]');
            const publicUrl = await page.$eval('.library-publisher a[href*="conspect="]', el => el.href);
            assert(new URL(publicUrl).searchParams.get('lang'));
            const bundle = JSON.parse(await fs.readFile(path.join(backend.directory, 'library_notes.json'), 'utf8'));
            assert.equal(bundle.notes.length, 1);
            assert(bundle.notes[0].languages.ru.stickers.some(sticker => sticker.text === 'Public reader sticker'));
            const reader = await browser.newPage();
            reader.on('pageerror', error => errors.push(error.message));
            await reader.goto(backend.url + '/library', {waitUntil: 'networkidle0'});
            assert.equal(await reader.$eval('.library-card', el => el.href), publicUrl);
            const noScriptReader = await browser.newPage();
            await noScriptReader.setJavaScriptEnabled(false);
            await noScriptReader.goto(publicUrl, {waitUntil: 'load'});
            assert(await noScriptReader.$('#public-conspect h1'));
            assert((await noScriptReader.$eval('#public-conspect', el => el.textContent)).includes('Public reader sticker'));
            assert.equal(await noScriptReader.$eval('.app-container', el => getComputedStyle(el).display), 'none');
            await noScriptReader.close();
            await reader.goto(publicUrl, {waitUntil: 'networkidle0'});
            await reader.waitForSelector('.dialectics-block');
            assert.equal(await reader.$('#public-conspect'), null);
            assert(await reader.$('#btn-save'));
            assert(await reader.$('.btn-edit'));
            assert(await reader.$('.btn-sticker'));
            assert(new URL(await reader.url()).searchParams.has('conspect'));
            assert.equal(await reader.$eval('#note-title', el => el.value), await page.$eval('#note-title', el => el.value));
            await reader.close();
            await page.click('#library-unpublish');
            await page.waitForFunction(() => !document.querySelector('.library-publisher a[href*="conspect="]'));
            assert.equal(JSON.parse(await fs.readFile(path.join(backend.directory, 'library_notes.json'), 'utf8')).notes.length, 0);
            await page.click('.library-publisher .library-actions button:last-child');
        });
        await t.test('cancelling the starter preserves the question and restores editing', async () => {
            const context = await browser.createBrowserContext();
            try {
                const cancelPage = await context.newPage();
                await cancelPage.evaluateOnNewDocument(() => {
                    localStorage.setItem('dialectics_onboarding_seen', '1');
                    localStorage.setItem('papanda-cookie-consent', 'essential');
                });
                await cancelPage.setRequestInterception(true);
                cancelPage.on('request', request => {
                    if (request.url().includes('/api/ai/')) return; // Stall until UI cancellation.
                    if (/^https?:/.test(request.url()) && !request.url().startsWith(backend.url)) return request.abort();
                    return request.continue();
                });
                await cancelPage.goto(backend.url, {waitUntil: 'networkidle0'});
                await cancelPage.click('#btn-new-conspect');
                await cancelPage.click('#mode-master-toggle button[data-mode="ai"]');
                await cancelPage.waitForSelector('.anchor-topic-input');
                await cancelPage.type('.anchor-topic-input', 'Cancellation control question');
                await cancelPage.click('.btn-anchor-generate');
                await cancelPage.waitForSelector('#ai-global-loader button');
                await cancelPage.click('#ai-global-loader button');
                await cancelPage.waitForSelector('.dialectics-block .btn-edit');
                assert.match(await cancelPage.$eval('#blocks-container', el => el.textContent), /Cancellation control question/);
                assert.equal(await cancelPage.$('.btn-anchor-generate:disabled'), null);
                await cancelPage.click('.dialectics-block .btn-edit');
                await cancelPage.waitForSelector('.tiptap');
            } finally {
                await context.close();
            }
        });
        await t.test('attaching before the goal survives cancelling the manual editor', async () => {
            await page.click('#btn-new-conspect');
            await page.click('#mode-master-toggle button[data-mode="manual"]');
            assert(await page.$('.dialectics-hint-block[data-role="anchor"] > .request-documents'));
            const [chooser] = await Promise.all([page.waitForFileChooser(), page.click('#btn-request-document')]);
            await chooser.accept([path.join(backend.directory, 'material.txt')]);
            await page.waitForFunction(() => document.querySelector('#request-document-name').textContent === 'material.txt');
            assert(await page.$('#modal-container.hidden'));
            await page.focus('.dialectics-hint-block[data-role="anchor"]');
            await page.keyboard.press('Enter');
            await page.waitForSelector('.tiptap');
            await page.keyboard.press('Escape');
            await page.waitForSelector('#modal-container.hidden');
            assert.equal(await page.$eval('#request-document-text', el => el.textContent), documentText);
            assert(await page.$('.dialectics-hint-block[data-role="anchor"]'));
            await page.click('#mode-master-toggle button[data-mode="ai"]');
            await page.type('.anchor-topic-input', 'Создать одноканальный ЭКГ');
            await page.click('#btn-remove-request-document');
            assert.equal(await page.$eval('#request-document-preview', el => el.hidden), true);
            assert.equal(await page.$eval('.anchor-topic-input', el => el.value), 'Создать одноканальный ЭКГ');
        });
        await t.test('Open only lists notes, and New note preserves unsaved edits', async () => {
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            const previousId = new URL(page.url()).searchParams.get('note');
            await page.$eval('#note-title', el => {
                el.value = 'Saved when leaving via note list'; el.dispatchEvent(new Event('input', {bubbles:true}));
            });
            await page.click('#btn-main-menu');
            await page.click('#menu-item-open-note');
            await page.waitForSelector('.premium-note-card');
            const notePickerStyle = await page.evaluate(() => ({
                footer: getComputedStyle(document.querySelector('.load-notes-modal .modal-dialog-footer')).display,
                listOverflow: getComputedStyle(document.querySelector('.load-notes-modal .premium-list')).overflowY,
                bodyOverflow: getComputedStyle(document.querySelector('.load-notes-modal .modal-dialog-body')).overflowY,
            }));
            assert.equal(notePickerStyle.footer, 'none');
            assert.equal(notePickerStyle.listOverflow, 'visible');
            assert.equal(notePickerStyle.bodyOverflow, 'auto');
            assert.equal(await page.$('#btn-create-new-note'), null);
            await page.click('.load-notes-modal .btn-close-modal');
            await page.click('#btn-main-menu');
            await page.click('#menu-item-new-note');
            await page.waitForSelector('.btn-confirm-dialog');
            await page.click('.btn-confirm-dialog');
            await page.waitForFunction(() => !location.search.includes('note='));
            const savedTitle = await page.evaluate(async id => (await (await fetch(`/api/dialectics/${id}`)).json()).title, previousId);
            assert.equal(savedTitle, 'Saved when leaving via note list');
            await page.click('#mode-master-toggle button[data-mode="manual"]');
            await page.focus('.dialectics-hint-block[data-role="anchor"]');
            await page.keyboard.press('Enter');
            await page.waitForSelector('.tiptap');
            await page.type('.tiptap', 'Technical audit note');
            await page.click('#btn-modal-ok');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            assert.notEqual(new URL(page.url()).searchParams.get('note'), previousId);
        });
        await t.test('category deletion leaves the current note saveable and quotes remain intact', async () => {
            await page.click('#btn-category-select');
            await page.waitForSelector('#new-cat-btn-row');
            await page.click('#new-cat-btn-row');
            await page.type('#new-cat-input', 'Audit "quoted" category');
            await page.click('#btn-save-new-cat');
            await page.waitForFunction(() => document.getElementById('category-label').textContent === 'Audit "quoted" category');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await page.click('#btn-category-select');
            await page.waitForSelector('#category-dropdown-menu:not(.hidden) .btn-del-cat');
            assert.equal(await page.$eval('.btn-edit-cat', el => el.dataset.name), 'Audit "quoted" category');
            await page.click('.btn-del-cat');
            await page.waitForSelector('.btn-confirm-dialog');
            await page.click('.btn-confirm-dialog');
            await page.waitForFunction(() => !document.querySelector('.btn-del-cat'));
            await page.click('#btn-category-select');
            await page.$eval('#note-title', el => {
                el.value = 'Saved after category deletion'; el.dispatchEvent(new Event('input', {bubbles:true}));
            });
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.equal(await page.$eval('#note-title', el => el.value), 'Saved after category deletion');
        });
        await t.test('connections window opens another note and saves current edits', async () => {
            const currentId = new URL(page.url()).searchParams.get('note');
            await page.$eval('#note-title', el => {
                el.value = 'Saved before connection navigation'; el.dispatchEvent(new Event('input', {bubbles:true}));
            });
            await page.click('#btn-connections-nav');
            await page.waitForSelector('.btn-open-note');
            const targetId = await page.$eval('.btn-open-note', el => el.closest('.connections-note-card').dataset.id);
            await page.click('.btn-open-note');
            await page.waitForFunction(id => localStorage.getItem('papanda_last_note_id') === id, {}, targetId);
            assert.equal(new URL(page.url()).searchParams.get('note'), null);
            assert.equal(await page.$('.connections-modal-dialog'), null);
            assert.equal(await page.evaluate(async id => (await (await fetch(`/api/dialectics/${id}`)).json()).title, currentId),
                'Saved before connection navigation');
        });
        await t.test('deleting the current note beside Save and restoring it from Trash works', async () => {
            const isolatedBackend = await server();
            const context = await browser.createBrowserContext();
            try {
                const isolated = await context.newPage();
                isolated.on('pageerror', error => errors.push(error.message));
                await isolated.evaluateOnNewDocument(() => {
                    localStorage.setItem('dialectics_onboarding_seen', '1');
                    localStorage.setItem('papanda-cookie-consent', 'essential');
                });
                await isolated.goto(isolatedBackend.url, {waitUntil:'networkidle0'});
                const note = await isolated.evaluate(async () => (await fetch('/api/dialectics/save', {method:'POST',
                    headers:{'Content-Type':'application/json'}, body:JSON.stringify({title:'Only note', blocks:[]})})).json());
                await isolated.goto(`${isolatedBackend.url}/?note=${note.id}`, {waitUntil:'networkidle0'});
                await isolated.click('#btn-main-menu');
                await isolated.click('#menu-item-open-note');
                await isolated.waitForSelector('.premium-note-card');
                assert.equal(await isolated.$('.btn-delete-note'), null);
                assert.equal(await isolated.$('#tab-btn-trash'), null);
                await isolated.click('.modal-dialog .btn-close-modal');
                await isolated.click('#btn-delete-current');
                await isolated.waitForSelector('.btn-confirm-dialog');
                await isolated.click('.btn-confirm-dialog');
                await isolated.waitForFunction(() => !location.search.includes('note=') && !document.querySelector('#btn-delete-current:not(:disabled)'));
                assert.equal(await isolated.evaluate(() => localStorage.getItem('papanda_last_note_id')), null);
                await isolated.click('#btn-main-menu');
                await isolated.click('#menu-item-trash');
                await isolated.waitForSelector('.btn-restore-note');
                await isolated.click('.btn-restore-note');
                await isolated.waitForFunction(id => localStorage.getItem('papanda_last_note_id') === String(id), {}, note.id);
                assert.equal(new URL(isolated.url()).searchParams.get('note'), null);
                assert.equal(await isolated.$eval('#note-title', el => el.value), 'Only note');
            } finally {
                await context.close();
                if (isolatedBackend.child.exitCode === null) {
                    const exited = once(isolatedBackend.child, 'exit');
                    isolatedBackend.child.kill(); await exited;
                }
            }
        });
        await t.test('archiving the simplest process keeps the next hint after save and reload', async () => {
            await page.click('#btn-new-conspect');
            await page.waitForSelector('.dialectics-hint-block[data-role="anchor"]');
            await page.click('.dialectics-hint-block[data-role="anchor"]');
            await page.waitForSelector('.tiptap');
            await page.type('.tiptap', 'Understand a simple process');
            await page.click('#btn-modal-ok');
            await page.waitForSelector('.dialectics-hint-block[data-role="step1"]');
            await page.click('.dialectics-hint-block[data-role="step1"]');
            await page.waitForSelector('.tiptap');
            await page.type('.tiptap', 'An initial simplest process');
            await page.click('#btn-modal-ok');
            await page.waitForSelector('.dialectics-hint-block[data-role="step2"]');
            await page.click('.dialectics-block .btn-edit');
            await page.click('#btn-editor-rewrite');
            await page.click('#btn-modal-ok');
            assert(await page.$('.dialectics-hint-block[data-role="step2"]'));
            assert.equal(await page.$('.dialectics-hint-block[data-role="step1"]'), null);
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert(await page.$('.dialectics-hint-block[data-role="step2"]'));
            assert.equal(await page.$('.dialectics-hint-block[data-role="step1"]'), null);
        });
        await t.test('a section appears after submission and the contents distinguish both sides', async () => {
            await page.hover('.block-divider[data-index="2"]');
            await page.click('.block-divider[data-index="2"] .section-add-btn');
            await page.waitForSelector('#section-title-input');
            await page.type('#section-title-input', 'Раздел проверки');
            await page.click('.modal-dialog .btn-ok-modal');
            assert.match(await page.$eval('.dialectics-block.block-section .block-title', el => el.textContent), /Раздел проверки/);
            assert(await page.$eval('.dialectics-block.block-section', el => {
                const section = el.getBoundingClientRect();
                const canvas = document.querySelector('#blocks-container').getBoundingClientRect();
                return Math.abs((section.left + section.right) / 2 - (canvas.left + canvas.right) / 2) < 3
                    && section.width > canvas.width * .55;
            }), 'The section title must span and center on the canvas');
            await page.screenshot({path: path.join(root, '.cache/centered-section.png')});
            await page.click('.dialectics-hint-block[data-role="step2"]');
            await page.waitForSelector('.tiptap');
            await page.type('.tiptap', 'Развитие процесса');
            await page.click('#btn-modal-ok');
            await page.hover('.block-divider[data-index="4"]');
            await page.click('.block-divider[data-index="4"] .section-add-btn');
            await page.waitForSelector('#section-title-input');
            await page.type('#section-title-input', 'Следующий раздел');
            await page.click('.modal-dialog .btn-ok-modal');
            assert.deepEqual(await page.$$eval('.block-section .section-label', elements => elements.map(el => el.textContent.trim())),
                ['Раздел 1', 'Раздел 2']);
            const counterStyles = () => page.$$eval('#blocks-container > .dialectics-block', elements =>
                elements.map(el => ({section: el.classList.contains('block-section'), increment: getComputedStyle(el).counterIncrement})));
            const styles = await counterStyles();
            const sectionIndex = styles.findIndex(item => item.section);
            assert(sectionIndex > 0 && sectionIndex < styles.length - 1, 'Section must sit between numbered blocks');
            assert(styles.filter(item => item.section).every(item => item.increment === 'none'), 'Section headings must not consume block numbers');
            assert(styles.filter(item => !item.section).every(item => item.increment.startsWith('block-number')));
            await page.screenshot({path: path.join(root, '.cache/section-numbering.png')});
            await page.click('#btn-toc');
            await page.waitForSelector('#toc-dropdown-menu:not(.hidden)');
            assert(await page.$('#toc-dropdown-menu .toc-side-legend'));
            assert(await page.$('#toc-dropdown-menu .toc-side-left'));
            assert(await page.$('#toc-dropdown-menu .toc-side-right'));
            assert.match(await page.$eval('#toc-dropdown-menu .toc-section-item .toc-title', el => el.textContent), /Раздел проверки/);
            assert.deepEqual(await page.$$eval('#toc-dropdown-menu .toc-section-item .toc-title', elements => elements.map(el => el.textContent)),
                ['Раздел 1 · Раздел проверки', 'Раздел 2 · Следующий раздел']);
            await page.screenshot({path: path.join(root, '.cache/toc-sides-and-section.png')});
            await page.click('.btn-close-toc');
            await page.click('#btn-save');
            await page.waitForFunction(() => !document.querySelector('#btn-save').classList.contains('is-dirty'));
            await reopenSavedNote();
            assert.match(await page.$eval('.dialectics-block.block-section .block-title', el => el.textContent), /Раздел проверки/);
            assert.deepEqual(await page.$$eval('.block-section .section-label', elements => elements.map(el => el.textContent.trim())),
                ['Раздел 1', 'Раздел 2']);
            const reloadedStyles = await counterStyles();
            assert(reloadedStyles.filter(item => item.section).every(item => item.increment === 'none'));
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

test('the four deployed ECG links render full HTML and still open the editor', {timeout: 120_000}, async () => {
    const backend = await server();
    let browser;
    try {
        await fs.copyFile(path.join(root, 'fastapi_app/data/library_notes.json'),
            path.join(backend.directory, 'library_notes.json'));
        browser = await puppeteer.launch({headless: true, args: process.env.CI ? ['--no-sandbox'] : []});
        const variants = [
            ['ecg-original', 'ru', 'Как собрать одноканальный ЭКГ? (черновик)', 'Как собрать одноканальный ЭКГ'],
            ['ecg-original', 'en', 'How to Build a Single-Channel ECG Device? (Draft)', 'ADS1292 internal test generator'],
            ['ecg-final', 'ru', 'Как собрать одноканальный ЭКГ?', 'ADS1291'],
            ['ecg-final', 'en', 'How to Build a Single-Channel ECG Device', 'ADS1291'],
        ];
        for (const [slug, language, title, phrase] of variants) {
            const url = `${backend.url}/?conspect=${slug}&lang=${language}`;
            const response = await fetch(url);
            const html = await response.text();
            assert.equal(response.status, 200);
            assert(html.includes(`<h1>${title}</h1>`));
            assert(html.includes(phrase));
            const noScript = await browser.newPage();
            await noScript.setJavaScriptEnabled(false);
            await noScript.goto(url, {waitUntil: 'load'});
            assert.equal(await noScript.$eval('#public-conspect h1', el => el.textContent), title);
            assert((await noScript.$eval('#public-conspect', el => el.textContent)).includes(phrase));
            assert.notEqual(await noScript.$eval('#public-conspect', el => getComputedStyle(el).display), 'none');
            await noScript.close();

            const editor = await browser.newPage();
            const pageErrors = [];
            editor.on('pageerror', error => pageErrors.push(error.message));
            editor.on('response', response => {
                if (response.url().startsWith(backend.url) && response.status() >= 400)
                    pageErrors.push(`${response.status()} ${response.url()}`);
            });
            if (slug === 'ecg-original' && language === 'ru') {
                await editor.setRequestInterception(true);
                let releaseOpen;
                const openBlocked = new Promise(resolve => {
                    editor.on('request', request => {
                        if (request.url().includes('/dialectics/library/') && request.url().endsWith('/open')) {
                            releaseOpen = () => request.continue();
                            resolve();
                        } else request.continue();
                    });
                });
                await editor.goto(url, {waitUntil: 'domcontentloaded'});
                await openBlocked;
                assert.equal(await editor.$eval('#public-conspect', el => getComputedStyle(el).display), 'none');
                assert.notEqual(await editor.$eval('.public-app-loading', el => getComputedStyle(el).display), 'none');
                releaseOpen();
            } else {
                await editor.goto(url, {waitUntil: 'networkidle0'});
            }
            await editor.waitForFunction(() => !document.querySelector('#public-conspect') &&
                document.querySelectorAll('.dialectics-block').length > 0);
            assert.equal(await editor.$eval('#note-title', el => el.value), title);
            assert.deepEqual(pageErrors, []);
            await editor.close();
        }
    } finally {
        await browser?.close();
        if (backend.child.exitCode === null) {
            const exited = once(backend.child, 'exit');
            backend.child.kill();
            await exited;
        }
    }
});
