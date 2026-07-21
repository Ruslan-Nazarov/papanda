/**
 * ModalsController.js - Фасад-координатор модальных окон, категорий и связей Диалектики
 * Декомпозирован на:
 * - modals/LoadNotesModalService.js (открытие конспектов, корзина, удаление, закрепление, статусы)
 * - modals/GuideViewModalService.js (инструкция, справочник, просмотр конспекта)
 * - modals/ConnectionsModalService.js (категории и связи)
 */
import { LoadNotesModalService } from './modals/LoadNotesModalService.js';
import { GuideViewModalService } from './modals/GuideViewModalService.js';
import { ConnectionsModalService } from './modals/ConnectionsModalService.js';

export const ModalsControllerMixin = {
    // GuideViewModalService
    async showReferenceModal() {
        return GuideViewModalService.showReferenceModal(this);
    },
    async showGuideModal() {
        return GuideViewModalService.showGuideModal(this);
    },
    hideGuideModal() {
        return GuideViewModalService.hideGuideModal(this);
    },
    showViewModal(id, title, blocks) {
        return GuideViewModalService.showViewModal(this, id, title, blocks);
    },
    hideViewModal() {
        return GuideViewModalService.hideViewModal(this);
    },

    // LoadNotesModalService
    showLoadModal() {
        return LoadNotesModalService.showLoadModal(this);
    },
    hideLoadModal() {
        return LoadNotesModalService.hideLoadModal(this);
    },
    async searchNotes(query) {
        return LoadNotesModalService.searchNotes(this, query);
    },
    renderNotesList(notes) {
        return LoadNotesModalService.renderNotesList(this, notes);
    },
    async showTrashModal() {
        return LoadNotesModalService.showTrashModal(this);
    },
    renderTrashList(trash, container) {
        return LoadNotesModalService.renderTrashList(this, trash, container);
    },
    async deleteGlobal() {
        return LoadNotesModalService.deleteGlobal(this);
    },
    async pinCurrent() {
        return LoadNotesModalService.pinCurrent(this);
    },
    async toggleListNoteStatus(e, noteId, el) {
        return LoadNotesModalService.toggleListNoteStatus(this, e, noteId, el);
    },

    // ConnectionsModalService
    async loadCategories() {
        return ConnectionsModalService.loadCategories(this);
    },
    renderCategorySelect() {
        return ConnectionsModalService.renderCategorySelect(this);
    },
    renderConnectionsCategories() {
        return ConnectionsModalService.renderConnectionsCategories(this);
    },
    async addCategory(e) {
        return ConnectionsModalService.addCategory(this, e);
    },
    async createNewCategory(name) {
        return ConnectionsModalService.createNewCategory(this, name);
    },
    async showConnectionsModal(e) {
        return ConnectionsModalService.showConnectionsModal(this, e);
    },
    hideConnectionsModal() {
        return ConnectionsModalService.hideConnectionsModal(this);
    },
    async searchConnections(query) {
        return ConnectionsModalService.searchConnections(this, query);
    },
    async searchConnectionsByCategory(categoryId, categoryName) {
        return ConnectionsModalService.searchConnectionsByCategory(this, categoryId, categoryName);
    }
};
