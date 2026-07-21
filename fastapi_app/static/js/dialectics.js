/**
 * dialectics.js - Главный оркестратор (Entry Point) для Диалектики
 * Декомпозирован: логика событий вынесена в controller/CanvasEventManager.js, controller/ToolbarEventManager.js и controller/ConceptExplainManager.js
 */
import { DialecticsAPI } from './dialectics/api.js';
import { DialecticsUI } from './dialectics/ui_utils.js';
import { BlockManager } from './dialectics/BlockManager.js';
import { CanvasManager } from './dialectics/CanvasManager.js';
import { EditorManager } from './dialectics/EditorManager.js';
import { ModalsControllerMixin } from './dialectics/ModalsController.js';
import { NoteControllerMixin } from './dialectics/NoteController.js';
import { AIControllerMixin } from './dialectics/AIController.js';
import { BlocksOrchestratorMixin } from './dialectics/BlocksOrchestrator.js';
import { CanvasEventManager } from './dialectics/controller/CanvasEventManager.js';
import { ToolbarEventManager } from './dialectics/controller/ToolbarEventManager.js';
import { ConceptExplainMixin } from './dialectics/controller/ConceptExplainManager.js';

class DialecticsEngine {
    constructor() {
        window.showToast = window.showToast || ((msg) => console.log("Toast:", msg));
        window.DialecticsUI = DialecticsUI;
        window.logDebugWindow = () => {};

        this.state = {
            currentNoteId: null,
            noteHistory: [],
            pendingSide: null,
            isExpanded: false,
            editingBlock: null,
            notesList: [],
            viewingNoteId: null,
            insertAfterIndex: null,
            categories: [],
            blockStickersCount: {},
            dismissedHints: []
        };

        this.dom = {
            canvas: document.getElementById('dialecticsCanvas'),
            editor: document.getElementById('inlineEditor'),
            title: document.getElementById('globalDialecticsTitle'),
            deleteBtn: document.getElementById('btnDeleteDialectics'),
            backdrop: document.getElementById('expandedBackdrop'),
            dragHandle: document.getElementById('editorDragHandle'),
            loadModal: document.getElementById('loadDialecticsModal'),
            loadList: document.getElementById('loadDialecticsList'),
            guideModal: document.getElementById('guideDialecticsModal'),
            guideContent: document.getElementById('dialecticsGuideContent'),
            viewModal: document.getElementById('dialecticsViewModal'),
            viewTitle: document.getElementById('dialecticsViewTitle'),
            viewBody: document.getElementById('dialecticsViewBody'),
            debug: document.getElementById('debugLogContent'),
            connectionsModal: document.getElementById('dialectics-connections-modal'),
            categorySelect: document.getElementById('dialecticsCategorySelect'),
            connCategoriesList: document.getElementById('connections-categories-list'),
            connResultsContainer: document.getElementById('connections-results-container'),
            newCategoryInput: document.getElementById('new-category-input')
        };

        this.editor = new EditorManager(this);

        if (this.dom.editor) {
            this.init();
        }
    }

    async init() {
        this.logDebug("Engine init...");

        this._bindEvents();

        window.addEventListener('stickersUpdated', async (e) => {
            if (e.detail && e.detail.parentType === 'dialectics' && String(e.detail.parentId) === String(this.state.currentNoteId)) {
                if (typeof this.refreshStickers === 'function') {
                    await this.refreshStickers();
                }
            }
        });
        
        await this.loadCategories();

        const params = new URLSearchParams(window.location.search);
        let noteId = params.get('id');
        if (!noteId) {
            noteId = localStorage.getItem('dialectics_last_note_id');
            if (noteId) {
                const url = new URL(window.location);
                url.searchParams.set('id', noteId);
                window.history.replaceState({}, '', url);
            }
        }

        if (noteId) {
            await this.loadNoteToEditor(noteId, false);
        } else {
            this.state.currentNoteId = null;
            this.state.dismissedHints = JSON.parse(localStorage.getItem('dialectics_dismissed_hints_temp') || '[]');
            if (this.dom.title) {
                this.dom.title.value = "";
            }
            
            if (this.dom.categorySelect) {
                this.dom.categorySelect.value = "";
            }

            if (this.dom.canvas) BlockManager.render(this.dom.canvas, [], typeof this._blockCallbacks === 'function' ? this._blockCallbacks() : {});
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'none';
            this._revealInterface();
        }

        const showHiddenToggle = document.getElementById('toggleShowHiddenHints');
        if (showHiddenToggle) {
            showHiddenToggle.checked = localStorage.getItem('dialectics_show_hidden_hints') === 'true';
        }

        await this.editor.switchTab('text');

        try {
            const multiStates = JSON.parse(localStorage.getItem('papanda_multiple_editors_state') || '[]');
            if (Array.isArray(multiStates) && multiStates.length > 0) {
                setTimeout(() => {
                    multiStates.forEach(state => {
                        let blockEl = null;
                        if (state.blockId && !state.blockId.startsWith('new_block')) {
                            blockEl = this.dom.canvas.querySelector(`[data-block-id="${state.blockId}"], [data-id="${state.blockId}"]`);
                        }
                        
                        if (blockEl || (state.blockId && state.blockId.startsWith('new_block'))) {
                            const dummyBlock = blockEl || { dataset: { id: state.blockId } };
                            const win = this.createFloatingEditor(dummyBlock, state.content, state.title, state.isExpanded);
                            if (win) {
                                if (state.styleLeft) win.style.left = state.styleLeft;
                                if (state.styleTop) win.style.top = state.styleTop;
                                if (state.styleWidth) win.style.width = state.styleWidth;
                                if (state.styleHeight) win.style.height = state.styleHeight;
                            }
                        }
                    });
                }, 300);
            } else {
                const editorState = JSON.parse(localStorage.getItem('papanda_editor_open_state') || 'null');
                if (editorState && editorState.isOpen) {
                    if (editorState.editingBlockId) {
                        const blockEl = this.dom.canvas.querySelector(`[data-block-id="${editorState.editingBlockId}"], [data-id="${editorState.editingBlockId}"]`);
                        if (blockEl) {
                            this.state.editingBlock = blockEl;
                            if (editorState.editingAltCardIndex !== undefined && editorState.editingAltCardIndex !== null) {
                                const cards = Array.from(blockEl.querySelectorAll('div')).filter(el => el.querySelector('.alt-title') || el.querySelector('.alt-title-text'));
                                this.state.editingAltCard = cards[editorState.editingAltCardIndex] || null;
                            }
                        }
                    }
                    if (editorState.pendingSide) this.state.pendingSide = editorState.pendingSide;
                    if (editorState.pendingBlockId) this.state.pendingBlockId = editorState.pendingBlockId;
                    if (editorState.pendingRole) this.state.pendingRole = editorState.pendingRole;
                    if (editorState.insertAfterIndex !== undefined) this.state.insertAfterIndex = editorState.insertAfterIndex;

                    const titleInput = document.getElementById('editorBlockTitleInput');
                    if (titleInput && editorState.blockTitle !== undefined) {
                        titleInput.value = editorState.blockTitle;
                    }

                    this.open(editorState.content || '');
                }
            }
        } catch (e) {}
    }

    _revealInterface() {
        const iface = document.querySelector('.note-interface');
        if (iface) iface.style.opacity = '1';
    }

    _bindEvents() {
        ToolbarEventManager.init(this);
        CanvasEventManager.init(this);
        if (typeof this.setupExplainTooltip === 'function') {
            this.setupExplainTooltip();
        }
    }

    logDebug(msg) {
        if (!this.dom.debug) return;
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.dom.debug.prepend(line);
    }
}

Object.assign(
    DialecticsEngine.prototype,
    ModalsControllerMixin,
    NoteControllerMixin,
    BlocksOrchestratorMixin,
    AIControllerMixin,
    ConceptExplainMixin
);

window.toggleOnlyTitlesMode = function(onlyTitles) {
    const canvas = document.getElementById('dialecticsCanvas');
    if (!canvas) return;
    if (onlyTitles) {
        canvas.classList.add('mode-only-titles');
    } else {
        canvas.classList.remove('mode-only-titles');
    }
};

window.toggleCompressedMode = function(compressed) {
    const canvas = document.getElementById('dialecticsCanvas');
    if (!canvas) return;
    if (compressed) {
        canvas.classList.add('mode-compressed-left');
    } else {
        canvas.classList.remove('mode-compressed-left');
    }
};

window.BlockManager = BlockManager;
window.CanvasManager = CanvasManager;
window.DialecticsUI = DialecticsUI;
window.logDebugWindow = () => {};
window.app = new DialecticsEngine();
