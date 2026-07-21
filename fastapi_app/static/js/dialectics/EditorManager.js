/**
 * EditorManager.js - Управление редактором TipTap и вкладками
 * Декомпозирован на:
 * - editor/EditorFormattingToolbar.js (панель форматирования, кнопки, состояния)
 * - editor/EditorCanvasShapes.js (вкладки, рисование фигур, графики, формулы)
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { ResizableImage, MathNode, QuestionMark, QuoteBlock, HiddenPhraseMark, BlockLinkMark, ClearMarksOnEnter, ClearMarksOnSpace } from './editor_setup.js';
import { EditorFormattingToolbar } from './editor/EditorFormattingToolbar.js';
import { EditorCanvasShapes } from './editor/EditorCanvasShapes.js';

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

        const initialHtml = el.innerHTML.trim() || '<p></p>';
        el.innerHTML = '';
        this.mainTiptap = this.createEditor(el, initialHtml);
        this.tiptap = this.mainTiptap;

        // Sync initial title
        setTimeout(() => {
            if (this.engine && this.engine.state && !this.engine.state.isProgrammaticUpdate) {
                const titleInput = document.getElementById('dialecticsTopic');
                if (titleInput) {
                    if (this.engine && this.engine.state) {
                        this.engine.state.currentNoteTitle = titleInput.value;
                    }
                }
            }
        }, 100);

        // Global check on modal close to restore focus
        const checkModal = () => {
            const current = window.customModalController?.currentModal;
            if (current && !current.isOpen && this.tiptap && !this.tiptap.isDestroyed) {
                this.updateFormattingToolbarStates();
            }
        };
        document.addEventListener('modalClosed', checkModal);

        const toolbar = document.querySelector('.editor-formatting-toolbar');
        if (toolbar) {
            this.bindFormattingButtons(toolbar);
        }

        this._syncOwnerBlock(this.tiptap);
    }

    _syncOwnerBlock(editor) {
        if (!editor || !this.engine || !this.engine.state) return;
        let owner = editor._ownerBlock;
        if (!owner && editor.options && editor.options.element) {
            const winOrBlock = editor.options.element.closest('.dialectics-floating-editor, .dialectics-block');
            if (winOrBlock) {
                if (winOrBlock.classList.contains('dialectics-floating-editor')) {
                    const blockId = winOrBlock.dataset.blockId;
                    if (blockId && this.engine.dom && this.engine.dom.canvas) {
                        owner = this.engine.dom.canvas.querySelector(`.dialectics-block[data-block-id="${blockId}"]`);
                    }
                } else {
                    owner = winOrBlock;
                }
            }
        }
        if (owner) {
            const liveOwner = document.contains(owner) ? owner : null;
            if (liveOwner) {
                this.engine.state.editingBlock = liveOwner;
            }
        }
    }

    bindFormattingButtons(toolbarEl, getEditorFunc) {
        EditorFormattingToolbar.bindFormattingButtons(this, toolbarEl, getEditorFunc);
    }

    updateFormattingToolbarStates(editorInstance = null) {
        EditorFormattingToolbar.updateFormattingToolbarStates(this, editorInstance);
    }

    async switchTab(tab, windowEl = null) {
        return EditorCanvasShapes.switchTab(this, tab, windowEl);
    }

    showMathMenu(x, y) {
        return EditorCanvasShapes.showMathMenu(this, x, y);
    }

    plotGraph() {
        return EditorCanvasShapes.plotGraph();
    }

    async insertGraphToNote() {
        return EditorCanvasShapes.insertGraphToNote(this);
    }

    setShapeTool(tool) {
        return EditorCanvasShapes.setShapeTool(this, tool);
    }

    async addShape(type) {
        return EditorCanvasShapes.addShape(this, type);
    }

    deleteSelectedShape() {
        return EditorCanvasShapes.deleteSelectedShape(this);
    }

    async toggleShapeGrid() {
        return EditorCanvasShapes.toggleShapeGrid(this);
    }

    async copySelectedShape() {
        return EditorCanvasShapes.copySelectedShape(this);
    }

    undoShape() {
        return EditorCanvasShapes.undoShape(this);
    }

    applyColorToSelected(color) {
        return EditorCanvasShapes.applyColorToSelected(this, color);
    }

    applyFillToSelected(color) {
        return EditorCanvasShapes.applyFillToSelected(this, color);
    }

    toggleFillForSelected() {
        return EditorCanvasShapes.toggleFillForSelected(this);
    }

    _saveHistory() {
        return EditorCanvasShapes._saveHistory(this);
    }

    async clearShapes() {
        return EditorCanvasShapes.clearShapes(this);
    }

    groupSelected() {
        return EditorCanvasShapes.groupSelected(this);
    }

    toggleObjectListPanel() {
        return EditorCanvasShapes.toggleObjectListPanel(this);
    }

    _refreshObjectList() {
        return EditorCanvasShapes._refreshObjectList(this);
    }

    insertShapesToNote() {
        return EditorCanvasShapes.insertShapesToNote(this);
    }

    setContent(content) {
        if (this.tiptap) {
            if (this.engine && this.engine.state) {
                this.engine.state.isProgrammaticUpdate = true;
            }
            this.tiptap.commands.setContent(content);
            this.tiptap.commands.focus();
            if (this.engine && this.engine.state) {
                this.engine.state.isProgrammaticUpdate = false;
            }
        }
    }

    getHTML() {
        return this.tiptap ? this.tiptap.getHTML() : "";
    }

    createEditor(element, content, onFocusCallback, onUpdateCallback) {
        const editor = new Editor({
            element: element,
            extensions: [
                StarterKit.configure({ blockquote: false }),
                Underline,
                QuestionMark,
                HiddenPhraseMark,
                BlockLinkMark,
                ResizableImage.configure({ allowBase64: true }),
                MathNode,
                QuoteBlock,
                ClearMarksOnEnter,
                ClearMarksOnSpace
            ],
            content: content || '<p></p>',
            autofocus: 'end',
            onFocus: ({ editor }) => {
                this.tiptap = editor;
                this._syncOwnerBlock(editor);
                if (onFocusCallback) onFocusCallback();
                this.updateFormattingToolbarStates(editor);
            },
            onBlur: () => {
                this.updateFormattingToolbarStates();
            },
            editorProps: {
                handleDOMEvents: {
                    mousedown: (view, event) => {
                        event.stopPropagation();
                        return false;
                    },
                    paste: (view, event) => {
                        event.stopPropagation();
                        return false;
                    }
                },
                handlePaste: (view, event, slice) => {
                    if (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    if (slice && slice.content && slice.content.childCount > 0) {
                        const tr = view.state.tr.replaceSelection(slice);
                        view.dispatch(tr);
                    }
                    return true;
                }
            },
            onSelectionUpdate: ({ editor }) => {
                this.tiptap = editor;
                this._syncOwnerBlock(editor);
                this.updateFormattingToolbarStates(editor);
            },
            onUpdate: ({ editor }) => {
                this.tiptap = editor;
                this._syncOwnerBlock(editor);
                if (onUpdateCallback) onUpdateCallback();
                this.updateFormattingToolbarStates(editor);
            }
        });

        if (element) {
            element.addEventListener('click', (e) => {
                if ((e.target === element || e.target.classList.contains('tiptap-editor') || e.target.classList.contains('block-tiptap-editor')) && editor && !editor.isDestroyed) {
                    editor.commands.focus('end');
                }
            });

            element.addEventListener('contextmenu', (e) => {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed && selection.toString().trim() !== '') {
                    return;
                }
                e.preventDefault();

                this.tiptap = editor;
                this._syncOwnerBlock(editor);
                this.updateFormattingToolbarStates(editor);

                if (this.engine && this.engine.logDebug) {
                    this.engine.logDebug(`[EditorManager] Right-click detected at ${e.clientX}, ${e.clientY}`);
                }
                try {
                    this.showMathMenu(e.clientX, e.clientY);
                } catch (err) {
                    console.error("Error showing math menu:", err);
                }
            });
        }

        const originalDestroy = editor.destroy.bind(editor);
        editor.destroy = () => {
            if (this.tiptap === editor) {
                this.tiptap = this.mainTiptap;
            }
            originalDestroy();
        };

        return editor;
    }
}
