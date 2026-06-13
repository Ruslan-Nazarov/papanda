/**
 * EditorManager.js - Управление редактором TipTap и вкладками
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { MathNode, ResizableImage } from './editor_setup.js';
import { MathTool } from './tools/math.js';
import { GraphTool } from './tools/graph.js';
import { ShapeTool } from './tools/shapes.js';

export class EditorManager {
    constructor(engine) {
        this.engine = engine;
        this.tiptap = null;
        this.fabricCanvas = null;
    }

    async init() {
        if (this.tiptap) return;
        const el = document.getElementById('tiptap-editor');
        if (!el) return;

        el.addEventListener('mousedown', (e) => e.stopPropagation());

        try {
            this.engine.logDebug("[EditorManager] Initializing TipTap...");
            this.tiptap = new Editor({
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
                            this.showMathMenu(event.clientX, event.clientY);
                            return true;
                        }
                    },
                    handleKeyDown: (view, event) => {
                        // Alt + кириллица → inline LaTeX-формула (mathNode)
                        const mathMap = {
                            'п': '+',
                            'м': '-',
                            'у': '\\times',
                            'д': '\\div',
                            'р': '=',
                            'и': '\\int',
                            'с': '\\sum',
                            'б': '\\infty',
                            'к': '\\sqrt{}',
                            'ф': '\\frac{}{}',
                        };
                        if (event.altKey && mathMap[event.key] && !event.ctrlKey && !event.metaKey) {
                            event.preventDefault();
                            const latex = mathMap[event.key];
                            const nodeType = view.state.schema.nodes.mathNode;
                            if (!nodeType) return false;
                            const mathNode = nodeType.create({ latex });
                            const tr = view.state.tr.replaceSelectionWith(mathNode);
                            view.dispatch(tr);
                            return true;
                        }
                        return false;
                    }
                },
                onSelectionUpdate: ({ editor }) => {
                    const { from, to } = editor.state.selection;
                    const btn = document.getElementById('btnBoldFormat');
                    if (btn) btn.style.display = (from !== to) ? 'inline-block' : 'none';
                }
            });
            this.engine.logDebug("[EditorManager] TipTap initialized successfully.");
        } catch (e) {
            this.engine.logDebug(`[EditorManager] TipTap init error: ${e.message}`);
            console.error("TipTap init error:", e);
        }
    }

    async switchTab(tab) {
        this.engine.logDebug(`[EditorManager] Switching tab to: ${tab}`);
        document.querySelectorAll('.editor-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
        document.querySelectorAll('.tab-content').forEach(el => {
            const isTarget = el.id === `editor-${tab}`;
            el.classList.toggle('active', isTarget);
            el.style.display = isTarget ? 'flex' : 'none';
        });

        if (tab === 'text') {
            await this.init();
        }
        else if (tab === 'graph') await GraphTool.init();
        else if (tab === 'shapes') {
            if (!this.fabricCanvas) {
                this.fabricCanvas = await ShapeTool.init('shapesCanvas', 'shapesCanvasWrapper');
                
                // Initialize history
                this.shapeHistory = [];
                this.isHistoryProcessing = false;
                
                const saveHistory = () => {
                    if (this.isHistoryProcessing) return;
                    this.shapeHistory.push(JSON.stringify(this.fabricCanvas.toJSON()));
                    if (this.shapeHistory.length > 50) this.shapeHistory.shift();
                };
                
                saveHistory(); // Save initial blank state
                
                this.fabricCanvas.on('object:added', saveHistory);
                this.fabricCanvas.on('object:modified', saveHistory);
                this.fabricCanvas.on('object:removed', saveHistory);

                // Auto-refresh object list panel when selection changes
                const refreshIfPanelOpen = () => {
                    const panel = document.getElementById('objectListPanel');
                    if (panel && panel.style.display === 'flex') this._refreshObjectList();
                };
                this.fabricCanvas.on('selection:created', refreshIfPanelOpen);
                this.fabricCanvas.on('selection:updated', refreshIfPanelOpen);
                this.fabricCanvas.on('selection:cleared', refreshIfPanelOpen);
                this.fabricCanvas.on('object:added', refreshIfPanelOpen);
                this.fabricCanvas.on('object:removed', refreshIfPanelOpen);
            }
        }
    }

    async showMathMenu(x, y) {
        this.engine.logDebug("[EditorManager] showMathMenu called");

        // If coordinates provided, it's a floating context menu
        if (x !== undefined && y !== undefined) {
            await MathTool.showContextMenu(x, y, (s) => this.insertMath(s));
            return;
        }

        const menu = document.getElementById('mathMenu');
        if (!menu) return;

        if (menu.style.display === 'flex') {
            menu.style.display = 'none';
            return;
        }

        menu.style.display = 'flex';
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
        this.engine.logDebug(`[EditorManager] Inserting math: ${latex}`);

        if (!this.tiptap) {
            this.engine.logDebug("[EditorManager] Error: TipTap not initialized");
            return;
        }

        // 1. Принудительно возвращаем фокус редактору
        this.tiptap.commands.focus();

        // 2. Вставляем узел с формулой
        this.tiptap.chain()
            .focus()
            .insertContent({
                type: 'mathNode',
                attrs: { latex }
            })
            .run();

        this.engine.logDebug("[EditorManager] Math inserted successfully");
    }

    toggleBold() {
        this.tiptap?.chain().focus().toggleBold().run();
    }

    plotGraph() {
        GraphTool.plot(document.getElementById('graphPreview'), document.getElementById('graphFuncInput').value);
    }

    async insertGraphToNote() {
        const svg = document.getElementById('graphPreview').querySelector('svg');
        if (svg && this.tiptap) {
            await GraphTool.exportToPNG(svg, this.tiptap, () => this.switchTab('text'));
        }
    }

    setShapeTool(tool) {
        ShapeTool.setTool(this.fabricCanvas, tool, document.getElementById('shapeColor').value);
    }

    async addShape(type) {
        await ShapeTool.add(this.fabricCanvas, type, document.getElementById('shapeColor').value);
    }

    deleteSelectedShape() {
        if (!this.fabricCanvas) return;
        const active = this.fabricCanvas.getActiveObjects();
        this.fabricCanvas.discardActiveObject();
        this.fabricCanvas.remove(...active);
    }

    async toggleShapeGrid() {
        await ShapeTool.toggleGrid(this.fabricCanvas);
    }

    async copySelectedShape() {
        await ShapeTool.copySelectedShape(this.fabricCanvas);
    }

    undoShape() {
        if (!this.fabricCanvas || !this.shapeHistory || this.shapeHistory.length <= 1) return;
        
        this.isHistoryProcessing = true;
        this.shapeHistory.pop(); // Remove current state
        const prevState = this.shapeHistory[this.shapeHistory.length - 1];
        
        this.fabricCanvas.loadFromJSON(prevState, () => {
            this.fabricCanvas.renderAll();
            this.isHistoryProcessing = false;
        });
    }

    applyColorToSelected(color) {
        if (!this.fabricCanvas) return;
        const activeObj = this.fabricCanvas.getActiveObject();
        if (!activeObj) return;

        // Just apply to whatever is actively selected (either group or single object)
        const applyToObj = (obj) => {
            if (obj.type === 'i-text' || obj.type === 'text') {
                obj.set({ fill: color, dirty: true });
            } else if (obj.type === 'line' || obj.type === 'path') {
                obj.set({ stroke: color, dirty: true });
            } else if (obj.type === 'polygon' || obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle') {
                obj.set({ stroke: color, dirty: true });
            }
        };

        if (activeObj.type === 'group' || activeObj.type === 'activeSelection') {
            activeObj.forEachObject(obj => applyToObj(obj));
        } else {
            applyToObj(activeObj);
        }
        
        this.fabricCanvas.renderAll();
        this._saveHistory();
    }

    applyFillToSelected(color) {
        if (!this.fabricCanvas) return;
        const activeObj = this.fabricCanvas.getActiveObject();
        if (!activeObj) return;

        const applyToObj = (obj) => {
            if (obj.type === 'polygon' || obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle') {
                obj.set({ fill: color, dirty: true });
            }
        };

        if (activeObj.type === 'group' || activeObj.type === 'activeSelection') {
            activeObj.forEachObject(obj => applyToObj(obj));
        } else {
            applyToObj(activeObj);
        }
        
        this.fabricCanvas.renderAll();
        this._saveHistory();
    }
    
    toggleFillForSelected() {
        if (!this.fabricCanvas) return;
        const activeObj = this.fabricCanvas.getActiveObject();
        if (!activeObj) return;
        
        const fillColorPicker = document.getElementById('shapeFillColor');
        const fallbackColor = fillColorPicker ? fillColorPicker.value + '33' : 'rgba(59, 130, 246, 0.2)';

        const applyToObj = (obj) => {
            if (obj.type === 'polygon' || obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle') {
                if (!obj.fill || obj.fill === 'transparent') {
                    obj.set({ fill: fallbackColor, dirty: true });
                } else {
                    obj.set({ fill: 'transparent', dirty: true });
                }
            }
        };

        if (activeObj.type === 'group' || activeObj.type === 'activeSelection') {
            activeObj.forEachObject(obj => applyToObj(obj));
        } else {
            applyToObj(activeObj);
        }
        
        this.fabricCanvas.renderAll();
        this._saveHistory();
    }

    _saveHistory() {
        if (this.shapeHistory && !this.isHistoryProcessing) {
            this.shapeHistory.push(JSON.stringify(this.fabricCanvas.toJSON()));
            if (this.shapeHistory.length > 50) this.shapeHistory.shift();
        }
    }

    clearShapes() {
        if (confirm("Очистить холст?") && this.fabricCanvas) {
            this.fabricCanvas.clear();
            this.fabricCanvas.backgroundColor = '#ffffff';
            this.fabricCanvas.renderAll();
            this._refreshObjectList();
        }
    }

    groupSelected() {
        const c = this.fabricCanvas;
        if (!c) return;
        const active = c.getActiveObject();
        if (!active) return;

        if (active.type === 'activeSelection') {
            // Group the selected objects
            const group = active.toGroup();
            group._isLockedGroup = true;
            c.setActiveObject(group);
            c.renderAll();
            this._refreshObjectList();
        } else if (active.type === 'group') {
            // Ungroup
            active.toActiveSelection();
            c.renderAll();
            this._refreshObjectList();
        }
    }

    toggleObjectListPanel() {
        const panel = document.getElementById('objectListPanel');
        if (!panel) return;
        const isVisible = panel.style.display === 'flex';
        if (isVisible) {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'flex';
            this._refreshObjectList();
        }
    }

    _refreshObjectList() {
        const c = this.fabricCanvas;
        const container = document.getElementById('objectListItems');
        if (!c || !container) return;

        const typeLabels = {
            'line': '— Отрезок',
            'group': '🔒 Группа',
            'circle': '○ Окружность',
            'rect': '▯ Прямоугольник',
            'triangle': '△ Треугольник',
            'polygon': '◇ Многоугольник',
            'i-text': '🔤 Текст',
            'path': '✎ Рисунок',
        };

        const objs = c.getObjects();
        if (objs.length === 0) {
            container.innerHTML = '<div style="padding:8px;font-size:11px;color:#94a3b8;text-align:center;">Холст пуст</div>';
            return;
        }

        container.innerHTML = objs.map((obj, i) => {
            const label = typeLabels[obj.type] || obj.type;
            const isActive = c.getActiveObjects().includes(obj);
            return `<div data-obj-index="${i}" style="
                padding:5px 8px; border-radius:6px; cursor:pointer; font-size:12px;
                background:${isActive ? '#eff6ff' : 'transparent'};
                color:${isActive ? '#1d4ed8' : '#334155'};
                border:1px solid ${isActive ? '#bfdbfe' : 'transparent'};
                margin-bottom:2px;
                display:flex; align-items:center; gap:6px;
            ">${label} <span style="color:#94a3b8;font-size:10px;">#${i+1}</span></div>`;
        }).join('');

        // Wire click handlers
        container.querySelectorAll('[data-obj-index]').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.objIndex);
                const obj = c.getObjects()[idx];
                if (obj) {
                    c.discardActiveObject();
                    c.setActiveObject(obj);
                    c.renderAll();
                    this._refreshObjectList();
                }
            });
        });
    }

    insertShapesToNote() {
        ShapeTool.exportToPNG(this.fabricCanvas, this.tiptap, () => this.switchTab('text'));
    }

    setContent(content) {
        if (this.tiptap) {
            this.tiptap.commands.setContent(content);
            this.tiptap.commands.focus();
        }
    }

    getHTML() {
        return this.tiptap ? this.tiptap.getHTML() : "";
    }
}
