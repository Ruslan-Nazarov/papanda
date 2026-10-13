const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {context, load} = require('./helpers.cjs');

test('note notice can be added, edited, removed and never renders as HTML', async () => {
    const dom = new JSDOM(`<button id="btn-note-notice" aria-expanded="false"></button>
        <section id="note-notice-editor" hidden><textarea id="note-notice-input"></textarea>
        <button id="btn-note-notice-save"></button><button id="btn-note-notice-cancel"></button>
        <button id="btn-note-notice-remove"></button></section>
        <aside id="note-notice-banner" hidden><button id="btn-note-notice-edit"></button>
        <div id="note-notice-text"></div></aside>`);
    const document = dom.window.document;
    const state = {currentNote: {note_notice: ''}, documentEpoch: 1,
        updateNote(patch) { Object.assign(this.currentNote, patch); document.dispatchEvent(new dom.window.Event('stateDirty')); }};
    let saves = 0;
    const ctx = context({document, AppState: state, NoteController: {async saveCurrentNote() { saves++; }},
        showToast() {}, t: key => key});
    load(ctx, 'NoteNoticeManager');
    ctx.NoteNoticeManager.init();

    assert.equal(document.getElementById('note-notice-banner').hidden, true);
    document.getElementById('btn-note-notice').click();
    const input = document.getElementById('note-notice-input');
    input.value = 'По заданию <script>alert(1)</script>';
    document.getElementById('btn-note-notice-save').click();
    await Promise.resolve();
    assert.equal(saves, 1);
    assert.equal(state.currentNote.note_notice, input.value);
    assert.equal(document.getElementById('note-notice-banner').hidden, false);
    assert.equal(document.querySelector('#note-notice-text script'), null);
    assert.match(document.getElementById('note-notice-text').textContent, /<script>/);

    document.getElementById('btn-note-notice-edit').click();
    assert.equal(input.value, state.currentNote.note_notice);
    document.getElementById('btn-note-notice-remove').click();
    await Promise.resolve();
    assert.equal(saves, 2);
    assert.equal(state.currentNote.note_notice, '');
    assert.equal(document.getElementById('note-notice-banner').hidden, true);
});
