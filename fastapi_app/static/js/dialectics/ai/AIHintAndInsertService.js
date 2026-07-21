import { DialecticsAPI } from '../api.js';
import { DialecticsUI } from '../ui_utils.js';
import { BlockManager } from '../BlockManager.js';
import { customConfirm } from '../../modal_controller.js';

class AIHintAndInsertClass {
    async runHintAI(hint) {
        if (!hint || hint.id === 'anchor') {
            window.showToast("Cannot run AI on the main goal block before it is created.", "info");
            return;
        }

        const blocks = BlockManager.getBlocks(this.dom.canvas);
        const anchorBlock = blocks.find(b => b.role === 'anchor');
        
        const stripHtml = (html) => {
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };

        const goalText = anchorBlock ? stripHtml(anchorBlock.html) : '';

        // Extract context (previous blocks)
        const contextBlocks = blocks.filter(b => b.role && b.role !== 'anchor');
        const contextText = contextBlocks.map(b => `[${b.role}]: ${stripHtml(b.html)}`).join('\\n\\n');

        window.showToast("✨ " + window._("toast.ai_is_thinking", "AI is generating response..."), "info");
        try {
            const res = await fetch('/api/ai/dialectics/hint-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    step_id: hint.id, 
                    goal_text: goalText,
                    context_text: contextText 
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'API Error');
            }

            const data = await res.json();
            
            // Convert simple text to HTML paragraphs
            let aiHtml = data.result;
            if (!aiHtml.includes('<p>') && !aiHtml.includes('<div>')) {
                aiHtml = aiHtml.split('\\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
            }
            
            this.openHintEditor(hint, '', aiHtml);

        } catch (error) {
            console.error("AI Error:", error);
            window.showToast("AI Error: " + error.message, "error");
        }
    }

    // Open editor to insert a new block after a specific index
    async openInsertAfter(side, index) {
        const uiLog = window.logDebugWindow || (typeof DialecticsUI !== 'undefined' && DialecticsUI.logDebugWindow ? DialecticsUI.logDebugWindow.bind(DialecticsUI) : null);
        if (uiLog) {
            uiLog('1. Нажата кнопка [+] (openInsertAfter)', {
                side,
                index,
                hasState: !!this.state,
                hasEditor: !!(this.editor),
                hasCreateEditor: !!(this.editor && this.editor.createEditor),
                hasOpen: typeof this.open === 'function',
                isDirty: this.state?.isDirty
            });
        }
        console.log(`[AIController] openInsertAfter called with side=${side}, index=${index}`);
        if (this.state.isDirty) {
            console.log(`[AIController] openInsertAfter: state is dirty, prompting user`);
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
        this.state.isDirty = false;

        if (side === 'section') {
            if (this.openSectionTitleModal) {
                this.openSectionTitleModal(index);
            }
            return;
        }
        this.state.editingBlock = null;
        this.state.pendingSide = side;
        let inheritedRole = null;
        if (window.BlockManager && this.dom && this.dom.canvas) {
            const currentBlocks = window.BlockManager.getBlocks(this.dom.canvas);
            if (index !== null && index !== undefined && index >= 0 && currentBlocks[index]) {
                inheritedRole = currentBlocks[index].role || null;
                if (!inheritedRole) {
                    for (let i = index; i >= 0; i--) {
                        if (currentBlocks[i].role && currentBlocks[i].role !== 'anchor') {
                            inheritedRole = currentBlocks[i].role;
                            break;
                        }
                    }
                }
            }
        }
        if (!inheritedRole) {
            inheritedRole = side === 'right' ? 'step2' : side === 'center' ? 'step5' : 'step1';
        }
        this.state.pendingRole = inheritedRole;
        this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        this.state.insertAfterIndex = index;
        const titleInput = document.getElementById('editorBlockTitleInput');
        if (titleInput) {
            titleInput.value = "";
        }
        if (uiLog) {
            uiLog('1b. Состояние перед open()', {
                pendingSide: this.state.pendingSide,
                pendingRole: this.state.pendingRole,
                insertAfterIndex: this.state.insertAfterIndex,
                pendingBlockId: this.state.pendingBlockId
            });
        }
        console.log(`[AIController] openInsertAfter: calling this.open() with pendingSide=${this.state.pendingSide}, pendingRole=${this.state.pendingRole}`);
        try {
            this.open();
        } catch(err) {
            console.error('[AIController] openInsertAfter: ERROR calling open()', err);
            if (uiLog) uiLog('❌ ОШИБКА в open(): ' + err.message, { stack: err.stack?.substring(0, 500) });
        }
    }

}
export const AIHintAndInsertMixin = {};
Object.getOwnPropertyNames(AIHintAndInsertClass.prototype).forEach(k => { if (k !== 'constructor') AIHintAndInsertMixin[k] = AIHintAndInsertClass.prototype[k]; });
