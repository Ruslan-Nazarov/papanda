/**
 * StickerOverview.js - Overview grid for parent-attached stickers
 */
import { StickerService } from './StickerService.js';
import { StickerModal } from './StickerModal.js';
import { ModalManager } from './ModalManager.js';

export class StickerOverview {
    static async open(parentType, parentId, secondaryId = null) {
        try {
            const stickers = await StickerService.getByParent(parentType, parentId, secondaryId);
            
            // Set global context for this parent in the modal state
            StickerModal.state.parentType = parentType;
            StickerModal.state.parentId = parentId;
            StickerModal.state.secondaryId = secondaryId;

            if (stickers.length === 0) {
                // No stickers -> Open creation directly
                StickerModal.open({ parentType: parentType, parentId: parentId, secondaryId: secondaryId });
            } else {
                // Have stickers -> Open Overview
                this.render(parentType, parentId, secondaryId, stickers);
            }
        } catch (e) {
            console.error('Error fetching parent stickers:', e);
            StickerModal.open({ parentType: parentType, parentId: parentId, secondaryId: secondaryId });
        }
    }

    static createCardElement(s, isBlockSticker = false) {
        const card = document.createElement('div');
        card.className = 'mini-sticker-card';
        card.style.backgroundColor = s.color || 'var(--color-sticker-default)';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.justifyContent = 'space-between';
        
        let textPreview = s.text;
        if (s.type === 'list') {
            try {
                const data = JSON.parse(s.text);
                textPreview = data.items.map(it => (it.done ? '✓ ' : '○ ') + it.text).join('\n');
            } catch(e) {}
        }

        const dateObj = new Date(s.created_at);
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getFullYear()).slice(-2)}`;

        let blockActionHtml = '';
        if (isBlockSticker && s.dialectics_block_id) {
            let blockTitle = "Перейти к блоку";
            const canvas = document.getElementById('dialecticsCanvas');
            if (canvas) {
                const blockEl = canvas.querySelector(`[data-block-id="${s.dialectics_block_id}"]`);
                if (blockEl) {
                    const titleTextEl = blockEl.querySelector('.block-title-text');
                    if (titleTextEl && titleTextEl.innerText.trim()) {
                        blockTitle = titleTextEl.innerText.trim();
                    }
                }
            }
            
            blockActionHtml = `
                <div class="mini-sticker-goto" onclick="event.stopPropagation(); window.app && window.app.goToBlock('${s.dialectics_block_id}')" style="margin-top: 8px; padding: 4px 6px; background: rgba(255,255,255,0.7); border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; font-size: 0.72rem; font-weight: bold; color: #1e3a8a; display: flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer; transition: all 0.2s;" title="Перейти к блоку: ${blockTitle}">
                    🔍 <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">${blockTitle}</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="mini-sticker-del" onclick="event.stopPropagation(); archiveStickerInOverview(this, '${s.id}')" title="Archive">×</div>
            <div>
                ${s.title ? `<div class="mini-sticker-title" style="font-weight: bold; margin-bottom: 4px;">${s.title}</div>` : ''}
                <div class="mini-sticker-text">${textPreview.replace(/\n/g, '<br>')}</div>
            </div>
            <div>
                ${blockActionHtml}
                <div class="mini-sticker-date" style="margin-top: 8px; font-size: 0.65rem; opacity: 0.6;">${dateStr}</div>
            </div>
        `;
        
        card.onclick = () => {
            this.close();
            StickerModal.open({
                id: s.id,
                parentType: StickerModal.state.parentType,
                parentId: StickerModal.state.parentId,
                secondaryId: s.dialectics_block_id || null
            });
        };

        return card;
    }

    static render(type, id, secondaryId, stickers) {
        const modal = document.getElementById('parentStickersOverviewModal');
        const list = document.getElementById('parentStickersList');
        const emptyMsg = document.getElementById('noParentStickersMessage');
        
        if (!modal || !list) return;

        list.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'none';

        if (type === 'dialectics' && !secondaryId) {
            // Global stickers overview for Dialectics note
            const canvas = document.getElementById('dialecticsCanvas');
            const presentBlockIds = new Set();
            if (canvas && window.BlockManager) {
                const blocks = window.BlockManager.getBlocks(canvas);
                blocks.forEach(b => {
                    if (b.id) presentBlockIds.add(String(b.id));
                });
            }

            const globalStickers = stickers.filter(s => !s.dialectics_block_id);
            const blockStickers = stickers.filter(s => s.dialectics_block_id && presentBlockIds.has(String(s.dialectics_block_id)));
            
            // Clean up orphaned block stickers in the background
            stickers.forEach(s => {
                if (s.dialectics_block_id && !presentBlockIds.has(String(s.dialectics_block_id))) {
                    fetch(`/api/stickers/${s.id}/archive/`, { method: 'POST' }).catch(() => {});
                }
            });
            
            list.style.display = 'block';
            
            // Section 1: Global Note Stickers
            const globalHeader = document.createElement('div');
            globalHeader.style.fontWeight = 'bold';
            globalHeader.style.fontSize = '0.9rem';
            globalHeader.style.color = '#475569';
            globalHeader.style.marginBottom = '10px';
            globalHeader.style.display = 'flex';
            globalHeader.style.alignItems = 'center';
            globalHeader.style.gap = '6px';
            globalHeader.innerHTML = `📌 Общие стикеры конспекта <span style="font-size: 0.75rem; background: #e2e8f0; color: #475569; border-radius: 12px; padding: 2px 6px;">${globalStickers.length}</span>`;
            list.appendChild(globalHeader);
            
            if (globalStickers.length > 0) {
                const globalGrid = document.createElement('div');
                globalGrid.style.display = 'grid';
                globalGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(130px, 1fr))';
                globalGrid.style.gap = '15px';
                globalGrid.style.marginBottom = '25px';
                
                globalStickers.forEach(s => {
                    const card = this.createCardElement(s, false);
                    globalGrid.appendChild(card);
                });
                list.appendChild(globalGrid);
            } else {
                const emptyGlobal = document.createElement('div');
                emptyGlobal.style.padding = '15px';
                emptyGlobal.style.textAlign = 'center';
                emptyGlobal.style.color = '#94a3b8';
                emptyGlobal.style.fontSize = '0.85rem';
                emptyGlobal.style.border = '1px dashed #e2e8f0';
                emptyGlobal.style.borderRadius = '8px';
                emptyGlobal.style.marginBottom = '25px';
                emptyGlobal.innerText = 'Нет общих стикеров конспекта.';
                list.appendChild(emptyGlobal);
            }
            
            // Section 2: Block Stickers
            if (blockStickers.length > 0) {
                const blockHeader = document.createElement('div');
                blockHeader.style.fontWeight = 'bold';
                blockHeader.style.fontSize = '0.9rem';
                blockHeader.style.color = '#475569';
                blockHeader.style.marginBottom = '10px';
                blockHeader.style.marginTop = '20px';
                blockHeader.style.display = 'flex';
                blockHeader.style.alignItems = 'center';
                blockHeader.style.gap = '6px';
                blockHeader.innerHTML = `🧱 Стикеры отдельных блоков <span style="font-size: 0.75rem; background: #e2e8f0; color: #475569; border-radius: 12px; padding: 2px 6px;">${blockStickers.length}</span>`;
                list.appendChild(blockHeader);
                
                const blockGrid = document.createElement('div');
                blockGrid.style.display = 'grid';
                blockGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(130px, 1fr))';
                blockGrid.style.gap = '15px';
                
                blockStickers.forEach(s => {
                    const card = this.createCardElement(s, true);
                    blockGrid.appendChild(card);
                });
                list.appendChild(blockGrid);
            }
        } else {
            list.style.display = 'grid';
            stickers.forEach(s => {
                const card = this.createCardElement(s, false);
                list.appendChild(card);
            });
        }

        ModalManager.open('parentStickersOverviewModal');
    }

    static close() {
        ModalManager.close('parentStickersOverviewModal');
    }

    static async archive(btn, id) {
        const confirmed = await window.NotificationService.confirm(window._('modal.archive_confirm', 'Archive this thought?'), { okText: window._('modal.archive', 'Archive') });
        if (!confirmed) return;
        try {
            await StickerService.archive(id);
            btn.parentElement.remove();
            
            // Dispatch event to refresh widgets immediately
            window.dispatchEvent(new CustomEvent('stickersUpdated', { 
                detail: { parentType: StickerModal.state.parentType, parentId: StickerModal.state.parentId } 
            }));

            // Immediately update the sticker icon badge in the dashboard widget
            StickerModal._updateParentStickerIcon(StickerModal.state.parentType, StickerModal.state.parentId, -1);

            const list = document.getElementById('parentStickersList');
            if (list && list.children.length === 0) {
                const emptyMsg = document.getElementById('noParentStickersMessage');
                if (emptyMsg) emptyMsg.style.display = 'block';
            }
        } catch(e) {
            console.error(e);
            if (typeof window.showToast === 'function') window.showToast(window._("toast.failed_to_archive"), 'error');
        }
    }
}
