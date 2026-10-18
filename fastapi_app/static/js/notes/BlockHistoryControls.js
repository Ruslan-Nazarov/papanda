import AppState from './AppState.js';
import { t } from '../i18n.js';
import { showToast } from './ToastService.js';

class BlockHistoryControls {
    static documents = new WeakSet();

    static refresh(root) {
        root.querySelectorAll('.block-version-controls').forEach(group => {
            const state = AppState.blockHistory?.(group.dataset.blockId) || {undo: 0, redo: 0, position: 1, total: 1};
            group.querySelector('.btn-block-undo').disabled = !state.undo;
            group.querySelector('.btn-block-redo').disabled = !state.redo;
            group.querySelector('output').textContent = `${state.position} / ${state.total}`;
        });
    }

    static mount(blockEl, blockId, render) {
        const edit = blockEl.querySelector('.btn-edit');
        if (!edit) return;
        const group = document.createElement('span');
        group.className = 'block-version-controls';
        group.dataset.blockId = blockId;
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', t('block_history_title'));
        group.title = t('block_history_hint');
        const note = AppState.currentNote;
        for (const [direction, icon] of [['undo', 'ph-arrow-u-up-left'], ['redo', 'ph-arrow-u-up-right']]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `block-action-btn btn-block-${direction}`;
            button.title = t(`block_history_${direction}`);
            button.setAttribute('aria-label', button.title);
            button.innerHTML = `<i class="ph ${icon}" aria-hidden="true"></i>`;
            button.addEventListener('click', event => {
                event.stopPropagation();
                if (note !== AppState.currentNote) return;
                if (document.querySelector('.modal-editor-floating, .editor-dock')) {
                    showToast(t('block_history_close_editor'));
                    return;
                }
                if (!AppState.restoreBlockVersion(blockId, direction)) return;
                render?.();
                const replacement = [...document.querySelectorAll('.block-version-controls')]
                    .find(control => control.dataset.blockId === blockId);
                const active = replacement?.querySelector(`.btn-block-${direction}:not(:disabled)`)
                    || replacement?.querySelector('button:not(:disabled)');
                active?.focus({preventScroll: true});
            });
            group.append(button);
            if (direction === 'undo') {
                const counter = document.createElement('output');
                counter.setAttribute('aria-label', t('block_history_version'));
                counter.setAttribute('aria-live', 'polite');
                group.append(counter);
            }
        }
        edit.after(group);
        this.refresh(blockEl);
        if (!this.documents.has(document)) {
            this.documents.add(document);
            document.addEventListener('stateDirty', () => this.refresh(document));
            document.addEventListener('noteOpened', () => this.refresh(document));
        }
    }
}

export default BlockHistoryControls;
