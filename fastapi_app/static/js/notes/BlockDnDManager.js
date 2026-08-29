import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';

class BlockDnDManager {
    static init() {
        const container = document.getElementById('blocks-container');
        if (!container) return;

        container.addEventListener('dragover', this.handleDragOver.bind(this));
        container.addEventListener('drop', this.handleDrop.bind(this));
        container.addEventListener('dragleave', this.handleDragLeave.bind(this));

        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
    }

    static handleDragStart(e) {
        // Only allow dragging if the user is grabbing the drag handle.
        // This prevents accidental dragging when interacting with the inline editor or content.
        if (!e.target.closest('.drag-handle')) {
            e.preventDefault();
            return;
        }

        const blockEl = e.target.closest('.dialectics-block');
        if (!blockEl) return;
        blockEl.classList.add('is-dragging');
        e.dataTransfer.setData('text/plain', blockEl.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        window._draggedBlock = blockEl;
    }

    static handleDragEnd(e) {
        const blockEl = e.target.closest('.dialectics-block');
        if (blockEl) {
            blockEl.classList.remove('is-dragging');
        }
        this.clearIndicator();
        window._draggedBlock = null;
    }
    
    static handleDragLeave(e) {
        const container = document.getElementById('blocks-container');
        if (!container.contains(e.relatedTarget)) {
            this.clearIndicator();
        }
    }

    static clearIndicator() {
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    }

    static handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const container = document.getElementById('blocks-container');
        const afterElement = this.getDragAfterElement(container, e.clientY);
        
        let indicator = document.querySelector('.drop-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'drop-indicator';
        }
        
        if (afterElement == null) {
            container.appendChild(indicator);
        } else {
            container.insertBefore(indicator, afterElement);
        }
    }

    static handleDrop(e) {
        e.preventDefault();
        const blockId = e.dataTransfer.getData('text/plain');
        if (!blockId) return;

        const container = document.getElementById('blocks-container');
        const indicator = document.querySelector('.drop-indicator');
        const draggedEl = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
        
        if (draggedEl && indicator) {
            container.insertBefore(draggedEl, indicator);
        }
        
        this.clearIndicator();
        
        const containerRect = container.getBoundingClientRect();
        
        // Update side based on drop horizontal position
        const droppedBlock = AppState.currentNote.blocks.find(b => b.id === blockId);
        if (droppedBlock && droppedBlock.role !== 'section' && droppedBlock.side !== 'center') {
            if (droppedBlock.role === 'anchor' || (droppedBlock.title || '').toLowerCase().includes('что вам нужно понять')) {
                droppedBlock.side = 'left';
            } else {
                const dropX = e.clientX - containerRect.left;
                if (dropX < containerRect.width / 2) {
                    droppedBlock.side = 'left';
                } else {
                    droppedBlock.side = 'right';
                }
            }
        }

        // Sync order with AppState based on DOM
        const newBlocksOrder = [];
        container.querySelectorAll('.dialectics-block').forEach(el => {
            const id = el.dataset.id;
            const block = AppState.currentNote.blocks.find(b => b.id === id);
            if (block) newBlocksOrder.push(block);
        });

        AppState.currentNote.blocks = newBlocksOrder;
        AppState.markDirty();
        BlockDOMRenderer.renderAll();
    }

    static getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.dialectics-block:not(.is-dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}

export default BlockDnDManager;
