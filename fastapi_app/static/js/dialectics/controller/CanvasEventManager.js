/**
 * CanvasEventManager.js - Менеджер событий холста Диалектики (клики, двойные клики, drag-and-drop блоков, инструменты фигур)
 */
import { CanvasManager } from '../CanvasManager.js';
import { BlockManager } from '../BlockManager.js';
import { customConfirm } from '../../modal_controller.js';

export const CanvasEventManager = {
    init(engine) {
        CanvasManager.init(engine.dom.canvas, {
            onClick: async (clientX, mid) => {
                if (engine.state.isDirty) {
                    const confirmed = await customConfirm({
                        title: window._ ? window._('dialectics.unsaved_title', 'Внимание') : "Внимание",
                        message: window._ ? window._('dialectics.unsaved_msg', 'Есть несохранённые изменения. Продолжить?') : "Есть несохранённые изменения. Продолжить?",
                        icon: '',
                        buttons: [
                            { label: window._ ? window._('dialectics.cancel', 'Отмена') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                            { label: window._ ? window._('dialectics.continue_btn', 'Продолжить') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                        ]
                    });
                    if (!confirmed) return;
                }
                engine.state.isDirty = false;

                const nextSide = clientX < mid ? 'left' : 'right';

                engine.state.editingBlock = null;
                engine.state.pendingSide = nextSide;
                engine.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
                engine.state.pendingRole = null;

                const blocks = BlockManager.getBlocks(engine.dom.canvas);
                const hasAnchor = blocks.some(b => b.role === 'anchor');
                if (nextSide === 'left' && !hasAnchor) {
                    engine.state.pendingRole = 'anchor';
                }

                engine.open();
            },
            onDoubleClick: (block) => {
                engine.openEdit(block);
            }
        });

        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', () => engine.editor.switchTab(tab.dataset.tab));
        });

        const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn.bind(engine));

        bind('btnGraphPlot', () => engine.editor.plotGraph());
        bind('btnGraphInsert', () => engine.editor.insertGraphToNote());
        bind('btnShapeUndo', () => engine.editor.undoShape());
        bind('btnShapeDelete', () => engine.editor.deleteSelectedShape());
        bind('btnShapeGrid', () => engine.editor.toggleShapeGrid());
        bind('btnShapeCopy', () => engine.editor.copySelectedShape());
        bind('btnShapeClear', () => engine.editor.clearShapes());
        bind('btnShapesInsert', () => engine.editor.insertShapesToNote());
        bind('btnShapeGroup', () => engine.editor.groupSelected());
        bind('btnObjectList', () => engine.editor.toggleObjectListPanel());

        document.querySelectorAll('.shape-tool[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => engine.editor.setShapeTool(btn.dataset.tool));
        });
        document.querySelectorAll('.shape-tool[data-shape]').forEach(btn => {
            btn.addEventListener('click', () => engine.editor.addShape(btn.dataset.shape));
        });

        const colorPicker = document.getElementById('shapeColor');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                engine.editor.applyColorToSelected(e.target.value);
            });
        }

        const fillPicker = document.getElementById('shapeFillColor');
        if (fillPicker) {
            fillPicker.addEventListener('input', (e) => {
                engine.editor.applyFillToSelected(e.target.value + '33');
            });
        }

        bind('btnToggleFill', () => engine.editor.toggleFillForSelected());

        if (engine.dom.canvas) {
            let draggedBlock = null;

            engine.dom.canvas.addEventListener('dragstart', (e) => {
                const block = e.target.closest('.dialectics-block');
                if (!block || block._preventDrag || block.getAttribute('draggable') !== 'true') {
                    e.preventDefault();
                    return;
                }
                
                draggedBlock = block;
                block.classList.add('is-dragging');
                engine.dom.canvas.classList.add('is-dragging-active');
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', block.dataset.blockId || '');
                }
            });

            engine.dom.canvas.addEventListener('drop', (e) => {
                e.preventDefault();
            });

            engine.dom.canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggedBlock) return;

                const targetBlock = e.target.closest('.dialectics-block');
                if (!targetBlock || targetBlock === draggedBlock) return;

                const rect = targetBlock.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;

                if (e.clientY < midpoint) {
                    engine.dom.canvas.insertBefore(draggedBlock, targetBlock);
                } else {
                    engine.dom.canvas.insertBefore(draggedBlock, targetBlock.nextSibling);
                }
            });

            engine.dom.canvas.addEventListener('dragend', async (e) => {
                if (draggedBlock) {
                    draggedBlock.classList.remove('is-dragging');
                    draggedBlock.setAttribute('draggable', 'false');
                }
                engine.dom.canvas.classList.remove('is-dragging-active');
                draggedBlock = null;

                const blocks = BlockManager.getBlocks(engine.dom.canvas);
                BlockManager.render(engine.dom.canvas, blocks, typeof engine._blockCallbacks === 'function' ? engine._blockCallbacks() : {});
                await engine.saveGlobal(false, "toast.dialectics_updated");
            });
        }
    }
};
