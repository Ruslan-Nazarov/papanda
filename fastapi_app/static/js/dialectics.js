/**
 * dialectics.js - Главный оркестратор (Entry Point) для Диалектики
 */
import { DialecticsAPI } from './dialectics/api.js';
import { DialecticsUI } from './dialectics/ui_utils.js';
import { BlockManager } from './dialectics/BlockManager.js';
import { CanvasManager } from './dialectics/CanvasManager.js';
import { EditorManager } from './dialectics/EditorManager.js';
import { ModalsControllerMixin } from './dialectics/ModalsController.js';
import { customConfirm, customChoice, customPrompt } from './modal_controller.js';
import { NoteControllerMixin } from './dialectics/NoteController.js';
import { AIControllerMixin } from './dialectics/AIController.js';
import { BlocksOrchestratorMixin } from './dialectics/BlocksOrchestrator.js';

class DialecticsEngine {
    constructor() {
        window.showToast = window.showToast || ((msg) => console.log("Toast:", msg));

        this.state = {
            currentNoteId: null,
            noteHistory: [],
            pendingSide: null,
            isExpanded: false,
            editingBlock: null,
            notesList: [],
            viewingNoteId: null,
            insertAfterIndex: null,   // null = append at end, number = insert after that index
            categories: [],
            blockStickersCount: {}
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
            dashboardTextarea: document.getElementById('dashboard-note-editor'),
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
        
        await this.loadCategories();

        if (this.dom.editor.classList.contains('embedded') && this.dom.dashboardTextarea) {
            this.setupDashboardTextarea();
            this._revealInterface();
        } else {
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
                if (this.dom.title) {
                    this.dom.title.value = "";
                }
                
                if (this.dom.categorySelect) {
                    this.dom.categorySelect.value = "";
                }

                if (this.dom.canvas) BlockManager.render(this.dom.canvas, [], this._blockCallbacks());
                if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'none';
                this._revealInterface();
            }
        }

        await this.editor.switchTab('text');

        try {
            const editorState = JSON.parse(localStorage.getItem('papanda_editor_open_state') || 'null');
            if (editorState && editorState.isOpen) {
                this.open(editorState.content || '');
            }
        } catch (e) {}
    }

    _revealInterface() {
        const iface = document.querySelector('.note-interface');
        if (iface) iface.style.opacity = '1';
    }


    _bindEvents() {
        DialecticsUI.setupDraggable(this.dom.editor, this.dom.dragHandle, this.state);
        DialecticsUI.setupResizable(this.dom.editor, document.getElementById('editorResizeHandle'));

        const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn.bind(this));

        bind('btnDeleteDialectics', this.deleteGlobal);
        bind('btnSaveDialectics', this.saveGlobal);
        bind('btnMathFormula', () => this.editor.showMathMenu()); // Need to add showMathMenu to EditorManager or keep here

        if (this.dom.editor.classList.contains('embedded')) {
            this.logDebug("Binding embedded editor save");
            bind('btnEditorSave', this.saveAndPin);
        } else {
            this.logDebug("Binding global save");
            bind('btnEditorSave', this.saveGlobal);
        }

        this.logDebug("Binding other buttons");
        bind('btnPinNote', this.pinCurrent);
        bind('btnEditorClose', this.close);
        bind('btnEditorExpand', this.toggleExpand);
        
        this.logDebug("Binding btnLoadDialectics...");
        bind('btnLoadDialectics', async (e) => {
            this.logDebug("btnLoadDialectics CLICKED!");
            e.preventDefault();
            e.stopPropagation();
            try {
                this.logDebug("isDirty = " + this.state.isDirty);
                if (this.state.isDirty) {
                    this.logDebug("Showing customConfirm for unsaved changes...");
                    const confirmed = await customConfirm({
                        title: window._ ? window._('dialectics.unsaved_title') : "Внимание",
                        message: window._ ? window._('dialectics.unsaved_msg') : "Есть несохранённые изменения. Продолжить?",
                        icon: '⚠️',
                        buttons: [
                            { label: window._ ? window._('dialectics.cancel') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                            { label: window._ ? window._('dialectics.continue_btn') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                        ]
                    });
                    this.logDebug("customConfirm resolved: " + confirmed);
                    if (confirmed) {
                        this.state.isDirty = false;
                        this.showLoadModal();
                        const searchInput = document.getElementById('dialecticsSearchInput');
                        if (searchInput) {
                            searchInput.value = '';
                            searchInput.focus();
                        }
                    }
                } else {
                    this.logDebug("No unsaved changes. Opening modal directly.");
                    this.showLoadModal();
                    const searchInput = document.getElementById('dialecticsSearchInput');
                    if (searchInput) {
                        searchInput.value = '';
                        searchInput.focus();
                    }
                }
            } catch (err) {
                this.logDebug("ERROR in open button: " + err.message);
                alert("Error in open button: " + err.message);
            }
        });

        this.logDebug("Binding btnLoadDialectics COMPLETED.");

        const searchInput = document.getElementById('dialecticsSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));
        }



        bind('btnNewDialectics', this.createNewNote);
        bind('btnGlobalParser', this.runGlobalParser);
        bind('btnExampleDialectics', this.loadExample);
        bind('btnPrevDialectics', this.loadPreviousNote);
        bind('btnDialecticsReference', this.showReferenceModal);
        bind('btnDialecticsGuide', this.showGuideModal);
        
        bind('btnDialecticsConnections', this.showConnectionsModal);
        bind('close-connections-btn', () => {
            if (this.dom.connectionsModal) this.dom.connectionsModal.style.display = 'none';
        });
        bind('add-category-btn', this.addCategory);
        
        const connSearchInput = document.getElementById('connections-search-input');
        if (connSearchInput) {
            connSearchInput.addEventListener('input', (e) => this.searchConnections(e.target.value));
        }

        if (this.dom.categorySelect) {
            this.dom.categorySelect.addEventListener('change', async (e) => {
                if (e.target.value === "__add_new__") {
                    e.target.value = ""; // Reset temporarily
                    const newCatName = await customPrompt({
                        title: "Новая категория",
                        message: "Введите название новой категории:",
                        placeholder: "Например: Физика, Идеи..."
                    });
                    
                    if (newCatName && newCatName.trim()) {
                        await this.createNewCategory(newCatName.trim());
                    }
                }
            });
        }

        bind('btnViewModalEdit', () => {
            this.hideViewModal();
            this.loadNoteToEditor(this.state.viewingNoteId);
        });

        CanvasManager.init(this.dom.canvas, {
            onClick: (clientX, mid) => {
                const nextSide = clientX < mid ? 'left' : 'right';

                this.state.editingBlock = null;
                this.state.pendingSide = nextSide;
                this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
                this.state.pendingRole = null;

                const blocks = BlockManager.getBlocks(this.dom.canvas);
                const hasAnchor = blocks.some(b => b.role === 'anchor');
                if (nextSide === 'left' && !hasAnchor) {
                    this.state.pendingRole = 'anchor';
                }

                this.open();
            },
            onDoubleClick: (block) => {
                this.state.editingBlock = block;
                this.openEdit(block);
            }
        });

        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', () => this.editor.switchTab(tab.dataset.tab));
        });

        bind('btnGraphPlot', () => this.editor.plotGraph());
        bind('btnGraphInsert', () => this.editor.insertGraphToNote());
        bind('btnShapeUndo', () => this.editor.undoShape());
        bind('btnShapeDelete', () => this.editor.deleteSelectedShape());
        bind('btnShapeGrid', () => this.editor.toggleShapeGrid());
        bind('btnShapeCopy', () => this.editor.copySelectedShape());
        bind('btnShapeClear', () => this.editor.clearShapes());
        bind('btnShapesInsert', () => this.editor.insertShapesToNote());
        bind('btnShapeGroup', () => this.editor.groupSelected());
        bind('btnObjectList', () => this.editor.toggleObjectListPanel());

        this.setupExplainTooltip();

        document.querySelectorAll('.shape-tool[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => this.editor.setShapeTool(btn.dataset.tool));
        });
        document.querySelectorAll('.shape-tool[data-shape]').forEach(btn => {
            btn.addEventListener('click', () => this.editor.addShape(btn.dataset.shape));
        });

        const colorPicker = document.getElementById('shapeColor');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                this.editor.applyColorToSelected(e.target.value);
            });
        }

        const fillPicker = document.getElementById('shapeFillColor');
        if (fillPicker) {
            fillPicker.addEventListener('input', (e) => {
                this.editor.applyFillToSelected(e.target.value + '33');
            });
        }

        bind('btnToggleFill', () => this.editor.toggleFillForSelected());

        window.addEventListener('stickersUpdated', async (e) => {
            const { parentType, parentId } = e.detail || {};
            if (parentType === 'dialectics' && Number(parentId) === Number(this.state.currentNoteId)) {
                let stickersCountMap = {};
                try {
                    const stickers = await fetch(`/api/stickers/dialectics/${this.state.currentNoteId}/`).then(r => r.json());
                    if (Array.isArray(stickers)) {
                        stickers.forEach(s => {
                            if (s.dialectics_block_id) {
                                stickersCountMap[s.dialectics_block_id] = (stickersCountMap[s.dialectics_block_id] || 0) + 1;
                            }
                        });
                    }
                } catch(err) {
                    console.error("Failed to refresh block stickers:", err);
                }
                this.state.blockStickersCount = stickersCountMap;
                
                const blocks = BlockManager.getBlocks(this.dom.canvas);
                BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
            }
        });

        if (this.dom.canvas) {
            let draggedBlock = null;

            this.dom.canvas.addEventListener('dragstart', (e) => {
                const block = e.target.closest('.dialectics-block');
                if (!block || block._preventDrag || block.getAttribute('draggable') !== 'true') {
                    e.preventDefault();
                    return;
                }
                
                draggedBlock = block;
                block.classList.add('is-dragging');
                this.dom.canvas.classList.add('is-dragging-active');
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', block.dataset.blockId || '');
                }
            });

            this.dom.canvas.addEventListener('drop', (e) => {
                e.preventDefault();
            });

            this.dom.canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggedBlock) return;

                const targetBlock = e.target.closest('.dialectics-block');
                if (!targetBlock || targetBlock === draggedBlock) return;

                const rect = targetBlock.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;

                if (e.clientY < midpoint) {
                    this.dom.canvas.insertBefore(draggedBlock, targetBlock);
                } else {
                    this.dom.canvas.insertBefore(draggedBlock, targetBlock.nextSibling);
                }
            });

            this.dom.canvas.addEventListener('dragend', async (e) => {
                if (draggedBlock) {
                    draggedBlock.classList.remove('is-dragging');
                    draggedBlock.setAttribute('draggable', 'false');
                }
                this.dom.canvas.classList.remove('is-dragging-active');
                draggedBlock = null;

                const blocks = BlockManager.getBlocks(this.dom.canvas);
                BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
                await this.saveGlobal(false, "toast.dialectics_updated");
            });
        }
    }

    _renderMarkdown(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }

    setupExplainTooltip() {
        const contextMenu = document.createElement('div');
        contextMenu.className = 'dialectics-context-menu';
        contextMenu.style.display = 'none';
        
        const explainOption = document.createElement('div');
        explainOption.className = 'dialectics-context-menu-item';
        explainOption.innerHTML = 'Что это?';
        
        contextMenu.appendChild(explainOption);
        document.body.appendChild(contextMenu);

        let selectedText = '';

        const isInsideDialecticsArea = (element) => {
            return element.closest('.dialectics-content-inner') ||
                   element.closest('.tiptap-editor') ||
                   element.closest('.ProseMirror') ||
                   element.closest('#inlineEditor');
        };

        document.addEventListener('contextmenu', (e) => {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount || selection.isCollapsed) {
                contextMenu.style.display = 'none';
                return;
            }

            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const element = container.nodeType === 3 ? container.parentElement : container;

            if (!isInsideDialecticsArea(element)) {
                contextMenu.style.display = 'none';
                return;
            }

            selectedText = selection.toString().trim();
            if (!selectedText) {
                contextMenu.style.display = 'none';
                return;
            }

            e.preventDefault();
            contextMenu.style.display = 'block';
            
            let left = e.pageX;
            let top = e.pageY;
            if (left + 160 > window.innerWidth) left = window.innerWidth - 160;
            if (top + 50 > window.innerHeight + window.scrollY) top = e.pageY - 50;
            
            contextMenu.style.left = `${left}px`;
            contextMenu.style.top = `${top}px`;
        }, true);

        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') contextMenu.style.display = 'none';
        });

        explainOption.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!selectedText) return;
            
            contextMenu.style.display = 'none';
            
            const modal = document.getElementById('explainConceptModal');
            const titleEl = document.getElementById('explainConceptTitle');
            const bodyEl = document.getElementById('explainConceptBody');

            if (!modal || !bodyEl) return;

            titleEl.innerText = `Что это: "${selectedText}"?`;
            bodyEl.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8;"><div style="font-size:2rem; margin-bottom:12px;">⏳</div><div>Анализирую концепт...</div></div>`;
            modal.style.display = 'flex';
            
            try {
                const response = await fetch('/api/ai/dialectics/explain-concept', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: selectedText })
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                bodyEl.innerHTML = this._renderMarkdown(data.result);
            } catch (err) {
                bodyEl.innerHTML = `<div style="color:#ef4444;">Ошибка: ${err.message}</div>`;
            }
            
            window.getSelection()?.removeAllRanges();
        });
    }

    logDebug(msg) {
        if (!this.dom.debug) return;
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.dom.debug.prepend(line);
    }

    showWordDefinition(wordName) {
        const blocks = BlockManager.getBlocks(document.getElementById('dialecticsCanvas'));
        let foundWord = null;
        let foundBlockId = null;
        for (const b of blocks) {
            if (b.words) {
                const w = b.words.find(x => x.word.toLowerCase() === wordName.toLowerCase());
                if (w) {
                    foundWord = w;
                    foundBlockId = b.id;
                    break;
                }
            }
        }

        if (!foundWord) {
            if (window.showToast) window.showToast("Слово не найдено в словаре этого конспекта", "warning");
            return;
        }

        const modal = document.getElementById('explainConceptModal');
        const titleEl = document.getElementById('explainConceptTitle');
        const bodyEl = document.getElementById('explainConceptBody');
        if (!modal || !bodyEl) return;

        titleEl.innerText = `📖 ${foundWord.word}`;

        let connHtml = '';
        if (foundWord.connections) {
            const parts = foundWord.connections.split(',').map(x => x.trim()).filter(Boolean);
            if (parts.length > 0) {
                connHtml = `<div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
                    <strong style="color: #475569; font-size: 0.85rem; display: block; margin-bottom: 6px;">Связи:</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                `;
                parts.forEach(p => {
                    connHtml += `<span onclick="window.app && window.app.showWordDefinition('${p.replace(/'/g, "\\'")}')" style="cursor: pointer; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">📖 ${p}</span>`;
                });
                connHtml += `</div></div>`;
            }
        }

        bodyEl.innerHTML = `
            <div style="font-size: 1rem; color: #1e293b; line-height: 1.6;">
                ${foundWord.definition.replace(/\n/g, '<br>')}
            </div>
            ${connHtml}
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-secondary" onclick="document.getElementById('explainConceptModal').style.display='none'; const el = document.querySelector('[data-block-id=\\'${foundBlockId}\\']'); if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)'; setTimeout(() => el.style.boxShadow = '', 2000); }" style="font-size: 0.85rem; padding: 6px 12px; border-radius: 6px; background: #3b82f6; color: white; border: none; cursor: pointer; font-weight: 600;">🔍 Перейти к блоку</button>
            </div>
        `;

        modal.style.display = 'flex';
    }
}

Object.assign(DialecticsEngine.prototype, ModalsControllerMixin);


Object.assign(
    DialecticsEngine.prototype,
    ModalsControllerMixin,
    NoteControllerMixin,
    AIControllerMixin,
    BlocksOrchestratorMixin
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

window.app = new DialecticsEngine();
