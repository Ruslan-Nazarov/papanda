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
            categories: []
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

    // --- Core Logic ---
    open(content = '') {
        if (this.dom.editor && !this.dom.editor.classList.contains('embedded')) {
            DialecticsUI.toggleDisplay(this.dom.editor, true, true);
        }
        const aiTab = document.getElementById('tab-ai');
        if (aiTab) aiTab.style.display = 'none';
        this.editor.switchTab('text');
        this.editor.setContent(content);

        if (!this.editor.tiptap && this.dom.dashboardTextarea) {
            const temp = document.createElement('div');
            temp.innerHTML = content;
            this.dom.dashboardTextarea.value = temp.innerText || temp.textContent || "";
            this.dom.dashboardTextarea.dispatchEvent(new Event('input'));
        }
    }

    openEdit(block) {
        const html = block.querySelector('.dialectics-content-inner')?.innerHTML || "";
        this.open(html);
    }

    close() {
        if (this.dom.editor) {
            this.dom.editor.style.display = 'none';
            this.dom.editor.classList.remove('embedded');
        }
        this.editor.setContent('');
        this.state.editingBlock = null;
        this.state.pendingSide = null;
        this.state.pendingRole = null;
        this.state.pendingBlockId = null;
        this.state.insertAfterIndex = null;
    }

    save() {
        this.saveGlobal(false, "toast.dialectics_saved");
    }

    createBlock(side, role, html, id, stickers = [], sources = [], insertAfterIndex = null) {
        const container = side === 'left' ? this.dom.leftCol : this.dom.rightCol;
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'dialectics-block';
        el.dataset.id = id;
        el.dataset.side = side;
        el.dataset.role = role;
        if (stickers.length > 0) el.dataset.stickers = JSON.stringify(stickers);
        if (sources.length > 0) el.dataset.sources = JSON.stringify(sources);

        const badgeText = window._('dialectics.roles.' + role) || role;

        el.innerHTML = `
            <div class="dialectics-block-header">
                <span class="dialectics-block-badge">${badgeText}</span>
                <div class="dialectics-block-actions">
                    <button type="button" class="btn-block-action btn-block-sources" title="Источники">🔗</button>
                    <button type="button" class="btn-block-action btn-block-stickers" title="Стикеры">🏷️</button>
                    <button type="button" class="btn-block-action btn-block-edit" title="Редактировать">✏️</button>
                    <button type="button" class="btn-block-action btn-block-del" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="dialectics-content-inner">${html}</div>
            <div class="dialectics-stickers-container" style="display:none; margin-top:10px; border-top:1px dashed #e2e8f0; padding-top:8px;"></div>
        `;

        this.attachBlockEvents(el);

        if (insertAfterIndex !== null && insertAfterIndex !== undefined) {
            const allBlocks = Array.from(container.querySelectorAll('.dialectics-block'));
            if (insertAfterIndex < allBlocks.length) {
                allBlocks[insertAfterIndex].after(el);
            } else {
                container.appendChild(el);
            }
        } else {
            container.appendChild(el);
        }

        if (stickers.length > 0) {
            this.renderStickersForBlock(el);
        }
    }

    attachBlockEvents(el) {
        const editBtn = el.querySelector('.btn-block-edit');
        const delBtn = el.querySelector('.btn-block-del');
        const stickersBtn = el.querySelector('.btn-block-stickers');
        const sourcesBtn = el.querySelector('.btn-block-sources');

        if (editBtn) editBtn.onclick = () => {
            this.state.editingBlock = el;
            this.openEdit(el);
        };

        if (delBtn) delBtn.onclick = () => {
            el.remove();
            if (window.showToast) window.showToast(window._("toast.dialectics_updated", "Обновлено"), "success");
        };

        if (stickersBtn) stickersBtn.onclick = () => {
            this.openStickersForCurrent(el.dataset.id);
        };

        if (sourcesBtn) sourcesBtn.onclick = () => {
            this.openSourcesModal(el);
        };
    }

    initStickersModal() {
        const modal = document.getElementById('blockStickersModal');
        const addBtn = document.getElementById('btnAddStickerModal');
        const listEl = document.getElementById('modalStickersList');

        if (!modal || !addBtn) return;

        addBtn.onclick = () => {
            const blockId = modal.dataset.currentBlockId;
            if (!blockId) return;

            const textInput = document.getElementById('modalStickerText');
            const titleInput = document.getElementById('modalStickerTitle');
            const colorInput = document.getElementById('modalStickerColor');

            const text = textInput?.value?.trim();
            if (!text) {
                if (window.showToast) window.showToast("Введите текст стикера", "warning");
                return;
            }

            const block = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
            if (block) {
                let existing = [];
                try { existing = JSON.parse(block.dataset.stickers || "[]"); } catch(e){}
                existing.push({
                    text: text,
                    title: titleInput?.value?.trim() || "Важное примечание",
                    color: colorInput?.value || "#fff9c4",
                    type: "text"
                });
                block.dataset.stickers = JSON.stringify(existing);
                this.renderStickersForBlock(block);
                this.renderStickersListInModal(blockId);
                this.saveGlobal(false, "toast.dialectics_updated");
            }

            if (textInput) textInput.value = '';
            if (titleInput) titleInput.value = '';
        };
    }

    renderStickersListInModal(blockId) {
        const listEl = document.getElementById('modalStickersList');
        if (!listEl) return;
        listEl.innerHTML = '';

        const block = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
        if (!block) return;

        let stickers = [];
        try { stickers = JSON.parse(block.dataset.stickers || "[]"); } catch(e){}

        if (stickers.length === 0) {
            listEl.innerHTML = '<div style="color:#94a3b8; font-size:0.9rem; font-style:italic;">Стикеры пока не добавлены.</div>';
            return;
        }

        stickers.forEach((st, idx) => {
            const item = document.createElement('div');
            item.style.cssText = `background:${st.color || '#fff9c4'}; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; box-shadow:0 1px 2px rgba(0,0,0,0.05);`;
            item.innerHTML = `
                <div>
                    <div style="font-weight:bold; font-size:0.85rem; margin-bottom:4px; color:#334155;">${st.title || 'Примечание'}</div>
                    <div style="font-size:0.9rem; color:#1e293b; white-space:pre-wrap;">${st.text}</div>
                </div>
                <button type="button" class="btn-del-st" style="background:none; border:none; cursor:pointer; color:#ef4444; font-weight:bold; padding:0 4px;" title="Удалить">&times;</button>
            `;
            item.querySelector('.btn-del-st').onclick = () => {
                stickers.splice(idx, 1);
                block.dataset.stickers = JSON.stringify(stickers);
                this.renderStickersForBlock(block);
                this.renderStickersListInModal(blockId);
                this.saveGlobal(false, "toast.dialectics_updated");
            };
            listEl.appendChild(item);
        });
    }

    renderStickersForBlock(blockEl) {
        let stickers = [];
        try { stickers = JSON.parse(blockEl.dataset.stickers || "[]"); } catch(e){}

        const container = blockEl.querySelector('.dialectics-stickers-container');
        const btn = blockEl.querySelector('.btn-block-stickers');

        if (btn) {
            const countHtml = stickers.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${stickers.length}</span>` : '';
            btn.innerHTML = `🏷️${countHtml}`;
        }

        if (!container) return;
        container.innerHTML = '';

        if (stickers.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '8px';

        stickers.forEach(st => {
            const pill = document.createElement('div');
            pill.style.cssText = `background:${st.color || '#fff9c4'}; padding:6px 10px; border-radius:6px; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.05); max-width:100%;`;
            pill.innerHTML = `<strong style="display:block; font-size:0.75rem; color:#64748b; margin-bottom:2px;">${st.title || 'Примечание'}:</strong><span style="color:#1e293b; white-space:pre-wrap;">${st.text}</span>`;
            container.appendChild(pill);
        });
    }

    initHintEvents() {
        const hints = document.querySelectorAll('.dialectics-hint-block');
        hints.forEach(hintEl => {
            const btnAI = hintEl.querySelector('.btn-hint-ai');
            if (btnAI) {
                btnAI.onclick = (e) => {
                    e.stopPropagation();
                    this.runHintAI({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                };
            }

            hintEl.onclick = () => {
                this.openHintEditor({
                    id: hintEl.dataset.stepId || hintEl.dataset.id,
                    side: hintEl.dataset.side
                });
            };
        });
    }

    bindEvents() {
        if (this.dom.btnSave) this.dom.btnSave.onclick = () => this.save();
        if (this.dom.btnCancel) this.dom.btnCancel.onclick = () => this.close();
        if (this.dom.btnClose) this.dom.btnClose.onclick = () => this.close();

        // Global delegator for dynamically added blocks or hints
        document.addEventListener('click', (e) => {
            const badge = e.target.closest('.dialectics-hint-badge');
            if (badge) {
                e.preventDefault();
                e.stopPropagation();
                const hintEl = badge.closest('.dialectics-hint-block');
                if (hintEl) {
                    this.openHintEditor({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                }
                return;
            }

            const aiBtn = e.target.closest('.btn-hint-ai');
            if (aiBtn) {
                e.preventDefault();
                e.stopPropagation();
                const hintEl = aiBtn.closest('.dialectics-hint-block');
                if (hintEl) {
                    this.runHintAI({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                }
                return;
            }
        });

        // Setup callbacks for BlockManager
        if (window.BlockManager) {
            window.BlockManager.setCallbacks({
                onEdit: (block) => this.openEdit(block),
                onDelete: async () => { await this.saveGlobal(false, "toast.dialectics_updated"); const blocks = BlockManager.getBlocks(this.dom.canvas); BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks()); },
                onHintClick: (hint) => this.openHintEditor(hint),
                onHintAI: (hint) => (hint && hint.id === 'step3' ? this.runAI(this.dom.canvas) : this.runHintAI(hint))
            });
        }
    }

    openHintEditor(hint, content = '', aiHtml = null) {
        this.state.editingBlock = null;
        this.state.pendingSide = hint.side;
        this.state.pendingRole = hint.id;
        this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        this.state.insertAfterIndex = null;
        this.open(content);

        const aiTab = document.getElementById('tab-ai');
        if (aiHtml) {
            if (aiTab) aiTab.style.display = 'flex';
            const aiContainer = document.getElementById('aiHelpContent');
            if (aiContainer) aiContainer.innerHTML = aiHtml;
            const copyBtn = document.getElementById('btnCopyAiToText');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    this.editor.setContent(aiHtml);
                    this.editor.switchTab('text');
                    if (window.showToast) window.showToast(window._("dialectics.ai_transferred", "Текст от ИИ перенесен в редактор"), "success");
                };
            }
            this.editor.switchTab('ai');
        } else {
            if (aiTab) aiTab.style.display = 'none';
        }
    }

    toggleExpand() {
        this.state.isExpanded = !this.state.isExpanded;
        if (this.dom.editor) {
            this.dom.editor.classList.toggle('expanded', this.state.isExpanded);
            if (this.dom.backdrop) DialecticsUI.toggleDisplay(this.dom.backdrop, this.state.isExpanded);
        }
        // Resize Fabric.js canvas to match new wrapper dimensions after transition
        setTimeout(() => {
            const wrapper = document.getElementById('shapesCanvasWrapper');
            const fabricCanvas = this.editor && this.editor.fabricCanvas;
            if (wrapper && fabricCanvas) {
                const newW = wrapper.clientWidth;
                const newH = wrapper.clientHeight;
                if (newW > 10 && newH > 10) {
                    fabricCanvas.setWidth(newW);
                    fabricCanvas.setHeight(newH);
                    fabricCanvas.calcOffset();
                    fabricCanvas.renderAll();
                }
            }
        }, 320); // wait for CSS transition to finish
    }

    // Returns the standard callbacks object for BlockManager.render
    _blockCallbacks() {
        return {
            onEdit: (b) => { this.state.editingBlock = b; this.openEdit(b); },
            onInsertAfter: (side, index) => { this.openInsertAfter(side, index); },
            onDelete: async () => { await this.saveGlobal(false, "toast.dialectics_updated"); const blocks = BlockManager.getBlocks(this.dom.canvas); BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks()); },
            onAI: (b) => { this.runAI(b); },
            onSources: (b) => { this.openSourcesModal(b); },
            onHintClick: (hint) => { this.openHintEditor(hint); },
            onHintAI: (hint) => { if (hint && hint.id === 'step3') { this.runAI(this.dom.canvas); } else { this.runHintAI(hint); } }
        };
    }

    openSourcesModal(blockEl) {
        const modal = document.getElementById('blockSourcesModal');
        const listEl = document.getElementById('sourcesList');
        const urlInput = document.getElementById('sourceUrl');
        const titleInput = document.getElementById('sourceTitle');
        const quoteInput = document.getElementById('sourceQuote');
        const addBtn = document.getElementById('btnAddSource');

        if (!modal || !listEl) return;

        let sources = [];
        try {
            if (blockEl.dataset.sources) {
                sources = JSON.parse(blockEl.dataset.sources);
            }
        } catch(e) {}

        const renderList = () => {
            listEl.innerHTML = '';
            if (sources.length === 0) {
                listEl.innerHTML = `<div style="color:#94a3b8; font-size:0.9rem; font-style:italic;">Источники пока не добавлены.</div>`;
                return;
            }
            sources.forEach((s, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px;';
                
                let linkHtml = s.title || s.url;
                if (s.url) {
                    let safeUrl = s.url.startsWith('http') ? s.url : 'https://' + s.url;
                    linkHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:600; text-decoration:none;">${s.title || s.url}</a>`;
                } else {
                    linkHtml = `<span style="font-weight:600; color:#1e293b;">${s.title}</span>`;
                }

                let quoteHtml = '';
                if (s.quote) {
                    quoteHtml = `<div style="font-size:0.85rem; color:#475569; margin-top:4px; white-space:pre-wrap;">${s.quote}</div>`;
                }

                item.innerHTML = `
                    <div style="flex-grow:1; overflow:hidden;">
                        ${linkHtml}
                        ${quoteHtml}
                    </div>
                    <button type="button" class="btn-del-src" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:1.2rem; padding:0 4px; line-height:1;" title="Удалить">&times;</button>
                `;

                item.querySelector('.btn-del-src').onclick = () => {
                    sources.splice(idx, 1);
                    updateBlockData();
                    renderList();
                };

                listEl.appendChild(item);
            });
        };

        const updateBlockData = () => {
            blockEl.dataset.sources = JSON.stringify(sources);
            const btn = blockEl.querySelector('.btn-block-sources');
            if (btn) {
                const countHtml = sources.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${sources.length}</span>` : '';
                btn.innerHTML = `🔗${countHtml}`;
            }
            this.saveGlobal(false, "toast.dialectics_updated");
        };

        addBtn.onclick = () => {
            const url = urlInput ? urlInput.value.trim() : '';
            const title = titleInput ? titleInput.value.trim() : '';
            const quote = quoteInput ? quoteInput.value.trim() : '';

            if (!url && !title && !quote) {
                if (window.showToast) window.showToast("Введите информацию об источнике", "warning");
                return;
            }

            sources.push({ url, title, quote });
            if (urlInput) urlInput.value = '';
            if (titleInput) titleInput.value = '';
            if (quoteInput) quoteInput.value = '';

            updateBlockData();
            renderList();
        };

        renderList();
        modal.style.display = 'flex';
    }

    async runHintAI(hint) {
        if (!hint || hint.id === 'anchor') {
            window.showToast("Cannot run AI on the main goal block before it is created.", "info");
            return;
        }

        const blocks = BlockManager.getBlocks(this.dom.canvas);
        const anchorBlock = blocks.find(b => b.role === 'anchor');
        
        const stripHtml = (html) => {
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };

        const goalText = anchorBlock ? stripHtml(anchorBlock.html) : '';

        // Extract context (previous blocks)
        const contextBlocks = blocks.filter(b => b.role && b.role !== 'anchor');
        const contextText = contextBlocks.map(b => `[${b.role}]: ${stripHtml(b.html)}`).join('\\n\\n');

        window.showToast("✨ " + window._("toast.ai_is_thinking", "AI is generating response..."), "info");
        try {
            const res = await fetch('/api/ai/dialectics/hint-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    step_id: hint.id, 
                    goal_text: goalText,
                    context_text: contextText 
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'API Error');
            }

            const data = await res.json();
            
            // Convert simple text to HTML paragraphs
            let aiHtml = data.result;
            if (!aiHtml.includes('<p>') && !aiHtml.includes('<div>')) {
                aiHtml = aiHtml.split('\\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
            }
            
            this.openHintEditor(hint, '', aiHtml);

        } catch (error) {
            console.error("AI Error:", error);
            window.showToast("AI Error: " + error.message, "error");
        }
    }

    // Open editor to insert a new block after a specific index
    openInsertAfter(side, index) {
        this.state.editingBlock = null;
        this.state.pendingSide = side;
        this.state.pendingRole = null;
        this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        this.state.insertAfterIndex = index;
        this.open();
    }

    async runAI(block) {
        const container = block.closest('.dialectics-editor') || document;
        const getRoleText = (role) => {
            const el = container.querySelector(`[data-role="${role}"] .dialectics-content-inner`);
            return el ? (el.innerText || el.textContent).trim() : '';
        };

        const anchorText = getRoleText('anchor');
        const step1Text = getRoleText('step1');
        const step2Text = getRoleText('step2');

        let parts = [];
        if (anchorText) parts.push(`Что понять: ${anchorText}`);
        if (step1Text) parts.push(`Простейший процесс: ${step1Text}`);
        if (step2Text) parts.push(`Развитие процесса: ${step2Text}`);

        let processText = parts.join('\n\n');
        if (!processText) {
            const inner = block.querySelector('.dialectics-content-inner');
            processText = inner ? (inner.innerText || inner.textContent).trim() : '';
        }
        if (!processText) return;

        window.showToast(window._("toast.ai_is_analyzing_the_process"), "info");

        try {
            const res = await fetch('/api/ai/dialectics/opposites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ process_a: processText })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'API Error');
            }

            const data = await res.json();

            const modal = document.getElementById('explainConceptModal');
            const titleEl = document.getElementById('explainConceptTitle');
            const bodyEl = document.getElementById('explainConceptBody');

            if (modal && titleEl && bodyEl) {
                titleEl.innerText = window._ ? (window._('analysis_result') || 'Результат анализа') : 'Результат анализа';
                bodyEl.innerHTML = this._renderMarkdown(data.result);
                modal.style.display = 'flex';
            } else {
                // Fallback safe formatting
                const safeResult = data.result.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const formattedResult = `<div style="white-space: pre-wrap; text-align: left; font-family: monospace; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 8px; max-height: 60vh; overflow-y: auto;">${safeResult}</div>`;
                customConfirm({
                    title: 'Результат анализа',
                    message: formattedResult,
                    buttons: [
                        { label: 'Закрыть', value: true, class: 'confirm-btn-primary' }
                    ]
                });
            }

        } catch (error) {
            console.error(error);
            const modal = document.getElementById('explainConceptModal');
            const titleEl = document.getElementById('explainConceptTitle');
            const bodyEl = document.getElementById('explainConceptBody');

            if (modal && titleEl && bodyEl) {
                titleEl.innerText = 'Ошибка';
                bodyEl.innerHTML = `<div style="color:#ef4444;">${error.message}</div>`;
                modal.style.display = 'flex';
            } else {
                customConfirm({
                    title: 'Ошибка',
                    message: `<div style="color: red;">${error.message}</div>`,
                    buttons: [
                        { label: 'Закрыть', value: true, class: 'confirm-btn-secondary' }
                    ]
                });
            }
        }
    }

    async runGlobalParser() {
        const formula = await customPrompt({
            title: '✨ AI Formula Parser',
            message: 'Enter math formula for dialectical parsing:',
            placeholder: 'e.g. E = mc^2 or Hψ = Eψ',
            watermark: 'made of Iasmin',
            width: '500px'
        });
        if (!formula || !formula.trim()) return;

        window.showToast(window._("toast.ai_is_parsing_formula"), "info");

        try {
            const res = await fetch('/api/ai/dialectics/parser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formula: formula.trim() })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'API Error');
            }

            const data = await res.json();

            // Parse JSON response
            let parsed;
            try {
                parsed = JSON.parse(data.result);
            } catch (e) {
                // Sometimes LLM wraps JSON in markdown blocks
                const match = data.result.match(/```(?:json)?\n([\s\S]*?)\n```/);
                if (match) {
                    parsed = JSON.parse(match[1]);
                } else {
                    throw new Error("Failed to parse JSON response from AI.");
                }
            }

            // Create formatted HTML for the parsed JSON
            const formatBlock = (title, content, typeClass) => `
                <div class="parser-block ${typeClass}">
                    <div class="parser-block-title">${title}</div>
                    <div class="parser-block-content">${content || '—'}</div>
                </div>
            `;

            const htmlContent = `
                <div class="parser-modal-container">
                    <h3 class="parser-modal-header">
                        Formula Analysis: <span class="parser-modal-formula">${formula}</span>
                    </h3>
                    ${formatBlock("Preceding Operation (Thesis)", parsed.predecessor, "thesis")}
                    ${formatBlock("Crisis of Notation Complexity (Antithesis)", parsed.crisis_of_notation, "antithesis")}
                    ${formatBlock("Resolution (Synthesis)", parsed.resolution, "synthesis")}
                </div>
            `;

            customConfirm({
                title: 'Parser Result',
                message: htmlContent,
                icon: '🧮',
                watermark: 'made of Iasmin',
                width: '650px',
                buttons: [
                    { label: 'Close', value: true, class: 'confirm-btn-primary' }
                ]
            });

        } catch (error) {
            console.error(error);
            customConfirm({
                title: 'Parser Error',
                message: `<div style="color: red;">${error.message}</div>`,
                buttons: [
                    { label: 'Close', value: true, class: 'confirm-btn-secondary' }
                ]
            });
        }
    }

    async startTextMathDictation() {
        const text = await customPrompt({
            title: '✍ Describe the formula in words',
            message: 'Example: "square root of x squared plus y squared"',
            placeholder: 'Your text...'
        });
        if (!text || !text.trim()) return;

        window.showToast(window._("toast.ai_is_generating_formula"), "info");

        try {
            const res = await fetch('/api/ai/dialectics/text-math', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() })
            });

            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            const latex = data.latex;

            // Insert into TipTap
            if (this.editor && this.editor.tiptap) {
                this.editor.tiptap.chain().focus().insertContent({
                    type: 'mathNode',
                    attrs: { latex: latex }
                }).run();
                window.showToast(window._("toast.formula_added"), "success");
            }
        } catch (error) {
            console.error(error);
            window.showToast(window._("toast.error_generating_formula"), "error");
        }
    }

    async startVoiceMathDictation() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];
            let isCancelled = false;

            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                if (isCancelled) {
                    window.showToast(window._("toast.recording_cancelled"), "info");
                    return;
                }

                window.showToast(window._("toast.recognizing_and_generating_lat"), "info");

                const formData = new FormData();
                // append file
                formData.append("file", audioBlob, "voice-math.webm");

                try {
                    const res = await fetch('/api/ai/dialectics/voice-math', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) throw new Error(await res.text());

                    const data = await res.json();
                    const latex = data.latex;

                    console.log("Transcribed text:", data.transcribed_text);

                    // Insert into TipTap
                    if (this.editor && this.editor.tiptap) {
                        this.editor.tiptap.chain().focus().insertContent({
                            type: 'mathNode',
                            attrs: { latex: latex }
                        }).run();
                        window.showToast(window._("toast.formula_added"), "success");
                    }

                } catch (error) {
                    console.error(error);
                    window.showToast(window._("toast.audio_processing_error"), "error");
                }
            });

            mediaRecorder.start();

            // Show toast indicating recording
            customConfirm({
                title: '🎙 Recording',
                message: '<div style="text-align: center; color: red; font-weight: bold; animation: pulse 1.5s infinite;">Audio recording in progress... Speak the formula.</div>',
                buttons: [
                    { label: 'Stop and recognize', value: true, class: 'confirm-btn-primary' },
                    { label: 'Cancel', value: false, class: 'confirm-btn-secondary' }
                ]
            }).then((val) => {
                if (val === false) isCancelled = true;
                // Stop recording when user clicks any button
                if (mediaRecorder.state === "recording") {
                    mediaRecorder.stop();
                }
            });

        } catch (err) {
            console.error("Microphone access denied or error:", err);
            window.showToast(window._("toast.no_microphone_access"), "error");
        }
    }

    async saveGlobal(shouldClose = true, toastKey = "toast.dialectics_saved") {
        const title = this.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        const html = this.editor.getHTML();
        console.log("TipTap HTML Output -> length:", html.length);
        if (this.state.editingBlock) {
            const inner = this.state.editingBlock.querySelector('.dialectics-content-inner');
            if (inner) {
                inner.innerHTML = html;
                BlockManager.renderMath(inner);
            }
        } else if (this.state.pendingSide) {
            if (html !== '<p></p>' && html.trim() !== '') {
                const currentBlocks = BlockManager.getBlocks(this.dom.canvas);
                const newBlock = { id: this.state.pendingBlockId, side: this.state.pendingSide, html };
                if (this.state.pendingRole) {
                    newBlock.role = this.state.pendingRole;
                }
                let newBlocks;
                if (this.state.insertAfterIndex !== null) {
                    // Insert after the specified index
                    newBlocks = [
                        ...currentBlocks.slice(0, this.state.insertAfterIndex + 1),
                        newBlock,
                        ...currentBlocks.slice(this.state.insertAfterIndex + 1)
                    ];
                } else {
                    newBlocks = [...currentBlocks, newBlock];
                }
                this.state.insertAfterIndex = null;
                this.state.pendingRole = null;
                BlockManager.render(this.dom.canvas, newBlocks, this._blockCallbacks());
            }
        }

        const blocks = BlockManager.getBlocks(this.dom.canvas);
        const categoryId = this.dom.categorySelect ? this.dom.categorySelect.value : null;

        const payload = {
            title,
            blocks: blocks.map(b => ({
                id: b.id,
                side: b.side,
                html: b.html,
                role: b.role
            })),
            is_pinned: this.state.isPinned || false,
            category_id: categoryId ? parseInt(categoryId) : null,
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        if (this.state.currentNoteId) {
            payload.id = Number(this.state.currentNoteId);
        }

        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            this.state.currentNoteId = res.id;
            localStorage.setItem('dialectics_last_note_id', res.id);
            
            // Sync URL query parameter
            const url = new URL(window.location);
            if (url.searchParams.get('id') !== String(res.id)) {
                url.searchParams.set('id', res.id);
                window.history.pushState({}, '', url);
            }

            window.showToast(window._(toastKey) || window._("toast.dialectics_saved"), "success");
            if (shouldClose) {
                this.close();
            }
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'block';
            return res.id;
        }
        return null;
    }

    async openStickersForCurrent(forceBlockId = null) {
        if (!this.state.currentNoteId) {
            if (window.showToast) window.showToast(window._("toast.saving_note_to_attach_sticker"), "info");
            const savedId = await this.saveGlobal(false);
            if (!savedId) {
                if (window.showToast) window.showToast(window._("toast.failed_to_save_note"), "error");
                return;
            }
        }
        
        let blockId = forceBlockId;
        if (!blockId) {
            if (this.state.editingBlock) {
                blockId = this.state.editingBlock.dataset.blockId;
            } else if (this.state.pendingBlockId) {
                blockId = this.state.pendingBlockId;
            }
        }

        if (window.openParentStickers) {
            window.openParentStickers('dialectics', this.state.currentNoteId, blockId);
        }
    }

    async saveAndPin() {
        const title = this.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        let html = this.editor.getHTML() || (this.dom.dashboardTextarea?.value.replace(/\n/g, '<br>') || "");

        const payload = {
            title,
            blocks: [{ side: 'left', html }],
            is_pinned: true,
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        if (this.state.currentNoteId) {
            payload.id = this.state.currentNoteId;
        }

        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            window.showToast(window._("toast.saved_and_pinned"), "success");
            this.close();
            setTimeout(() => location.reload(), 500);
        }
    }

    async loadNoteToEditor(id, addToHistory = true) {
        const n = await DialecticsAPI.get(id);
        if (n) {
            if (addToHistory && this.state.currentNoteId && this.state.currentNoteId !== n.id) {
                const history = this.getNoteHistory();
                if (history.length === 0 || history[history.length - 1] !== this.state.currentNoteId) {
                    history.push(this.state.currentNoteId);
                    this.saveNoteHistory(history);
                }
            }
            this.state.currentNoteId = n.id;
            localStorage.setItem('dialectics_last_note_id', n.id);
            this.dom.title.value = n.title;
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;

            if (this.dom.categorySelect) {
                this.dom.categorySelect.value = n.category_id || "";
            }

            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());

            this._revealInterface();
            this.hideLoadModal();
            if (this.dom.deleteBtn) {
                this.dom.deleteBtn.style.display = (n.title === "Example Note" || n.title === "Пример конспекта" || n.title === "Конспект мысалы") ? 'none' : 'block';
            }

            // Sync URL query parameter
            const url = new URL(window.location);
            if (url.searchParams.get('id') !== String(n.id)) {
                url.searchParams.set('id', n.id);
                window.history.pushState({}, '', url);
            }
        } else {
            // Note not found (e.g. deleted), clear stored id and show empty
            localStorage.removeItem('dialectics_last_note_id');
            this._revealInterface();
        }
    }

    async loadExample() {
        DialecticsUI.setLoading(this.dom.canvas);
        try {
            const response = await fetch('/api/dialectics/example/get_or_create_id');
            if (response.ok) {
                const data = await response.json();
                if (data && data.id) {
                    await this.loadNoteToEditor(data.id);
                    window.showToast(window._("toast.opened_existing_example_note") || "Example Note loaded", "info");
                }
            } else {
                console.error("Failed to load example note ID.");
                DialecticsUI.clearLoading(this.dom.canvas);
            }
        } catch (e) {
            console.error(e);
            DialecticsUI.clearLoading(this.dom.canvas);
        }
    }

    async createNewNote() {
        if (this.state.isDirty) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_new_msg') : "Есть несохранённые изменения. Создать новый конспект?",
                icon: '⚠️',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.create_btn') : 'Создать', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (confirmed) {
                this.state.isDirty = false;
                this._resetToNewNote();
            }
        } else {
            this._resetToNewNote();
        }
    }

    _resetToNewNote() {
        if (this.state.currentNoteId) {
            const history = this.getNoteHistory();
            if (history.length === 0 || history[history.length - 1] !== this.state.currentNoteId) {
                history.push(this.state.currentNoteId);
                this.saveNoteHistory(history);
            }
        }
        this.state.currentNoteId = null;
        localStorage.removeItem('dialectics_last_note_id');
        if (this.dom.title) this.dom.title.value = "";
        if (this.dom.categorySelect) this.dom.categorySelect.value = "";
        if (this.dom.canvas) BlockManager.render(this.dom.canvas, [], this._blockCallbacks());
        if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'none';
        
        // Remove ?id=... query parameter from the URL
        const url = new URL(window.location);
        url.searchParams.delete('id');
        window.history.pushState({}, '', url);
        
        window.showToast(window._("toast.created_a_new_blank_note"), "success");
    }

    getNoteHistory() {
        try {
            const data = sessionStorage.getItem('dialectics_note_history');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveNoteHistory(history) {
        try {
            sessionStorage.setItem('dialectics_note_history', JSON.stringify(history));
        } catch (e) {}
    }

    loadPreviousNote() {
        const history = this.getNoteHistory();
        if (history.length > 0) {
            const prevId = history.pop();
            this.saveNoteHistory(history);
            this.loadNoteToEditor(prevId, false);
            window.showToast(window._("toast.loaded_previous_note"), "info");
        } else {
            window.location.href = '/';
        }
    }

    logDebug(msg) {
        if (!this.dom.debug) return;
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.dom.debug.prepend(line);
    }
}

Object.assign(DialecticsEngine.prototype, ModalsControllerMixin);

window.app = new DialecticsEngine();
