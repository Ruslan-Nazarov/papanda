const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('saved version becomes a locked material with a copyable fixed link', async () => {
    const dom = new JSDOM('<body></body>', {url: 'https://example.test/'});
    const document = dom.window.document;
    const note = {id: 7, title: 'Конспект'};
    let materialToken = null;
    const copied = [];
    const api = {
        getVersions: async () => [{id: 11, note_id: 7, title: 'Итог', is_manual: true,
            created_at: '2026-10-11T00:00:00Z', material_token: materialToken}],
        addVersionMaterial: async () => {
            materialToken = 'fixed-token';
            return {id: 11, material_token: materialToken};
        },
    };
    const ctx = context({document, window: dom.window, location: dom.window.location,
        navigator: {clipboard: {writeText: async value => copied.push(value)}},
        Event: dom.window.Event, NotesAPI: api, AppState: {currentNote: note},
        DialogService: {formatDateTime: () => '11 октября'},
        NoteController: {_showToast() {}}, t: key => key});
    load(ctx, 'NoteVersionsService');
    await ctx.NoteVersionsService.show({});
    assert.equal(document.querySelector('[data-version-action="addMaterial"]')?.dataset.versionId, '11');
    document.querySelector('[data-version-action="addMaterial"]').click();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(document.querySelector('.version-material-badge')?.textContent, 'version_material');
    assert.equal(document.querySelector('[data-version-action="delete"]'), null);
    assert.equal(document.querySelector('[data-version-action="togglePin"]'), null);
    assert.deepEqual(copied, ['https://example.test/v/fixed-token']);
});
