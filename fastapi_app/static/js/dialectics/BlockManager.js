/**
 * BlockManager.js - Управление блоками на холсте Диалектики
 */
import { customConfirm } from '../modal_controller.js';

export const BlockManager = {
    render(container, blocks, callbacks) {
        if (!container) return;
        const divider = document.getElementById('canvasDivider');
        container.innerHTML = '';
        if (divider) container.appendChild(divider);

        const createInsertRow = (targetIndex) => {
            const zone = document.createElement('div');
            zone.className = `block-insert-row`;
            
            ['left', 'right', 'center'].forEach(side => {
                const wrap = document.createElement('div');
                wrap.className = `insert-wrap insert-wrap--${side}`;
                const isCenter = side === 'center';
                wrap.innerHTML = `<button class="btn-insert-block ${isCenter ? 'btn-insert-square' : 'btn-insert-round'}" title="${isCenter ? 'Добавить обобщение' : 'Добавить блок'}">+</button>`;
                wrap.querySelector('button').onclick = (e) => {
                    e.stopPropagation();
                    callbacks.onInsertAfter(side, targetIndex - 1);
                };
                zone.appendChild(wrap);
            });
            
            return zone;
        };

        if (callbacks.onInsertAfter) {
            container.appendChild(createInsertRow(0));
        }

        blocks.forEach((b, index) => {
            const el = document.createElement('div');
            el.className = `dialectics-block block-${b.side}`;
            el.innerHTML = `
                <div class="block-actions">
                    <button class="btn-block-edit">✎ Edit</button>
                    <button class="btn-block-del">× Delete</button>
                </div>
                <div class="dialectics-content-inner">${b.html}</div>
            `;
            el.querySelector('.btn-block-edit').onclick = (e) => {
                e.stopPropagation();
                callbacks.onEdit(el);
            };
            el.querySelector('.btn-block-del').onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await customConfirm({
                    title: 'Удалить блок',
                    message: 'Вы уверены, что хотите удалить этот блок?',
                    icon: '🗑️',
                    buttons: [
                        { label: 'Отмена', value: false, class: 'confirm-btn-secondary' },
                        { label: 'Удалить', value: true, class: 'confirm-btn-danger' }
                    ]
                });
                if (confirmed) {
                    const nextEl = el.nextElementSibling;
                    if (nextEl && nextEl.classList.contains('block-insert-row')) {
                        nextEl.remove();
                    }
                    el.remove();
                    if (callbacks.onDelete) callbacks.onDelete();
                }
            };
            container.appendChild(el);

            if (callbacks.onInsertAfter) {
                container.appendChild(createInsertRow(index + 1));
            }
        });
    },

    getBlocks(container) {
        if (!container) return [];
        const blocks = [];
        container.querySelectorAll('.dialectics-block').forEach(b => {
            const inner = b.querySelector('.dialectics-content-inner');
            if (inner) {
                blocks.push({
                    side: b.classList.contains('block-left') ? 'left' : 
                          b.classList.contains('block-center') ? 'center' : 'right',
                    html: inner.innerHTML
                });
            }
        });
        return blocks;
    },

    getLastSide(container) {
        if (!container) return null;
        const blocks = container.querySelectorAll('.dialectics-block');
        if (blocks.length === 0) return null;
        return blocks[blocks.length - 1].classList.contains('block-left') ? 'left' : 'right';
    }
};
