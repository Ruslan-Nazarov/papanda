import AppState from './AppState.js';

class BlockDOMParser {
    static syncDOMToState() {
        const blocks = document.querySelectorAll('.dialectics-block');
        blocks.forEach(blockEl => {
            const id = blockEl.dataset.id;
            const contentEl = blockEl.querySelector('.block-content');
            const titleEl = blockEl.querySelector('.block-title');
            if (id && titleEl) {
                const title = titleEl.textContent;
                const updates = { title };
                if (contentEl && contentEl.isContentEditable) {
                    updates.html = contentEl.innerHTML;
                }
                AppState.updateBlock(id, updates);
            }
        });
    }
}

export default BlockDOMParser;
