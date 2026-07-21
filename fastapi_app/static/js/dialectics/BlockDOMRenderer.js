/**
 * BlockDOMRenderer.js - Координация отрисовки блоков, подсказок и разделителей на холсте
 */
import { getSteps, getAnchorHint } from './BlockConstants.js';
import { BlockProgressWidget } from './BlockProgressWidget.js';
import { BlockElementFactory } from './BlockElementFactory.js';

export const BlockDOMRenderer = {
    render(container, blocks, callbacks = {}, globalCallbacks = {}, renderMathFn = null) {
        if (!container) return;
        
        callbacks = { ...globalCallbacks, ...callbacks };
        const divider = document.getElementById('canvasDivider');
        container.innerHTML = '';
        if (divider) container.appendChild(divider);

        BlockProgressWidget.update(blocks);

        const STEPS = getSteps();
        const ANCHOR_HINT = getAnchorHint();

        const specialBlocks = {};
        const normalBlocks = [];
        let curSideRoles = { left: 'step1', right: 'step2', center: 'step5' };

        blocks.forEach(b => {
            if (b.role && b.role !== 'anchor') {
                if (b.side && curSideRoles[b.side]) {
                    curSideRoles[b.side] = b.role;
                }
            }

            if (b.role) {
                specialBlocks[b.role] = b;
                if (b.role !== 'anchor') {
                    normalBlocks.push(b);
                }
            } else {
                normalBlocks.push(b);
            }
        });

        const stepOrder = { 'step1': 1, 'step2': 2, 'step3': 3, 'step4': 4, 'step5': 5 };
        const allElements = [];

        if (!specialBlocks['anchor']) {
            normalBlocks.forEach(b => allElements.push({ type: 'block', data: b }));
            allElements.push({ type: 'hint', data: ANCHOR_HINT });
        } else {
            let nextHint = null;
            for (const step of STEPS) {
                const isDismissed = window.app && window.app.state && window.app.state.dismissedHints && window.app.state.dismissedHints.includes(step.id);
                const showHidden = document.getElementById('toggleShowHiddenHints')?.checked;
                if (!specialBlocks[step.id] && !(isDismissed && !showHidden)) {
                    nextHint = step;
                    break;
                }
            }

            let hintPushed = false;
            normalBlocks.forEach(b => {
                if (nextHint && !hintPushed && b.role && stepOrder[b.role] && stepOrder[b.role] > stepOrder[nextHint.id]) {
                    allElements.push({ type: 'hint', data: nextHint });
                    hintPushed = true;
                }
                allElements.push({ type: 'block', data: b });
            });

            if (nextHint && !hintPushed) {
                allElements.push({ type: 'hint', data: nextHint });
            }

            allElements.push({ type: 'block', data: specialBlocks['anchor'] });
        }

        if (callbacks.onInsertAfter) {
            container.appendChild(BlockElementFactory.createInsertRow(callbacks, 0));
        }

        let logicalBlockIndex = 0;

        allElements.forEach((el) => {
            if (el.type === 'hint') {
                const isNoDialectics = container.classList.contains('mode-no-dialectics') || 
                                       (document.getElementById('toggleDialecticsMode') && !document.getElementById('toggleDialecticsMode').checked);
                if (isNoDialectics) return;
                BlockElementFactory.renderHintBlock(container, el.data, callbacks);
            } else {
                const b = el.data;
                if (!b.id) b.id = 'block_' + Math.random().toString(36).substring(2, 9);
                const isSection = b.isSection === true || b.side === 'section';
                if (isSection) {
                    BlockElementFactory.renderSectionBlock(container, b, callbacks, logicalBlockIndex);
                    logicalBlockIndex++;
                } else {
                    BlockElementFactory.renderNormalBlock(container, b, callbacks, renderMathFn);
                    if (callbacks.onInsertAfter) {
                        container.appendChild(BlockElementFactory.createInsertRow(callbacks, logicalBlockIndex + 1));
                    }
                    logicalBlockIndex++;
                }
            }
        });

        if (typeof window.applyCanvasModes === 'function') window.applyCanvasModes();
    }
};
