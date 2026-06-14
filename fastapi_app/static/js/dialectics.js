/**
 * dialectics.js - Главный оркестратор (Entry Point) для Диалектики
 */
import { DialecticsAPI } from './dialectics/api.js';
import { DialecticsUI } from './dialectics/ui_utils.js';
import { BlockManager } from './dialectics/BlockManager.js';
import { CanvasManager } from './dialectics/CanvasManager.js';
import { EditorManager } from './dialectics/EditorManager.js';
import { customConfirm, customChoice, customPrompt } from './modal_controller.js';

// --- Debug Console Interceptor ---
const debugEl = document.getElementById('debugLogContent');
if (debugEl) {
    const origLog = console.log;
    const origErr = console.error;
    const origWarn = console.warn;

    function logToScreen(type, args) {
        const msg = Array.from(args).map(a => {
            if (a instanceof Error) return a.message + '\\n' + a.stack;
            return typeof a === 'object' ? JSON.stringify(a) : a;
        }).join(' ');

        const line = document.createElement('div');
        line.style.color = type === 'error' ? '#ff5555' : type === 'warn' ? '#ffff55' : '#55ff55';
        line.style.marginBottom = '4px';
        line.style.borderBottom = '1px solid #333';
        line.style.paddingBottom = '4px';
        line.style.wordBreak = 'break-all';
        line.textContent = `[${type.toUpperCase()}] ${msg}`;
        debugEl.prepend(line);
    }

    console.log = function () { logToScreen('log', arguments); origLog.apply(console, arguments); };
    console.error = function () { logToScreen('error', arguments); origErr.apply(console, arguments); };
    console.warn = function () { logToScreen('warn', arguments); origWarn.apply(console, arguments); };

    window.addEventListener('error', function (e) {
        console.error('Global Error: ' + e.message + ' at ' + e.filename + ':' + e.lineno);
    });
    window.addEventListener('unhandledrejection', function (e) {
        console.error('Unhandled Rejection: ', e.reason);
    });
    console.log("Debug console initialized");
}
// ---------------------------------

class DialecticsEngine {
    constructor() {
        window.showToast = window.showToast || ((msg) => console.log("Toast:", msg));

        this.state = {
            currentNoteId: null,
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
            const noteId = params.get('id');
            if (noteId) {
                await this.loadNoteToEditor(noteId);
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
        bind('btnBoldFormat', () => this.editor.toggleBold());

        if (this.dom.editor.classList.contains('embedded')) {
            bind('btnEditorSave', this.saveAndPin);
        } else {
            bind('btnEditorSave', this.saveGlobal);
        }

        bind('btnPinNote', this.pinCurrent);
        bind('btnEditorClose', this.close);
        bind('btnEditorExpand', this.toggleExpand);
        bind('btnLoadDialectics', () => {
            if (this.state.isDirty) {
                customConfirm("У вас есть несохраненные изменения. Все равно продолжить?", () => {
                    this.state.isDirty = false;
                    this.showLoadModal();
                });
            } else {
                this.showLoadModal();
                const searchInput = document.getElementById('dialecticsSearchInput');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
            }
        });

        const searchInput = document.getElementById('dialecticsSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));
        }



        bind('btnGlobalParser', this.runGlobalParser);
        bind('btnExampleDialectics', this.loadExample);

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
            onAI: (b) => { this.runAI(b); }
        };
    }

    // Open editor to insert a new block after a specific index
    openInsertAfter(side, index) {
        this.state.editingBlock = null;
        this.state.pendingSide = side;
        this.state.insertAfterIndex = index;
        this.open();
    }

    async runAI(block) {
        const inner = block.querySelector('.dialectics-content-inner');
        if (!inner) return;
        const processText = inner.innerText || inner.textContent;

        window.showToast("🤖 AI анализирует процесс...", "info");

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
                title: 'Результат анализа',
                message: formattedResult,
                icon: '🤖',
                buttons: [
                    { label: 'Закрыть', value: true, class: 'confirm-btn-primary' }
                ]
            });

        } catch (error) {
            console.error(error);
            customConfirm({
                title: 'Ошибка AI',
                message: `<div style="color: red;">${error.message}</div>`,
                buttons: [
                    { label: 'Закрыть', value: true, class: 'confirm-btn-secondary' }
                ]
            });
        }
    }

    async runGlobalParser() {
        const formula = prompt("Введите математическую формулу для диалектического парсинга:");
        if (!formula || !formula.trim()) return;

        window.showToast("🧮 AI парсит формулу...", "info");

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
                    throw new Error("Не удалось распарсить JSON ответ от ИИ.");
                }
            }

            // Create formatted HTML for the parsed JSON
            const formatBlock = (title, content, bgColor) => `
                <div style="background: ${bgColor}; border: 1px solid rgba(0,0,0,0.05); padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 800; color: rgba(0,0,0,0.5); margin-bottom: 6px;">${title}</div>
                    <div style="font-size: 0.95rem; line-height: 1.5; color: #1e293b;">${content || '—'}</div>
                </div>
            `;

            const htmlContent = `
                <div style="text-align: left; max-height: 60vh; overflow-y: auto; padding-right: 8px;">
                    <h3 style="margin-top: 0; color: #4338ca; font-size: 1.1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px;">
                        Анализ формулы: <span style="font-family: monospace; background: #e0e7ff; padding: 2px 6px; border-radius: 4px;">${formula}</span>
                    </h3>
                    ${formatBlock("Предшествующая операция", parsed.predecessor, "#f8fafc")}
                    ${formatBlock("Кризис усложнения записи", parsed.crisis_of_notation, "#fef2f2")}
                    ${formatBlock("Снятие (Разрешение)", parsed.resolution, "#f0fdf4")}
                </div>
            `;

            customConfirm({
                title: 'Результат Парсера',
                message: htmlContent,
                icon: '🧮',
                buttons: [
                    { label: 'Закрыть', value: true, class: 'confirm-btn-primary' }
                ]
            });

        } catch (error) {
            console.error(error);
            customConfirm({
                title: 'Ошибка Парсера',
                message: `<div style="color: red;">${error.message}</div>`,
                buttons: [
                    { label: 'Закрыть', value: true, class: 'confirm-btn-secondary' }
                ]
            });
        }
    }

    async startTextMathDictation() {
        const text = await customPrompt({
            title: '✍ Опишите формулу словами',
            message: 'Например: "корень из x в квадрате плюс y в квадрате"',
            placeholder: 'Ваш текст...'
        });
        if (!text || !text.trim()) return;

        window.showToast("⏳ ИИ генерирует формулу...", "info");

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
                window.showToast("✅ Формула добавлена", "success");
            }
        } catch (error) {
            console.error(error);
            window.showToast("❌ Ошибка генерации формулы", "error");
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
                    window.showToast("Запись отменена", "info");
                    return;
                }

                window.showToast("⏳ Распознавание и генерация LaTeX...", "info");

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
                        window.showToast("✅ Формула добавлена", "success");
                    }

                } catch (error) {
                    console.error(error);
                    window.showToast("❌ Ошибка обработки аудио", "error");
                }
            });

            mediaRecorder.start();

            // Show toast indicating recording
            customConfirm({
                title: '🎙 Запись',
                message: '<div style="text-align: center; color: red; font-weight: bold; animation: pulse 1.5s infinite;">Идет запись аудио... Говорите формулу.</div>',
                buttons: [
                    { label: 'Остановить и распознать', value: true, class: 'confirm-btn-primary' },
                    { label: 'Отмена', value: false, class: 'confirm-btn-secondary' }
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
            window.showToast("❌ Нет доступа к микрофону", "error");
        }
    }

    async saveGlobal() {
        const title = this.dom.title.value || "Untitled Dialectics";
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
                const newBlock = { side: this.state.pendingSide, html };
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
        if (this.state.currentNoteId) {
            payload.id = this.state.currentNoteId;
        }

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
            localStorage.setItem('dialectics_last_note_id', n.id);
            this.dom.title.value = n.title;
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;

            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());

            this._revealInterface();
            this.hideLoadModal();
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'block';
        } else {
            // Note not found (e.g. deleted), clear stored id and show empty
            localStorage.removeItem('dialectics_last_note_id');
            this._revealInterface();
        }
    }

    async loadExample() {
        DialecticsUI.setLoading(this.dom.canvas); // Optional loading state
        const notes = await DialecticsAPI.list("Пример конспекта");
        const exampleNote = notes.find(n => n.title === "Пример конспекта");

        if (exampleNote) {
            await this.loadNoteToEditor(exampleNote.id);
            window.showToast("Открыт существующий пример конспекта", "info");
        } else {
            this.state.currentNoteId = null;
            this.dom.title.value = "Пример конспекта";
            BlockManager.render(this.dom.canvas, [], this._blockCallbacks());
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'none';
            window.showToast("Открыт новый пример конспекта (пока пустой)", "info");
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
        this.dom.loadList.innerHTML = notes.length ? '' : '<div style="color: #64748b; text-align: center; padding: 20px;">Ничего не найдено</div>';
        notes.forEach(n => {
            const i = document.createElement('div');
            i.className = 'load-note-item';

            const d = new Date(n.updated_at || n.created_at);
            let dateStr = "";
            if (d.getFullYear() > 1970) {
                dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            const pinnedIcon = n.is_pinned ? '<span style="color: #f59e0b; margin-right: 8px;" title="Закреплено">📌</span>' : '';

            i.innerHTML = `
                <div class="load-note-item-content" style="flex: 1;">
                    <div class="load-note-item-title" style="display: flex; align-items: center; color: #1e293b; font-size: 1.05em; margin-bottom: 4px;">${pinnedIcon}<strong>${n.title}</strong></div>
                    <div class="load-note-item-date" style="color: #94a3b8; font-size: 0.85em;">${dateStr}</div>
                </div>
                <button class="load-note-item-delete" title="Удалить">🗑️</button>
            `;
            // Inline styles will be enhanced by CSS if needed, but these ensure it looks ok immediately

            i.onclick = () => this.loadNoteToEditor(n.id);

            const delBtn = i.querySelector('.load-note-item-delete');
            delBtn.onclick = async (e) => {
                e.stopPropagation();

                const confirmed = await customConfirm({
                    title: 'Подтверждение удаления',
                    message: `Удалить диалектику "${n.title}"?`,
                    icon: '🗑️',
                    buttons: [
                        { label: 'Отмена', value: false, class: 'confirm-btn-secondary' },
                        { label: 'Удалить', value: true, class: 'confirm-btn-danger' }
                    ]
                });

                if (confirmed) {
                    const ok = await DialecticsAPI.delete(n.id);
                    if (ok) {
                        window.showToast("Запись удалена", "info");
                        // Remove visually without reloading to avoid flicker
                        i.remove();
                        if (this.dom.loadList.children.length === 0) {
                            this.dom.loadList.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Ничего не найдено</div>';
                        }
                        if (this.state.currentNoteId === n.id) {
                            this.close();
                            this.dom.title.value = "Untitled Dialectics";
                            BlockManager.render(this.dom.canvas, []);
                            this.state.currentNoteId = null;
                            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'none';
                        }
                    }
                }
            };

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
