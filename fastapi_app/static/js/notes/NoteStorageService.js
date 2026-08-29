import AppState from './AppState.js';
import NotesAPI from './api.js';
import BlockDOMParser from './BlockDOMParser.js';

class NoteStorageService {
    static async loadNote(noteId) {
        try {
            const note = await NotesAPI.getNote(noteId);
            AppState.setNote(note);
            try { localStorage.setItem('papanda_last_note_id', note.id); } catch {}
            return note;
        } catch (e) {
            console.error('Failed to load note', e);
            throw e;
        }
    }

    static async saveCurrentNote() {
        // Синхронизируем DOM перед сохранением, так как редактор мог изменить HTML
        BlockDOMParser.syncDOMToState();

        const titleInput = document.getElementById('note-title');
        if (titleInput && titleInput.value.trim()) {
            AppState.currentNote.title = titleInput.value.trim();
        }

        if (!AppState.isDirty && AppState.currentNote && AppState.currentNote.id) {
            return AppState.currentNote;
        }

        const data = {
            title: AppState.currentNote.title || '',
            blocks: AppState.currentNote.blocks || [],
            category_id: AppState.currentNote.category_id,
            status: AppState.currentNote.status || 'in_progress'
        };

        try {
            let res;
            if (AppState.currentNote.id) {
                res = await NotesAPI.updateNote(AppState.currentNote.id, data);
            } else {
                res = await NotesAPI.createNote(data);
            }
            AppState.setNote(res);
            try { localStorage.setItem('papanda_last_note_id', res.id); } catch {}
            return res;
        } catch (e) {
            console.error('Failed to save note', e);
            throw e;
        }
    }
}

export default NoteStorageService;
