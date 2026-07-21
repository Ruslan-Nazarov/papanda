/**
 * NoteStickersService.js - Управление стикерами конспекта и отдельных блоков
 */
export const NoteStickersService = {
    async openStickersForCurrent(ctx, forceBlockId = undefined) {
        if (!ctx.state.currentNoteId) {
            if (window.showToast) window.showToast(window._("toast.saving_note_to_attach_sticker"), "info");
            const savedId = await ctx.saveGlobal(false, null);
            if (!savedId) {
                if (window.showToast) window.showToast(window._("toast.failed_to_save_note"), "error");
                return;
            }
        }
        
        let blockId = forceBlockId;
        if (blockId === undefined) {
            if (ctx.state.editingBlock) {
                blockId = ctx.state.editingBlock.dataset.blockId || ctx.state.editingBlock.dataset.id;
            } else if (ctx.state.pendingBlockId) {
                blockId = ctx.state.pendingBlockId;
            } else {
                blockId = null;
            }
        }

        if (window.openParentStickers) {
            window.openParentStickers('dialectics', ctx.state.currentNoteId, blockId);
        }
    },

    updateGlobalStickersBadge(ctx) {
        const badge = document.getElementById('globalStickersCountBadge');
        if (badge) {
            const count = ctx.state.globalStickersCount || 0;
            badge.innerText = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    },

    async refreshStickers(ctx) {
        if (!ctx.state.currentNoteId) return;
        let stickersCountMap = {};
        let globalStickersCount = 0;
        let presentBlockIds = new Set();
        if (ctx.dom.canvas && window.BlockManager) {
            const blocks = window.BlockManager.getBlocks(ctx.dom.canvas);
            blocks.forEach(b => {
                if (b.id) presentBlockIds.add(String(b.id));
            });
        }

        try {
            const stickers = await fetch(`/api/stickers/dialectics/${ctx.state.currentNoteId}/`).then(r => r.json());
            if (Array.isArray(stickers)) {
                stickers.forEach(s => {
                    if (s.dialectics_block_id) {
                        if (presentBlockIds.has(String(s.dialectics_block_id))) {
                            stickersCountMap[s.dialectics_block_id] = (stickersCountMap[s.dialectics_block_id] || 0) + 1;
                        } else {
                            fetch(`/api/stickers/${s.id}/archive/`, { method: 'POST' }).catch(() => {});
                        }
                    } else {
                        globalStickersCount++;
                    }
                });
            }
        } catch(e) {
            console.error("Failed to load block stickers:", e);
        }
        ctx.state.blockStickersCount = stickersCountMap;
        ctx.state.globalStickersCount = globalStickersCount;
        ctx.updateGlobalStickersBadge();

        if (window.BlockManager && ctx.dom.canvas) {
            const blocks = window.BlockManager.getBlocks(ctx.dom.canvas);
            window.BlockManager.render(ctx.dom.canvas, blocks, typeof ctx._blockCallbacks === 'function' ? ctx._blockCallbacks() : {});
        }
    },

    async deleteStickersForBlock(ctx, blockId) {
        if (!ctx.state.currentNoteId) return;
        try {
            const res = await fetch(`/api/stickers/dialectics/${ctx.state.currentNoteId}/?recurrence_id=${blockId}`);
            if (res.ok) {
                const stickers = await res.json();
                if (Array.isArray(stickers)) {
                    await Promise.all(stickers.map(s => 
                        fetch(`/api/stickers/${s.id}/archive/`, { method: 'POST' })
                    ));
                    
                    window.dispatchEvent(new CustomEvent('stickersUpdated', { 
                        detail: { parentType: 'dialectics', parentId: ctx.state.currentNoteId } 
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to delete stickers for block:", blockId, e);
        }
    }
};
