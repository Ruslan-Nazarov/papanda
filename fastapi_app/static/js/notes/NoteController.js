import AppState from './AppState.js';
import NoteStorageService from './NoteStorageService.js';
import NotesAPI from './api.js';
import { showToast } from './ToastService.js';
import DialogService from './DialogService.js';
import { t } from '../i18n.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const AUTOSAVE_DELAY_MS = 30_000;        // 30 seconds debounce
const SESSION_CHECKPOINT_INTERVAL = 900_000; // 15 minutes of real editing

class NoteController {
    // ── Autosave state ────────────────────────────────────────────────────────
    static _autosaveTimer = null;
    static _lastSavedAt = null;
    static _statusInterval = null;
    static _sessionCheckpointTimer = null;
    static _conflictedNote = null;

    // ── Init ──────────────────────────────────────────────────────────────────
    static init() {
        // Listen for any state change → schedule autosave
        document.addEventListener('stateDirty', () => {
            this._scheduleAutosave();
            this._updateStatusIndicator();
        });

        // Listen for note load → reset timers and update indicator
        document.addEventListener('noteLoaded', () => {
            this._conflictedNote = null;
            this._clearAutosaveTimer();
            this._lastSavedAt = new Date();
            this._updateStatusIndicator();
            this._scheduleSessionCheckpoint();
        });
        document.addEventListener('noteSaved', () => {
            this._conflictedNote = null;
            this._lastSavedAt = new Date();
            this._updateStatusIndicator();
        });

        // Warn on page close if dirty
        window.addEventListener('beforeunload', (e) => {
            if (AppState.isDirty) {
                e.preventDefault();
                e.returnValue = t('unsaved_changes_warning');
            }
        });

        // Update "saved X sec ago" text every 30 seconds
        this._statusInterval = setInterval(() => this._updateStatusIndicator(), 30_000);
    }

    // ── Autosave (silent, no checkpoint) ──────────────────────────────────────
    static _scheduleAutosave() {
        clearTimeout(this._autosaveTimer);
        this._autosaveTimer = setTimeout(() => {
            this._doAutosave();
        }, AUTOSAVE_DELAY_MS);
    }

    static _clearAutosaveTimer() {
        clearTimeout(this._autosaveTimer);
        this._autosaveTimer = null;
    }

    static async _doAutosave() {
        if (!AppState.isDirty) return;
        const note = AppState.currentNote;
        if (this._conflictedNote === note) return;
        try {
            this._setStatus('saving');
            await NoteStorageService.saveCurrentNote();
            if (AppState.currentNote === note) this._updateStatusIndicator();
        } catch (e) {
            if (e.status === 409 && AppState.currentNote === note) this._conflictedNote = note;
            if (AppState.currentNote === note) this._setStatus(e.status === 409 ? 'conflict' : 'error');
            console.error('Autosave failed:', e);
        }
    }

    // ── Session checkpoint (auto, every 15 minutes) ──────────────────────────
    static _scheduleSessionCheckpoint() {
        clearTimeout(this._sessionCheckpointTimer);
        this._sessionCheckpointTimer = setTimeout(async () => {
            if (!AppState.currentNote.id) return;
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            try {
                const saved = await NoteStorageService.saveCurrentNote(); // flush first
                await NotesAPI.createCheckpoint(
                    saved.id,
                    `${t('session')} ${dateStr}`,
                    false // is_manual = false (auto-checkpoint)
                );
            } catch (e) {
                console.error('Session checkpoint failed:', e);
            }
            // Schedule next
            this._scheduleSessionCheckpoint();
        }, SESSION_CHECKPOINT_INTERVAL);
    }

    // ── Manual save (flush immediately, no checkpoint) ────────────────────────
    static async saveCurrentNote() {
        const note = AppState.currentNote;
        this._clearAutosaveTimer();
        try {
            this._setStatus('saving');
            const saved = await NoteStorageService.saveCurrentNote();
            if (AppState.currentNote === note) this._updateStatusIndicator();
            return saved;
        } catch (e) {
            if (AppState.currentNote === note) this._setStatus('error');
            if (e.status === 409 && AppState.currentNote === note) {
                this._conflictedNote = note;
                this._setStatus('conflict');
                const copy = await DialogService.confirm({title: t('save_conflict_title'),
                    message: t('save_conflict_message'), confirmText: t('save_conflict_copy')});
                if (copy && AppState.currentNote === note) return NoteStorageService.saveCopy();
            }
            console.error('Save failed:', e);
            throw e;
        }
    }

    // ── Create named checkpoint (manual version pin) ───────────────────────────
    static async createCheckpoint(customTitle = null) {
        // First make sure data is saved
        const saved = await this.saveCurrentNote();
        if (!saved.id) return;

        let title = customTitle;
        if (!title) {
            const defaultTitle = `${t('version')} ${new Date().toLocaleDateString()}`;
            title = await DialogService.prompt({
                title: t('checkpoint_dialog_title'),
                message: t('checkpoint_dialog_msg'),
                defaultValue: defaultTitle,
                icon: '📌',
                confirmText: t('save')
            });
            if (title === null) return; // cancelled
            if (!title.trim()) title = defaultTitle;
        }

        try {
            await NotesAPI.createCheckpoint(saved.id, title, true);
            showToast(`${t('checkpoint_saved')}: «${title}»`);
        } catch (e) {
            console.error('Checkpoint failed:', e);
            showToast(t('checkpoint_error'), 'error');
        }
    }

    // ── Status indicator ──────────────────────────────────────────────────────
    static _setStatus(state) {
        const el = document.getElementById('save-status');
        if (!el) return;
        if (state === 'conflict') {
            el.className = 'save-status error';
            el.textContent = t('save_conflict_title');
        } else if (state === 'saving') {
            el.className = 'save-status saving';
            el.innerHTML = `<span class="save-dot"></span> ${t('saving')}`;
        } else if (state === 'saved') {
            el.className = 'save-status saved';
            el.innerHTML = `<span class="save-dot"></span> ${t('saved')}`;
            this._lastSavedAt = new Date();
        } else if (state === 'error') {
            el.className = 'save-status error';
            el.innerHTML = `<span class="save-dot"></span> ${t('error_saving')}`;
        }
    }

    static _updateStatusIndicator() {
        const el = document.getElementById('save-status');
        if (!el) return;
        if (this._conflictedNote === AppState.currentNote) {
            this._setStatus('conflict');
            return;
        }

        if (AppState.isDirty) {
            el.className = 'save-status dirty';
            el.innerHTML = `<span class="save-dot"></span> ${t('not_saved')}`;
            return;
        }

        if (this._lastSavedAt) {
            const secAgo = Math.round((Date.now() - this._lastSavedAt.getTime()) / 1000);
            let timeStr;
            if (secAgo < 60) timeStr = t('time_sec_ago').replace('{t}', secAgo);
            else if (secAgo < 3600) timeStr = t('time_min_ago').replace('{t}', Math.round(secAgo / 60));
            else timeStr = this._lastSavedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            el.className = 'save-status saved';
            el.innerHTML = `<span class="save-dot"></span> ${t('saved_at')} ${timeStr}`;
        }
    }

    // ── Progress bar ──────────────────────────────────────────────────────────
    static updateProgress() {
        const blocks = AppState.currentNote.blocks.filter(b => b.role !== 'section' && !b.isDraft);
        const total = blocks.length;

        const readyEl = document.getElementById('progress-ready');
        const inProgressEl = document.getElementById('progress-in-progress');
        const textEl = document.getElementById('progress-text');

        if (total === 0) {
            if (readyEl) readyEl.style.width = '0%';
            if (inProgressEl) inProgressEl.style.width = '0%';
            if (textEl) textEl.textContent = '0%';
            return;
        }

        const ready = blocks.filter(b => b.status === 'ready' || b.status === 'done').length;
        const inProgress = blocks.filter(b => b.status === 'in_progress').length;

        if (readyEl) readyEl.style.width = `${(ready / total) * 100}%`;
        if (inProgressEl) inProgressEl.style.width = `${(inProgress * 0.5 / total) * 100}%`;
        if (textEl) textEl.textContent = `${Math.round(((ready + inProgress * 0.5) / total) * 100)}%  ● ${inProgress}  ● ${ready} / ${total}`;
    }

    // ── Toast helper ──────────────────────────────────────────────────────────
    static _showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('toast--visible'));
        setTimeout(() => {
            toast.classList.remove('toast--visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

export default NoteController;
