import AppState from './AppState.js';
import Lifecycle from './Lifecycle.js';
import DerivationEditor from './DerivationEditor.js';
import { t } from '../i18n.js';

class PinnedDerivations {
    static session = null;
    static frame = null;
    static pairs = new Map();

    static mount(container) {
        this.session?.dispose();
        const session = new Lifecycle();
        this.session = session;
        this.pairs = new Map();
        const overlay = document.createElement('div');
        overlay.className = 'pinned-derivations';
        document.body.appendChild(overlay);
        session.own(() => {
            cancelAnimationFrame(this.frame);
            this.frame = null;
            overlay.remove();
        });
        const schedule = () => {
            if (this.frame !== null || session.disposed) return;
            this.frame = requestAnimationFrame(() => { this.frame = null; this.update(container, overlay); });
        };
        session.on(window, 'scroll', schedule, {passive: true, capture: true});
        session.on(window, 'resize', schedule);
        session.on(document, 'stateDirty', schedule);
        session.on(document, 'noteSaved', schedule);
        session.on(document, 'noteOpened', () => { DerivationEditor.close(); this.pairs.clear(); overlay.replaceChildren(); schedule(); });
        const resize = new ResizeObserver(schedule);
        resize.observe(container);
        for (const el of container.querySelectorAll('.dialectics-block')) resize.observe(el);
        session.own(() => resize.disconnect());
        const mutations = new MutationObserver(schedule);
        mutations.observe(container, {subtree: true, childList: true, attributes: true, characterData: true});
        session.own(() => mutations.disconnect());
        schedule();
    }

    static update(container, overlay) {
        const allElements = [...container.querySelectorAll('.dialectics-block')];
        if (!container.isConnected || window.matchMedia('(max-width: 768px)').matches
            || container.classList.contains('single-column-mode')
            || container.classList.contains('hide-left-column')) {
            for (const el of allElements) {
                if (el.classList.contains('pinned-as-source')) el.classList.remove('pinned-as-source');
                if (el.classList.contains('pinned-inactive')) el.classList.remove('pinned-inactive');
            }
            this.pairs.clear(); overlay.replaceChildren(); return;
        }
        const blocks = new Map((AppState.currentNote.blocks || []).map(block => [block.id, block]));
        const canvas = container.getBoundingClientRect();
        const pinned = allElements.filter(el => el.classList.contains('pinned-sticky')
            && blocks.get(el.dataset.id)?.is_pinned && !blocks.get(el.dataset.id)?.isDraft);
        const stickyTop = el => parseFloat(getComputedStyle(el).top) || 0;
        const viewportTop = Math.max(0, canvas.top);
        const viewportBottom = Math.min(window.innerHeight, canvas.bottom);
        const stuck = pinned.filter(el => {
            const rect = el.getBoundingClientRect();
            const visibleTop = Math.max(viewportTop, stickyTop(el));
            return rect.top <= stickyTop(el) + 1 && rect.bottom > visibleTop
                && viewportBottom > visibleTop;
        });
        // A lower pinned block takes over as the abstract source when it reaches
        // the sticky position. Earlier sources yield that position until scrolling back.
        const source = stuck.at(-1);
        for (const el of allElements) {
            const asSource = el === source && el.classList.contains('block-right');
            const inactive = stuck.includes(el) && el !== source;
            if (el.classList.contains('pinned-as-source') !== asSource)
                el.classList.toggle('pinned-as-source', asSource);
            if (el.classList.contains('pinned-inactive') !== inactive)
                el.classList.toggle('pinned-inactive', inactive);
        }
        const active = new Set();
        if (source) {
            const sourceId = source.dataset.id;
            const rect = source.getBoundingClientRect();
            const top = Math.max(0, stickyTop(source), canvas.top);
            const bottom = viewportBottom;
            const y1 = (Math.max(rect.top, top) + Math.min(rect.bottom, bottom)) / 2;
            const sourceIndex = allElements.indexOf(source);
            const candidates = allElements.slice(sourceIndex + 1)
                .filter(el => el.classList.contains('block-right') && el !== source
                    && blocks.has(el.dataset.id) && !blocks.get(el.dataset.id).isDraft
                    && !el.classList.contains('pinned-inactive'))
                .map(el => ({el, rect: el.getBoundingClientRect()}))
                .filter(({rect: r}) => r.bottom > top && r.top < bottom && r.left - rect.right >= 28);
            if (candidates.length) {
                const center = r => (Math.max(r.top, top) + Math.min(r.bottom, bottom)) / 2;
                candidates.sort((a, b) => Math.abs(center(a.rect) - y1) - Math.abs(center(b.rect) - y1));
                let target = candidates[0];
                let pair = this.pairs.get(sourceId);
                // Keep a target near a tie to avoid flicker during slow scrolling.
                const previous = candidates.find(item => item.el.dataset.id === pair?.targetId);
                if (previous && Math.abs(center(previous.rect) - y1) <= Math.abs(center(target.rect) - y1) + 12) target = previous;
                if (!pair) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    line.setAttribute('aria-hidden', 'true');
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    line.appendChild(path);
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'derivation-dot';
                    overlay.append(line, button);
                    pair = {line, path, button, targetId: target.el.dataset.id};
                    button.addEventListener('click', () => DerivationEditor.open(sourceId, pair.targetId, button));
                    this.pairs.set(sourceId, pair);
                }
                pair.targetId = target.el.dataset.id;
                const y2 = center(target.rect), x1 = rect.right, x2 = target.rect.left;
                pair.path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
                pair.button.style.left = `${(x1 + x2) / 2}px`;
                pair.button.style.top = `${(y1 + y2) / 2}px`;
                pair.button.dataset.sourceId = sourceId;
                pair.button.dataset.targetId = pair.targetId;
                const saved = (blocks.get(pair.targetId).derivations || []).some(item => item.source_id === sourceId);
                pair.button.classList.toggle('has-derivation', saved);
                const label = `${t(saved ? 'derivation_edit' : 'derivation_add')}: ${blocks.get(sourceId).title || ''} → ${blocks.get(pair.targetId).title || ''}`;
                pair.button.title = label;
                pair.button.setAttribute('aria-label', label);
                active.add(sourceId);
            }
        }
        for (const [id, pair] of this.pairs) {
            if (active.has(id)) continue;
            pair.line.remove(); pair.button.remove(); this.pairs.delete(id);
        }
    }
}

export default PinnedDerivations;
