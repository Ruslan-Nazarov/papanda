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

        const blocks = (AppState.currentNote.blocks || []).filter(b => !b.isDraft);

        let itemsHTML = '';
        if (blocks.length === 0) {
            itemsHTML = `<div style="color: #94a3b8; font-style: italic; padding: 12px 16px; font-size: 0.9rem;">${t('toc_empty')}</div>`;
        } else {
            itemsHTML = blocks.map((b) => {
                inferRoleFromTitle(b);
                const isSection = b.role === 'section';
                const isAnchor = b.role === 'anchor' || (b.title || '').toLowerCase().includes('что вам нужно понять');
                
                let icon = '▪';
                let iconColor = '#a855f7';
                let itemBg = 'transparent';
                let fontWeight = '500';
                let titleText = b.title || (isAnchor ? t('hint_anchor_title') : (isSection ? t('section_word') : t('block_word')));

                if (isSection) {
                    icon = '📄';
                    iconColor = '#3b82f6';
                    itemBg = '#f1f5f9';
                    fontWeight = '700';
                } else if (isAnchor) {
                    icon = '🧠';
                    iconColor = '#ea580c';
                    fontWeight = '600';
                }

                return `
                    <div class="toc-item ${isSection ? 'toc-section-item' : ''}" 
                         data-id="${b.id}" 
                         draggable="true" 
                         style="display: flex; align-items: center; gap: 8px; padding: ${isSection ? '8px 10px' : '6px 10px'}; border-radius: 8px; cursor: pointer; transition: background 0.15s; font-size: 0.92rem; color: #1e293b; background: ${itemBg}; border: 2px solid transparent; user-select: none;">
                        <span class="toc-drag-handle" title="${t('drag_word')}" style="color: #94a3b8; font-size: 1.1rem; cursor: grab; padding: 0 2px; line-height: 1;">⠿</span>
                        <span class="toc-marker" style="color: ${iconColor}; font-size: ${isSection ? '1rem' : '0.85rem'}; display: inline-flex; align-items: center; justify-content: center;">${icon}</span>
                        <span class="toc-title" style="flex: 1; font-weight: ${fontWeight}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(titleText)}</span>
                    </div>
                `;
            }).join('');
        }

        menu.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px 8px 16px; border-bottom: 1px solid #f8fafc;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.05rem; color: #1e293b;">
                    <span style="font-size: 1.15rem;">📋</span>
                    <span>${t('toc_title')}</span>
                </div>
                <button class="btn-close-toc" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 2px 6px; border-radius: 4px; line-height: 1;">✕</button>
            </div>
            <div class="toc-items-list" style="padding: 6px 8px 10px 8px; display: flex; flex-direction: column; gap: 4px; max-height: 380px; overflow-y: auto;">
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

        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                if (!item.classList.contains('toc-section-item')) {
                    item.style.background = '#f8fafc';
                }
            });
            item.addEventListener('mouseleave', () => {
                if (!item.classList.contains('toc-section-item')) {
                    item.style.background = 'transparent';
                }
            });

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

                const blocksList = AppState.currentNote.blocks || [];
                const fromIndex = blocksList.findIndex(b => b.id === sourceId);
                let toIndex = blocksList.findIndex(b => b.id === targetId);

                if (fromIndex === -1 || toIndex === -1) return;

                const [movedBlock] = blocksList.splice(fromIndex, 1);
                
                // Recalculate toIndex after removal
                toIndex = blocksList.findIndex(b => b.id === targetId);
                const insertIndex = isAfter ? toIndex + 1 : toIndex;

                blocksList.splice(insertIndex, 0, movedBlock);

                // Update AppState & Re-render note on canvas and TOC
                AppState.markDirty();
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

