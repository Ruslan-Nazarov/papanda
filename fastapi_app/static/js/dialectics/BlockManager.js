/**
 * BlockManager.js - Управление блоками на холсте Диалектики
 */
import { customConfirm } from '../modal_controller.js';
import katex from 'katex';

export const BlockManager = {
    renderMath(element) {
        const mathNodes = element.querySelectorAll('span[data-type="mathNode"]');
        mathNodes.forEach(node => {
            const latex = node.getAttribute('latex');
            if (latex) {
                try {
                    katex.render(latex, node, { throwOnError: false });
                } catch(e) {
                    node.textContent = latex;
                    node.style.color = 'red';
                }
            }
        });
    },

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
                wrap.innerHTML = `<button class="btn-insert-block ${isCenter ? 'btn-insert-square' : 'btn-insert-round'}" title="${isCenter ? 'Add summary' : 'Add block'}">+</button>`;
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
            if (!b.id) b.id = 'block_' + Math.random().toString(36).substring(2, 9);
            const el = document.createElement('div');
            el.className = `dialectics-block block-${b.side || 'left'}`;
            el.dataset.blockId = b.id;
            el.innerHTML = `
                <div class="dialectics-block-actions">
                    <button class="btn-block-edit" title="Edit">✎</button>
                    <button class="btn-block-ai" title="Ask AI">✨</button>
                    <button class="btn-block-sticker" title="Stickers" style="display: flex; align-items: center; justify-content: center;"><div class="sticker-icon-mini" style="transform: scale(0.65); margin: 0;"></div></button>
                    <button class="btn-block-del" title="Delete">🗑️</button>
                </div>
                <div class="dialectics-content-inner">${b.html}</div>
            `;
            
            this.renderMath(el);

            el.querySelector('.btn-block-ai').onclick = (e) => {
                e.stopPropagation();
                if (callbacks.onAI) callbacks.onAI(el);
            };
            el.querySelector('.btn-block-edit').onclick = (e) => {
                e.stopPropagation();
                callbacks.onEdit(el);
            };
            el.querySelector('.btn-block-sticker').onclick = (e) => {
                e.stopPropagation();
                if(window.app && window.app.state.currentNoteId) {
                    window.openParentStickers('dialectics', window.app.state.currentNoteId, b.id);
                } else {
                    if(window.showToast) window.showToast('Save the note first', 'error');
                }
            };
            el.querySelector('.btn-block-del').onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await customConfirm({
                    title: 'Delete block',
                    message: 'Are you sure you want to delete this block?',
                    icon: '🗑️',
                    buttons: [
                        { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                        { label: 'Delete', value: true, class: 'confirm-btn-danger' }
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
            
            // Математика удалена

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
                    id: b.dataset.blockId || ('block_' + Math.random().toString(36).substring(2, 9)),
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
