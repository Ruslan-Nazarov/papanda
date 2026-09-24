import AppState from './AppState.js';
import NotesAPI from './api.js';
import BlockDOMParser from './BlockDOMParser.js';

class SaveCoordinator {
    static _jobs = new WeakMap();
    static _pendingById = new Map();

    static _sync(note) {
        if (AppState.currentNote !== note) return;
        BlockDOMParser.syncDOMToState();
        const input = document.getElementById('note-title');
        if (input && input.value.trim() !== note.title) {
            AppState.updateNote({title: input.value.trim()});
        }
    }

    static _payload(note) {
        // Snapshot nested blocks as well: later editor mutations cannot change a request.
        return JSON.parse(JSON.stringify({title: note.title || '', blocks: note.blocks || [],
            category_id: note.category_id ?? null, status: note.status || 'in_progress'}));
    }

    static saveCurrentNote() {
        const note = AppState.currentNote;
        this._sync(note);
        const running = this._jobs.get(note);
        if (running) return running;
        if (!AppState.isDirty && note.id) return Promise.resolve(note);

        const previous = note.id ? this._pendingById.get(String(note.id)) : null;
        const pending = this._save(note, previous).finally(() => {
            this._jobs.delete(note);
            if (this._pendingById.get(String(note.id)) === pending) {
                this._pendingById.delete(String(note.id));
            }
        });
        this._jobs.set(note, pending);
        if (note.id) this._pendingById.set(String(note.id), pending);
        return pending;
    }

    static async _save(note, previous) {
        if (previous) await previous;
        for (;;) {
            this._sync(note);
            const revision = AppState.currentNote === note ? AppState.editRevision : null;
            const payload = this._payload(note);
            const res = note.id ? await NotesAPI.updateNote(note.id, {...payload, revision: note.revision})
                : await NotesAPI.createNote(payload);
            AppState.acceptSaveIdentity(note, res);
            const job = this._jobs.get(note);
            if (job && !this._pendingById.has(String(note.id))) {
                this._pendingById.set(String(note.id), job);
            }
            this._sync(note);
            const active = AppState.currentNote === note;
            const changed = JSON.stringify(this._payload(note)) !== JSON.stringify(payload)
                || (active && revision !== AppState.editRevision);
            if (changed) continue; // Flush the newer revision, never overwrite it with res.

            AppState.acceptSaved(note, res, payload);
            if (active) {
                try { localStorage.setItem('papanda_last_note_id', res.id); } catch {}
            }
            return note;
        }
    }

    static async saveCopy() {
        const note = AppState.currentNote;
        this._sync(note);
        const copy = this._payload(note);
        AppState.setNote({...copy, id: null, revision: null});
        AppState.markDirty();
        return this.saveCurrentNote();
    }
}

export default SaveCoordinator;
