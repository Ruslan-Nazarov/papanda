/**
 * BlocksOrchestrator.js - Фасад оркестратора блоков конспектов Dialectics
 * Разделен на модули: OrchestratorState, FloatingEditorManager, InlineEditorManager, BlockDnDManager, BlockSectionsManager, BlockStickersManager.
 */
import { OrchestratorState } from './orchestrator/OrchestratorState.js';
import { FloatingEditorManager } from './orchestrator/FloatingEditorManager.js';
import { InlineEditorManager } from './orchestrator/InlineEditorManager.js';
import { BlockDnDManager } from './orchestrator/BlockDnDManager.js';
import { BlockSectionsManager } from './orchestrator/BlockSectionsManager.js';
import { BlockStickersManager } from './orchestrator/BlockStickersManager.js';
import { DialecticsLogger } from './DialecticsLogger.js';

class BlocksOrchestratorClass {
    resolveLiveBlock(blockOrId) {
        if (!blockOrId) return null;
        if (typeof blockOrId === 'string') {
            return this.dom?.canvas?.querySelector(`.dialectics-block[data-block-id="${blockOrId}"], .dialectics-block[data-id="${blockOrId}"], #${blockOrId}`) || null;
        }
        const blockId = blockOrId.dataset?.blockId || blockOrId.dataset?.id || blockOrId.id;
        if (blockId) {
            const live = this.dom?.canvas?.querySelector(`.dialectics-block[data-block-id="${blockId}"], .dialectics-block[data-id="${blockId}"], #${blockId}`);
            if (live) return live;
        }
        return blockOrId;
    }

    // --- Floating Editor ---
    open(content = '') { return FloatingEditorManager.open(window.app || this, content); }
    createFloatingEditor(block, content, title, fullscreen = false) { return FloatingEditorManager.createFloatingEditor(window.app || this, block, content, title, fullscreen); }
    bringToFront(win) { return FloatingEditorManager.bringToFront(win); }
    getNextZIndex() { return FloatingEditorManager.getNextZIndex(); }
    setupWindowTabs(win) { return FloatingEditorManager.setupWindowTabs(win); }
    switchWindowTab(win, tabId) { return FloatingEditorManager.switchWindowTab(win, tabId); }
    closeFloatingEditor(block) { return FloatingEditorManager.closeFloatingEditor(window.app || this, block); }
    destroyFloatingEditorWindow(win, blockOrId) { return FloatingEditorManager.destroyFloatingEditorWindow(window.app || this, win, blockOrId); }
    saveFloatingEditor(block) { return FloatingEditorManager.saveFloatingEditor(window.app || this, block); }
    saveAllEditorsState() { return FloatingEditorManager.saveAllEditorsState(); }

    // --- Inline Editor ---
    cleanUpInlineEdit() { return InlineEditorManager.cleanUpInlineEdit(window.app || this); }
    cleanUpAllInlineEditors() { return InlineEditorManager.cleanUpAllInlineEditors(window.app || this); }
    cleanUpInlineEditForBlock(block) { return InlineEditorManager.cleanUpInlineEditForBlock(window.app || this, block); }
    saveInlineEdit() { return InlineEditorManager.saveInlineEdit(window.app || this); }
    saveInlineEditForBlock(block) { return InlineEditorManager.saveInlineEditForBlock(window.app || this, block); }
    cancelInlineEdit() { return InlineEditorManager.cancelInlineEdit(window.app || this); }
    cancelInlineEditForBlock(block) { return InlineEditorManager.cancelInlineEditForBlock(window.app || this, block); }
    detachInlineEdit(fullscreen = false) { return InlineEditorManager.detachInlineEdit(window.app || this, fullscreen); }
    detachInlineEditForBlock(block, fullscreen = false) { return InlineEditorManager.detachInlineEditForBlock(window.app || this, block, fullscreen); }
    openEdit(block) { return InlineEditorManager.openEdit(window.app || this, block); }
    openEditAltCard(altCardEl, blockEl) { return InlineEditorManager.openEditAltCard(window.app || this, altCardEl, blockEl); }
    close(confirmIfDirty = true) { return InlineEditorManager.close(window.app || this, confirmIfDirty); }

    // --- Global & DnD & Events ---
    save() { if (this.saveGlobal) this.saveGlobal(false, "toast.dialectics_saved"); }
    bindEvents() { return BlockDnDManager.bindEvents(window.app || this); }
    initHintEvents() { return BlockDnDManager.initHintEvents(window.app || this); }
    openHintEditor(hint, content = '', aiHtml = null) { return BlockDnDManager.openHintEditor(window.app || this, hint, content, aiHtml); }
    toggleExpand() { return BlockDnDManager.toggleExpand(window.app || this); }
    dismissHint(hintId) { return BlockDnDManager.dismissHint(window.app || this, hintId); }
    toggleShowHiddenHints(checked) { return BlockDnDManager.toggleShowHiddenHints(window.app || this, checked); }
    _blockCallbacks() { return BlockDnDManager.getBlockCallbacks(window.app || this); }

    // --- Sections & TOC & Search ---
    addSectionBlock() { return BlockSectionsManager.addSectionBlock(window.app || this); }
    openSectionTitleModal(index = null, existingBlock = null) { return BlockSectionsManager.openSectionTitleModal(window.app || this, index, existingBlock); }
    closeSectionTitleModal() { return BlockSectionsManager.closeSectionTitleModal(window.app || this); }
    saveSectionTitle() { return BlockSectionsManager.saveSectionTitle(window.app || this); }
    toggleTableOfContents(e) { return BlockSectionsManager.toggleTableOfContents(window.app || this, e); }
    updateTableOfContents() { return BlockSectionsManager.updateTableOfContents(window.app || this); }
    toggleSearchInNote(e) { return BlockSectionsManager.toggleSearchInNote(window.app || this, e); }
    performSearchInNote(query) { return BlockSectionsManager.performSearchInNote(window.app || this, query); }

    // --- Stickers & Modals ---
    initStickersModal() { return BlockStickersManager.initStickersModal(window.app || this); }
    renderStickersListInModal(blockId) { return BlockStickersManager.renderStickersListInModal(window.app || this, blockId); }
    renderStickersForBlock(blockEl) { return BlockStickersManager.renderStickersForBlock(blockEl); }
    openSourcesModal(blockEl) { return BlockStickersManager.openSourcesModal(window.app || this, blockEl); }
    openWordsModal(blockEl) { return BlockStickersManager.openWordsModal(window.app || this, blockEl); }
    openColorModal(blockEl) { return BlockStickersManager.openColorModal(window.app || this, blockEl); }
    openHacksPopover(blockEl) { return BlockStickersManager.openHacksPopover(window.app || this, blockEl); }

    // Методы-обертки при вызове на отдельном экземпляре (но исключенные из миксина ниже, чтобы не было рекурсии)
    _forwardToApp(method, ...args) {
        if (window.app && typeof window.app[method] === 'function') {
            return window.app[method](...args);
        }
    }
    openInsertAfter(side, index) { return this._forwardToApp('openInsertAfter', side, index); }
    runAI(b) { return this._forwardToApp('runAI', b); }
    checkAI(b) { return this._forwardToApp('checkAI', b); }
    runHintAI(hint) { return this._forwardToApp('runHintAI', hint); }
    deleteStickersForBlock(id) { return this._forwardToApp('deleteStickersForBlock', id); }
    saveGlobal(...args) { return this._forwardToApp('saveGlobal', ...args); }
}

export const BlocksOrchestratorMixin = {};
const IGNORED_MIXIN_METHODS = ['constructor', '_forwardToApp', 'openInsertAfter', 'runAI', 'checkAI', 'runHintAI', 'deleteStickersForBlock', 'saveGlobal'];
Object.getOwnPropertyNames(BlocksOrchestratorClass.prototype).forEach(key => {
    if (!IGNORED_MIXIN_METHODS.includes(key)) {
        BlocksOrchestratorMixin[key] = BlocksOrchestratorClass.prototype[key];
    }
});


DialecticsLogger.info('BlocksOrchestrator', 'Инициализирован модульный фасад BlocksOrchestrator');
