import AppState from './AppState.js';
import BlockNormalBuilder from './BlockNormalBuilder.js';
import BlockHintBuilder from './BlockHintBuilder.js';
import RequestDocuments from './RequestDocuments.js';
import PinnedDerivations from './PinnedDerivations.js';
import MathSubstitutions from './MathSubstitutions.js';
import { ALGORITHM_STEPS, inferRoleFromTitle } from './BlockConstants.js';
import { t } from '../i18n.js';

// These fields can change the card's controls without changing its body.
const PRESENTATION_FIELDS = ['title', 'status', 'side', 'is_pinned', 'collapsed', 'author', 'border_color'];

class BlockDOMRenderer {
    static renderedBlocks = new WeakMap();
    static renderedHints = new WeakMap();

    /**
     * Compute which hint to show next based on saved content in the note.
     * Steps are sequentially evaluated: anchor -> step1 -> step2 -> step3 -> step4 -> step5.
     */
    static getNextActiveRole(blocks) {
        const pendingAnchor = BlockHintBuilder.pendingAnchor();
        // Saved proposals occupy their step even before the author marks them ready.
        // An archived proposal also keeps its step while the author rewrites it;
        // only a new empty block without history still needs the same hint.
        const completedBlocks = (blocks || []).filter(b => b.id !== pendingAnchor?.id
            && b.role !== 'section' && !b.isDraft
            && ((b.html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
                || b.rejected_drafts?.length));
        
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

        for (const step of ALGORITHM_STEPS) {
            if (!existingRoles.has(step.role)) {
                if (dismissedHints.includes(step.role)) {
                    continue;
                }
                return step;
            }
        }
        return null;
    }

    /**
     * Reconcile the canvas, retaining unchanged cards and their rendered math.
     * Renders all other blocks sequentially, followed by upcoming hints,
     * and keeps the "Что вам нужно понять" (anchor) block at the very bottom on the left.
     */
    static renderAll({reuseUnchanged = true} = {}) {
        const container = document.getElementById('blocks-container');
        if (!container) return;
        BlockNormalBuilder.syncReadingState();

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

        // Every caller gets incremental rendering, including drag/drop, mode
        // switches, history, deletion, generation and editor cancellation.
        const existing = new Map([...container.children].filter(el => el.classList.contains('dialectics-block'))
            .map(el => [el.dataset.id, el]));
        const oldCards = [...existing.values()];
        const dividers = [...container.children].filter(el => el.classList.contains('block-divider'));
        let dividerIndex = 0;
        const divider = index => {
            const el = dividers[dividerIndex++] || this.createDivider(index);
            if (el.dataset.index !== String(index)) el.dataset.index = String(index);
            return el;
        };
        const build = block => {
            const previous = existing.get(block.id);
            const snapshot = this.renderedBlocks.get(previous);
            // Only inputs used to build the body/toolbar structure belong here.
            // Definitions, attachments and server-added defaults must not rebuild math.
            const data = JSON.stringify([block.role || null, block.html || '', block.tags || '',
                !!block.anchorResolved, block.rejected_drafts?.length || 0]);
            const presentation = JSON.stringify([...PRESENTATION_FIELDS.map(key => block[key]),
                block.collapsed_tables || [], block.collapsed_calculations || [], block.sources?.length || 0, block.stickers?.length || 0,
                AppState.currentNote.dictionary?.length || 0]);
            if (reuseUnchanged && snapshot?.epoch === AppState.documentEpoch && snapshot.data === data) {
                if (snapshot.presentation !== presentation) {
                    BlockNormalBuilder.updatePresentation(previous, block);
                    snapshot.presentation = presentation;
                }
                return previous;
            }
            const el = BlockNormalBuilder.build(block, () => this.renderAll());
            this.renderedBlocks.set(el, {epoch: AppState.documentEpoch, data, presentation});
            return el;
        };
        const buildHint = step => {
            const previous = container.querySelector('.dialectics-hint-block');
            const key = `${step.role}:${step.side}:${AppState.mode}`;
            const snapshot = this.renderedHints.get(previous);
            if (reuseUnchanged && snapshot?.epoch === AppState.documentEpoch && snapshot.key === key) return previous;
            const el = BlockHintBuilder.build(step.role, step.side, () => this.renderAll());
            this.renderedHints.set(el, {epoch: AppState.documentEpoch, key});
            return el;
        };
        const storedIndices = new Map(storedBlocks.map((block, index) => [block.id, index]));
        const children = [];
        // 1. Render all non-anchor blocks
        let sectionNumber = 0;
        nonAnchorBlocks.forEach((block) => {
            // Anchor blocks are displayed last, even when stored earlier. Divider
            // indices must refer to the stored array used by NoteStore.addBlock.
            const storedIndex = storedIndices.get(block.id);
            children.push(divider(storedIndex));
            const el = build(block);
            if (block.role === 'section') {
                const number = el.querySelector('.section-number');
                if (number.textContent !== String(++sectionNumber)) number.textContent = String(sectionNumber);
            }
            children.push(el);
        });

        // 2. Render next dialectics hint if active and not anchor (e.g. step1..step5 hint grows above anchor)
        if (showHints && !noDialectics && nextStep && nextStep.role !== 'anchor') {
            children.push(divider(storedBlocks.length), buildHint(nextStep));
        }

        // 3. Render anchor blocks at the bottom, left
        anchorBlocks.forEach((block) => {
            children.push(divider(storedBlocks.length));
            children.push(build(block));
        });

        // 4. If next step is anchor (note is empty / no anchor yet)
        if (showHints && !noDialectics && nextStep && nextStep.role === 'anchor') {
            children.push(divider(storedBlocks.length), buildHint(nextStep));
        }

        // Divider after the last block
        children.push(divider(storedBlocks.length));
        // Leave reused cards connected so selection, focus and reading controls
        // survive saving a different block.
        const retained = new Set(children);
        for (const child of [...container.childNodes]) {
            if (!retained.has(child)) child.remove();
        }
        let cursor = container.firstChild;
        for (const child of children) {
            if (child === cursor) cursor = cursor.nextSibling;
            else container.insertBefore(child, cursor);
        }
        RequestDocuments.mount(container);
        PinnedDerivations.mount(container);
        // Only content changes and card order affect formula dependencies.
        const cards = children.filter(el => el.classList.contains('dialectics-block'));
        if (cards.length !== oldCards.length || cards.some((el, i) => el !== oldCards[i])) MathSubstitutions.scheduleRefresh();
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
                    <button class="section-add-btn" title="${t('add_section')}"><i class="ph ph-file-plus" aria-hidden="true"></i> ${t('section_word')}</button>
                </div>
            </div>
        `;
        return div;
    }
}

export default BlockDOMRenderer;
