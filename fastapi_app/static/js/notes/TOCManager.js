import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import { inferRoleFromTitle } from './BlockConstants.js';

import { t } from '../i18n.js';
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

        const storedBlocks = (AppState.currentNote.blocks || []).filter(b => !b.isDraft);
        const blocks = [...storedBlocks.filter(b => b.role !== 'anchor'),
            ...storedBlocks.filter(b => b.role === 'anchor')];

        let itemsHTML;
        if (blocks.length === 0) {
            itemsHTML = `<div class="toc-empty">${t('toc_empty')}</div>`;
        } else {
            let sectionNumber = 0;
            itemsHTML = blocks.map((b) => {
                inferRoleFromTitle(b);
                const isSection = b.role === 'section';
                const _t = (b.title || '').toLowerCase();
                const isAnchor = b.role === 'anchor' || _t.includes('что вам надо объяснить') || _t.includes('что вам нужно понять');
                const side = isSection ? 'center' : b.side === 'right' ? 'right' : b.side === 'left' ? 'left' : 'center';
                let icon = side === 'left' ? '←' : side === 'right' ? '→' : '•';
                const titleText = b.title || (isAnchor ? t('hint_anchor_title') : (isSection ? t('section_word') : t('block_word')));
                const displayTitle = isSection ? `${t('section_word')} ${++sectionNumber} · ${titleText}` : titleText;

                if (isSection) {
                    icon = '§';
                } else if (isAnchor) {
                    icon = '⌖';
                }

                return `
                    <div class="toc-item toc-side-${side} ${isSection ? 'toc-section-item' : ''} ${isAnchor ? 'toc-anchor-item' : ''}"
                         data-id="${b.id}" 
                         draggable="true" 
                         data-side="${side}"
                         tabindex="0">
                        <span class="toc-drag-handle ph ph-dots-six-vertical" title="${t('drag_word')}" aria-hidden="true"></span>
                        <span class="toc-marker" aria-hidden="true">${icon}</span>
                        <span class="toc-title">${this.escapeHtml(displayTitle)}</span>
                    </div>
                `;
            }).join('');
        }

        menu.innerHTML = `
            <div class="toc-panel-header">
                <div class="toc-panel-heading">
                    <i class="ph ph-list-numbers" aria-hidden="true"></i>
                    <span>${t('toc_title')}</span>
                </div>
                <button class="btn-close-toc" type="button" aria-label="${t('close_word')}"><i class="ph ph-x" aria-hidden="true"></i></button>
            </div>
            <div class="toc-side-legend"><span class="toc-legend-left"><b aria-hidden="true">←</b> ${t('toc_left_side')}</span><span class="toc-legend-right"><b aria-hidden="true">→</b> ${t('toc_right_side')}</span></div>
            <div class="toc-items-list">
                ${itemsHTML}
            </div>
        `;

        // Close button
        menu.querySelector('.btn-close-toc')?.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.add('hidden');
        });

        const items = menu.querySelectorAll('.toc-item');
        let draggedItemId = null;

        const clearDropStyles = () => {
            items.forEach(i => {
                i.style.borderTop = '2px solid transparent';
                i.style.borderBottom = '2px solid transparent';
            });
        };

        items.forEach((item, index) => {
            if (blocks[index]?.border_color) item.style.borderLeftColor = blocks[index].border_color;
            // Click navigation
            item.addEventListener('click', (e) => {
                if (e.target.closest('.toc-drag-handle')) return;
                const blockId = item.dataset.id;
                const targetEl = document.getElementById(blockId) || document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
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
            item.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });

            // Drag events
            item.addEventListener('dragstart', (e) => {
                draggedItemId = item.dataset.id;
                e.dataTransfer.setData('text/plain', draggedItemId);
                e.dataTransfer.effectAllowed = 'move';
                item.style.opacity = '0.4';
            });

            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
                draggedItemId = null;
                clearDropStyles();
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const rect = item.getBoundingClientRect();
                const offsetY = e.clientY - rect.top;
                const isAfter = offsetY > rect.height / 2;

                clearDropStyles();
                if (isAfter) {
                    item.style.borderBottom = '2px solid #ea580c';
                } else {
                    item.style.borderTop = '2px solid #ea580c';
                }
            });

            item.addEventListener('dragleave', () => {
                item.style.borderTop = '2px solid transparent';
                item.style.borderBottom = '2px solid transparent';
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const sourceId = e.dataTransfer.getData('text/plain') || draggedItemId;
                const targetId = item.dataset.id;
                clearDropStyles();

                if (!sourceId || !targetId || sourceId === targetId) return;

                const rect = item.getBoundingClientRect();
                const isAfter = (e.clientY - rect.top) > rect.height / 2;

                const blocksList = [...AppState.currentNote.blocks];
                const fromIndex = blocksList.findIndex(b => b.id === sourceId);
                let toIndex = blocksList.findIndex(b => b.id === targetId);

                if (fromIndex === -1 || toIndex === -1) return;

                const [movedBlock] = blocksList.splice(fromIndex, 1);
                
                // Recalculate toIndex after removal
                toIndex = blocksList.findIndex(b => b.id === targetId);
                const insertIndex = isAfter ? toIndex + 1 : toIndex;

                blocksList.splice(insertIndex, 0, movedBlock);

                // Update AppState & Re-render note on canvas and TOC
                AppState.updateNote({blocks: blocksList});
                BlockDOMRenderer.renderAll();
                this.render();
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

