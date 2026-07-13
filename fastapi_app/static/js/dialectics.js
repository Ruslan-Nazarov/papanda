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

            if (this.dom.canvas) BlockManager.render(this.dom.canvas, [], this._blockCallbacks());
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
        DialecticsUI.setupDraggable(this.dom.editor, this.dom.dragHandle, this.state);
        DialecticsUI.setupResizable(this.dom.editor, document.getElementById('editorResizeHandle'));

        const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn.bind(this));

        bind('btnDeleteDialectics', this.deleteGlobal);
        bind('btnSaveDialectics', () => this.saveGlobal(false));
        bind('btnExportMarkdown', this.exportMarkdown);
        bind('btnExportPDF', this.exportPDF);
        bind('btnMathFormula', () => this.editor.showMathMenu());

        bind('btnEditorSave', () => this.saveGlobal(true));

        bind('btnPinNote', this.pinCurrent);
        bind('btnEditorClose', async () => await this.close(true));
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
                        icon: '',
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
        bind('btnTrashDialectics', () => {
            const menu = document.getElementById('dialecticsMenuContent');
            if (menu) menu.style.display = 'none';
            this.showTrashModal();
        });
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
                } else if (this.state.currentNoteId) {
                    await this.saveGlobal(false, "toast.dialectics_updated");
                }
            });
        }

        bind('btnViewModalEdit', () => {
            this.hideViewModal();
            this.loadNoteToEditor(this.state.viewingNoteId);
        });

        CanvasManager.init(this.dom.canvas, {
            onClick: async (clientX, mid) => {
                if (this.state.isDirty) {
                    const confirmed = await customConfirm({
                        title: window._ ? window._('dialectics.unsaved_title', 'Внимание') : "Внимание",
                        message: window._ ? window._('dialectics.unsaved_msg', 'Есть несохранённые изменения. Продолжить?') : "Есть несохранённые изменения. Продолжить?",
                        icon: '',
                        buttons: [
                            { label: window._ ? window._('dialectics.cancel', 'Отмена') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                            { label: window._ ? window._('dialectics.continue_btn', 'Продолжить') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                        ]
                    });
                    if (!confirmed) return;
                }
                this.state.isDirty = false;

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
        if (!document.getElementById('explain-concept-styles')) {
            const style = document.createElement('style');
            style.id = 'explain-concept-styles';
            style.innerHTML = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        const contextMenu = document.createElement('div');
        contextMenu.className = 'dialectics-context-menu';
        contextMenu.style.display = 'none';
        
        const explainOption = document.createElement('div');
        explainOption.className = 'dialectics-context-menu-item';
        explainOption.innerHTML = 'Что это?';
        
        contextMenu.appendChild(explainOption);
        document.body.appendChild(contextMenu);

        let selectedText = '';
        let contextBefore = '';
        let contextAfter = '';
        let chatHistory = [];

        const getBlockContainer = (element) => {
            let curr = element;
            while (curr && curr !== document.body) {
                if (
                    curr.classList.contains('tiptap-editor') ||
                    curr.classList.contains('ProseMirror') ||
                    curr.classList.contains('dialectics-content-inner') ||
                    curr.id === 'inlineEditor' ||
                    ['P', 'DIV', 'LI', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(curr.tagName)
                ) {
                    return curr;
                }
                curr = curr.parentElement;
            }
            return element;
        };

        const getContext = (sel) => {
            if (!sel || !sel.rangeCount) return { before: '', after: '' };
            try {
                const range = sel.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const element = container.nodeType === 3 ? container.parentElement : container;
                const blockContainer = getBlockContainer(element);

                const preRange = document.createRange();
                preRange.selectNodeContents(blockContainer);
                preRange.setEnd(range.startContainer, range.startOffset);
                const before = preRange.toString();

                const postRange = document.createRange();
                postRange.selectNodeContents(blockContainer);
                postRange.setStart(range.endContainer, range.endOffset);
                const after = postRange.toString();

                return { before, after };
            } catch (err) {
                console.error("Error getting context:", err);
                return { before: '', after: '' };
            }
        };

        const isInsideDialecticsArea = (element) => {
            return element.closest('.dialectics-content-inner') ||
                   element.closest('.tiptap-editor') ||
                   element.closest('.ProseMirror') ||
                   element.closest('#inlineEditor');
        };

        const bodyEl = document.getElementById('explainConceptBody');
        const appendMessage = (role, text) => {
            if (!bodyEl) return;
            const msgDiv = document.createElement('div');
            if (role === 'user') {
                msgDiv.style.cssText = "margin-left: auto; margin-right: 0; max-width: 80%; background: #3b82f6; color: #fff; padding: 10px 14px; border-radius: 12px 12px 0 12px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15); margin-bottom: 12px; word-break: break-word;";
                msgDiv.innerText = text;
            } else if (role === 'assistant') {
                msgDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #1e293b; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; word-break: break-word;";
                msgDiv.innerHTML = this._renderMarkdown(text);
            } else if (role === 'loading') {
                msgDiv.id = 'explainConceptLoading';
                msgDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #94a3b8; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;";
                msgDiv.innerHTML = `<span class="spinner" style="border: 2px solid #cbd5e1; border-top: 2px solid #3b82f6; border-radius: 50%; width: 14px; height: 14px; animation: spin 0.8s linear infinite; display: inline-block;"></span><span>Думаю...</span>`;
            }
            bodyEl.appendChild(msgDiv);
            bodyEl.scrollTop = bodyEl.scrollHeight;
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

            const ctx = getContext(selection);
            contextBefore = ctx.before;
            contextAfter = ctx.after;

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
            const defaultFooter = document.getElementById('explainConceptDefaultFooter');
            const chatFooter = document.getElementById('explainConceptChatFooter');
            const inputEl = document.getElementById('explainConceptInput');
            const sendBtn = document.getElementById('explainConceptSendBtn');

            if (!modal || !bodyEl || !inputEl || !sendBtn) return;

            // Reset chat history and UI
            chatHistory = [];
            titleEl.innerText = `Что это: "${selectedText}"?`;
            bodyEl.innerHTML = '';
            inputEl.value = '';
            inputEl.disabled = true;
            sendBtn.disabled = true;
            
            if (defaultFooter) defaultFooter.style.display = 'none';
            if (chatFooter) chatFooter.style.display = 'block';
            
            modal.style.display = 'flex';
            
            // Append loading message
            appendMessage('loading');
            
            try {
                const response = await fetch('/api/ai/dialectics/explain-concept', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: selectedText,
                        context_before: contextBefore,
                        context_after: contextAfter
                    })
                });
                
                // Remove loading message
                const loadingEl = document.getElementById('explainConceptLoading');
                if (loadingEl) loadingEl.remove();
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                
                const initialUserQuery = data.user_query || `Объясни следующее понятие: ${selectedText}`;
                
                chatHistory.push({ role: 'user', content: initialUserQuery });
                chatHistory.push({ role: 'assistant', content: data.result });
                
                appendMessage('assistant', data.result);
                
                inputEl.disabled = false;
                sendBtn.disabled = false;
                inputEl.focus();
            } catch (err) {
                const loadingEl = document.getElementById('explainConceptLoading');
                if (loadingEl) loadingEl.remove();
                
                bodyEl.innerHTML = `<div style="color:#ef4444; padding:10px;">Ошибка: ${err.message}</div>`;
            }
            
            window.getSelection()?.removeAllRanges();
        });

        const formEl = document.getElementById('explainConceptForm');
        if (formEl) {
            formEl.onsubmit = async (evt) => {
                evt.preventDefault();
                const inputEl = document.getElementById('explainConceptInput');
                const sendBtn = document.getElementById('explainConceptSendBtn');
                if (!inputEl || !sendBtn) return;
                
                const questionText = inputEl.value.trim();
                if (!questionText || inputEl.disabled) return;
                
                // Append user message to UI
                appendMessage('user', questionText);
                
                // Append to chat history
                chatHistory.push({ role: 'user', content: questionText });
                
                // Clear input and disable
                inputEl.value = '';
                inputEl.disabled = true;
                sendBtn.disabled = true;
                
                // Append loading message
                appendMessage('loading');
                
                try {
                    const response = await fetch('/api/ai/dialectics/explain-concept', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: selectedText,
                            history: chatHistory
                        })
                    });
                    
                    const loadingEl = document.getElementById('explainConceptLoading');
                    if (loadingEl) loadingEl.remove();
                    
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    
                    chatHistory.push({ role: 'assistant', content: data.result });
                    appendMessage('assistant', data.result);
                } catch (err) {
                    const loadingEl = document.getElementById('explainConceptLoading');
                    if (loadingEl) loadingEl.remove();
                    
                    const errDiv = document.createElement('div');
                    errDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; color: #ef4444; padding: 10px 12px; margin-bottom: 12px;";
                    errDiv.innerText = `Ошибка: ${err.message}`;
                    bodyEl.appendChild(errDiv);
                    bodyEl.scrollTop = bodyEl.scrollHeight;
                } finally {
                    inputEl.disabled = false;
                    sendBtn.disabled = false;
                    inputEl.focus();
                }
            };
        }
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

        const defaultFooter = document.getElementById('explainConceptDefaultFooter');
        const chatFooter = document.getElementById('explainConceptChatFooter');
        if (defaultFooter) defaultFooter.style.display = 'block';
        if (chatFooter) chatFooter.style.display = 'none';

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
                <button class="btn btn-secondary" onclick="document.getElementById('explainConceptModal').style.display='none'; const el = document.querySelector('[data-block-id=\\'${foundBlockId}\\']'); if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)'; setTimeout(() => el.style.boxShadow = '', 2000); }" style="font-size: 0.85rem; padding: 6px 12px; border-radius: 6px; background: #3b82f6; color: white; border: none; cursor: pointer; font-weight: 600;">🔍 ${(window._ && window._('dialectics.go_to_block')) || 'Перейти к блоку'}</button>
            </div>
        `;

        modal.style.display = 'flex';
    }
}

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
window.app = new DialecticsEngine();
