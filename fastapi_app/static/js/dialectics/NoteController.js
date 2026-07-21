/**
 * NoteController.js - Фасад-координатор для управления конспектами, историей, версиями, стикерами и экспортом
 * Разделен на модули:
 * - controller/NoteStorageService.js
 * - controller/NoteHistoryManager.js
 * - controller/NoteVersionsService.js
 * - controller/NoteStickersService.js
 * - controller/NoteExportService.js
 */
import { NoteStorageService } from './controller/NoteStorageService.js';
import { NoteHistoryManager } from './controller/NoteHistoryManager.js';
import { NoteVersionsService } from './controller/NoteVersionsService.js';
import { NoteStickersService } from './controller/NoteStickersService.js';
import { NoteExportService } from './controller/NoteExportService.js';

export const NoteControllerMixin = {
    // NoteStorageService
    async saveGlobal(shouldClose = true, toastKey = "toast.dialectics_saved") {
        return NoteStorageService.saveGlobal(this, shouldClose, toastKey);
    },
    async saveAndPin() {
        return NoteStorageService.saveAndPin(this);
    },
    async loadNoteToEditor(id, addToHistory = true, noteData = null) {
        return NoteStorageService.loadNoteToEditor(this, id, addToHistory, noteData);
    },
    async createNewNote() {
        return NoteStorageService.createNewNote(this);
    },
    _resetToNewNote() {
        return NoteStorageService._resetToNewNote(this);
    },
    async loadExample(type = null) {
        return NoteStorageService.loadExample(this, type);
    },
    async loadExampleNoteByType(type = 'pythagoras') {
        return NoteStorageService.loadExampleNoteByType(this, type);
    },

    // NoteHistoryManager
    getNoteHistory() {
        return NoteHistoryManager.getNoteHistory();
    },
    saveNoteHistory(history) {
        return NoteHistoryManager.saveNoteHistory(history);
    },
    async loadPreviousNote() {
        return NoteHistoryManager.loadPreviousNote(this);
    },
    goToBlock(blockId) {
        return NoteHistoryManager.goToBlock(this, blockId);
    },

    // NoteVersionsService
    updateCurrentVersionDisplay(note) {
        return NoteVersionsService.updateCurrentVersionDisplay(this, note);
    },
    toggleVersionsMenu(e) {
        return NoteVersionsService.toggleVersionsMenu(this, e);
    },
    async loadVersions() {
        return NoteVersionsService.loadVersions(this);
    },
    async saveManualVersion() {
        return NoteVersionsService.saveManualVersion(this);
    },
    async restoreVersion(versionId) {
        return NoteVersionsService.restoreVersion(this, versionId);
    },
    async togglePinVersion(versionId) {
        return NoteVersionsService.togglePinVersion(this, versionId);
    },
    async deleteVersion(versionId) {
        return NoteVersionsService.deleteVersion(this, versionId);
    },

    // NoteStickersService
    async openStickersForCurrent(forceBlockId = undefined) {
        return NoteStickersService.openStickersForCurrent(this, forceBlockId);
    },
    updateGlobalStickersBadge() {
        return NoteStickersService.updateGlobalStickersBadge(this);
    },
    async refreshStickers() {
        return NoteStickersService.refreshStickers(this);
    },
    async deleteStickersForBlock(blockId) {
        return NoteStickersService.deleteStickersForBlock(this, blockId);
    },

    // NoteExportService
    updateStatusButtonDisplay(status = 'none') {
        return NoteExportService.updateStatusButtonDisplay(this, status);
    },
    async toggleCurrentNoteStatus(e) {
        return NoteExportService.toggleCurrentNoteStatus(this, e);
    },
    exportMarkdown() {
        return NoteExportService.exportMarkdown(this);
    },
    exportPDF() {
        return NoteExportService.exportPDF(this);
    }
};
