/**
 * BlockElementFactory.js - Фабрика создания элементов блоков, разделов и подсказок для холста
 * Декомпозирована на:
 * - blocks/BlockInsertAndHintBuilder.js (строки добавления + и подсказки)
 * - blocks/BlockSectionBuilder.js (разделы холста)
 * - blocks/BlockNormalBuilder.js (стандартные блоки с кнопками, статусами, стикерами)
 */
import { BlockInsertAndHintBuilder } from './blocks/BlockInsertAndHintBuilder.js';
import { BlockSectionBuilder } from './blocks/BlockSectionBuilder.js';
import { BlockNormalBuilder } from './blocks/BlockNormalBuilder.js';

export const BlockElementFactory = {
    createInsertRow(callbacks, targetIndex) {
        return BlockInsertAndHintBuilder.createInsertRow(callbacks, targetIndex);
    },

    renderHintBlock(container, hint, callbacks) {
        return BlockInsertAndHintBuilder.renderHintBlock(container, hint, callbacks);
    },

    renderSectionBlock(container, b, callbacks, logicalBlockIndex) {
        return BlockSectionBuilder.renderSectionBlock(this, container, b, callbacks, logicalBlockIndex);
    },

    renderNormalBlock(container, b, callbacks, renderMathFn) {
        return BlockNormalBuilder.renderNormalBlock(container, b, callbacks, renderMathFn);
    }
};
