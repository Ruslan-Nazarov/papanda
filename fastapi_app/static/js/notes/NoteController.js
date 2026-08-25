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

    // ── Init ──────────────────────────────────────────────────────────────────
    static init() {
        // Listen for any state change → schedule autosave
        document.addEventListener('stateDirty', () => {
            this._scheduleAutosave();
            this._updateStatusIndicator();
        });

        // Listen for note load → reset timers and update indicator
        document.addEventListener('noteLoaded', () => {
            this._clearAutosaveTimer();
            this._lastSavedAt = new Date();
            this._updateStatusIndicator();
            this._scheduleSessionCheckpoint();
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
        if (!AppState.isDirty || !AppState.currentNote.id) return;
        try {
            this._setStatus('saving');
            await NoteStorageService.saveCurrentNote();
            this._lastSavedAt = new Date();
            this._setStatus('saved');
        } catch (e) {
            this._setStatus('error');
            console.error('Autosave failed:', e);
        }
    }

    // ── Session checkpoint (auto, every 2 hours of editing) ───────────────────
    static _scheduleSessionCheckpoint() {
        clearTimeout(this._sessionCheckpointTimer);
        this._sessionCheckpointTimer = setTimeout(async () => {
            if (!AppState.currentNote.id) return;
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            try {
                await NoteStorageService.saveCurrentNote(); // flush first
                await NotesAPI.createCheckpoint(
                    AppState.currentNote.id,
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
        if (!AppState.isDirty) {
            this._setStatus('saved');
            return;
        }
        this._clearAutosaveTimer();
        try {
            this._setStatus('saving');
            await NoteStorageService.saveCurrentNote();
            this._lastSavedAt = new Date();
            this._setStatus('saved');
        } catch (e) {
            this._setStatus('error');
            console.error('Save failed:', e);
        }
    }

    // ── Create named checkpoint (manual version pin) ───────────────────────────
    static async createCheckpoint(customTitle = null) {
        // First make sure data is saved
        await this.saveCurrentNote();
        if (!AppState.currentNote.id) return;

        let title = customTitle;
        if (!title) {
            const defaultTitle = `${t('version') || 'Версия'} ${new Date().toLocaleDateString('ru-RU')}`;
            title = await DialogService.prompt({
                title: 'Сохранение версии',
                message: t('checkpoint_name_prompt') || 'Введите название точки сохранения:',
                defaultValue: defaultTitle,
                icon: '📌',
                confirmText: 'Сохранить'
            });
            if (title === null) return; // cancelled
            if (!title.trim()) title = defaultTitle;
        }

        try {
            await NotesAPI.createCheckpoint(AppState.currentNote.id, title, true);
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
        if (state === 'saving') {
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
            el.innerHTML = `<span class="save-dot"></span> Сохранено ${timeStr}`;
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
