/**
 * note_chrono_widget.js — Note & Chronology expand modals + language rule widget.
 * Extracted from dashboard_index.js (lines 567–782, 1021–1059, 1147–1265).
 */

// window.openStickerModal is provided by stickers.js (standard script)
import { showToast } from './ui_helpers.js';

// ─── Chronology ───────────────────────────────────────────────────────────────

window.openChronoExpandModal = function (id = null, text = '', date = '') {
    const widgetText = text || document.querySelector('textarea[name="chrono_text"]')?.value || '';
    let widgetDate = date || document.querySelector('input[name="chrono_date"]')?.value || '';

    // If we only have a date (YYYY-MM-DD), append T00:00 for datetime-local compatibility
    if (widgetDate && widgetDate.length === 10) {
        widgetDate += 'T00:00';
    }

    document.getElementById('editChronoId').value = id || '';
    document.getElementById('editChronoTitle').value = widgetText;
    document.getElementById('editChronoDate').value = widgetDate;
    
    document.getElementById('chronoModalHeader').innerText = id ? 'Edit Chronology Entry' : 'Add Chronology Entry';
    document.getElementById('editChronoError').innerText = '';
    document.getElementById('editChronoModal').style.display = 'flex';
};

window.closeChronoExpandModal = function (sync = true) {
    if (sync === true) {
        const id = document.getElementById('editChronoId').value;
        if (!id) {
            const modalText = document.getElementById('editChronoTitle').value;
            const t = document.querySelector('textarea[name="chrono_text"]');
            if (t) t.value = modalText;
        }
    }
    document.getElementById('editChronoModal').style.display = 'none';
};

window.closeEditChronoModal = () => window.closeChronoExpandModal(true);
window.saveChronoEdit = () => window.saveChronoFromModal();

window.saveChronoFromModal = async function () {
    const id   = document.getElementById('editChronoId').value;
    const text = document.getElementById('editChronoTitle').value.trim();
    const date = document.getElementById('editChronoDate').value;
    const errEl = document.getElementById('editChronoError');

    if (!text) { errEl.innerText = 'Text cannot be empty'; return; }

    try {
        let resp;
        if (id) {
            resp = await fetch('/edit_chrono_json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, text, date })
            });
        } else {
            const formData = new FormData();
            formData.append('chrono_text', text);
            formData.append('chrono_date', date);
            resp = await fetch('/submit_chrono_json', { method: 'POST', body: formData });
        }

        const data = await resp.json();
        if (data.status === 'success') {
            showToast('✓ ' + (data.message || 'Saved'), 'success');
            window.closeChronoExpandModal(false);
            const t = document.querySelector('textarea[name="chrono_text"]');
            if (t) t.value = '';
            const d = document.querySelector('input[name="chrono_date"]');
            if (d) d.value = window.P_CHRONO_DATE || '';
            setTimeout(() => location.reload(), 500);
        } else {
            errEl.innerText = data.message || 'Error saving.';
        }
    } catch (e) {
        errEl.innerText = 'Network error.';
        console.error(e);
    }
};

window.saveQuickChrono = async function (e) {
    if (e) e.preventDefault();
    const form = e.target;
    try {
        const response = await fetch('/submit_chrono_json', { method: 'POST', body: new FormData(form) });
        const data = await response.json();
        if (data.status === 'success') {
            showToast('✓ ' + (data.message || 'Chrono saved'), 'success');
            form.reset();
            setTimeout(() => location.reload(), 500);
        } else {
            showToast('⚠ ' + (data.message || 'Error saving'), 'error');
        }
    } catch (error) {
        console.error('Chrono save error:', error);
        showToast('⚠ Network error', 'error');
    }
};

// ─── Notes ────────────────────────────────────────────────────────────────────

window.openNoteExpandModal = function (id = null, note = '', category = '') {
    const widgetNote = note || document.getElementById('note_textarea')?.value || '';
    const widgetCatSelector = document.querySelector('.note-section select[name="category"]');
    const widgetCategory = category || (widgetCatSelector ? widgetCatSelector.value : '');

    document.getElementById('expandNoteId').value = id || '';
    const input = document.getElementById('expandNoteText');
    input.value = widgetNote;
    document.getElementById('expandNoteCategory').value = widgetCategory;
    document.getElementById('noteModalHeader').innerText = id ? 'Edit Note' : 'Add Note';
    document.getElementById('expandNoteError').innerText = '';
    document.getElementById('noteExpandModal').style.display = 'flex';

    if (!id) {
        document.getElementById('expandNoteStickerText').value = '';
        document.getElementById('expandNoteStickerTitle').value = '';
        document.getElementById('expandNoteStickerColor').value = '#fff9c4';
        document.getElementById('expandNoteStickerType').value = 'text';
        window.updateNoteStickerUI(false, 'expand');
    } else {
        window.updateNoteStickerUI(false, 'expand');
    }

    setTimeout(() => {
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
        if (parseInt(input.style.height) < 300) input.style.height = '350px';
    }, 10);
};

window.openNoteStickerModal = function (source) {
    let id = null;
    if (source === 'expand') id = document.getElementById('expandNoteId')?.value;
    else if (source === 'dialectics') id = window.app?.state?.currentNoteId;

    if (id) {
        openStickerModal({ parentType: 'note', parentId: id });
    } else {
        let prefix = 'widgetNote';
        if (source === 'expand') prefix = 'expandNote';
        else if (source === 'dialectics') prefix = 'dialectics';

        openStickerModal({
            source: 'note_modal',
            noteSource: source,
            text:  document.getElementById(prefix + 'StickerText')?.value  || '',
            title: document.getElementById(prefix + 'StickerTitle')?.value || '',
            color: document.getElementById(prefix + 'StickerColor')?.value || '#fff9c4',
            type:  document.getElementById(prefix + 'StickerType')?.value  || 'text'
        });
    }
};

window.updateNoteStickerUI = function (attached, source) {
    let btnId = 'widgetNoteStickerBtn';
    if (source === 'expand') btnId = 'expandNoteStickerBtn';
    else if (source === 'dialectics') btnId = 'dialecticsStickerBtn';

    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (attached) {
        btn.classList.add('attached');
        btn.title = 'Sticker Attached (Click to Edit)';
    } else {
        btn.classList.remove('attached');
        btn.title = 'Add Sticker';
    }
};

window.closeNoteExpandModal = function (sync = true) {
    if (sync === true) {
        const id = document.getElementById('expandNoteId').value;
        if (!id) {
            const modalText = document.getElementById('expandNoteText').value;
            const t = document.getElementById('note_textarea');
            if (t) t.value = modalText;
        }
    }
    document.getElementById('noteExpandModal').style.display = 'none';
};

window.saveNoteFromModal = async function () {
    const id       = document.getElementById('expandNoteId').value;
    const text     = document.getElementById('expandNoteText').value.trim();
    const category = document.getElementById('expandNoteCategory').value;
    const errEl    = document.getElementById('expandNoteError');

    if (!text) { errEl.innerText = 'Note text cannot be empty'; return; }

    try {
        const formData = new FormData();
        formData.append('note', text);
        formData.append('category', category);
        if (id) formData.append('id', id);

        if (!id) {
            const sText  = document.getElementById('expandNoteStickerText').value;
            const sTitle = document.getElementById('expandNoteStickerTitle').value;
            if (sText || sTitle) {
                formData.append('sticker_text',  sText);
                formData.append('sticker_title', sTitle);
                formData.append('sticker_color', document.getElementById('expandNoteStickerColor').value);
                formData.append('sticker_type',  document.getElementById('expandNoteStickerType').value);
            }
        }

        const resp = await fetch('/add_note', { method: 'POST', body: formData });
        const data = await resp.json();
        if (data.status === 'success') {
            showToast('✓ Note saved', 'success');
            window.closeNoteExpandModal(false);

            if (window.noteCreationCallback) {
                window.noteCreationCallback(data.id, text);
                window.noteCreationCallback = null;
                return;
            }

            const t = document.getElementById('note_textarea');
            if (t) { t.value = ''; t.style.height = '80px'; }
            setTimeout(() => location.reload(), 500);
        } else {
            errEl.innerText = data.message || 'Error saving note';
        }
    } catch (e) {
        errEl.innerText = 'Network error';
        console.error(e);
    }
};

window.saveQuickNote = async function (e) {
    e.preventDefault();
    const form     = e.target;
    const note     = form.note.value.trim();
    const category = form.category.value;
    const sText    = document.getElementById('widgetNoteStickerText').value;
    const sTitle   = document.getElementById('widgetNoteStickerTitle').value;

    if (!note) return;

    try {
        const formData = new FormData();
        formData.append('note', note);
        formData.append('category', category);

        if (sText || sTitle) {
            formData.append('sticker_text',  sText);
            formData.append('sticker_title', sTitle);
            formData.append('sticker_color', document.getElementById('widgetNoteStickerColor').value);
            formData.append('sticker_type',  document.getElementById('widgetNoteStickerType').value);
        }

        const resp = await fetch('/add_note', { method: 'POST', body: formData });
        if (resp.ok) {
            showToast('✓ Note added', 'success');
            form.note.value = '';
            form.note.style.height = '80px';
            document.getElementById('widgetNoteStickerText').value = '';
            document.getElementById('widgetNoteStickerTitle').value = '';
            window.updateNoteStickerUI(false, 'widget');
            setTimeout(() => location.reload(), 500);
        }
    } catch (e) { console.error(e); }
};

// ─── Notes Textarea Editor ────────────────────────────────────────────────────

window.insertNoteFormat = function (type, targetId = 'note_textarea') {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end   = textarea.selectionEnd;
    const text  = textarea.value;
    let insertion = '';
    let cursorOffset = 0;

    if      (type === 'bullet') { insertion = '\n- ';   cursorOffset = 3; }
    else if (type === 'number') { insertion = '\n1. ';  cursorOffset = 4; }
    else if (type === 'bold')   { insertion = '****';   cursorOffset = 2; }

    textarea.value = text.substring(0, start) + insertion + text.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
};

function setupNotesEditor(id) {
    const textarea = document.getElementById(id);
    if (!textarea) return;

    textarea.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const start = this.selectionStart;
            const text  = this.value;
            const lineStart   = text.lastIndexOf('\n', start - 1) + 1;
            const currentLine = text.substring(lineStart, start);
            const match = currentLine.match(/^(\s*([-*]|\d+\.))\s+/);
            if (match) {
                e.preventDefault();
                const prefix = match[1] + ' ';
                this.value = text.substring(0, start) + '\n' + prefix + text.substring(start);
                this.setSelectionRange(start + prefix.length + 1, start + prefix.length + 1);
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            }
        }
    });
}

// ─── Language Rule Widget ─────────────────────────────────────────────────────

window.toggleRule = function () {
    const ru = document.getElementById('rule-ru');
    const en = document.getElementById('rule-en');
    if (!ru || !en) return;
    const showRu = ru.style.display === 'none';
    ru.style.display = showRu ? 'block' : 'none';
    en.style.display = showRu ? 'none'  : 'block';
};

window.refreshRule = async function () {
    try {
        const response = await fetch('/get_random_rule');
        const data = await response.json();
        const langEl = document.getElementById('rule-lang');
        const ruEl   = document.getElementById('rule-ru');
        const enEl   = document.getElementById('rule-en');
        if (langEl) langEl.innerText = data.language;
        if (ruEl)   ruEl.innerText   = data.rule_ru;
        if (enEl)   enEl.innerText   = data.rule_en;
        if (ruEl && enEl) {
            if (ruEl.style.display === 'none') { enEl.style.display = 'block'; }
            else { ruEl.style.display = 'block'; }
        }
    } catch (e) { console.error('Rule refresh failed', e); }
};

// ─── Dialectics Pinning ──────────────────────────────────────────────────────

window.pinDialectics = async function (id) {
    try {
        const resp = await fetch(`/api/dialectics/${id}/pin`, { method: 'POST' });
        if (resp.ok) {
            showToast('✓ Dialectics pinned to Dashboard', 'success');
            setTimeout(() => location.reload(), 500);
        }
    } catch (e) { console.error(e); }
};

window.unpinDialectics = async function (id) {
    try {
        const resp = await fetch(`/api/dialectics/${id}/unpin`, { method: 'POST' });
        if (resp.ok) {
            showToast('✓ Dialectics unpinned', 'success');
            setTimeout(() => location.reload(), 500);
        }
    } catch (e) { console.error(e); }
};

// ─── Note Category Sync ───────────────────────────────────────────────────────

function syncNoteCategory() {
    const select = document.querySelector('.note-section select[name="category"]');
    const hidden = document.getElementById('note_category_hidden');
    if (!select || !hidden) return;
    if (select.value) hidden.value = select.value;
    select.addEventListener('change', function () { hidden.value = this.value; });
}

// ─── Initializer ─────────────────────────────────────────────────────────────

export function initNoteChronoWidget() {
    // Textarea editors
    setupNotesEditor('note_textarea');
    setupNotesEditor('expandNoteText');

    // Note category hidden field sync
    syncNoteCategory();

    // Form submit listeners
    document.querySelectorAll('.chrono-form').forEach(f => {
        if (!f.getAttribute('onsubmit')) f.addEventListener('submit', window.saveQuickChrono);
    });
    document.querySelectorAll('form[action="/add_note"]').forEach(f => {
        if (!f.getAttribute('onsubmit')) f.addEventListener('submit', window.saveQuickNote);
    });
}
