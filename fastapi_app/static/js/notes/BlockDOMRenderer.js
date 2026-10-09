import AppState from './AppState.js';
import BlockNormalBuilder from './BlockNormalBuilder.js';
import BlockHintBuilder from './BlockHintBuilder.js';
import RequestDocuments from './RequestDocuments.js';
import { ALGORITHM_STEPS, inferRoleFromTitle } from './BlockConstants.js';
import { t } from '../i18n.js';

class BlockDOMRenderer {
    /**
     * Compute which hint to show next based on saved content in the note.
     * Steps are sequentially evaluated: anchor -> step1 -> step2 -> step3 -> step4 -> step5.
     */
    static getNextActiveRole(blocks) {
        const pendingAnchor = BlockHintBuilder.pendingAnchor();
        // Saved proposals occupy their step even before the author marks them ready.
        // Unsaved editor drafts and empty blocks still need a hint.
        const completedBlocks = (blocks || []).filter(b => b.id !== pendingAnchor?.id
            && b.role !== 'section' && !b.isDraft
            && (b.html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
        
        // Роли вида "step1.2" (несколько простейших/развивающих процессов на
        // одном шаге, см. expected_step_keys на бэкенде) считаются частью
        // базового шага "step1" — иначе подсказка для уже заполненного шага
        // продолжала бы показываться.
        const existingRoles = new Set();
        completedBlocks.forEach((b) => {
            const role = inferRoleFromTitle(b);
            if (role) existingRoles.add(role.split('.')[0]);
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
        const storedBlocks = AppState.currentNote.blocks || [];
        const allBlocks = storedBlocks.filter(b => !b.isDraft);
        const pendingAnchor = BlockHintBuilder.pendingAnchor();
        const hasRealBlocks = allBlocks.some(b => b.role !== 'section' && b.id !== pendingAnchor?.id);
        const showHints = !aiMode || !hasRealBlocks;

        const nextStep = this.getNextActiveRole(allBlocks);

        const nonAnchorBlocks = allBlocks.filter(b => b.role !== 'anchor');
        const anchorBlocks = allBlocks.filter(b => b.role === 'anchor' && b.id !== pendingAnchor?.id);

        container.innerHTML = '';
        // 1. Render all non-anchor blocks
        nonAnchorBlocks.forEach((block) => {
            // Anchor blocks are displayed last, even when stored earlier. Divider
            // indices must refer to the stored array used by NoteStore.addBlock.
            const storedIndex = storedBlocks.findIndex(item => item.id === block.id);
            container.appendChild(this.createDivider(storedIndex));
            const el = BlockNormalBuilder.build(block, () => this.renderAll());
            container.appendChild(el);
        });

        // 2. Render next dialectics hint if active and not anchor (e.g. step1..step5 hint grows above anchor)
        if (showHints && !noDialectics && nextStep && nextStep.role !== 'anchor') {
            container.appendChild(this.createDivider(storedBlocks.length));
            const hintEl = BlockHintBuilder.build(nextStep.role, nextStep.side, () => this.renderAll());
            container.appendChild(hintEl);
        }

        // 3. Render anchor blocks at the bottom, left
        anchorBlocks.forEach((block) => {
            container.appendChild(this.createDivider(storedBlocks.length));
            const el = BlockNormalBuilder.build(block, () => this.renderAll());
            container.appendChild(el);
        });

        // 4. If next step is anchor (note is empty / no anchor yet)
        if (showHints && !noDialectics && nextStep && nextStep.role === 'anchor') {
            container.appendChild(this.createDivider(storedBlocks.length));
            const hintEl = BlockHintBuilder.build(nextStep.role, nextStep.side, () => this.renderAll());
            container.appendChild(hintEl);
        }

        // Divider after the last block
        container.appendChild(this.createDivider(storedBlocks.length));
        RequestDocuments.mount(container);
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
