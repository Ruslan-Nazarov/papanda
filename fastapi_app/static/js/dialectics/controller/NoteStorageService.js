/**
 * NoteStorageService.js - Сервис сохранения, загрузки, закрепления и создания конспектов
 */
import { DialecticsAPI } from '../api.js';
import { DialecticsUI } from '../ui_utils.js';
import { BlockManager } from '../BlockManager.js';
import { customConfirm } from '../../modal_controller.js';

export const NoteStorageService = {
    async saveGlobal(ctx, shouldClose = true, toastKey = "toast.dialectics_saved") {
        const uiLog = window.logDebugWindow || (typeof DialecticsUI !== 'undefined' && DialecticsUI.logDebugWindow ? DialecticsUI.logDebugWindow.bind(DialecticsUI) : null);
        if (uiLog) {
            const stack = new Error().stack || '';
            const lines = stack.split('\n').map(l => l.trim()).filter(l => !l.includes('saveGlobal') && !l.includes('Error'));
            uiLog('5.0. Вызван saveGlobal (стек вызовов)', { shouldClose, caller: lines.slice(0, 3) });
        }
        const title = ctx.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        const html = ctx.editor.getHTML();
        const customBlockTitle = document.getElementById('editorBlockTitleInput')?.value?.trim() || "";
        if (ctx.state.editingAltCard && ctx.state.editingBlock) {
            const inner = ctx.state.editingAltCard.querySelector('.dialectics-content-inner');
            if (inner) {
                inner.innerHTML = html;
            }
            if (customBlockTitle) {
                const titleSpan = ctx.state.editingAltCard.querySelector('.alt-title');
                if (titleSpan) titleSpan.innerText = customBlockTitle;
            }
        } else if (ctx.state.editingBlock && ctx.dom.editor && ctx.dom.editor.style.display !== 'none' && !ctx.state.editingBlock.classList.contains('is-editing') && !ctx.state.editingBlock._floatingEditorWindow) {
            if (typeof ctx.cleanUpInlineEditForBlock === 'function') {
                ctx.cleanUpInlineEditForBlock(ctx.state.editingBlock);
            } else if (typeof ctx.cleanUpInlineEdit === 'function') {
                ctx.cleanUpInlineEdit();
            }
            const liveBlock = (typeof ctx.resolveLiveBlock === 'function') ? (ctx.resolveLiveBlock(ctx.state.editingBlock) || ctx.state.editingBlock) : ctx.state.editingBlock;
            const inner = liveBlock.querySelector('.dialectics-content-inner');
            if (inner) {
                liveBlock._rawHtml = html;
                inner.innerHTML = html;
                if (typeof BlockManager.renderMath === 'function') {
                    BlockManager.renderMath(liveBlock);
                }
            }
            if (customBlockTitle) {
                liveBlock.dataset.title = customBlockTitle;
            } else {
                delete liveBlock.dataset.title;
            }
            const titleEl = liveBlock.querySelector('.block-title-text');
            if (titleEl) {
                titleEl.innerText = customBlockTitle || (liveBlock.classList.contains('block-section') ? 'Раздел' : (liveBlock.dataset.side === 'center' ? 'Связующий блок' : 'Блок'));
            }
        }

        const blocks = BlockManager.getBlocks(ctx.dom.canvas);
        const categoryId = ctx.dom.categorySelect ? ctx.dom.categorySelect.value : null;

        const payload = {
            title,
            blocks: blocks.map(b => ({
                id: b.id,
                side: b.side,
                html: b.html,
                role: b.role,
                sources: b.sources || [],
                title: b.title || undefined,
                collapsed: b.collapsed || false,
                words: b.words || [],
                color: b.color || undefined,
                status: b.status || "none"
            })),
            is_pinned: ctx.state.isPinned || false,
            category_id: categoryId ? parseInt(categoryId) : null,
            status: ctx.state.currentNoteStatus || "none",
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        if (ctx.state.currentNoteId) {
            payload.id = Number(ctx.state.currentNoteId);
        }

        if (uiLog) {
            uiLog('5. saveGlobal: отправка на сервер DialecticsAPI.save', { noteId: ctx.state.currentNoteId, blocksCount: payload.blocks.length, blocks: payload.blocks.map(b => b.id + '(' + b.side + ')') });
        }
        const res = await DialecticsAPI.save(payload, ctx.state.currentNoteId);
        if (uiLog) {
            uiLog('6. saveGlobal: ответ от сервера', { resId: res?.id, resBlocksCount: res?.content_json ? (typeof res.content_json === 'string' ? JSON.parse(res.content_json).length : res.content_json.length) : 'нет content_json' });
        }
        if (res) {
            ctx.state.isDirty = false;
            ctx.state.currentNoteId = res.id;
            localStorage.setItem('dialectics_last_note_id', res.id);
            ctx.updateCurrentVersionDisplay(res);
            
            if (!shouldClose && res.content_json) {
                try {
                    const savedBlocks = typeof res.content_json === 'string' ? JSON.parse(res.content_json) : res.content_json;
                    if (Array.isArray(savedBlocks)) {
                        if (uiLog) {
                            uiLog('7. Холст синхронизирован с БД сервера после сохранения', { count: savedBlocks.length });
                        }
                    }
                } catch(e) {}
            }
            
            const url = new URL(window.location);
            if (url.searchParams.get('id') !== String(res.id)) {
                url.searchParams.set('id', res.id);
                window.history.pushState({}, '', url);
            }

            if (toastKey !== null) {
                window.showToast(window._(toastKey, window._("toast.dialectics_saved", "Сохранено")), "success");
            }
            if (shouldClose && typeof ctx.close === 'function') {
                await ctx.close(false);
            }
            if (ctx.dom.deleteBtn) ctx.dom.deleteBtn.style.display = 'block';
            return res.id;
        }
        if (window.showToast) window.showToast(window._("toast.save_error", "Ошибка сохранения. Попробуйте ещё раз."), "error");
        return null;
    },

    async saveAndPin(ctx) {
        const title = ctx.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        let html = ctx.editor.getHTML() || "";
        const categoryId = ctx.dom.categorySelect ? ctx.dom.categorySelect.value : null;

        const payload = {
            title,
            blocks: [{ side: 'left', html }],
            is_pinned: true,
            category_id: categoryId ? parseInt(categoryId) : null,
            status: ctx.state.currentNoteStatus || "none",
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        if (ctx.state.currentNoteId) {
            payload.id = ctx.state.currentNoteId;
        }

        const res = await DialecticsAPI.save(payload, ctx.state.currentNoteId);
        if (res) {
            ctx.updateCurrentVersionDisplay(res);
            window.showToast(window._("toast.saved_and_pinned"), "success");
            if (typeof ctx.close === 'function') {
                await ctx.close(false);
            }
            setTimeout(() => location.reload(), 500);
        }
    },

    async loadNoteToEditor(ctx, id, addToHistory = true, noteData = null) {
        if (typeof ctx.close === 'function') {
            await ctx.close();
        }
        const n = noteData || await DialecticsAPI.get(id);
        if (n) {
            if (addToHistory && ctx.state.currentNoteId && ctx.state.currentNoteId !== n.id) {
                const history = ctx.getNoteHistory();
                if (history.length === 0 || history[history.length - 1] !== ctx.state.currentNoteId) {
                    history.push(ctx.state.currentNoteId);
                    ctx.saveNoteHistory(history);
                }
            }
            ctx.state.currentNoteId = n.id;
            ctx.state.dismissedHints = JSON.parse(localStorage.getItem('dialectics_dismissed_hints_' + n.id) || '[]');
            localStorage.setItem('dialectics_last_note_id', n.id);
            ctx.updateCurrentVersionDisplay(n);
            ctx.dom.title.value = n.title;
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;

            if (ctx.dom.categorySelect) {
                ctx.dom.categorySelect.value = n.category_id || "";
            }

            let stickersCountMap = {};
            let globalStickersCount = 0;
            try {
                let presentBlockIds = new Set();
                if (n.content) {
                    try {
                        const parsedBlocks = typeof n.content === 'string' ? JSON.parse(n.content) : n.content;
                        if (Array.isArray(parsedBlocks)) {
                            parsedBlocks.forEach(b => {
                                if (b.id) presentBlockIds.add(String(b.id));
                            });
                        }
                    } catch(e) {
                        console.error("Failed to parse note content for block IDs:", e);
                    }
                }

                const stickers = await fetch(`/api/stickers/dialectics/${n.id}/`).then(r => r.json());
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

            const toggleOnlyTitles = document.getElementById('toggleOnlyTitlesMode');
            if (toggleOnlyTitles) {
                toggleOnlyTitles.checked = false;
                if (window.toggleOnlyTitlesMode) window.toggleOnlyTitlesMode(false);
            }

            BlockManager.render(ctx.dom.canvas, blocks, typeof ctx._blockCallbacks === 'function' ? ctx._blockCallbacks() : {});

            if (typeof ctx._revealInterface === 'function') ctx._revealInterface();
            if (typeof ctx.hideLoadModal === 'function') ctx.hideLoadModal();
            if (ctx.dom.deleteBtn) {
                const cleanTitle = (n.title || "").trim().toLowerCase();
                const isDefaultNote = ["example note", "пример конспекта", "конспект мысалы", "summation", "суммирование", "суммалау"].includes(cleanTitle) || cleanTitle.includes("сумм") || cleanTitle.includes("summation") || cleanTitle.includes("пример конспекта");
                ctx.dom.deleteBtn.style.display = isDefaultNote ? 'none' : 'block';
            }

            const url = new URL(window.location);
            if (url.searchParams.get('id') !== String(n.id)) {
                url.searchParams.set('id', n.id);
                window.history.pushState({}, '', url);
            }
        } else {
            localStorage.removeItem('dialectics_last_note_id');
            ctx.updateCurrentVersionDisplay(null);
            if (typeof ctx._revealInterface === 'function') ctx._revealInterface();
        }
    },

    async loadExample(ctx, type = null) {
        if (typeof type !== 'string' || !type) {
            if (window.openExampleChoiceModal) {
                window.openExampleChoiceModal();
                return;
            }
            type = 'pythagoras';
        }
        await ctx.loadExampleNoteByType(type);
    },

    async loadExampleNoteByType(ctx, type = 'pythagoras') {
        DialecticsUI.setLoading(ctx.dom.canvas);
        try {
            const response = await fetch(`/api/dialectics/example/get_or_create_id?type=${type}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.id) {
                    await ctx.loadNoteToEditor(data.id);
                    const msg = type === 'summation' ? 
                        (window._ ? window._("toast.opened_summation_note") : "Конспект «Суммирование» загружен") : 
                        (window._ ? window._("toast.opened_existing_example_note") : "Пример конспекта загружен");
                    if (window.showToast) window.showToast(msg || "Пример конспекта загружен", "info");
                }
            } else {
                console.error("Failed to load example note ID.");
                DialecticsUI.clearLoading(ctx.dom.canvas);
            }
        } catch (e) {
            console.error(e);
            DialecticsUI.clearLoading(ctx.dom.canvas);
        }
    },

    async createNewNote(ctx) {
        if (ctx.state.isDirty) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_new_msg') : "Есть несохранённые изменения. Создать новый конспект?",
                icon: '',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.create_btn') : 'Создать', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (confirmed) {
                ctx.state.isDirty = false;
                ctx._resetToNewNote();
            }
        } else {
            ctx._resetToNewNote();
        }
    },

    _resetToNewNote(ctx) {
        if (ctx.state.currentNoteId) {
            const history = ctx.getNoteHistory();
            if (history.length === 0 || history[history.length - 1] !== ctx.state.currentNoteId) {
                history.push(ctx.state.currentNoteId);
                ctx.saveNoteHistory(history);
            }
        }
        ctx.state.currentNoteId = null;
        ctx.state.dismissedHints = [];
        localStorage.removeItem('dialectics_last_note_id');
        ctx.updateCurrentVersionDisplay(null);
        if (ctx.dom.title) ctx.dom.title.value = "";
        if (ctx.dom.categorySelect) ctx.dom.categorySelect.value = "";
        if (ctx.dom.canvas) BlockManager.render(ctx.dom.canvas, [], typeof ctx._blockCallbacks === 'function' ? ctx._blockCallbacks() : {});
        if (ctx.dom.deleteBtn) ctx.dom.deleteBtn.style.display = 'none';
        
        const url = new URL(window.location);
        url.searchParams.delete('id');
        window.history.pushState({}, '', url);
        
        window.showToast(window._("toast.created_a_new_blank_note"), "success");
    }
};
