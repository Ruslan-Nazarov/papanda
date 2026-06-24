/**
 * dialectics.js - Главный оркестратор (Entry Point) для Диалектики
 */
import { DialecticsAPI } from './dialectics/api.js';
import { DialecticsUI } from './dialectics/ui_utils.js';
import { BlockManager } from './dialectics/BlockManager.js';
import { CanvasManager } from './dialectics/CanvasManager.js';
import { EditorManager } from './dialectics/EditorManager.js';
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
            insertAfterIndex: null   // null = append at end, number = insert after that index
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
            dashboardTextarea: document.getElementById('dashboard-note-editor')
        };

        this.editor = new EditorManager(this);

        if (this.dom.editor) {
            this.init();
        }
    }

    async init() {
        this.logDebug("Engine init...");

        this._bindEvents();

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
                if (this.dom.title) this.dom.title.value = "";
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
                        message: "You have unsaved changes. Continue anyway?",
                        icon: '⚠️'
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
        bind('btnDialecticsGuide', this.showGuideModal);

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
        this.state.pendingRole = null;
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
            onDelete: () => { this.saveGlobal(); },
            onAI: (b) => { this.runAI(b); },
            onHintClick: (hint) => { this.openHintEditor(hint); },
            onHintAI: (hint) => { this.runHintAI(hint); }
        };
    }

    openHintEditor(hint, content = '') {
        this.state.editingBlock = null;
        this.state.pendingSide = hint.side;
        this.state.pendingRole = hint.id;
        this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        this.state.insertAfterIndex = null;
        this.open(content);
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
            
            this.openHintEditor(hint, aiHtml);

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
        const inner = block.querySelector('.dialectics-content-inner');
        if (!inner) return;
        const processText = inner.innerText || inner.textContent;

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

            // Format result safely
            const safeResult = data.result.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const formattedResult = `<div style="white-space: pre-wrap; text-align: left; font-family: monospace; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 8px; max-height: 60vh; overflow-y: auto;">${safeResult}</div>`;

            customConfirm({
                title: 'Analysis Result',
                message: formattedResult,
                icon: '🤖',
                buttons: [
                    { label: 'Close', value: true, class: 'confirm-btn-primary' }
                ]
            });

        } catch (error) {
            console.error(error);
            customConfirm({
                title: 'AI Error',
                message: `<div style="color: red;">${error.message}</div>`,
                buttons: [
                    { label: 'Close', value: true, class: 'confirm-btn-secondary' }
                ]
            });
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

    async saveGlobal(shouldClose = true) {
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
        const payload = {
            title,
            blocks,
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

            window.showToast(window._("toast.dialectics_saved"), "success");
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
                message: "You have unsaved changes. Create a new note anyway?",
                icon: '⚠️'
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

    // --- Modal Helpers ---
    async showGuideModal() {
        const modal = document.getElementById('guideDialecticsModal');
        if (!modal) return;
        modal.style.display = 'flex';

        const contentEl = document.getElementById('dialecticsGuideContent');
        if (!contentEl) return;

        // Fetch guide from API if not loaded yet
        if (contentEl.dataset.loaded === 'true') return;

        try {
            contentEl.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Loading instructions...</div>';
            const res = await fetch('/api/dialectics/guide');
            if (!res.ok) throw new Error("Failed to load guide");
            const data = await res.json();
            contentEl.innerHTML = `<div class="guide-markdown-content">${data.html}</div>`;
            contentEl.dataset.loaded = 'true';
        } catch (err) {
            console.error(err);
            contentEl.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Failed to load instructions. Please try again.</div>';
        }
    }

    hideGuideModal() {
        const modal = document.getElementById('guideDialecticsModal');
        if (modal) modal.style.display = 'none';
    }

    showLoadModal() {
        this.logDebug("showLoadModal() called");
        if (this.dom.loadModal) {
            this.dom.loadModal.style.display = 'flex';
            this.dom.loadModal.offsetHeight; // trigger reflow
            this.dom.loadModal.classList.add('active');
            this.logDebug("loadModal display set to flex and active class added");
        } else {
            this.logDebug("ERROR: this.dom.loadModal is undefined!");
        }
        this.searchNotes("");
    }
    hideLoadModal() { 
        if (this.dom.loadModal) {
            this.dom.loadModal.classList.remove('active');
            setTimeout(() => this.dom.loadModal.style.display = 'none', 200);
        }
    }

    async searchNotes(query) {
        this.logDebug("searchNotes called with query: " + query);
        if (!this.dom.loadList) {
            this.logDebug("ERROR: this.dom.loadList is undefined!");
            return;
        }
        DialecticsUI.setLoading(this.dom.loadList);
        try {
            const notes = await DialecticsAPI.list(query);
            this.logDebug("DialecticsAPI.list returned " + notes.length + " notes");
            this.renderNotesList(notes);
        } catch (err) {
            this.logDebug("ERROR in DialecticsAPI.list: " + err.message);
        }
    }

    renderNotesList(notes) {
        this.dom.loadList.innerHTML = notes.length ? '' : '<div style="color: #64748b; text-align: center; padding: 20px;">Nothing found</div>';
        notes.forEach(n => {
            const i = document.createElement('div');
            i.className = 'load-note-item';

            const d = new Date(n.updated_at || n.created_at);
            let dateStr = "";
            if (d.getFullYear() > 1970) {
                dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            const pinnedIcon = n.is_pinned ? '<span style="color: #f59e0b; margin-right: 8px;" title="Pinned">📌</span>' : '';
            const delBtnHTML = (n.title === "Example Note" || n.title === "Пример конспекта" || n.title === "Конспект мысалы") ? '' : '<button class="load-note-item-delete" title="Delete">🗑️</button>';

            i.innerHTML = `
                <div class="load-note-item-content" style="flex: 1;">
                    <div class="load-note-item-title" style="display: flex; align-items: center; color: #1e293b; font-size: 1.05em; margin-bottom: 4px;">${pinnedIcon}<strong>${n.title || (window._ ? window._('dialectics.topic_placeholder') : "Untitled")}</strong></div>
                    <div class="load-note-item-date" style="color: #94a3b8; font-size: 0.85em;">${dateStr}</div>
                </div>
                ${delBtnHTML}
            `;
            // Inline styles will be enhanced by CSS if needed, but these ensure it looks ok immediately

            i.onclick = () => this.loadNoteToEditor(n.id);

            const delBtn = i.querySelector('.load-note-item-delete');
            if (delBtn) {
                delBtn.onclick = async (e) => {
                    e.stopPropagation();

                const confirmed = await customConfirm({
                    title: 'Confirm Deletion',
                    message: `Delete dialectics "${n.title}"?`,
                    icon: '🗑️',
                    buttons: [
                        { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                        { label: 'Delete', value: true, class: 'confirm-btn-danger' }
                    ]
                });

                if (confirmed) {
                    const ok = await DialecticsAPI.delete(n.id);
                    if (ok) {
                        window.showToast(window._("toast.record_deleted"), "info");
                        // Remove visually without reloading to avoid flicker
                        i.remove();
                        if (this.dom.loadList.children.length === 0) {
                            this.dom.loadList.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Nothing found</div>';
                        }
                        if (this.state.currentNoteId === n.id) {
                            this.close();
                            this.dom.title.value = "";
                            BlockManager.render(this.dom.canvas, []);
                            this.state.currentNoteId = null;
                            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'none';
                        }
                    }
                    }
                };
            }

        this.dom.loadList.appendChild(i);
        });
    }

    async deleteGlobal() {
        if (!this.state.currentNoteId) return;
        if (this.dom.title && (this.dom.title.value === "Example Note" || this.dom.title.value === "Пример конспекта" || this.dom.title.value === "Конспект мысалы")) {
            if(window.showToast) window.showToast(window._("toast.cannot_delete_the_example_note"), "error");
            return;
        }
        const confirmed = await customConfirm({
            title: 'Delete Confirmation',
            message: 'Are you sure you want to delete this Dialectics?',
            icon: '🗑️',
            buttons: [
                { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                { label: 'Delete', value: true, class: 'confirm-btn-danger' }
            ]
        });
        if (confirmed) {
            const ok = await DialecticsAPI.delete(this.state.currentNoteId);
            if (ok) {
                window.showToast(window._("toast.dialectics_deleted"), "info");
                location.reload();
            }
        }
    }

    async pinCurrent() {
        if (!this.state.currentNoteId) {
            window.showToast(window._("toast.save_first_to_pin"), "warning");
            return;
        }

        const title = this.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        const blocks = BlockManager.getBlocks(this.dom.canvas);

        const payload = {
            id: this.state.currentNoteId,
            title,
            blocks,
            is_pinned: true
        };

        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            window.showToast(window._("toast.pinned_successfully"), "success");
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
        this.dom.viewModal.offsetHeight; // trigger reflow
        this.dom.viewModal.classList.add('active');
    }

    hideViewModal() {
        if (this.dom.viewModal) {
            this.dom.viewModal.classList.remove('active');
            setTimeout(() => this.dom.viewModal.style.display = 'none', 200);
        }
        this.state.viewingNoteId = null;
    }

    async showGuideModal() {
        if (!this.dom.guideModal) return;
        this.dom.guideModal.style.display = 'flex';
        this.dom.guideModal.offsetHeight; // reflow
        this.dom.guideModal.classList.add('active');
        
        try {
            const res = await fetch('/api/dialectics/guide');
            if (res.ok) {
                const data = await res.json();
                if (this.dom.guideContent) {
                    this.dom.guideContent.innerHTML = data.html;
                }
            } else {
                if (this.dom.guideContent) {
                    this.dom.guideContent.innerHTML = '<div style="color:red; text-align:center; padding: 20px;">Failed to load guide.</div>';
                }
            }
        } catch (e) {
            console.error("Guide error:", e);
        }
    }

    hideGuideModal() {
        if (this.dom.guideModal) {
            this.dom.guideModal.classList.remove('active');
            setTimeout(() => this.dom.guideModal.style.display = 'none', 200);
        }
    }

    logDebug(msg) {
        if (!this.dom.debug) return;
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        this.dom.debug.prepend(line);
    }
}

window.app = new DialecticsEngine();
