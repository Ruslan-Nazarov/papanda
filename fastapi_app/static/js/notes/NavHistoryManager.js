import NoteStorageService from './NoteStorageService.js';
import DialogService from './DialogService.js';

import { t } from '../i18n.js';
export class NavHistoryManager {
    static _navHistory = [];

    static push(noteId) {
        if (!noteId) return;
        if (this._navHistory[this._navHistory.length - 1] !== noteId) {
            this._navHistory.push(noteId);
            if (this._navHistory.length > 50) this._navHistory.shift();
        }
    }

    static async goBack() {
        if (this._navHistory.length >= 2) {
            this._navHistory.pop(); // Pop current
            const prevId = this._navHistory[this._navHistory.length - 1];
            await NoteStorageService.loadNote(prevId);
        } else {
            await DialogService.alert(t('back_word'), t('nav_no_prev'));
        }
    }
}

export default NavHistoryManager;
