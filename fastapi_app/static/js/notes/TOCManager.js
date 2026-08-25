import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';

class TOCManager {
    static init() {
        const btn = document.getElementById('btn-toc');
        const menu = document.getElementById('toc-dropdown-menu');

        if (btn && menu) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = menu.classList.contains('hidden');
                document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
                if (isHidden) {
                    this.render();
                    menu.classList.remove('hidden');
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#btn-toc') && !e.target.closest('#toc-dropdown-menu')) {
                    menu.classList.add('hidden');
                }
            });
        }
    }

    static render() {
        const menu = document.getElementById('toc-dropdown-menu');
        if (!menu) return;

        const blocks = AppState.currentNote.blocks || [];

        let itemsHTML = '';
        if (blocks.length === 0) {
            itemsHTML = `<div style="color: #94a3b8; font-style: italic; padding: 12px 16px; font-size: 0.9rem;">Нет блоков в конспекте.</div>`;
        } else {
            itemsHTML = blocks.map((b, idx) => `
                <div class="toc-item" data-id="${b.id}" data-idx="${idx}" draggable="true" style="display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; font-size: 0.93rem; color: #1e293b;">
                    <span class="toc-drag-handle" style="color: #94a3b8; font-size: 1.1rem; cursor: grab; user-select: none; line-height: 1;">⠿</span>
                    <span class="toc-marker" style="color: #a855f7; font-size: 0.75rem; line-height: 1;">▪</span>
                    <span class="toc-title" style="flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(b.title || 'Что вам нужно понять?')}</span>
                </div>
            `).join('');
        }

        menu.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px 8px 16px; border-bottom: 1px solid #f8fafc;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.05rem; color: #1e293b;">
                    <span style="font-size: 1.15rem;">📋</span>
                    <span>Оглавление</span>
                </div>
                <button class="btn-close-toc" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 2px 6px; border-radius: 4px; line-height: 1;">✕</button>
            </div>
            <div class="toc-items-list" style="padding: 6px 8px 10px 8px; display: flex; flex-direction: column; gap: 2px; max-height: 360px; overflow-y: auto;">
                ${itemsHTML}
            </div>
        `;

        // Close button
        menu.querySelector('.btn-close-toc')?.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.add('hidden');
        });

        // Item click and hover
        const items = menu.querySelectorAll('.toc-item');
        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.background = '#f1f5f9';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });

            item.addEventListener('click', (e) => {
                if (e.target.closest('.toc-drag-handle')) return;
                const blockId = item.dataset.id;
                const targetEl = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetEl.style.transition = 'box-shadow 0.3s ease, transform 0.2s ease';
                    targetEl.style.boxShadow = '0 0 0 3px #ea580c, 0 10px 25px rgba(234, 88, 12, 0.2)';
                    targetEl.style.transform = 'scale(1.01)';
                    setTimeout(() => {
                        targetEl.style.boxShadow = '';
                        targetEl.style.transform = '';
                    }, 1800);
                }
            });

            // Drag and drop within TOC to reorder blocks
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.idx);
                item.style.opacity = '0.4';
            });

            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
                items.forEach(i => i.style.borderTop = '');
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                item.style.borderTop = '2px solid #ea580c';
            });

            item.addEventListener('dragleave', () => {
                item.style.borderTop = '';
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.style.borderTop = '';
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                const toIdx = parseInt(item.dataset.idx, 10);

                if (!isNaN(fromIdx) && !isNaN(toIdx) && fromIdx !== toIdx) {
                    const movedBlock = AppState.currentNote.blocks.splice(fromIdx, 1)[0];
                    AppState.currentNote.blocks.splice(toIdx, 0, movedBlock);
                    AppState.markDirty();
                    BlockDOMRenderer.renderAll();
                    this.render();
                }
            });
        });
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default TOCManager;
