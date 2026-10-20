import AppState from './AppState.js';
import DialogService from './DialogService.js';
import NotesAPI from './api.js';
import NoteSnapshot from './NoteSnapshot.js';
import NoteStorageService from './NoteStorageService.js';
import { showToast } from './ToastService.js';
import { t } from '../i18n.js';

class NoteImportService {
    static busy = false;

    static chooseFile() {
        if (this.busy) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.json,text/markdown,application/json';
        input.addEventListener('change', () => {
            if (input.files?.[0]) void this.importFile(input.files[0]);
        }, {once: true});
        input.click();
    }

    static async importFile(file) {
        if (this.busy) return;
        this.busy = true;
        try {
            if (file.size > NoteSnapshot.MAX_BYTES) throw new Error('snapshot_too_large');
            const payload = NoteSnapshot.detachReferences(NoteSnapshot.parse(await file.text()));
            const epoch = AppState.documentEpoch;
            const accepted = await DialogService.confirm({
                title: t('menu_import_snapshot'),
                message: `${payload.title || t('untitled')} — ${t('snapshot_blocks')}: ${payload.blocks.length}. ${t('snapshot_import_hint')}`,
                confirmText: t('snapshot_restore'),
            });
            if (!accepted || epoch !== AppState.documentEpoch) return;
            // A failed current save must prevent creating or switching to the copy.
            if (AppState.isDirty) await NoteStorageService.saveCurrentNote();
            if (epoch !== AppState.documentEpoch) return;
            const saved = await NotesAPI.createNote(payload);
            // Navigation and edits may continue during the request. Never steal a
            // newer document; loadNote also saves edits made while it fetches.
            if (epoch === AppState.documentEpoch) await NoteStorageService.openNote(saved.id);
            showToast(t('snapshot_imported'));
            return saved;
        } catch (error) {
            const key = ['snapshot_invalid', 'snapshot_version', 'snapshot_too_large'].includes(error.message)
                ? error.message : 'snapshot_import_failed';
            await DialogService.alert(t('error_word'), t(key));
        } finally {
            this.busy = false;
        }
    }
}

export default NoteImportService;
