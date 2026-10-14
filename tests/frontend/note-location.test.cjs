const test = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

function setup(search = '') {
    const stored = new Map();
    const window = {location: {href: 'http://localhost:8080/' + search, search},
        history: {replaceState(a, b, url) {window.location = {href: String(url), search: url.search};}}};
    const ctx = context({window, URL, URLSearchParams, localStorage: {
        getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value),
        removeItem: key => stored.delete(key),
    }});
    load(ctx, 'NoteLocation');
    return {ctx, stored, window};
}

test('ordinary navigation leaves the root URL ready for a fresh start', () => {
    const {ctx, window, stored} = setup('?lang=ru');
    ctx.NoteLocation.remember(22);
    assert.equal(ctx.NoteLocation.initialId(), null);
    assert.equal(window.location.search, '?lang=ru');
    assert.equal(stored.get('papanda_last_note_id'), '22');
});

test('explicit note wins over last opened note', () => {
    const {ctx, stored} = setup('?note=22');
    stored.set('papanda_last_note_id', '23');
    assert.equal(ctx.NoteLocation.initialId(), '22');
});

test('a root page ignores the last saved note', () => {
    const {ctx, stored} = setup();
    stored.set('papanda_last_note_id', '22');
    assert.equal(ctx.NoteLocation.initialId(), null);
});

test('an explicit note link stays bookmarkable while that note is open', () => {
    const {ctx, window} = setup('?note=22&lang=ru');
    ctx.NoteLocation.remember(22);
    assert.equal(window.location.search, '?note=22&lang=ru');
    ctx.NoteLocation.remember(23);
    assert.equal(window.location.search, '?lang=ru');
});

test('creating a new note clears both saved navigation pointers', () => {
    const {ctx, window, stored} = setup('?note=22&lang=ru');
    stored.set('papanda_last_note_id', '22');
    ctx.NoteLocation.clear();
    assert.equal(ctx.NoteLocation.initialId(), null);
    assert.equal(window.location.search, '?lang=ru');
});

test('a published note keeps its permanent bilingual identity after loading or saving', () => {
    const {ctx, window} = setup('?conspect=ecg-final&lang=en');
    assert.equal(ctx.NoteLocation.initialLibrarySlug(), 'ecg-final');
    ctx.NoteLocation.remember(17, 'ecg-final');
    assert.equal(window.location.search, '?conspect=ecg-final&lang=en');
    ctx.NoteLocation.clear();
    assert.equal(window.location.search, '?lang=en');
});
