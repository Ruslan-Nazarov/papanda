/**
 * dialectics.js - Главный оркестратор (Entry Point) для Диалектики
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DialecticsAPI } from './dialectics/api.js';
import { DialecticsUI } from './dialectics/ui_utils.js';
import { MathNode, ResizableImage } from './dialectics/editor_setup.js';
import { MathTool } from './dialectics/tools/math.js';
import { GraphTool } from './dialectics/tools/graph.js';
import { ShapeTool } from './dialectics/tools/shapes.js';

class DialecticsEngine {
    constructor() {
        // Fallback for Toast notifications if not defined globally
        window.showToast = window.showToast || ((msg) => console.log("Toast:", msg));
        
        console.log("DialecticsEngine: Initializing Modular App...");
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

        if (this.dom.editor) {
            this.init();
        }
    }

    async init() {
        this.logDebug("Engine init... (Dialectics)");
        
        if (!this.dom.canvas) {
            this.logDebug("WARNING: dialecticsCanvas not found in DOM");
        }
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
                // Standalone mode: check URL for record ID
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
        console.log(`[Dialectics Debug] ${msg}`);
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
        DialecticsUI.setupDraggable(this.dom.editor, this.dom.dragHandle, this.state);
        
        const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn.bind(this));
        
        bind('btnDeleteDialectics', this.deleteGlobal);
        bind('btnSaveDialectics', this.saveGlobal);
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
        bind('btnLoadDialectics', this.showLoadModal);
        
        bind('btnViewModalEdit', () => {
            this.hideViewModal();
            this.loadNoteToEditor(this.state.viewingNoteId);
        });
        
        bind('btnViewModalDelete', async () => {
            if (confirm("Delete this entry?")) {
                if (await DialecticsAPI.delete(this.state.viewingNoteId)) location.reload();
            }
        });

        if (this.dom.canvas) {
            this.logDebug("Canvas found, binding events...");
            
            const handleCanvasClick = (e) => {
                // If it's a touch event, we need to extract the target from the touch object
                const target = e.target || (e.changedTouches && e.changedTouches[0].target);
                if (!target) return;

                this.logDebug("Canvas clicked, checking target...");

                // Ignore if clicked on buttons or existing blocks
                if (target.closest('button, .resize-handle, .block-actions')) return;
                const b = target.closest('.dialectics-block');
                if (b) return;

                const r = this.dom.canvas.getBoundingClientRect();
                const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
                const mid = r.left + (r.width / 2);
                
                // Ступенчатая логика: определяем следующую сторону
                const lastSide = this.getLastSide();
                let nextSide = 'left'; // Default for first block
                
                if (lastSide === 'left') nextSide = 'right';
                else if (lastSide === 'right') nextSide = 'left';
                else {
                    // Если это первая запись, можно разрешить выбор стороны кликом
                    nextSide = clientX < mid ? 'left' : 'right';
                }

                this.logDebug(`Canvas click: lastSide=${lastSide}, determined nextSide=${nextSide}`);
                
                this.state.editingBlock = null;
                this.state.pendingSide = nextSide;
                this.open();
            };

            this.dom.canvas.addEventListener('click', handleCanvasClick);
            // Support for touch devices
            this.dom.canvas.addEventListener('touchend', (e) => {
                // Prevent ghost clicks if needed, but usually touchend is enough
                if (e.cancelable) e.preventDefault();
                handleCanvasClick(e.changedTouches[0]);
            });

            this.dom.canvas.addEventListener('dblclick', (e) => {
                const b = e.target.closest('.dialectics-block');
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
        this.logDebug(`Opening editor... pendingSide=${this.state.pendingSide}`);
        if (this.dom.editor && !this.dom.editor.classList.contains('embedded')) {
            DialecticsUI.toggleDisplay(this.dom.editor, true, true);
        }
        
        this.switchTab('text');
        if (this.state.tiptap) {
            this.state.tiptap.commands.setContent(content);
            this.state.tiptap.commands.focus();
        } else if (this.dom.dashboardTextarea) {
            const temp = document.createElement('div');
            temp.innerHTML = content;
            this.dom.dashboardTextarea.value = temp.innerText || temp.textContent || "";
            this.dom.dashboardTextarea.dispatchEvent(new Event('input')); 
        }
    }

    openEdit(block) {
        const html = block.querySelector('.note-content-inner')?.innerHTML || "";
        this.open(html);
    }

    close() {
        console.log("Dialectics: Closing editor...");
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

    async saveAndPin() {
        this.logDebug("Saving and pinning...");
        const title = this.dom.title.value || "Untitled Dialectics";
        let html = "";
        
        if (this.state.tiptap) {
            html = this.state.tiptap.getHTML();
        } else if (this.dom.dashboardTextarea) {
            html = this.dom.dashboardTextarea.value.replace(/\n/g, '<br>');
        }
        
        const payload = { 
            title, 
            blocks: [{ side: 'left', html }],
            is_pinned: true,
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        
        try {
            const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
            if (res) {
                window.showToast("✓ Dialectics entry saved and pinned", "success");
                if (this.dom.editor) this.close();
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
            alert("Save entry first.");
        }
    }

    async togglePin(id, shouldPin) {
        const endpoint = shouldPin ? 'pin' : 'unpin';
        try {
            const res = await fetch(`/api/dialectics/${id}/${endpoint}`, { method: 'POST' });
            if (res.ok) {
                window.showToast(`✓ Dialectics ${shouldPin?'pinned':'unpinned'}`, "success");
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
            DialecticsUI.setLoading(this.dom.loadList);
            const notes = await DialecticsAPI.list(query);
            this.state.notesList = notes;
            this.renderNotesList(notes);
        }, 300);
    }

    renderNotesList(notes) {
        this.dom.loadList.innerHTML = notes.length ? '' : '<div style="color: #94a3b8; text-align: center; margin-top: 20px;">No entries found</div>';
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
        const n = await DialecticsAPI.get(id);
        if (n) {
            this.state.currentNoteId = n.id;
            this.dom.title.value = n.title;
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;
            
            if (this.dom.canvas) {
                this.renderCanvas(blocks);
                const url = new URL(window.location);
                url.searchParams.set('id', n.id);
                window.history.replaceState({}, '', url);
            }
            
            // Handle sticker loading
            const textEl = document.getElementById('dialecticsStickerText');
            const titleEl = document.getElementById('dialecticsStickerTitle');
            const colorEl = document.getElementById('dialecticsStickerColor');
            const typeEl = document.getElementById('dialecticsStickerType');

            if (n.sticker_text || n.sticker_title) {
                if (textEl) textEl.value = n.sticker_text || "";
                if (titleEl) titleEl.value = n.sticker_title || "";
                if (colorEl) colorEl.value = n.sticker_color || "#fff9c4";
                if (typeEl) typeEl.value = n.sticker_type || "text";
                if (window.updateNoteStickerUI) window.updateNoteStickerUI(true, 'dialectics');
            } else {
                if (textEl) textEl.value = "";
                if (titleEl) titleEl.value = "";
                if (window.updateNoteStickerUI) window.updateNoteStickerUI(false, 'dialectics');
            }

            this.hideLoadModal();
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'block';
        }
    }

    renderCanvas(blocks) {
        if (!this.dom.canvas) return;
        const divider = document.getElementById('canvasDivider');
        this.dom.canvas.innerHTML = '';
        if (divider) this.dom.canvas.appendChild(divider);

        blocks.forEach(b => {
            const el = document.createElement('div');
            el.className = `dialectics-block block-${b.side}`;
            el.innerHTML = `
                <div class="dialectics-content-inner">${b.html}</div>
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
        this.logDebug("Saving Dialectics (Full Mode)...");
        const title = this.dom.title.value || "Untitled Dialectics";
        
        if (this.state.editingBlock && this.state.tiptap) {
            const inner = this.state.editingBlock.querySelector('.dialectics-content-inner');
            if (inner) inner.innerHTML = this.state.tiptap.getHTML();
        } else if (this.state.pendingSide && this.state.tiptap) {
            const html = this.state.tiptap.getHTML();
            if (html !== '<p></p>' && html.trim() !== '') {
                this.renderCanvas([...this.getBlocksFromCanvas(), { side: this.state.pendingSide, html }]);
            }
        }

        const blocks = this.getBlocksFromCanvas();
        const payload = { 
            title, 
            blocks,
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        if (this.state.currentNoteId) payload.id = this.state.currentNoteId;
        
        this.logDebug(`Payload prepared with ${blocks.length} blocks`);
        
        try {
            const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
            if (res) {
                this.logDebug("Save successful");
                this.state.currentNoteId = res.id;
                
                const url = new URL(window.location);
                url.searchParams.set('id', res.id);
                window.history.replaceState({}, '', url);

                window.showToast("✓ Dialectics Saved", "success");
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
        this.dom.canvas.querySelectorAll('.dialectics-block').forEach(b => {
            const inner = b.querySelector('.dialectics-content-inner');
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
        const n = await DialecticsAPI.get(id);
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
        if (this.state.currentNoteId && confirm("Удалить запись?")) {
            if (await DialecticsAPI.delete(this.state.currentNoteId)) location.reload();
        }
    }

    getLastSide() {
        if (!this.dom.canvas) return null;
        const blocks = this.dom.canvas.querySelectorAll('.dialectics-block');
        if (blocks.length === 0) return null;
        return blocks[blocks.length - 1].classList.contains('block-left') ? 'left' : 'right';
    }

}

window.app = new DialecticsEngine();
