/**
 * EditorManager.js - Управление редактором TipTap и вкладками
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { ResizableImage, MathNode, QuestionMark, QuoteBlock } from './editor_setup.js';
import { GraphTool } from './tools/graph.js';
import { ShapeTool } from './tools/shapes.js';
import { customPrompt } from '../modal_controller.js';

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
        
        // Custom context menu for math
        el.addEventListener('contextmenu', (e) => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && selection.toString().trim() !== '') {
                return; // Let the global selection context menu handle it
            }
            e.preventDefault();
            this.engine.logDebug(`[EditorManager] Right-click detected at ${e.clientX}, ${e.clientY}`);
            try {
                this.showMathMenu(e.clientX, e.clientY);
                this.engine.logDebug(`[EditorManager] Menu rendered successfully`);
            } catch (err) {
                this.engine.logDebug(`[EditorManager] Error showing menu: ${err.message}`);
                console.error(err);
            }
        }, true);

        try {
            this.engine.logDebug("[EditorManager] Initializing TipTap...");
            this.tiptap = new Editor({
                element: el,
                extensions: [StarterKit.configure({ blockquote: false }), Underline, QuestionMark, ResizableImage.configure({ allowBase64: true }), MathNode, QuoteBlock],
                content: '<p></p>',
                autofocus: 'end',
                onFocus: () => {
                    el.classList.add('focused');
                    this.updateFormattingToolbarStates();
                },
                onBlur: () => {
                    el.classList.remove('focused');
                    setTimeout(() => {
                        this.updateFormattingToolbarStates();
                    }, 200);
                },
                editorProps: {
                    handleDOMEvents: {
                        mousedown: (view, event) => {
                            event.stopPropagation();
                            return false;
                        }
                    }
                },
                onSelectionUpdate: ({ editor }) => {
                    this.updateFormattingToolbarStates();
                },
                onUpdate: ({ editor }) => {
                    try {
                        const current = JSON.parse(localStorage.getItem('papanda_editor_open_state') || '{}');
                        current.content = editor.getHTML();
                        localStorage.setItem('papanda_editor_open_state', JSON.stringify(current));
                    } catch (e) {}
                    this.updateFormattingToolbarStates();
                }
            });

            // Bind formatting toolbar buttons
            const toolbar = document.getElementById('editorFormattingToolbar');
            if (toolbar) {
                toolbar.querySelectorAll('.format-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const format = btn.dataset.format;
                        if (!format) return;
                        
                        let chain = this.tiptap.chain().focus();
                        if (format === 'bold') chain.toggleBold().run();
                        else if (format === 'italic') chain.toggleItalic().run();
                        else if (format === 'underline') chain.toggleUnderline().run();
                        else if (format === 'strike') chain.toggleStrike().run();
                        else if (format === 'code') chain.toggleCode().run();
                        else if (format === 'question') {
                            if (this.tiptap.isActive('questionMark')) {
                                this.tiptap.chain().focus().unsetMark('questionMark').run();
                            } else {
                                const qText = await customPrompt({
                                    title: 'Вопрос к выделенному тексту',
                                    message: 'В чём заключается вопрос или неясность?',
                                    placeholder: 'Например: Не совсем ясен вывод формулы / Откуда взялось это утверждение...',
                                    okLabel: 'Сохранить',
                                    cancelLabel: 'Отмена'
                                });
                                if (qText !== null && qText.trim() !== '') {
                                    this.tiptap.chain().focus().setMark('questionMark', { title: qText.trim() }).run();
                                } else if (qText !== null) {
                                    this.tiptap.chain().focus().setMark('questionMark', { title: 'Есть вопрос, непонятно' }).run();
                                }
                            }
                        }
                        else if (format === 'quote') chain.toggleQuoteBlock().run();
                        else if (format === 'clear') chain.unsetAllMarks().clearNodes().run();

                        this.updateFormattingToolbarStates();
                    };
                });
            }

            this.engine.logDebug("[EditorManager] TipTap initialized successfully.");
        } catch (e) {
            this.engine.logDebug(`[EditorManager] TipTap init error: ${e.message}`);
            console.error("TipTap init error:", e);
        }
    }

    updateFormattingToolbarStates() {
        const toolbar = document.getElementById('editorFormattingToolbar');
        if (!toolbar || !this.tiptap) return;

        const activeTab = document.querySelector('.editor-tab.active')?.dataset.tab;
        const { from, to } = this.tiptap.state.selection;
        const isSelected = (from !== to) && (activeTab === 'text');

        if (isSelected) {
            toolbar.style.display = 'inline-flex';
            toolbar.querySelectorAll('.format-btn').forEach(btn => {
                const format = btn.dataset.format;
                const isActive = format === 'question' ? this.tiptap.isActive('questionMark') : 
                                 format === 'quote' ? this.tiptap.isActive('quoteBlock') :
                                 this.tiptap.isActive(format);
                btn.classList.toggle('active', isActive);
            });
        } else {
            toolbar.style.display = 'none';
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
        this.updateFormattingToolbarStates();

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

    showMathMenu(x, y) {
        const existing = document.getElementById('mathContextMenu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'mathContextMenu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.background = 'white';
        menu.style.border = '1px solid #e2e8f0';
        menu.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
        menu.style.borderRadius = '8px';
        menu.style.padding = '8px 0';
        menu.style.zIndex = '999999'; // Very high z-index
        menu.style.display = 'flex';
        menu.style.flexDirection = 'column';
        menu.style.minWidth = '200px';

        const btnStyle = `
            background: transparent;
            border: none;
            padding: 8px 16px;
            text-align: left;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.9rem;
            color: #334155;
            transition: background 0.2s;
        `;

        const btnVoice = document.createElement('button');
        btnVoice.innerHTML = window._ ? window._('dialectics.dictate_formula', '🎙 Dictate formula') : '🎙 Dictate formula';
        btnVoice.style.cssText = btnStyle;
        btnVoice.onmouseover = () => btnVoice.style.background = '#f1f5f9';
        btnVoice.onmouseout = () => btnVoice.style.background = 'transparent';
        btnVoice.onclick = () => {
            menu.remove();
            this.engine.startVoiceMathDictation();
        };

        const btnText = document.createElement('button');
        btnText.innerHTML = window._ ? window._('dialectics.write_formula_in_text', '✍ Write formula in text') : '✍ Write formula in text';
        btnText.style.cssText = btnStyle;
        btnText.onmouseover = () => btnText.style.background = '#f1f5f9';
        btnText.onmouseout = () => btnText.style.background = 'transparent';
        btnText.onclick = () => {
            menu.remove();
            this.engine.startTextMathDictation();
        };

        const btnImage = document.createElement('button');
        btnImage.innerHTML = window._ ? window._('dialectics.insert_formula_image', '📷 Insert formula image') : '📷 Insert formula image';
        btnImage.style.cssText = btnStyle;
        btnImage.onmouseover = () => btnImage.style.background = '#f1f5f9';
        btnImage.onmouseout = () => btnImage.style.background = 'transparent';
        btnImage.onclick = () => {
            menu.remove();
            this.engine.startImageMathDictation();
        };

        menu.appendChild(btnVoice);
        menu.appendChild(btnText);
        menu.appendChild(btnImage);
        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
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

    async clearShapes() {
        const confirmed = await window.NotificationService.confirm("Clear canvas?", { isDanger: true, okText: 'Clear' });
        if (confirmed && this.fabricCanvas) {
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
            'line': '— Segment',
            'group': '🔒 Group',
            'circle': '○ Circle',
            'rect': '▯ Rectangle',
            'triangle': '△ Triangle',
            'polygon': '◇ Polygon',
            'i-text': '🔤 Text',
            'path': '✎ Drawing',
        };

        const objs = c.getObjects();
        if (objs.length === 0) {
            container.innerHTML = '<div style="padding:8px;font-size:11px;color:#94a3b8;text-align:center;">Canvas is empty</div>';
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
