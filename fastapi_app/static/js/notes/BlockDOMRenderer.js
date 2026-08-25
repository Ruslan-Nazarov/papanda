import AppState from './AppState.js';
import BlockNormalBuilder from './BlockNormalBuilder.js';
import BlockHintBuilder from './BlockHintBuilder.js';
import { ALGORITHM_STEPS, inferRoleFromTitle } from './BlockConstants.js';

class BlockDOMRenderer {
    /**
     * Compute which hint to show next based on confirmed blocks in the note.
     * Steps are sequentially evaluated: anchor -> step1 -> step2 -> step3 -> step4 -> step5.
     */
    static getNextActiveRole(blocks) {
        // Only consider blocks that are fully confirmed/saved (not in-progress drafts)
        const completedBlocks = (blocks || []).filter(b => b.role !== 'section' && b.status !== 'in_progress' && !b.isDraft);
        
        const existingRoles = new Set();
        completedBlocks.forEach((b) => {
            inferRoleFromTitle(b);
            if (b.role) existingRoles.add(b.role);
        });

        const dismissedHints = AppState.dismissedHints || [];
        const showHidden = AppState.toggleShowHiddenHints;

        for (const step of ALGORITHM_STEPS) {
            if (!existingRoles.has(step.role)) {
                const isDismissed = dismissedHints.includes(step.role);
                if (isDismissed && !showHidden) {
                    continue;
                }
                return step;
            }
        }
        return null;
    }

    /**
     * Full canvas re-render.
     * Renders normal blocks and next hint according to dialectics layout:
     * - If anchor is not yet created: render hint-anchor (left).
     * - If anchor is created: non-anchor blocks -> next hint -> anchor (bottom).
     */
    static renderAll() {
        const container = document.getElementById('blocks-container');
        if (!container) return;

        const noDialectics = container.classList.contains('mode-no-dialectics');
        const allBlocks = (AppState.currentNote.blocks || []).filter(b => !b.isDraft);

        // Separate anchor block and non-anchor blocks
        let anchorBlock = null;
        const nonAnchorBlocks = [];

        allBlocks.forEach(b => {
            inferRoleFromTitle(b);
            if (b.role === 'anchor') {
                anchorBlock = b;
            } else {
                nonAnchorBlocks.push(b);
            }
        });

        const nextStep = this.getNextActiveRole(allBlocks);

        container.innerHTML = '';
        container.appendChild(this.createDivider(0));

        let dividerIndex = 1;

        if (!anchorBlock) {
            // CASE 1: Anchor is not yet filled
            // Render any existing non-anchor blocks
            nonAnchorBlocks.forEach((block) => {
                const el = BlockNormalBuilder.build(block, () => this.renderAll());
                container.appendChild(el);
                container.appendChild(this.createDivider(dividerIndex++));
            });

            // Render hint-anchor (left)
            if (!noDialectics) {
                const anchorStep = ALGORITHM_STEPS.find(s => s.role === 'anchor') || { role: 'anchor', side: 'left' };
                const hintEl = BlockHintBuilder.build(anchorStep.role, anchorStep.side, () => this.renderAll());
                container.appendChild(hintEl);
            }
        } else {
            // CASE 2: Anchor exists -> Render non-anchor blocks, then next hint (above anchor), then anchor at bottom!
            nonAnchorBlocks.forEach((block) => {
                const el = BlockNormalBuilder.build(block, () => this.renderAll());
                container.appendChild(el);
                container.appendChild(this.createDivider(dividerIndex++));
            });

            // If there's a next step (step1..step5), render its hint ABOVE anchor
            if (!noDialectics && nextStep && nextStep.role !== 'anchor') {
                const hintEl = BlockHintBuilder.build(nextStep.role, nextStep.side, () => this.renderAll());
                container.appendChild(hintEl);
                container.appendChild(this.createDivider(dividerIndex++));
            }

            // Render anchor block at the very bottom
            const anchorEl = BlockNormalBuilder.build(anchorBlock, () => this.renderAll());
            container.appendChild(anchorEl);
            container.appendChild(this.createDivider(dividerIndex++));
        }
    }

    static createDivider(index) {
        const div = document.createElement('div');
        div.className = 'block-divider';
        div.dataset.index = index;
        div.innerHTML = `
            <div class="add-block-actions">
                <button class="icon-add-btn left" title="Добавить тезис">+</button>
                <button class="icon-add-btn center" title="Добавить синтез">+</button>
                <div class="right-actions">
                    <button class="icon-add-btn right" title="Добавить антитезис">+</button>
                    <button class="section-add-btn" title="Добавить раздел">📄 Раздел</button>
                </div>
            </div>
        `;
        return div;
    }
}

export default BlockDOMRenderer;
