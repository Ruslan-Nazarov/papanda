import AppState from './AppState.js';
import NotesAPI from './api.js';
import SaveCoordinator from './SaveCoordinator.js';
import NoteLocation from './NoteLocation.js';
import { t } from '../i18n.js';

class NoteStorageService {
    static _loadSequence = 0;

    static async openNote(noteId) {
        return this.loadNote(noteId, {preserveChanges: true});
    }

    static async createNewNote({preserveChanges = true} = {}) {
        const epoch = AppState.documentEpoch;
        if (preserveChanges && AppState.isDirty) await this.saveCurrentNote();
        if (epoch !== AppState.documentEpoch) return;
        ++this._loadSequence;
        NoteLocation.clear();
        AppState.setNote({id: null, title: t('menu_new_note'), blocks: []});
        return AppState.currentNote;
    }

    static async loadNote(noteId, {preserveChanges = false} = {}) {
        const sequence = ++this._loadSequence;
        const epoch = AppState.documentEpoch;
        try {
            if (preserveChanges && AppState.isDirty) await this.saveCurrentNote();
            if (sequence !== this._loadSequence || epoch !== AppState.documentEpoch) return;
            if (preserveChanges && String(noteId) === String(AppState.currentNote.id)) return AppState.currentNote;
            await SaveCoordinator._pendingById.get(String(noteId));
            const note = await NotesAPI.getNote(noteId);
            if (note.is_deleted) throw Object.assign(new Error('Note is in the trash'), {status: 404});
            if (sequence === this._loadSequence && epoch === AppState.documentEpoch) {
                // Editing may continue while the target note is being fetched.
                if (preserveChanges && AppState.isDirty) await this.saveCurrentNote();
                if (sequence !== this._loadSequence || epoch !== AppState.documentEpoch) return;
                AppState.setNote(note);
                NoteLocation.remember(note.id);
            }
            return note;
        } catch (e) {
            console.error('Failed to load note', e);
            throw e;
        }
    }

    static saveCurrentNote() { return SaveCoordinator.saveCurrentNote(); }
    static saveCopy() { return SaveCoordinator.saveCopy(); }
}

export default NoteStorageService;
