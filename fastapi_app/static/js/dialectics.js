/**
 * dialectics.js - Главный оркестратор (Entry Point) для Диалектики
 */
import { DialecticsAPI } from './dialectics/api.js';
import { DialecticsUI } from './dialectics/ui_utils.js';
import { BlockManager } from './dialectics/BlockManager.js';
import { CanvasManager } from './dialectics/CanvasManager.js';
import { EditorManager } from './dialectics/EditorManager.js';
import { MathTool } from './dialectics/tools/math.js';

class DialecticsEngine {
    constructor() {
        window.showToast = window.showToast || ((msg) => console.log("Toast:", msg));
        
        this.state = { 
            currentNoteId: null, 
            pendingSide: null, 
            isExpanded: false, 
            editingBlock: null,
            notesList: [],
            viewingNoteId: null
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
            viewModal: document.getElementById('dialecticsViewModal'),
            viewTitle: document.getElementById('dialecticsViewTitle'),
            viewBody: document.getElementById('dialecticsViewBody'),
            debug: document.getElementById('editorDebugLogs'),
            dashboardTextarea: document.getElementById('dashboard-note-editor')
        };

        this.editor = new EditorManager(this);

        if (this.dom.editor) {
            this.init();
        }
    }

    async init() {
        this.logDebug("Engine init...");
        
        try {
            await MathTool.initMathLive();
        } catch (e) {
            console.error("MathLive preload failed:", e);
        }
        
        if (window.MathfieldElement) {
            window.MathfieldElement.fontsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive@latest/dist/fonts';
        }
        
        this._bindEvents();
        
        if (this.dom.editor.classList.contains('embedded') && this.dom.dashboardTextarea) {
            this.setupDashboardTextarea();
        } else {
            const params = new URLSearchParams(window.location.search);
            const noteId = params.get('id');
            if (noteId) this.loadNoteToEditor(noteId);
        }
        
        await this.editor.switchTab('text');
    }

    _bindEvents() {
        DialecticsUI.setupDraggable(this.dom.editor, this.dom.dragHandle, this.state);
        DialecticsUI.setupResizable(this.dom.editor, document.getElementById('editorResizeHandle'));
        
        const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn.bind(this));
        
        bind('btnDeleteDialectics', this.deleteGlobal);
        bind('btnSaveDialectics', this.saveGlobal);
        bind('btnMathFormula', () => this.editor.showMathMenu()); // Need to add showMathMenu to EditorManager or keep here
        bind('btnBoldFormat', () => this.editor.toggleBold());
        
        if (this.dom.editor.classList.contains('embedded')) {
            bind('btnEditorSave', this.saveAndPin);
        } else {
            bind('btnEditorSave', this.saveGlobal);
        }

        bind('btnPinNote', this.pinCurrent);
        bind('btnEditorClose', this.close);
        bind('btnEditorExpand', this.toggleExpand);
        bind('btnLoadDialectics', this.showLoadModal);
        
        bind('btnViewModalEdit', () => {
            this.hideViewModal();
            this.loadNoteToEditor(this.state.viewingNoteId);
        });

        CanvasManager.init(this.dom.canvas, {
            onClick: (clientX, mid) => {
                const lastSide = BlockManager.getLastSide(this.dom.canvas);
                let nextSide = 'left';
                if (lastSide === 'left') nextSide = 'right';
                else if (lastSide === 'right') nextSide = 'left';
                else nextSide = clientX < mid ? 'left' : 'right';

                this.state.editingBlock = null;
                this.state.pendingSide = nextSide;
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
        bind('btnShapeDelete', () => this.editor.deleteSelectedShape());
        bind('btnShapeClear', () => this.editor.clearShapes());
        bind('btnShapesInsert', () => this.editor.insertShapesToNote());

        document.querySelectorAll('.shape-tool[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => this.editor.setShapeTool(btn.dataset.tool));
        });
        document.querySelectorAll('.shape-tool[data-shape]').forEach(btn => {
            btn.addEventListener('click', () => this.editor.addShape(btn.dataset.shape));
        });
    }

    // --- Core Logic ---
    open(content = '') {
        if (this.dom.editor && !this.dom.editor.classList.contains('embedded')) {
            DialecticsUI.toggleDisplay(this.dom.editor, true, true);
        }
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
            this.dom.editor.classList.remove('expanded');
        }
        if (this.dom.backdrop) this.dom.backdrop.style.display = 'none';
        this.state.editingBlock = null;
        this.state.pendingSide = null;
    }

    toggleExpand() {
        this.state.isExpanded = !this.state.isExpanded;
        if (this.dom.editor) {
            this.dom.editor.classList.toggle('expanded', this.state.isExpanded);
            if (this.dom.backdrop) DialecticsUI.toggleDisplay(this.dom.backdrop, this.state.isExpanded);
        }
    }

    async saveGlobal() {
        const title = this.dom.title.value || "Untitled Dialectics";
        const html = this.editor.getHTML();
        
        if (this.state.editingBlock) {
            const inner = this.state.editingBlock.querySelector('.dialectics-content-inner');
            if (inner) inner.innerHTML = html;
        } else if (this.state.pendingSide) {
            if (html !== '<p></p>' && html.trim() !== '') {
                const currentBlocks = BlockManager.getBlocks(this.dom.canvas);
                BlockManager.render(this.dom.canvas, [...currentBlocks, { side: this.state.pendingSide, html }], {
                    onEdit: (b) => { this.state.editingBlock = b; this.openEdit(b); }
                });
            }
        }

        const blocks = BlockManager.getBlocks(this.dom.canvas);
        const payload = { 
            title, 
            blocks,
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        
        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            this.state.currentNoteId = res.id;
            window.showToast("✓ Dialectics Saved", "success");
            this.close();
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'block';
        }
    }

    async saveAndPin() {
        const title = this.dom.title.value || "Untitled Dialectics";
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
        
        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            window.showToast("✓ Saved and pinned", "success");
            this.close();
            setTimeout(() => location.reload(), 500);
        }
    }

    async loadNoteToEditor(id) {
        const n = await DialecticsAPI.get(id);
        if (n) {
            this.state.currentNoteId = n.id;
            this.dom.title.value = n.title;
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;
            
            BlockManager.render(this.dom.canvas, blocks, {
                onEdit: (b) => { this.state.editingBlock = b; this.openEdit(b); }
            });
            
            this.hideLoadModal();
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'block';
        }
    }

    // --- Modal Helpers ---
    showLoadModal() {
        this.dom.loadModal.style.display = 'flex';
        this.searchNotes("");
    }
    hideLoadModal() { this.dom.loadModal.style.display = 'none'; }

    async searchNotes(query) {
        DialecticsUI.setLoading(this.dom.loadList);
        const notes = await DialecticsAPI.list(query);
        this.renderNotesList(notes);
    }

    renderNotesList(notes) {
        this.dom.loadList.innerHTML = notes.length ? '' : 'No entries found';
        notes.forEach(n => {
            const i = document.createElement('div');
            i.className = 'load-note-item';
            i.innerHTML = `<strong>${n.title}</strong><br><small>${new Date(n.updated_at).toLocaleDateString()}</small>`;
            i.onclick = () => this.loadNoteToEditor(n.id);
            this.dom.loadList.appendChild(i);
        });
    }

    async deleteGlobal() {
        if (!this.state.currentNoteId) return;
        if (confirm("Are you sure you want to delete this Dialectics?")) {
            const ok = await DialecticsAPI.delete(this.state.currentNoteId);
            if (ok) {
                window.showToast("Dialectics deleted", "info");
                location.reload();
            }
        }
    }

    async pinCurrent() {
        if (!this.state.currentNoteId) {
            window.showToast("Save first to pin", "warning");
            return;
        }
        
        const title = this.dom.title.value || "Untitled Dialectics";
        const blocks = BlockManager.getBlocks(this.dom.canvas);
        
        const payload = { 
            id: this.state.currentNoteId,
            title, 
            blocks,
            is_pinned: true
        };
        
        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            window.showToast("Pinned successfully", "success");
        }
    }

    showViewModal(id, title, blocks) {
        this.state.viewingNoteId = id;
        this.dom.viewTitle.textContent = title;
        
        // Render blocks into a simple view
        let fullHtml = "";
        blocks.forEach(b => {
            fullHtml += `<div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <small style="color: #94a3b8; text-transform: uppercase;">${b.side}</small>
                <div>${b.html}</div>
            </div>`;
        });
        
        this.dom.viewBody.innerHTML = fullHtml;
        this.dom.viewModal.style.display = 'flex';
    }

    hideViewModal() {
        this.dom.viewModal.style.display = 'none';
        this.state.viewingNoteId = null;
    }

    logDebug(msg) {
        if (!this.dom.debug) return;
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.dom.debug.prepend(line);
    }
}

window.app = new DialecticsEngine();
