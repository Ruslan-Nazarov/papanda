/**
 * BlockManager.js - Управление блоками на холсте Диалектики
 */
export const BlockManager = {
    render(container, blocks, callbacks) {
        if (!container) return;
        const divider = document.getElementById('canvasDivider');
        container.innerHTML = '';
        if (divider) container.appendChild(divider);

        blocks.forEach(b => {
            const el = document.createElement('div');
            el.className = `dialectics-block block-${b.side}`;
            el.innerHTML = `
                <div class="dialectics-content-inner">${b.html}</div>
                <div class="block-actions">
                    <button class="btn-block-edit">✎</button>
                    <button class="btn-block-del">×</button>
                </div>
            `;
            el.querySelector('.btn-block-edit').onclick = (e) => {
                e.stopPropagation();
                callbacks.onEdit(el);
            };
            el.querySelector('.btn-block-del').onclick = (e) => {
                e.stopPropagation();
                if (confirm("Удалить блок?")) el.remove();
            };
            container.appendChild(el);
        });
    },

    getBlocks(container) {
        if (!container) return [];
        const blocks = [];
        container.querySelectorAll('.dialectics-block').forEach(b => {
            const inner = b.querySelector('.dialectics-content-inner');
            if (inner) {
                blocks.push({
                    side: b.classList.contains('block-left') ? 'left' : 'right',
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
