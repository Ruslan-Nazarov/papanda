import AppState from './AppState.js';

import { t } from '../i18n.js';
export class EditorShapesTab {
    constructor(modalContainer, blockId, getEditor) {
        this.modalContainer = modalContainer;
        this.blockId = blockId;
        this.getEditor = getEditor;
        this.fabricCanvas = null;
        this.isGridVisible = false;
        this.canvasHistory = [];
        this.historyIndex = -1;
        this.isHistoryAction = false;
        this.currentFill = 'transparent';
    }

    init() {
        if (this.fabricCanvas || typeof fabric === 'undefined') return;
        
        this.fabricCanvas = new fabric.Canvas('shapes-canvas', { width: 540, height: 220, isDrawingMode: false });
        
        const block = AppState.getBlock(this.blockId);
        if (block && block.shapesData) {
            try {
                this.fabricCanvas.loadFromJSON(block.shapesData, () => {
                    this.fabricCanvas.renderAll();
                    this.saveHistory();
                });
            } catch (e) {
                console.error('Failed to load shapesData', e);
                this.saveHistory();
            }
        } else {
            this.saveHistory();
        }

        this.fabricCanvas.on('object:added', () => this.saveHistory());
        this.fabricCanvas.on('object:modified', () => this.saveHistory());
        this.fabricCanvas.on('object:removed', () => this.saveHistory());

        this.bindEvents();
    }

    saveHistory() {
        if (this.isHistoryAction || !this.fabricCanvas) return;
        if (this.historyIndex < this.canvasHistory.length - 1) {
            this.canvasHistory = this.canvasHistory.slice(0, this.historyIndex + 1);
        }
        this.canvasHistory.push(JSON.stringify(this.fabricCanvas));
        this.historyIndex++;
    }

    undo() {
        if (this.historyIndex > 0 && this.fabricCanvas) {
            this.isHistoryAction = true;
            this.historyIndex--;
            this.fabricCanvas.loadFromJSON(this.canvasHistory[this.historyIndex], () => {
                this.fabricCanvas.renderAll();
                this.isHistoryAction = false;
            });
        }
    }

    toggleGrid() {
        if (!this.fabricCanvas) return;
        this.isGridVisible = !this.isGridVisible;
        if (this.isGridVisible) {
            const gridPattern = new fabric.Pattern({
                source: function() {
                    const patternCanvas = document.createElement('canvas');
                    patternCanvas.width = 20;
                    patternCanvas.height = 20;
                    const ctx = patternCanvas.getContext('2d');
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.beginPath();
                    ctx.moveTo(0.5, 0.5);
                    ctx.lineTo(20.5, 0.5);
                    ctx.moveTo(0.5, 0.5);
                    ctx.lineTo(0.5, 20.5);
                    ctx.stroke();
                    return patternCanvas;
                }(),
                repeat: 'repeat'
            });
            this.fabricCanvas.backgroundColor = gridPattern;
        } else {
            this.fabricCanvas.backgroundColor = '';
        }
        this.fabricCanvas.requestRenderAll();
    }

    getFill() { return this.currentFill; }
    getStroke() { return this.modalContainer.querySelector('#shape-color-stroke')?.value || '#1e293b'; }
    getStrokeWidth() { return parseInt(this.modalContainer.querySelector('#shape-stroke-width')?.value, 10) || 2; }

    bindEvents() {
        const mc = this.modalContainer;
        const fc = this.fabricCanvas;

        mc.querySelector('#btn-shape-select')?.addEventListener('click', (e) => {
            fc.isDrawingMode = false;
            mc.querySelectorAll('.shape-tool-btn').forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });

        mc.querySelector('#btn-shape-draw')?.addEventListener('click', (e) => {
            fc.isDrawingMode = true;
            fc.freeDrawingBrush.color = this.getStroke();
            fc.freeDrawingBrush.width = this.getStrokeWidth();
            mc.querySelectorAll('.shape-tool-btn').forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });

        mc.querySelector('#btn-add-rect')?.addEventListener('click', () => {
            fc.add(new fabric.Rect({ left: 100, top: 80, fill: this.getFill(), stroke: this.getStroke(), strokeWidth: this.getStrokeWidth(), width: 60, height: 60 }));
        });
        mc.querySelector('#btn-add-circle')?.addEventListener('click', () => {
            fc.add(new fabric.Circle({ left: 150, top: 100, fill: this.getFill(), stroke: this.getStroke(), strokeWidth: this.getStrokeWidth(), radius: 30 }));
        });
        mc.querySelector('#btn-add-triangle')?.addEventListener('click', () => {
            fc.add(new fabric.Triangle({ left: 180, top: 100, fill: this.getFill(), stroke: this.getStroke(), strokeWidth: this.getStrokeWidth(), width: 60, height: 60 }));
        });
        mc.querySelector('#btn-add-rtriangle')?.addEventListener('click', () => {
            fc.add(new fabric.Polygon([{x: 0, y: 0}, {x: 0, y: 60}, {x: 60, y: 60}], { left: 200, top: 100, fill: this.getFill(), stroke: this.getStroke(), strokeWidth: this.getStrokeWidth() }));
        });
        mc.querySelector('#btn-add-diamond')?.addEventListener('click', () => {
            fc.add(new fabric.Polygon([{x: 30, y: 0}, {x: 60, y: 30}, {x: 30, y: 60}, {x: 0, y: 30}], { left: 230, top: 100, fill: this.getFill(), stroke: this.getStroke(), strokeWidth: this.getStrokeWidth() }));
        });
        mc.querySelector('#btn-add-line')?.addEventListener('click', () => {
            fc.add(new fabric.Line([50, 50, 150, 150], { stroke: this.getStroke(), strokeWidth: this.getStrokeWidth() }));
        });
        mc.querySelector('#btn-add-arrow')?.addEventListener('click', () => {
            const line = new fabric.Line([50, 50, 150, 150], { stroke: this.getStroke(), strokeWidth: this.getStrokeWidth() });
            const triangle = new fabric.Triangle({ width: 10, height: 15, fill: this.getStroke(), left: 150, top: 150, originX: 'center', originY: 'center', selectable: false, angle: 45 });
            const group = new fabric.Group([line, triangle]);
            fc.add(group);
        });
        mc.querySelector('#btn-add-text')?.addEventListener('click', () => {
            fc.add(new fabric.IText(t('tab_text'), { left: 50, top: 50, fontSize: 24, fill: this.getStroke() }));
        });

        mc.querySelector('#btn-shape-copy')?.addEventListener('click', () => {
            const active = fc.getActiveObject();
            if (active) {
                active.clone(cloned => {
                    cloned.set({ left: cloned.left + 15, top: cloned.top + 15, evented: true });
                    if (cloned.type === 'activeSelection') {
                        cloned.canvas = fc;
                        cloned.forEachObject(obj => fc.add(obj));
                        cloned.setCoords();
                    } else {
                        fc.add(cloned);
                    }
                    fc.setActiveObject(cloned);
                    fc.requestRenderAll();
                    this.saveHistory();
                });
            }
        });

        mc.querySelector('#btn-shape-delete')?.addEventListener('click', () => {
            const active = fc.getActiveObjects();
            if (active.length) {
                active.forEach(obj => fc.remove(obj));
                fc.discardActiveObject();
            }
        });

        mc.querySelector('#btn-clear-canvas')?.addEventListener('click', () => {
            fc.clear();
            this.isGridVisible = false;
            this.saveHistory();
        });

        mc.querySelector('#btn-shape-undo')?.addEventListener('click', () => this.undo());
        mc.querySelector('#btn-shape-grid')?.addEventListener('click', () => this.toggleGrid());

        mc.querySelector('#btn-shape-lock')?.addEventListener('click', () => {
            const active = fc.getActiveObjects();
            if (active.length) {
                active.forEach(obj => {
                    const isLocked = obj.lockMovementX;
                    obj.set({
                        lockMovementX: !isLocked, lockMovementY: !isLocked,
                        lockRotation: !isLocked, lockScalingX: !isLocked, lockScalingY: !isLocked,
                        hasControls: isLocked
                    });
                });
                fc.requestRenderAll();
            }
        });

        mc.querySelector('#btn-fill-transparent')?.addEventListener('click', () => {
            this.currentFill = 'transparent';
            const active = fc.getActiveObjects();
            active.forEach(obj => { if (obj.type !== 'i-text' && obj.type !== 'line') obj.set('fill', 'transparent'); });
            fc.requestRenderAll();
        });

        mc.querySelector('#shape-color-fill')?.addEventListener('change', (e) => {
            this.currentFill = e.target.value;
            const active = fc.getActiveObjects();
            active.forEach(obj => { if (obj.type !== 'i-text' && obj.type !== 'line' && obj.type !== 'group') obj.set('fill', this.currentFill); });
            fc.requestRenderAll();
        });

        mc.querySelector('#shape-color-stroke')?.addEventListener('change', (e) => {
            const color = e.target.value;
            const active = fc.getActiveObjects();
            active.forEach(obj => { 
                if (obj.type === 'i-text') obj.set('fill', color); 
                else if (obj.type === 'group') { obj.getObjects().forEach(sub => { sub.set('stroke', color); sub.set('fill', color); }); }
                else obj.set('stroke', color); 
            });
            fc.freeDrawingBrush.color = color;
            fc.requestRenderAll();
        });

        mc.querySelector('#shape-stroke-width')?.addEventListener('input', (e) => {
            const width = parseInt(e.target.value, 10);
            const active = fc.getActiveObjects();
            active.forEach(obj => { 
                if (obj.type !== 'i-text') {
                    if (obj.type === 'group') { obj.getObjects().forEach(sub => sub.set('strokeWidth', width)); }
                    else obj.set('strokeWidth', width);
                }
            });
            fc.freeDrawingBrush.width = width;
            fc.requestRenderAll();
        });

        mc.querySelector('#btn-insert-shapes')?.addEventListener('click', () => {
            const dataUrl = fc.toDataURL({ format: 'png', quality: 1 });
            const editor = this.getEditor();
            if (editor) {
                editor.commands.insertContent(`<img src="${dataUrl}">`);
            }
            mc.querySelector('[data-tab="text"]')?.click();
        });
    }

    getJSON() {
        return this.fabricCanvas ? JSON.stringify(this.fabricCanvas.toJSON()) : null;
    }
}
