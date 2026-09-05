import AppState from './AppState.js';
import BlockNormalBuilder from './BlockNormalBuilder.js';
import BlockHintBuilder from './BlockHintBuilder.js';
import { ALGORITHM_STEPS, inferRoleFromTitle } from './BlockConstants.js';
import { t } from '../i18n.js';

class BlockDOMRenderer {
    /**
     * Compute which hint to show next based on confirmed blocks in the note.
     * Steps are sequentially evaluated: anchor -> step1 -> step2 -> step3 -> step4 -> step5.
     */
    static getNextActiveRole(blocks) {
        // Only consider blocks that are fully confirmed/saved (not in-progress drafts)
        const completedBlocks = (blocks || []).filter(b => b.role !== 'section' && b.status !== 'in_progress' && !b.isDraft);
        
        // Роли вида "step1.2" (несколько простейших/развивающих процессов на
        // одном шаге, см. expected_step_keys на бэкенде) считаются частью
        // базового шага "step1" — иначе подсказка для уже заполненного шага
        // продолжала бы показываться.
        const existingRoles = new Set();
        completedBlocks.forEach((b) => {
            inferRoleFromTitle(b);
            if (b.role) existingRoles.add(b.role.split('.')[0]);
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
     * Renders all other blocks sequentially, followed by upcoming hints,
     * and keeps the "Что вам нужно понять" (anchor) block at the very bottom on the left.
     */
    static renderAll() {
        const container = document.getElementById('blocks-container');
        if (!container) return;

        const noDialectics = container.classList.contains('mode-no-dialectics');
        // В режиме ИИ-генерации подсказки-блоки не показываем вовсе —
        // исключение: пустой конспект, где anchor-подсказка нужна для старта.
        const aiMode = AppState.mode === 'ai';
        const allBlocks = (AppState.currentNote.blocks || []).filter(b => !b.isDraft);
        const hasRealBlocks = allBlocks.some(b => b.role !== 'section');
        const showHints = !aiMode || !hasRealBlocks;

        allBlocks.forEach(b => {
            inferRoleFromTitle(b);
            if (b.role === 'anchor') {
                b.side = 'left';
            }
        });

        const nextStep = this.getNextActiveRole(allBlocks);

        const nonAnchorBlocks = allBlocks.filter(b => b.role !== 'anchor');
        const anchorBlocks = allBlocks.filter(b => b.role === 'anchor');

        container.innerHTML = '';
        let dividerIdx = 0;

        // 1. Render all non-anchor blocks
        nonAnchorBlocks.forEach((block) => {
            container.appendChild(this.createDivider(dividerIdx++));
            const el = BlockNormalBuilder.build(block, () => this.renderAll());
            container.appendChild(el);
        });

        // 2. Render next dialectics hint if active and not anchor (e.g. step1..step5 hint grows above anchor)
        if (showHints && !noDialectics && nextStep && nextStep.role !== 'anchor') {
            container.appendChild(this.createDivider(dividerIdx++));
            const hintEl = BlockHintBuilder.build(nextStep.role, nextStep.side, () => this.renderAll());
            container.appendChild(hintEl);
        }

        // 3. Render anchor blocks at the bottom, left
        anchorBlocks.forEach((block) => {
            container.appendChild(this.createDivider(dividerIdx++));
            const el = BlockNormalBuilder.build(block, () => this.renderAll());
            container.appendChild(el);
        });

        // 4. If next step is anchor (note is empty / no anchor yet)
        if (showHints && !noDialectics && nextStep && nextStep.role === 'anchor') {
            container.appendChild(this.createDivider(dividerIdx++));
            const hintEl = BlockHintBuilder.build(nextStep.role, nextStep.side, () => this.renderAll());
            container.appendChild(hintEl);
        }

        // Divider after the last block
        container.appendChild(this.createDivider(dividerIdx));
    }

    static createDivider(index) {
        const div = document.createElement('div');
        div.className = 'block-divider';
        div.dataset.index = index;
        div.innerHTML = `
            <div class="add-block-actions">
                <button class="icon-add-btn left" title="${t('add_thesis')}">+</button>
                <button class="icon-add-btn center" title="${t('add_synthesis')}">+</button>
                <div class="right-actions">
                    <button class="icon-add-btn right" title="${t('add_antithesis')}">+</button>
                    <button class="section-add-btn" title="${t('add_section')}">📄 ${t('section_word')}</button>
                </div>
            </div>
        `;
        return div;
    }
}

export default BlockDOMRenderer;
