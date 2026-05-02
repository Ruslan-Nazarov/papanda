/**
 * smart_notes.js - Главный оркестратор (Entry Point)
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NoteAPI } from './smart_notes/api.js';
import { NoteUI } from './smart_notes/ui_utils.js';
import { MathNode, ResizableImage } from './smart_notes/editor_setup.js';
import { MathTool } from './smart_notes/tools/math.js';
import { GraphTool } from './smart_notes/tools/graph.js';
import { ShapeTool } from './smart_notes/tools/shapes.js';

class SmartNoteEngine {
    constructor() {
        // Fallback for Toast notifications if not defined globally
        window.showToast = window.showToast || ((msg) => console.log("Toast:", msg));
        
        console.log("SmartNoteEngine: Initializing Modular App...");
        this.state = { 
            currentNoteId: null, 
            pendingSide: null, 
            isExpanded: false, 
            backupPos: { top: '', left: '' },
            activeTab: 'text',
            tiptap: null,
            editingBlock: null,
            fabricCanvas: null,
            notesList: [] // Cache for searching
        };
        this.utils = {
            extractText: (html) => {
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                return tmp.textContent || tmp.innerText || "";
            }
        };
        this.dom = {
            canvas: document.getElementById('noteCanvas'), 
            editor: document.getElementById('inlineEditor'),
            title: document.getElementById('globalNoteTitle'), 
            category: document.getElementById('globalNoteCategory'),
            deleteBtn: document.getElementById('btnDeleteNote'), 
            backdrop: document.getElementById('expandedBackdrop'), 
            dragHandle: document.getElementById('editorDragHandle'),
            loadModal: document.getElementById('loadNoteModal'), 
            loadList: document.getElementById('loadNotesList'),
            viewModal: document.getElementById('smartNoteViewModal'),
            viewTitle: document.getElementById('viewModalTitle'),
            viewBody: document.getElementById('viewModalBody'),
            debug: document.getElementById('editorDebugLogs'),
            dashboardTextarea: document.getElementById('dashboard-note-editor')
        };

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
        this.checkLibs();

        if (this.dom.editor) {
            this.logDebug(`Engine init in ${this.dom.editor.classList.contains('embedded') ? 'Embedded' : 'Full'} mode`);
            
            if (this.dom.editor.classList.contains('embedded') && this.dom.dashboardTextarea) {
                this.setupDashboardTextarea();
            } else {
                // Standalone mode: check URL for note ID
                const params = new URLSearchParams(window.location.search);
                const noteId = params.get('id');
                if (noteId) {
                    this.logDebug(`Found ID ${noteId} in URL, loading...`);
                    this.loadNoteToEditor(noteId);
                }
            }
            
            // Always initialize the primary tab (text)
            this.switchTab('text');
        }
    }

    setupDashboardTextarea() {
        if (!this.dom.dashboardTextarea) return;
        const ta = this.dom.dashboardTextarea;
        const autoResize = () => {
            ta.style.height = 'auto';
            ta.style.height = (ta.scrollHeight) + 'px';
        };
        ta.addEventListener('input', autoResize);
        ta.addEventListener('focus', autoResize);
        // Initial resize
        setTimeout(autoResize, 100);
    }

    logDebug(msg) {
        if (!this.dom.debug) return;
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const line = document.createElement('div');
        line.textContent = `[${time}] ${msg}`;
        this.dom.debug.prepend(line);
        console.log(`[SmartNotes Debug] ${msg}`);
    }

    checkLibs() {
        const libs = {
            'TipTap': !!Editor,
            'MathLive': !!window.MathfieldElement
        };
        Object.entries(libs).forEach(([name, status]) => {
            this.logDebug(`${name}: ${status}`);
        });
    }

    _bindEvents() {
        NoteUI.setupDraggable(this.dom.editor, this.dom.dragHandle, this.state);
        
        const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn.bind(this));
        
        bind('btnDeleteNote', this.deleteGlobal);
        bind('btnSaveNote', this.saveGlobal);
        bind('btnMathFormula', this.showMathMenu);
        bind('btnBoldFormat', this.toggleBold);
        
        // Context-aware Save button
        if (this.dom.editor && this.dom.editor.classList.contains('embedded')) {
            bind('btnEditorSave', this.saveAndPin);
        } else {
            bind('btnEditorSave', this.saveGlobal);
        }

        bind('btnPinNote', this.pinCurrent);
        bind('btnEditorClose', this.close);
        bind('btnEditorExpand', this.toggleExpand);
        bind('btnLoadNote', this.showLoadModal);
        
        bind('btnViewModalEdit', () => {
            this.hideViewModal();
            this.loadNoteToEditor(this.state.viewingNoteId);
        });
        
        bind('btnViewModalDelete', async () => {
            if (confirm("Delete this note?")) {
                if (await NoteAPI.delete(this.state.viewingNoteId)) location.reload();
            }
        });

        if (this.dom.canvas) {
            this.dom.canvas.addEventListener('click', (e) => {
                if (e.target.closest('button, .resize-handle')) return;
                const b = e.target.closest('.note-block');
                if (b) return;

                const r = this.dom.canvas.getBoundingClientRect();
                const mid = r.left + (r.width / 2);
                const clickedSide = e.clientX < mid ? 'left' : 'right';
                const lastSide = this.getLastSide();
                
                if (lastSide === null || clickedSide !== lastSide) {
                    this.state.editingBlock = null;
                    this.state.pendingSide = clickedSide;
                    this.open();
                } else {
                    window.showToast("Пожалуйста, чередуйте стороны (формат диалога)", "info");
                }
            });

            this.dom.canvas.addEventListener('dblclick', (e) => {
                const b = e.target.closest('.note-block');
                if (b) {
                    this.state.editingBlock = b;
                    this.openEdit(b);
                }
            });
        }

        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Tools
        bind('btnGraphPlot', this.plotGraph);
        bind('btnGraphInsert', this.insertGraphToNote);
        bind('btnShapeDelete', this.deleteSelectedShape);
        bind('btnShapeClear', this.clearShapes);
        bind('btnShapesInsert', this.insertShapesToNote);

        document.querySelectorAll('.shape-tool[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => this.setShapeTool(btn.dataset.tool));
        });
        document.querySelectorAll('.shape-tool[data-shape]').forEach(btn => {
            btn.addEventListener('click', () => this.addShape(btn.dataset.shape));
        });
    }

    initTipTap() {
        if (this.state.tiptap) return;
        const el = document.getElementById('tiptap-editor');
        if (!el) {
            this.logDebug("TipTap target not found, skipping (Dashboard Mode?)");
            return;
        }
        
        el.addEventListener('mousedown', (e) => e.stopPropagation());
        
        try {
            this.state.tiptap = new Editor({
                element: el,
                extensions: [StarterKit, MathNode, ResizableImage],
                content: '<p></p>',
                autofocus: 'end',
                onFocus: () => el.classList.add('focused'),
                onBlur: () => el.classList.remove('focused'),
                editorProps: {
                    handleDOMEvents: {
                        mousedown: (view, event) => {
                            event.stopPropagation();
                            return false;
                        },
                        contextmenu: (view, event) => {
                            event.preventDefault();
                            MathTool.showContextMenu(event.clientX, event.clientY, (s) => this.insertMath(s));
                            return true;
                        }
                    }
                },
                onSelectionUpdate: ({ editor }) => {
                    const { from, to } = editor.state.selection;
                    const btn = document.getElementById('btnBoldFormat');
                    if (btn) btn.style.display = (from !== to) ? 'inline-block' : 'none';
                },
            });
        } catch (e) { console.error("TipTap init error:", e); }
    }

    async showMathMenu() {
        const menu = document.getElementById('mathMenu');
        if (menu && menu.style.display === 'flex') {
            menu.style.display = 'none';
            return;
        }
        if (menu) menu.style.display = 'flex';
        await MathTool.initMathLive();
        this.switchMathCategory('main');
    }

    switchMathCategory(cat) {
        MathTool.renderPalette(
            document.getElementById('mathPalette'),
            cat,
            (s) => this.insertMath(s),
            (c) => this.switchMathCategory(c)
        );
    }

    insertMath(latex) {
        let active = document.activeElement;
        if (active && active.tagName === 'MATH-FIELD' && !active.hasAttribute('read-only')) {
            active.insert(latex);
            return;
        }
        this.state.tiptap?.chain().focus().insertContent({ type: 'mathNode', attrs: { latex } }).run();
    }

    toggleBold() {
        this.state.tiptap?.chain().focus().toggleBold().run();
    }

    async switchTab(tab) {
        this.state.activeTab = tab;
        document.querySelectorAll('.editor-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
        document.querySelectorAll('.tab-content').forEach(el => {
            const isTarget = el.id === `editor-${tab}`;
            el.classList.toggle('active', isTarget);
            el.style.display = isTarget ? 'flex' : 'none';
        });

        if (tab === 'text') {
            if (document.getElementById('tiptap-editor')) {
                await this.initTipTap();
            } else {
                this.logDebug("Switched to text tab, but no TipTap editor found.");
            }
        }
        else if (tab === 'graph') await GraphTool.init();
        else if (tab === 'shapes') {
            if (!this.state.fabricCanvas) {
                this.state.fabricCanvas = await ShapeTool.init('shapesCanvas', 'shapesCanvasWrapper');
            }
        }
    }

    plotGraph() {
        GraphTool.plot(document.getElementById('graphPreview'), document.getElementById('graphFuncInput').value);
    }

    async insertGraphToNote() {
        const svg = document.getElementById('graphPreview').querySelector('svg');
        if (svg && this.state.tiptap) {
            await GraphTool.exportToPNG(svg, this.state.tiptap, () => this.switchTab('text'));
        }
    }

    setShapeTool(tool) {
        ShapeTool.setTool(this.state.fabricCanvas, tool, document.getElementById('shapeColor').value);
    }

    async addShape(type) {
        await ShapeTool.add(this.state.fabricCanvas, type, document.getElementById('shapeColor').value);
    }

    deleteSelectedShape() {
        if (!this.state.fabricCanvas) return;
        const active = this.state.fabricCanvas.getActiveObjects();
        this.state.fabricCanvas.discardActiveObject();
        this.state.fabricCanvas.remove(...active);
    }

    clearShapes() {
        if (confirm("Очистить холст?") && this.state.fabricCanvas) {
            this.state.fabricCanvas.clear();
            this.state.fabricCanvas.backgroundColor = '#ffffff';
        }
    }

    insertShapesToNote() {
        ShapeTool.exportToPNG(this.state.fabricCanvas, this.state.tiptap, () => this.switchTab('text'));
    }

    open(content = '') {
        // On standalone page, the editor is a modal/popover that needs to be shown
        if (this.dom.editor && !this.dom.editor.classList.contains('embedded')) {
            NoteUI.toggleDisplay(this.dom.editor, true, true);
        }
        
        this.switchTab('text');
        if (this.state.tiptap) {
            this.state.tiptap.commands.setContent(content);
            this.state.tiptap.commands.focus();
        } else if (this.dom.dashboardTextarea) {
            // Convert HTML to text for textarea
            const temp = document.createElement('div');
            temp.innerHTML = content;
            this.dom.dashboardTextarea.value = temp.innerText || temp.textContent || "";
            this.dom.dashboardTextarea.dispatchEvent(new Event('input')); // Trigger resize
        }
    }

    openEdit(block) {
        const html = block.querySelector('.note-content-inner')?.innerHTML || "";
        this.open(html);
    }

    close() {
        console.log("SmartNotes: Closing editor...");
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
            if (this.dom.backdrop) NoteUI.toggleDisplay(this.dom.backdrop, this.state.isExpanded);
        }
    }

    async saveAndPin() {
        this.logDebug("Saving and pinning...");
        const title = this.dom.title.value || "Untitled Note";
        const category = this.dom.category ? this.dom.category.value : "";
        let html = "";
        
        if (this.state.tiptap) {
            html = this.state.tiptap.getHTML();
        } else if (this.dom.dashboardTextarea) {
            html = this.dom.dashboardTextarea.value.replace(/\n/g, '<br>');
        }
        
        const payload = { 
            title, 
            category,
            blocks: [{ side: 'left', html }],
            is_pinned: true 
        };
        
        try {
            const res = await NoteAPI.save(payload, this.state.currentNoteId);
            if (res) {
                window.showToast("✓ Note saved and pinned", "success");
                if (this.dom.editor) this.close();
                // Reload dashboard to update pinned widget
                if (this.dom.editor && this.dom.editor.classList.contains('embedded')) {
                    setTimeout(() => location.reload(), 500);
                }
            }
        } catch (e) { console.error(e); }
    }

    async pinCurrent() {
        if (this.state.currentNoteId) {
            await this.togglePin(this.state.currentNoteId, true);
        } else {
            alert("Save note first.");
        }
    }

    async togglePin(id, shouldPin) {
        const endpoint = shouldPin ? 'pin' : 'unpin';
        try {
            const res = await fetch(`/api/smart_notes/${id}/${endpoint}`, { method: 'POST' });
            if (res.ok) {
                window.showToast(`✓ Note ${shouldPin?'pinned':'unpinned'}`, "success");
                setTimeout(() => location.reload(), 500);
            }
        } catch (e) { console.error(e); }
    }

    async showLoadModal() {
        this.dom.loadModal.style.display = 'flex';
        this.searchNotes("");
    }

    hideLoadModal() {
        this.dom.loadModal.style.display = 'none';
    }

    async searchNotes(query) {
        if (this._searchTimeout) clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(async () => {
            NoteUI.setLoading(this.dom.loadList);
            const notes = await NoteAPI.list(query);
            this.state.notesList = notes;
            this.renderNotesList(notes);
        }, 300);
    }

    renderNotesList(notes) {
        this.dom.loadList.innerHTML = notes.length ? '' : '<div style="color: #94a3b8; text-align: center; margin-top: 20px;">No notes found</div>';
        notes.forEach(n => {
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;
            const fullText = blocks.map(b => this.utils.extractText(b.html)).join(' ');
            const preview = fullText.length > 80 ? fullText.substring(0, 80) + '...' : fullText;

            const i = document.createElement('div');
            i.className = 'load-note-item';
            i.style = "display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all 0.2s;";
            i.onmouseover = () => { i.style.borderColor = '#3b82f6'; i.style.background = '#fff'; };
            i.onmouseout = () => { i.style.borderColor = '#e2e8f0'; i.style.background = '#f8fafc'; };
            
            i.innerHTML = `
                <div class="note-info" style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; color: #1e293b; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${DOMPurify.sanitize(n.title)}</div>
                    <div style="font-size: 0.8em; color: #64748b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${DOMPurify.sanitize(preview) || 'No content'}</div>
                    <small style="font-size: 0.7em; color: #94a3b8; margin-top: 4px; display: block;">${new Date(n.updated_at).toLocaleDateString()}</small>
                </div>
                <div class="note-actions" style="margin-left: 15px;">
                    <button class="btn-pin-widget ${n.is_pinned?'active':''}" 
                            onclick="event.stopPropagation(); window.app.togglePin(${n.id}, ${!n.is_pinned})"
                            style="font-size: 1.2em; background: none; border: none; cursor: pointer; color: ${n.is_pinned ? '#3b82f6' : '#cbd5e1'}; transition: transform 0.2s;">
                        📍
                    </button>
                </div>
            `;
            i.onclick = () => this.loadNoteToEditor(n.id);
            this.dom.loadList.appendChild(i);
        });
    }

    async loadNoteToEditor(id) {
        const n = await NoteAPI.get(id);
        if (n) {
            this.state.currentNoteId = n.id;
            this.dom.title.value = n.title;
            if (this.dom.category) this.dom.category.value = n.category || "";
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;
            
            if (this.dom.canvas) {
                // Full mode: render blocks on canvas and update URL
                this.renderCanvas(blocks);
                const url = new URL(window.location);
                url.searchParams.set('id', n.id);
                window.history.replaceState({}, '', url);
            } else {
                // Embedded mode: join all blocks into one textarea
                const html = blocks.map(b => DOMPurify.sanitize(b.html)).join('<br>');
                this.open(html);
            }
            this.hideLoadModal();
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'block';
        }
    }

    renderCanvas(blocks) {
        if (!this.dom.canvas) return;
        // Keep the divider if it's there
        const divider = document.getElementById('canvasDivider');
        this.dom.canvas.innerHTML = '';
        if (divider) this.dom.canvas.appendChild(divider);

        blocks.forEach(b => {
            const el = document.createElement('div');
            el.className = `note-block block-${b.side}`;
            el.innerHTML = `
                <div class="note-content-inner">${b.html}</div>
                <div class="block-actions">
                    <button class="btn-block-edit">✎</button>
                    <button class="btn-block-del">×</button>
                </div>
            `;
            el.querySelector('.btn-block-edit').onclick = (e) => {
                e.stopPropagation();
                this.state.editingBlock = el;
                this.openEdit(el);
            };
            el.querySelector('.btn-block-del').onclick = (e) => {
                e.stopPropagation();
                if (confirm("Удалить блок?")) el.remove();
            };
            this.dom.canvas.appendChild(el);
        });
    }

    async saveGlobal() {
        this.logDebug("Saving note (Full Mode)...");
        const title = this.dom.title.value || "Untitled Note";
        const category = this.dom.category ? this.dom.category.value : "";
        
        if (this.state.editingBlock && this.state.tiptap) {
            const inner = this.state.editingBlock.querySelector('.note-content-inner');
            if (inner) inner.innerHTML = this.state.tiptap.getHTML();
        } else if (this.state.pendingSide && this.state.tiptap) {
            const html = this.state.tiptap.getHTML();
            // Prevent adding completely empty blocks
            if (html !== '<p></p>' && html.trim() !== '') {
                this.renderCanvas([...this.getBlocksFromCanvas(), { side: this.state.pendingSide, html }]);
            }
        }

        const blocks = this.getBlocksFromCanvas();
        const payload = { title, category, blocks };
        if (this.state.currentNoteId) payload.id = this.state.currentNoteId;
        
        this.logDebug(`Payload prepared with ${blocks.length} blocks`);
        
        try {
            const res = await NoteAPI.save(payload, this.state.currentNoteId);
            if (res) {
                this.logDebug("Save successful");
                this.state.currentNoteId = res.id;
                
                // Update URL seamlessly
                const url = new URL(window.location);
                url.searchParams.set('id', res.id);
                window.history.replaceState({}, '', url);

                window.showToast("✓ Note Saved", "success");
                this.close();
                if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'block';
            } else {
                this.logDebug("Save failed (API returned null)");
                alert("Ошибка при сохранении. Проверьте консоль.");
            }
        } catch (e) { 
            this.logDebug(`Save Error: ${e.message}`);
            console.error(e); 
        }
    }

    getBlocksFromCanvas() {
        if (!this.dom.canvas) return [];
        const blocks = [];
        this.dom.canvas.querySelectorAll('.note-block').forEach(b => {
            const inner = b.querySelector('.note-content-inner');
            if (inner) {
                blocks.push({
                    side: b.classList.contains('block-left') ? 'left' : 'right',
                    html: inner.innerHTML
                });
            }
        });
        return blocks;
    }

    async viewNoteDetails(id) {
        const n = await NoteAPI.get(id);
        if (n) {
            this.state.viewingNoteId = n.id;
            this.dom.viewTitle.innerText = n.title;
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;
            this.dom.viewBody.innerHTML = blocks.map(b => DOMPurify.sanitize(b.html)).join('<hr style="border: none; border-top: 1px solid #f1f5f9; margin: 15px 0;">');
            this.dom.viewModal.style.display = 'flex';
        }
    }

    hideViewModal() {
        this.dom.viewModal.style.display = 'none';
    }

    async deleteGlobal() {
        if (this.state.currentNoteId && confirm("Удалить заметку?")) {
            if (await NoteAPI.delete(this.state.currentNoteId)) location.reload();
        }
    }

    getLastSide() {
        if (!this.dom.canvas) return null;
        const blocks = this.dom.canvas.querySelectorAll('.note-block');
        if (blocks.length === 0) return null;
        return blocks[blocks.length - 1].classList.contains('block-left') ? 'left' : 'right';
    }

}

window.app = new SmartNoteEngine();
