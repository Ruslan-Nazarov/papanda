/**
 * EditorCanvasShapes.js - Управление вкладками, инструментами рисования (Fabric.js), графиками (GraphTool) и математикой
 */
import { GraphTool } from '../tools/graph.js';
import { ShapeTool } from '../tools/shapes.js';

export const EditorCanvasShapes = {
    async switchTab(editorManager, tab, windowEl = null) {
        editorManager.engine.logDebug(`[EditorManager] Switching tab to: ${tab}`);
        const context = windowEl || document.querySelector('.dialectics-floating-editor:not([style*="display: none"])') || document;
        context.querySelectorAll('.editor-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
        context.querySelectorAll('.tab-content').forEach(el => {
            const tabName = el.dataset.tabContent || (el.id ? el.id.replace('editor-', '').replace('tab-', '') : '');
            const isTarget = tabName === tab || el.id === `editor-${tab}` || el.classList.contains(`editor-${tab}`) || el.classList.contains(`tab-content-${tab}`);
            if (el.id && el.id.startsWith('editor-')) {
                const name = el.id.replace('editor-', '');
                el.dataset.tabContent = name;
                el.classList.add(`tab-content-${name}`);
                el.removeAttribute('id');
            }
            el.classList.toggle('active', isTarget);
            el.style.display = isTarget ? 'flex' : 'none';
        });
        editorManager.updateFormattingToolbarStates();

        if (tab === 'text') {
            await editorManager.init();
        }
        else if (tab === 'graph') await GraphTool.init();
        else if (tab === 'shapes') {
            if (!editorManager.fabricCanvas) {
                editorManager.fabricCanvas = await ShapeTool.init('shapesCanvas', 'shapesCanvasWrapper');
                
                // Initialize history
                editorManager.shapeHistory = [];
                editorManager.isHistoryProcessing = false;
                
                const saveHistory = () => {
                    if (editorManager.isHistoryProcessing) return;
                    editorManager.shapeHistory.push(JSON.stringify(editorManager.fabricCanvas.toJSON()));
                    if (editorManager.shapeHistory.length > 50) editorManager.shapeHistory.shift();
                };
                
                saveHistory(); // Save initial blank state
                
                editorManager.fabricCanvas.on('object:added', saveHistory);
                editorManager.fabricCanvas.on('object:modified', saveHistory);
                editorManager.fabricCanvas.on('object:removed', saveHistory);

                // Auto-refresh object list panel when selection changes
                const refreshIfPanelOpen = () => {
                    const panel = document.getElementById('objectListPanel');
                    if (panel && panel.style.display === 'flex') this._refreshObjectList(editorManager);
                };
                editorManager.fabricCanvas.on('selection:created', refreshIfPanelOpen);
                editorManager.fabricCanvas.on('selection:updated', refreshIfPanelOpen);
                editorManager.fabricCanvas.on('selection:cleared', refreshIfPanelOpen);
                editorManager.fabricCanvas.on('object:added', refreshIfPanelOpen);
                editorManager.fabricCanvas.on('object:removed', refreshIfPanelOpen);
            }
        }
    },

    showMathMenu(editorManager, x, y) {
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
        menu.style.zIndex = '99999999';
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
            editorManager.engine.startVoiceMathDictation();
        };

        const btnText = document.createElement('button');
        btnText.innerHTML = window._ ? window._('dialectics.write_formula_in_text', '✍ Write formula in text') : '✍ Write formula in text';
        btnText.style.cssText = btnStyle;
        btnText.onmouseover = () => btnText.style.background = '#f1f5f9';
        btnText.onmouseout = () => btnText.style.background = 'transparent';
        btnText.onclick = () => {
            menu.remove();
            editorManager.engine.startTextMathDictation();
        };

        const btnImage = document.createElement('button');
        btnImage.innerHTML = window._ ? window._('dialectics.insert_formula_image', '📷 Insert formula image') : '📷 Insert formula image';
        btnImage.style.cssText = btnStyle;
        btnImage.onmouseover = () => btnImage.style.background = '#f1f5f9';
        btnImage.onmouseout = () => btnImage.style.background = 'transparent';
        btnImage.onclick = () => {
            menu.remove();
            editorManager.engine.startImageMathDictation();
        };

        menu.appendChild(btnVoice);
        menu.appendChild(btnText);
        menu.appendChild(btnImage);

        const divider = document.createElement('div');
        divider.style.cssText = 'height: 1px; background: #e2e8f0; margin: 4px 0;';
        menu.appendChild(divider);

        const btnQuote = document.createElement('button');
        btnQuote.innerHTML = window._ ? window._('dialectics.insert_quote', '💬 Вставить цитату') : '💬 Вставить цитату';
        btnQuote.style.cssText = btnStyle;
        btnQuote.onmouseover = () => btnQuote.style.background = '#f1f5f9';
        btnQuote.onmouseout = () => btnQuote.style.background = 'transparent';
        btnQuote.onclick = () => {
            menu.remove();
            if (editorManager.tiptap) {
                editorManager.tiptap.chain().focus().toggleQuoteBlock().run();
            }
        };
        menu.appendChild(btnQuote);

        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
    },

    _getActiveContext() {
        return document.querySelector('.dialectics-floating-editor:not([style*="display: none"])') || document;
    },

    plotGraph() {
        const ctx = this._getActiveContext();
        const preview = ctx.querySelector('#graphPreview') || document.getElementById('graphPreview');
        const input = ctx.querySelector('#graphFuncInput') || document.getElementById('graphFuncInput');
        if (preview && input) GraphTool.plot(preview, input.value);
    },

    async insertGraphToNote(editorManager) {
        const ctx = this._getActiveContext();
        const preview = ctx.querySelector('#graphPreview') || document.getElementById('graphPreview');
        const svg = preview ? preview.querySelector('svg') : null;
        if (svg && editorManager.tiptap) {
            await GraphTool.exportToPNG(svg, editorManager.tiptap, () => editorManager.switchTab('text'));
        }
    },

    setShapeTool(editorManager, tool) {
        const ctx = this._getActiveContext();
        const colorInput = ctx.querySelector('#shapeColor') || document.getElementById('shapeColor');
        ShapeTool.setTool(editorManager.fabricCanvas, tool, colorInput ? colorInput.value : '#000000');
    },

    async addShape(editorManager, type) {
        const ctx = this._getActiveContext();
        const colorInput = ctx.querySelector('#shapeColor') || document.getElementById('shapeColor');
        await ShapeTool.add(editorManager.fabricCanvas, type, colorInput ? colorInput.value : '#000000');
    },

    deleteSelectedShape(editorManager) {
        if (!editorManager.fabricCanvas) return;
        const active = editorManager.fabricCanvas.getActiveObjects();
        editorManager.fabricCanvas.discardActiveObject();
        editorManager.fabricCanvas.remove(...active);
    },

    async toggleShapeGrid(editorManager) {
        await ShapeTool.toggleGrid(editorManager.fabricCanvas);
    },

    async copySelectedShape(editorManager) {
        await ShapeTool.copySelectedShape(editorManager.fabricCanvas);
    },

    undoShape(editorManager) {
        if (!editorManager.fabricCanvas || !editorManager.shapeHistory || editorManager.shapeHistory.length <= 1) return;
        
        editorManager.isHistoryProcessing = true;
        editorManager.shapeHistory.pop();
        const prevState = editorManager.shapeHistory[editorManager.shapeHistory.length - 1];
        
        editorManager.fabricCanvas.loadFromJSON(prevState, () => {
            editorManager.fabricCanvas.renderAll();
            editorManager.isHistoryProcessing = false;
        });
    },

    applyColorToSelected(editorManager, color) {
        if (!editorManager.fabricCanvas) return;
        const activeObj = editorManager.fabricCanvas.getActiveObject();
        if (!activeObj) return;

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
        
        editorManager.fabricCanvas.renderAll();
        this._saveHistory(editorManager);
    },

    applyFillToSelected(editorManager, color) {
        if (!editorManager.fabricCanvas) return;
        const activeObj = editorManager.fabricCanvas.getActiveObject();
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
        
        editorManager.fabricCanvas.renderAll();
        this._saveHistory(editorManager);
    },

    toggleFillForSelected(editorManager) {
        if (!editorManager.fabricCanvas) return;
        const activeObj = editorManager.fabricCanvas.getActiveObject();
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
        
        editorManager.fabricCanvas.renderAll();
        this._saveHistory(editorManager);
    },

    _saveHistory(editorManager) {
        if (editorManager.shapeHistory && !editorManager.isHistoryProcessing) {
            editorManager.shapeHistory.push(JSON.stringify(editorManager.fabricCanvas.toJSON()));
            if (editorManager.shapeHistory.length > 50) editorManager.shapeHistory.shift();
        }
    },

    async clearShapes(editorManager) {
        const confirmed = await window.NotificationService.confirm("Clear canvas?", { isDanger: true, okText: 'Clear' });
        if (confirmed && editorManager.fabricCanvas) {
            editorManager.fabricCanvas.clear();
            editorManager.fabricCanvas.backgroundColor = '#ffffff';
            editorManager.fabricCanvas.renderAll();
            this._refreshObjectList(editorManager);
        }
    },

    groupSelected(editorManager) {
        const c = editorManager.fabricCanvas;
        if (!c) return;
        const active = c.getActiveObject();
        if (!active) return;

        if (active.type === 'activeSelection') {
            const group = active.toGroup();
            group._isLockedGroup = true;
            c.setActiveObject(group);
            c.renderAll();
            this._refreshObjectList(editorManager);
        } else if (active.type === 'group') {
            active.toActiveSelection();
            c.renderAll();
            this._refreshObjectList(editorManager);
        }
    },

    toggleObjectListPanel(editorManager) {
        const panel = document.getElementById('objectListPanel');
        if (!panel) return;
        const isVisible = panel.style.display === 'flex';
        if (isVisible) {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'flex';
            this._refreshObjectList(editorManager);
        }
    },

    _refreshObjectList(editorManager) {
        const c = editorManager.fabricCanvas;
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

        container.querySelectorAll('[data-obj-index]').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.objIndex);
                const obj = c.getObjects()[idx];
                if (obj) {
                    c.discardActiveObject();
                    c.setActiveObject(obj);
                    c.renderAll();
                    this._refreshObjectList(editorManager);
                }
            });
        });
    },

    insertShapesToNote(editorManager) {
        ShapeTool.exportToPNG(editorManager.fabricCanvas, editorManager.tiptap, () => this.switchTab(editorManager, 'text'));
    }
};
