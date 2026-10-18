import { t } from '../i18n.js';
import Lifecycle from './Lifecycle.js';
import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import EditorWindow from './EditorWindow.js';

class EditorManager {
    static active = null;
    static windows = new Map();
    static lifecycle = null;
    static dock = null;

    // Existing callers address the currently visible editor.
    static get currentEditor() { return this.active?.currentEditor || null; }
    static get currentBlockId() { return this.active?.currentBlockId || null; }
    static get session() { return this.active?.session || null; }
    static get shapesTab() { return this.active?.shapesTab || null; }
    static get graphTab() { return this.active?.graphTab || null; }
    static get draftArchive() { return this.active?.draftArchive || null; }

    static init() {
        if (this.lifecycle && !this.lifecycle.disposed) return;
        this.lifecycle = new Lifecycle();
        this.lifecycle.on(document, 'noteOpened', () => this.closeAll());
        this.lifecycle.on(document, 'stateDirty', () => {
            for (const window of [...this.windows.values()]) {
                if (!AppState.getBlock(window.currentBlockId)) this.closeWindow(window, false);
            }
        });
        this.lifecycle.on(document, 'openEditor', event => {
            const {blockId, el, textPosition} = event.detail;
            this.openModalEditor(blockId, el, textPosition);
        });
    }

    static dispose() {
        this.closeAll();
        this.lifecycle?.dispose();
        this.lifecycle = null;
    }

    static openModalEditor(blockId, blockEl, textPosition = null) {
        this.init();
        if (!AppState.getBlock(blockId)) return;
        if (this.windows.has(blockId)) {
            this.restore(blockId);
            return;
        }
        const opener = document.activeElement;
        this.minimize();
        const window = new EditorWindow(this);
        this.active = window;
        this.windows.set(blockId, window);
        window.open(blockId, blockEl, textPosition);
        window.opener = opener;
    }

    static minimize() {
        const window = this.active;
        if (!window) return;
        window.focusTarget = window.container.contains(document.activeElement) ? document.activeElement : null;
        window.scrollPositions = [...window.container.querySelectorAll('.modal-body, .modal-tiptap-content')]
            .map(element => ({element, top: element.scrollTop, left: element.scrollLeft}));
        window.container.querySelectorAll('.editor-size-popover, .editor-code-menu').forEach(menu => { menu.hidden = true; });
        window.container.querySelectorAll('[aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
        // TipTap's blur command clears the global selection on the next frame,
        // which could already belong to a different window by then.
        window.currentEditor?.view.dom.blur();
        // Retain the actual widgets, selection, undo history and unsaved fields.
        // Detached windows cannot intercept queries for active control IDs.
        window.container.remove();
        this.active = null;
        document.getElementById('modal-container')?.classList.add('hidden');
        this.renderDock();
        [...(this.dock?.children || [])].find(button => button.dataset.blockId === window.currentBlockId)?.focus({preventScroll: true});
    }

    static restore(blockId) {
        const window = this.windows.get(blockId);
        if (!window || this.active === window) return;
        if (window.epoch !== AppState.documentEpoch || !AppState.getBlock(blockId)) {
            this.closeWindow(window, false);
            return;
        }
        this.minimize();
        this.active = window;
        const container = document.getElementById('modal-container');
        container.replaceChildren(window.container);
        container.classList.remove('hidden');
        this.renderDock();
        // Keep a dragged window reachable after resizing while parked.
        const modal = window.container.querySelector('.modal-editor-floating');
        if (globalThis.innerWidth > 768 && !modal.classList.contains('expanded')) {
            const rect = modal.getBoundingClientRect();
            modal.style.left = `${Math.max(8, Math.min(rect.left, globalThis.innerWidth - rect.width - 8))}px`;
            modal.style.top = `${Math.max(8, Math.min(rect.top, globalThis.innerHeight - rect.height - 8))}px`;
        }
        if (window.focusTarget?.isConnected && window.focusTarget !== window.currentEditor?.view.dom) {
            window.focusTarget.focus({preventScroll: true});
        }
        else window.currentEditor?.view.focus();
        for (const {element, top, left} of window.scrollPositions || []) {
            element.scrollTop = top;
            element.scrollLeft = left;
        }
    }

    static renderDock() {
        this.dock?.remove();
        this.dock = null;
        const minimized = [...this.windows.values()].filter(window => window !== this.active);
        if (!minimized.length) return;
        const dock = document.createElement('nav');
        dock.className = 'editor-dock';
        dock.setAttribute('aria-label', t('ed_minimized'));
        for (const window of minimized) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'editor-dock-item';
            button.dataset.blockId = window.currentBlockId;
            const title = window.container.querySelector('.modal-title-input').value.trim() || t('ed_untitled');
            button.title = `${t('ed_restore')}: ${title}`;
            button.setAttribute('aria-label', button.title);
            const label = document.createElement('span');
            label.textContent = title;
            const icon = document.createElement('span');
            icon.className = 'editor-dock-restore';
            icon.textContent = '⤢';
            icon.setAttribute('aria-hidden', 'true');
            button.append(label, icon);
            button.addEventListener('click', () => this.restore(window.currentBlockId));
            dock.append(button);
        }
        document.body.append(dock);
        this.dock = dock;
    }

    static closeModal(save) {
        if (this.active) this.closeWindow(this.active, save);
    }

    static closeWindow(window, save, render = true) {
        const blockId = window.currentBlockId;
        const sameDocument = window.epoch === AppState.documentEpoch;
        this.windows.delete(blockId);
        const wasActive = this.active === window;
        if (wasActive) {
            this.active = null;
            document.getElementById('modal-container')?.classList.add('hidden');
        }
        window.dispose();
        if (sameDocument) {
            const block = AppState.getBlock(blockId);
            const discardDraft = !save && block?.isDraft;
            if (discardDraft) {
                if (block.request_document) AppState.updateBlock(blockId, {isDraft: false,
                    status: (block.html || '').trim() ? 'in_progress' : 'none'});
                else AppState.removeBlock(blockId);
            }
            if (render && (save || discardDraft)) BlockDOMRenderer.renderAll();
        }
        this.renderDock();
        if (wasActive && window.opener?.isConnected) window.opener.focus({preventScroll: true});
    }

    static closeAll() {
        for (const window of [...this.windows.values()]) this.closeWindow(window, false, false);
        this.dock?.remove();
        this.dock = null;
    }

    static handleSave() { return this.active?.handleSave(); }
    static triggerAutofill(html) { return EditorWindow.triggerAutofill(html); }
    static renderEditorHTML(options) { return EditorWindow.renderEditorHTML(options); }
    static escapeHtml(text) { return EditorWindow.escapeHtml(text); }
}

export default EditorManager;
