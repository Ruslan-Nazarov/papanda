import AppState from './AppState.js';
import { t } from '../i18n.js';

class BlockTableControls {
    static nextId = 0;
    static refreshers = new WeakMap();

    static update(container, block) {
        this.refreshers.get(container)?.(block);
    }

    static mount(container, block) {
        if (!container || container.closest('.tiptap, [contenteditable="true"]')) return;
        const tables = [...container.querySelectorAll('table')].filter(table =>
            !table.closest('.table-fold, .katex, .tiptap, [contenteditable="true"], pre, code')
            && !table.parentElement.closest('table'));
        if (!tables.length) return;

        const note = AppState.currentNote;
        const saved = new Set(Array.isArray(block.collapsed_tables) ? block.collapsed_tables : []);
        const occurrences = new Map();
        const entries = [];
        let allButton;
        const refresh = () => {
            for (const entry of entries) {
                entry.body.hidden = entry.collapsed;
                entry.button.setAttribute('aria-expanded', String(!entry.collapsed));
                entry.action.textContent = t(entry.collapsed ? 'table_expand' : 'table_collapse');
            }
            if (allButton) allButton.textContent = t(entries.every(entry => entry.collapsed)
                ? 'tables_expand_all' : 'tables_collapse_all');
        };
        const persist = () => {
            AppState.updateBlock(block.id, {collapsed_tables: entries.filter(entry => entry.collapsed).map(entry => entry.key)});
            refresh();
        };
        const isCurrent = () => note === AppState.currentNote && !!AppState.getBlock(block.id);

        tables.forEach((table, index) => {
            // Content identity keeps a fold attached to its table after insertions
            // or reordering. An edited table opens so its new values are visible.
            const source = table.outerHTML;
            let hash = 2166136261;
            for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
            const identity = `${(hash >>> 0).toString(36)}-${source.length}`;
            const occurrence = (occurrences.get(identity) || 0) + 1;
            occurrences.set(identity, occurrence);
            const key = `${identity}-${occurrence}`;

            const fold = document.createElement('div');
            fold.className = 'table-fold';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'table-fold-toggle';
            button.addEventListener('dblclick', event => event.stopPropagation());
            const caret = document.createElement('span');
            caret.className = 'table-fold-caret';
            caret.setAttribute('aria-hidden', 'true');
            const label = document.createElement('span');
            label.className = 'table-fold-label';
            label.textContent = t('table_number').replace('{n}', String(index + 1));
            const dimensions = document.createElement('span');
            dimensions.className = 'table-fold-size';
            const rows = [...table.rows];
            const dataRows = rows.filter(row => row.parentElement.tagName !== 'THEAD'
                && [...row.cells].some(cell => cell.tagName === 'TD')).length;
            const columns = Math.max(0, ...rows.map(row => [...row.cells].reduce((sum, cell) => sum + cell.colSpan, 0)));
            dimensions.textContent = t('table_dimensions').replace('{rows}', String(dataRows)).replace('{columns}', String(columns));
            const action = document.createElement('span');
            action.className = 'table-fold-action';
            button.append(caret, label, dimensions, action);
            const body = document.createElement('div');
            body.className = 'table-fold-body';
            body.id = `table-fold-body-${++this.nextId}`;
            button.setAttribute('aria-controls', body.id);
            table.before(fold);
            fold.append(button, body);
            body.append(table);
            const entry = {key, button, body, action, collapsed: saved.has(key)};
            entries.push(entry);
            button.addEventListener('click', event => {
                event.stopPropagation();
                if (!isCurrent()) return;
                entry.collapsed = !entry.collapsed;
                persist();
            });
        });
        if (entries.length > 1) {
            allButton = document.createElement('button');
            allButton.type = 'button';
            allButton.className = 'table-fold-all';
            allButton.addEventListener('dblclick', event => event.stopPropagation());
            allButton.addEventListener('click', event => {
                event.stopPropagation();
                if (!isCurrent()) return;
                const collapsed = !entries.every(entry => entry.collapsed);
                entries.forEach(entry => { entry.collapsed = collapsed; });
                persist();
            });
            container.prepend(allButton);
        }
        this.refreshers.set(container, current => {
            const collapsed = new Set(current.collapsed_tables || []);
            entries.forEach(entry => {entry.collapsed = collapsed.has(entry.key);});
            refresh();
        });
        refresh();
    }
}

export default BlockTableControls;
