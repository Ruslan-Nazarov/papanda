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

    async switchTab(tab) {
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
            }
        }
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
        this.tiptap?.chain().focus().insertContent({ type: 'mathNode', attrs: { latex } }).run();
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

    clearShapes() {
        if (confirm("Очистить холст?") && this.fabricCanvas) {
            this.fabricCanvas.clear();
            this.fabricCanvas.backgroundColor = '#ffffff';
        }
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
