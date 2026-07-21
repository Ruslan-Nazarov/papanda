/**
 * OrchestratorState.js - Управление состоянием оркестратора блоков и защита от состояний гонки
 */
import { DialecticsLogger } from '../DialecticsLogger.js';

export const OrchestratorState = {
    getState(engine) {
        if (!engine) return {};
        if (!engine.state) {
            engine.state = {
                isDirty: false,
                editingBlock: null,
                pendingSide: null,
                pendingRole: null,
                insertAfterIndex: null,
                activeTabId: null,
                isExpanded: false
            };
        }
        return engine.state;
    },

    setEditingBlock(engine, block, options = {}) {
        const state = this.getState(engine);
        if (state.editingBlock !== block) {
            DialecticsLogger.log('OrchestratorState', 'Смена редактируемого блока', {
                prev: state.editingBlock?.dataset?.id || state.editingBlock?.id || null,
                next: block?.dataset?.id || block?.id || null,
                ...options
            });
        }
        state.editingBlock = block;
        if (options.pendingSide !== undefined) state.pendingSide = options.pendingSide;
        if (options.pendingRole !== undefined) state.pendingRole = options.pendingRole;
        if (options.insertAfterIndex !== undefined) state.insertAfterIndex = options.insertAfterIndex;
    },

    clearEditingState(engine) {
        const state = this.getState(engine);
        if (state.editingBlock) {
            DialecticsLogger.log('OrchestratorState', 'Сброс редактируемого блока');
        }
        state.editingBlock = null;
        state.pendingSide = null;
        state.pendingRole = null;
        state.insertAfterIndex = null;
    },

    markDirty(engine, isDirty = true) {
        const state = this.getState(engine);
        state.isDirty = isDirty;
        if (isDirty) {
            DialecticsLogger.log('OrchestratorState', 'Заметка помечена как измененная (isDirty=true)');
        }
    }
};
