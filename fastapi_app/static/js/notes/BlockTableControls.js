import AppState from './AppState.js';
import { t } from '../i18n.js';

class BlockTableControls {
    static nextId = 0;
    static refreshers = new WeakMap();
    static active = null;

    static open(table, trigger, label, dimensions) {
        this.active?.close();
        const dialog = document.createElement('dialog');
        dialog.className = 'table-view-dialog';
        const header = document.createElement('div');
        header.className = 'table-view-header';
        const heading = document.createElement('div');
        const title = document.createElement('h2');
        title.id = `table-view-title-${++this.nextId}`;
        title.textContent = label;
        dialog.setAttribute('aria-labelledby', title.id);
        const size = document.createElement('span');
        size.className = 'table-fold-size';
        size.textContent = dimensions;
        heading.append(title, size);
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'table-view-close';
        close.textContent = '×';
        close.setAttribute('aria-label', t('close'));
        close.autofocus = true;
        header.append(heading, close);
        const viewport = document.createElement('div');
        viewport.className = 'table-view-viewport';
        viewport.tabIndex = 0;
        viewport.setAttribute('role', 'region');
        viewport.setAttribute('aria-label', label);
        const copy = table.cloneNode(true);
        // This is a read-only snapshot; cloned formula controls have no handlers.
        copy.querySelectorAll('button').forEach(button => button.remove());
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        viewport.append(copy);
        dialog.append(header, viewport);
        document.body.append(dialog);
        const dismiss = () => dialog.close();
        close.addEventListener('click', dismiss);
        let backdropDown = false;
        dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog; });
        dialog.addEventListener('click', event => {
            if (backdropDown && event.target === dialog) dismiss();
        });
        const observer = new MutationObserver(() => { if (!trigger.isConnected) dismiss(); });
        observer.observe(document.body, {childList: true, subtree: true});
        document.addEventListener('noteOpened', dismiss);
        document.addEventListener('stateDirty', dismiss);
        dialog.addEventListener('close', () => {
            observer.disconnect();
            document.removeEventListener('noteOpened', dismiss);
            document.removeEventListener('stateDirty', dismiss);
            dialog.remove();
            if (this.active === dialog) this.active = null;
            if (trigger.isConnected) trigger.focus({preventScroll: true});
        }, {once: true});
        this.active = dialog;
        dialog.showModal();
    }

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
            if (allButton) {
                const collapsed = entries.every(entry => entry.collapsed);
                allButton.title = t(collapsed ? 'tables_expand_all' : 'tables_collapse_all');
                allButton.setAttribute('aria-label', allButton.title);
                allButton.setAttribute('aria-pressed', String(collapsed));
            }
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
            const header = document.createElement('div');
            header.className = 'table-fold-header';
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
            const popup = document.createElement('button');
            popup.type = 'button';
            popup.className = 'table-view-open';
            popup.title = t('table_open_popup');
            popup.setAttribute('aria-label', `${t('table_open_popup')}: ${label.textContent}`);
            popup.setAttribute('aria-haspopup', 'dialog');
            popup.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/></svg>';
            popup.addEventListener('dblclick', event => event.stopPropagation());
            popup.addEventListener('click', event => {
                event.stopPropagation();
                if (isCurrent()) this.open(table, popup, label.textContent, dimensions.textContent);
            });
            const body = document.createElement('div');
            body.className = 'table-fold-body';
            body.id = `table-fold-body-${++this.nextId}`;
            button.setAttribute('aria-controls', body.id);
            table.before(fold);
            header.append(button, popup);
            fold.append(header, body);
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
        const toolbar = container.closest('.dialectics-block')?.querySelector('.block-fold-controls');
        if (entries.length > 1 && toolbar) {
            allButton = document.createElement('button');
            allButton.type = 'button';
            allButton.className = 'block-action-btn block-fold-all table-fold-all';
            const icon = document.createElement('i');
            icon.className = 'ph ph-table';
            icon.setAttribute('aria-hidden', 'true');
            allButton.append(icon);
            allButton.addEventListener('dblclick', event => event.stopPropagation());
            allButton.addEventListener('click', event => {
                event.stopPropagation();
                if (!isCurrent()) return;
                const collapsed = !entries.every(entry => entry.collapsed);
                entries.forEach(entry => { entry.collapsed = collapsed; });
                persist();
            });
            toolbar.append(allButton);
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
