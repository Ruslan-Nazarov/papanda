/**
 * BlockManager.js - Фасад управления блоками на холсте Диалектики (рефакторинг в модульную структуру)
 */
import { COLOR_PRESETS } from './BlockConstants.js';
import { BlockMathRenderer } from './BlockMathRenderer.js';
import { BlockProgressWidget } from './BlockProgressWidget.js';
import { BlockDOMRenderer } from './BlockDOMRenderer.js';
import { BlockDOMParser } from './BlockDOMParser.js';

export { COLOR_PRESETS };

export const BlockManager = {
    globalCallbacks: {},
    
    setCallbacks(callbacks) {
        this.globalCallbacks = callbacks;
    },

    renderMath(element) {
        return BlockMathRenderer.renderMath(element);
    },

    updateProgressWidget(blocks) {
        return BlockProgressWidget.update(blocks);
    },

    render(container, blocks, callbacks = {}) {
        return BlockDOMRenderer.render(container, blocks, callbacks, this.globalCallbacks, (el) => this.renderMath(el));
    },

    cleanRawHtml(innerNode) {
        return BlockDOMParser.cleanRawHtml(innerNode);
    },

    getBlocks(container) {
        return BlockDOMParser.getBlocks(container);
    },

    getLastSide(container) {
        return BlockDOMParser.getLastSide(container);
    }
};

window.BlockManager = BlockManager;
