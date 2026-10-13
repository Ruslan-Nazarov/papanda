import AppState from './AppState.js';
import NoteController from './NoteController.js';
import { showToast } from './ToastService.js';
import { t } from '../i18n.js';

class NoteNoticeManager {
    static init() {
        this.button = document.getElementById('btn-note-notice');
        this.editor = document.getElementById('note-notice-editor');
        this.input = document.getElementById('note-notice-input');
        this.banner = document.getElementById('note-notice-banner');
        this.text = document.getElementById('note-notice-text');
        if (!this.button || !this.editor || !this.input || !this.banner || !this.text) return;

        this.button.addEventListener('click', () => this.editor.hidden ? this.open() : this.close());
        document.getElementById('btn-note-notice-edit').addEventListener('click', () => this.open());
        document.getElementById('btn-note-notice-save').addEventListener('click', () => this.commit(this.input.value));
        document.getElementById('btn-note-notice-cancel').addEventListener('click', () => this.close());
        document.getElementById('btn-note-notice-remove').addEventListener('click', () => this.commit(''));
        this.input.addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); this.close(); }
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                this.commit(this.input.value);
            }
        });
        document.addEventListener('noteOpened', () => { this.close(); this.render(); });
        document.addEventListener('stateDirty', () => this.render());
        document.addEventListener('noteSaved', () => this.render());
        this.render();
    }

    static open() {
        this.epoch = AppState.documentEpoch;
        this.input.value = AppState.currentNote.note_notice || '';
        this.editor.hidden = false;
        this.button.setAttribute('aria-expanded', 'true');
        this.render();
        this.input.focus();
    }

    static close() {
        if (!this.editor) return;
        this.editor.hidden = true;
        this.button.setAttribute('aria-expanded', 'false');
        this.render();
    }

    static render() {
        if (!this.banner || !this.text) return;
        const notice = AppState.currentNote.note_notice || '';
        this.text.textContent = notice;
        this.banner.hidden = !notice || !this.editor.hidden;
        this.button.classList.toggle('has-notice', Boolean(notice));
        document.getElementById('btn-note-notice-remove').hidden = !notice;
    }

    static async commit(value) {
        if (this.epoch !== AppState.documentEpoch) { this.close(); return; }
        const notice = value.trim();
        if (notice.length > 5000) return;
        if (notice === (AppState.currentNote.note_notice || '')) { this.close(); return; }
        AppState.updateNote({note_notice: notice});
        this.close();
        try {
            await NoteController.saveCurrentNote();
        } catch {
            showToast(t('note_notice_save_failed'), 'error');
        }
    }
}

export default NoteNoticeManager;
