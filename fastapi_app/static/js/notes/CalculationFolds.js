import AppState from './AppState.js';
import { t } from '../i18n.js';

const FOLD_EXCLUDED = '.tiptap, [contenteditable="true"], pre, code, .hp-content, .hidden-phrase-tooltip, .math-symbol-tooltip, .formula-modal-backdrop, .formula-zoom-dialog';
// The current Transformer note has short calculations of 2–5 rows and long
// worked calculations of 6–18 rows. Count outer equation rows, not matrix cells.
const MIN_ROWS = 6;

class CalculationFolds {
    static nextId = 0;
    static controls = new WeakMap();

    static rowCount(element) {
        return Math.max(0, ...[...element.querySelectorAll('math mtable')]
            .filter(table => !table.parentElement.closest('mtable'))
            .map(table => {
                const relations = [...table.querySelectorAll('mo')].filter(operator =>
                    operator.closest('mtable') === table && /^[=≈≃≅]$/u.test(operator.textContent));
                if (relations.length < 2) return 0;
                return [...table.children].filter(row => row.localName === 'mtr' && row.textContent.trim()).length;
            }));
    }

    static update(container, block) {
        const controls = this.controls.get(container);
        if (!controls) return;
        const saved = new Set(Array.isArray(block.collapsed_calculations) ? block.collapsed_calculations : []);
        controls.entries.forEach(entry => { entry.collapsed = saved.has(entry.key); });
        controls.refresh();
    }

    static decorate(root) {
        const containers = [...root.querySelectorAll('.block-content, .blk-body')];
        if (root.matches?.('.block-content, .blk-body')) containers.push(root);
        containers.forEach(container => this.mount(container));
    }

    static mount(container) {
        if (container.closest(FOLD_EXCLUDED)) return;
        let controls = this.controls.get(container);
        if (!controls) {
            const blockId = container.closest('.dialectics-block')?.dataset.id;
            const note = AppState.currentNote;
            const block = blockId && AppState.getBlock(blockId);
            const sourceHtml = block?.html;
            const saved = new Set(Array.isArray(block?.collapsed_calculations) ? block.collapsed_calculations : []);
            controls = {entries: [], allButton: null, saved};
            const isCurrent = () => !blockId || (note === AppState.currentNote
                && AppState.getBlock(blockId)?.html === sourceHtml);
            controls.refresh = () => {
                for (const entry of controls.entries) {
                    entry.body.hidden = entry.collapsed;
                    entry.button.setAttribute('aria-expanded', String(!entry.collapsed));
                    entry.action.textContent = t(entry.collapsed ? 'calculation_unfold' : 'calculation_fold');
                }
                if (controls.allButton) {
                    const collapsed = controls.entries.every(entry => entry.collapsed);
                    const button = controls.allButton;
                    button.title = t(collapsed ? 'calculations_unfold_all' : 'calculations_fold_all');
                    button.setAttribute('aria-label', button.title);
                    button.setAttribute('aria-pressed', String(collapsed));
                    if (!button.classList.contains('block-action-btn')) button.textContent = button.title;
                }
            };
            controls.persist = () => {
                if (block) {
                    AppState.updateBlock(blockId, {collapsed_calculations: controls.entries
                        .filter(entry => entry.collapsed).map(entry => entry.key)});
                }
                controls.refresh();
            };
            controls.isCurrent = isCurrent;
            this.controls.set(container, controls);
        }
        const occurrences = new Map();
        container.querySelectorAll('.math-expandable').forEach(host => {
            if (host.closest(FOLD_EXCLUDED)) return;
            const element = host.querySelector('.katex');
            if (!element) return;
            const rows = this.rowCount(element);
            if (rows < MIN_ROWS) return;
            const source = element.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
            if (!source) return;
            let hash = 2166136261;
            for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
            const identity = `${(hash >>> 0).toString(36)}-${source.length}`;
            const occurrence = (occurrences.get(identity) || 0) + 1;
            occurrences.set(identity, occurrence);
            const key = `${identity}-${occurrence}`;
            if (host.closest('.calculation-fold')) return;

            const fold = document.createElement('span');
            fold.className = 'calculation-fold';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'calculation-fold-toggle';
            button.addEventListener('dblclick', event => event.stopPropagation());
            const caret = document.createElement('span');
            caret.className = 'calculation-fold-caret';
            caret.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span');
            label.className = 'calculation-fold-label';
            label.textContent = t('calculation_fold_label');
            const size = document.createElement('span');
            size.className = 'calculation-fold-size';
            size.textContent = t('calculation_fold_rows').replace('{n}', String(rows));
            const action = document.createElement('span');
            action.className = 'calculation-fold-action';
            button.append(caret, label, size, action);
            const body = document.createElement('span');
            body.className = 'calculation-fold-body';
            body.id = `calculation-fold-body-${++this.nextId}`;
            button.setAttribute('aria-controls', body.id);
            host.before(fold);
            fold.append(button, body);
            body.append(host);
            const entry = {key, button, body, action, collapsed: controls.saved.has(key)};
            controls.entries.push(entry);
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                if (!controls.isCurrent()) return;
                entry.collapsed = !entry.collapsed;
                controls.persist();
            });
        });
        if (controls.entries.length > 1 && !controls.allButton) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'calculation-fold-all';
            const toolbar = container.closest('.dialectics-block')?.querySelector('.block-fold-controls');
            if (toolbar) {
                button.classList.add('block-action-btn', 'block-fold-all');
                const icon = document.createElement('i');
                icon.className = 'ph ph-calculator';
                icon.setAttribute('aria-hidden', 'true');
                button.append(icon);
            }
            button.addEventListener('dblclick', event => event.stopPropagation());
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                if (!controls.isCurrent()) return;
                const collapsed = !controls.entries.every(entry => entry.collapsed);
                controls.entries.forEach(entry => { entry.collapsed = collapsed; });
                controls.persist();
            });
            controls.allButton = button;
            if (toolbar) toolbar.append(button);
            else container.prepend(button);
        }
        controls.refresh();
    }
}

export default CalculationFolds;
