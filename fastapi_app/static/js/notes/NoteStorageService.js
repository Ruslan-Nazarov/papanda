import AppState from './AppState.js';
import NotesAPI from './api.js';
import SaveCoordinator from './SaveCoordinator.js';

class NoteStorageService {
    static _loadSequence = 0;

    static async loadNote(noteId) {
        const sequence = ++this._loadSequence;
        const epoch = AppState.documentEpoch;
        try {
            await SaveCoordinator._pendingById.get(String(noteId));
            const note = await NotesAPI.getNote(noteId);
            if (sequence === this._loadSequence && epoch === AppState.documentEpoch) {
                AppState.setNote(note);
                try { localStorage.setItem('papanda_last_note_id', note.id); } catch {}
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
