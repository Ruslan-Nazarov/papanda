/**
 * StickerOverview.js - Overview grid for parent-attached stickers
 */
import { StickerService } from './StickerService.js';
import { StickerModal } from './StickerModal.js';
import { ModalManager } from './ModalManager.js';

export class StickerOverview {
    static async open(parentType, parentId) {
        try {
            const stickers = await StickerService.getByParent(parentType, parentId);
            
            // Set global context for this parent in the modal state
            StickerModal.state.parentType = parentType;
            StickerModal.state.parentId = parentId;

            if (stickers.length === 0) {
                // No stickers -> Open creation directly
                StickerModal.open({ parentType: parentType, parentId: parentId });
            } else {
                // Have stickers -> Open Overview
                this.render(parentType, parentId, stickers);
            }
        } catch (e) {
            console.error('Error fetching parent stickers:', e);
            StickerModal.open({ parentType: parentType, parentId: parentId });
        }
    }

    static render(type, id, stickers) {
        const modal = document.getElementById('parentStickersOverviewModal');
        const list = document.getElementById('parentStickersList');
        const emptyMsg = document.getElementById('noParentStickersMessage');
        
        if (!modal || !list) return;

        list.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'none';

        stickers.forEach(s => {
            const card = document.createElement('div');
            card.className = 'mini-sticker-card';
            card.style.backgroundColor = s.color || 'var(--color-sticker-default)';
            
            let textPreview = s.text;
            if (s.type === 'list') {
                try {
                    const data = JSON.parse(s.text);
                    textPreview = data.items.map(it => (it.done ? '✓ ' : '○ ') + it.text).join('\n');
                } catch(e) {}
            }

            const dateObj = new Date(s.created_at);
            const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getFullYear()).slice(-2)}`;

            card.innerHTML = `
                <div class="mini-sticker-del" onclick="event.stopPropagation(); archiveStickerInOverview(this, '${s.id}')" title="Archive">×</div>
                ${s.title ? `<div class="mini-sticker-title">${s.title}</div>` : ''}
                <div class="mini-sticker-text">${textPreview.replace(/\n/g, '<br>')}</div>
                <div class="mini-sticker-date">${dateStr}</div>
            `;
            
            card.onclick = () => {
                this.close();
                StickerModal.open({ id: s.id });
            };
            
            list.appendChild(card);
        });

        ModalManager.open('parentStickersOverviewModal');
    }

    static close() {
        ModalManager.close('parentStickersOverviewModal');
    }

    static async archive(btn, id) {
        if (!confirm('Archive this thought?')) return;
        try {
            await StickerService.archive(id);
            btn.parentElement.remove();
            const list = document.getElementById('parentStickersList');
            if (list && list.children.length === 0) {
                const emptyMsg = document.getElementById('noParentStickersMessage');
                if (emptyMsg) emptyMsg.style.display = 'block';
            }
        } catch(e) {
            console.error(e);
            if (typeof window.showToast === 'function') window.showToast('⚠ Failed to archive', 'error');
        }
    }
}
