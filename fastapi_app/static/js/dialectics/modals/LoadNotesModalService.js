/**
 * LoadNotesModalService.js - Модальное окно открытия конспектов (список, поиск), корзина и глобальное удаление/закрепление
 */
import { DialecticsAPI } from '../api.js';
import { DialecticsUI } from '../ui_utils.js';
import { BlockManager } from '../BlockManager.js';
import { customConfirm } from '../../modal_controller.js';

function parseUTCDate(dateStr) {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr += 'Z';
    }
    return new Date(dateStr);
}

export const LoadNotesModalService = {
    showLoadModal(ctx) {
        ctx.logDebug("showLoadModal() called");
        if (ctx.dom.loadModal) {
            ctx.dom.loadModal.style.display = 'flex';
            ctx.dom.loadModal.offsetHeight;
            ctx.dom.loadModal.classList.add('active');
        }
        ctx.searchNotes("");
    },

    hideLoadModal(ctx) { 
        if (ctx.dom.loadModal) {
            ctx.dom.loadModal.classList.remove('active');
            setTimeout(() => ctx.dom.loadModal.style.display = 'none', 200);
        }
    },

    async searchNotes(ctx, query) {
        if (!ctx.dom.loadList) return;
        DialecticsUI.setLoading(ctx.dom.loadList);
        try {
            const notes = await DialecticsAPI.list(query);
            ctx.renderNotesList(notes);
        } catch (err) {
            ctx.logDebug("ERROR in DialecticsAPI.list: " + err.message);
        }
    },

    renderNotesList(ctx, notes) {
        ctx.dom.loadList.innerHTML = notes.length ? '' : '<div style="color: #64748b; text-align: center; padding: 20px;">Nothing found</div>';
        notes.forEach(n => {
            const i = document.createElement('div');
            i.className = 'load-note-item';

            const d = parseUTCDate(n.updated_at || n.created_at);
            let dateStr = "";
            if (d.getFullYear() > 1970) {
                dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            const pinnedIcon = n.is_pinned ? '<span style="color: #f59e0b; margin-right: 8px;" title="Pinned">📌</span>' : '';
            const cleanTitle = (n.title || "").trim().toLowerCase();
            const isDefaultNote = ["example note", "пример конспекта", "конспект мысалы", "summation", "суммирование", "суммалау"].includes(cleanTitle) || cleanTitle.includes("сумм") || cleanTitle.includes("summation") || cleanTitle.includes("пример конспекта");
            const delBtnHTML = isDefaultNote ? '' : '<button class="load-note-item-delete" title="Delete">✕</button>';

            const status = n.status || 'none';
            let tooltip = 'Статус: Не указано (нажмите для смены)';
            if (status === 'in_progress') tooltip = 'В работе';
            else if (status === 'ready') tooltip = 'Готовый конспект';

            i.innerHTML = `
                <div class="load-note-item-content" style="flex: 1;">
                    <div class="load-note-item-title" style="display: flex; align-items: center; gap: 8px; color: #1e293b; font-size: 1.05em; margin-bottom: 4px;">
                        <button class="note-status-circle status-${status}" data-status="${status}" title="${tooltip}" onclick="if(window.app) window.app.toggleListNoteStatus(event, ${n.id}, this);"></button>
                        ${pinnedIcon}<strong>${n.title || (window._ ? window._('dialectics.topic_placeholder') : "Untitled")}</strong>
                    </div>
                    <div class="load-note-item-date" style="color: #94a3b8; font-size: 0.85em;">${dateStr}</div>
                </div>
                ${delBtnHTML}
            `;

            i.onclick = () => ctx.loadNoteToEditor(n.id);

            const delBtn = i.querySelector('.load-note-item-delete');
            if (delBtn) {
                delBtn.onclick = async (e) => {
                    e.stopPropagation();

                    const titleText = window._ ? window._('dialectics.delete', 'Confirm Deletion') : 'Confirm Deletion';
                    const msgTemplate = window._ ? window._('dialectics.confirm_delete', 'Delete note "%s"?') : 'Delete note "%s"?';
                    const cancelText = window._ ? window._('dialectics.cancel', 'Cancel') : 'Cancel';
                    const deleteText = window._ ? window._('dialectics.delete', 'Delete') : 'Delete';
                    
                    const confirmed = await customConfirm({
                        title: titleText,
                        message: msgTemplate.replace('%s', n.title),
                        icon: '',
                        buttons: [
                            { label: cancelText, value: false, class: 'confirm-btn-secondary' },
                            { label: deleteText, value: true, class: 'confirm-btn-danger' }
                        ]
                    });

                    if (confirmed) {
                        const ok = await DialecticsAPI.delete(n.id);
                        if (ok) {
                            window.showToast(window._("toast.record_deleted"), "info");
                            i.remove();
                            if (ctx.dom.loadList.children.length === 0) {
                                ctx.dom.loadList.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Nothing found</div>';
                            }
                            if (ctx.state.currentNoteId === n.id) {
                                await ctx.close(false);
                                ctx.dom.title.value = "";
                                BlockManager.render(ctx.dom.canvas, []);
                                ctx.state.currentNoteId = null;
                                if (ctx.dom.deleteBtn) ctx.dom.deleteBtn.style.display = 'none';
                            }
                        }
                    }
                };
            }

            ctx.dom.loadList.appendChild(i);
        });
    },

    async showTrashModal(ctx) {
        const modal = document.getElementById('trashDialecticsModal');
        const listContainer = document.getElementById('trashDialecticsList');
        if (modal && listContainer) {
            modal.style.display = 'flex';
            modal.offsetHeight;
            modal.classList.add('active');
            listContainer.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Загрузка корзины...</div>';
            try {
                const trash = await DialecticsAPI.listTrash();
                ctx.renderTrashList(trash, listContainer);
            } catch (err) {
                listContainer.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Ошибка загрузки корзины</div>';
            }
        }
    },

    renderTrashList(ctx, trash, container) {
        if (!trash || !trash.length) {
            container.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Корзина пуста</div>';
            return;
        }
        container.innerHTML = '';
        trash.forEach(n => {
            const i = document.createElement('div');
            i.className = 'load-note-item';
            const d = parseUTCDate(n.deleted_at || n.updated_at || n.created_at);
            const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            i.innerHTML = `
                <div class="load-note-item-content" style="flex: 1;">
                    <div class="load-note-item-title" style="color: #64748b; text-decoration: line-through; font-size: 1.02em; margin-bottom: 4px;"><strong>${n.title || "Без названия"}</strong></div>
                    <div class="load-note-item-date" style="color: #94a3b8; font-size: 0.85em;">Удалено: ${dateStr}</div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm restore-trash-btn" title="Восстановить из корзины" style="padding: 4px 8px;">♻️</button>
                    <button class="btn btn-danger btn-sm permanent-del-btn" title="Удалить навсегда" style="padding: 4px 8px; background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; border-radius: 6px;">🔥</button>
                </div>
            `;
            
            const restoreBtn = i.querySelector('.restore-trash-btn');
            restoreBtn.onclick = async (e) => {
                e.stopPropagation();
                const res = await DialecticsAPI.restoreTrash(n.id);
                if (res) {
                    window.showToast("Конспект восстановлен из корзины", "success");
                    i.remove();
                    if (!container.children.length) {
                        container.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Корзина пуста</div>';
                    }
                }
            };

            const delBtn = i.querySelector('.permanent-del-btn');
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await customConfirm({
                    title: "Окончательное удаление",
                    message: `Удалить конспект "${n.title}" навсегда? Это действие необратимо!`,
                    icon: '🔥',
                    buttons: [
                        { label: 'Отмена', value: false, class: 'confirm-btn-secondary' },
                        { label: 'Удалить навсегда', value: true, class: 'confirm-btn-danger' }
                    ]
                });
                if (confirmed) {
                    const ok = await DialecticsAPI.permanentDelete(n.id);
                    if (ok) {
                        window.showToast("Конспект удалён окончательно", "info");
                        i.remove();
                        if (!container.children.length) {
                            container.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Корзина пуста</div>';
                        }
                    }
                }
            };

            container.appendChild(i);
        });
    },

    async deleteGlobal(ctx) {
        if (!ctx.state.currentNoteId) return;
        const cleanTitle = (ctx.dom.title && ctx.dom.title.value ? ctx.dom.title.value : "").trim().toLowerCase();
        if (cleanTitle && (["example note", "пример конспекта", "конспект мысалы", "summation", "суммирование", "суммалау"].includes(cleanTitle) || cleanTitle.includes("сумм") || cleanTitle.includes("summation") || cleanTitle.includes("пример конспекта"))) {
            if(window.showToast) window.showToast(window._("toast.cannot_delete_the_example_note"), "error");
            return;
        }
        const confirmed = await customConfirm({
            title: window._ ? window._('dialectics.delete_note_title') : 'Удаление конспекта',
            message: window._ ? window._('dialectics.delete_note_msg') : 'Вы уверены, что хотите удалить этот конспект?',
            icon: '',
            buttons: [
                { label: window._ ? window._('dialectics.cancel') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                { label: window._ ? window._('dialectics.delete') : 'Удалить', value: true, class: 'confirm-btn-danger' }
            ]
        });
        if (confirmed) {
            const ok = await DialecticsAPI.delete(ctx.state.currentNoteId);
            if (ok) {
                window.showToast(window._("toast.dialectics_deleted"), "info");
                location.reload();
            }
        }
    },

    async pinCurrent(ctx) {
        if (!ctx.state.currentNoteId) {
            window.showToast(window._("toast.save_first_to_pin"), "warning");
            return;
        }

        const title = ctx.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        const blocks = BlockManager.getBlocks(ctx.dom.canvas);
        const categoryId = ctx.dom.categorySelect ? ctx.dom.categorySelect.value : null;

        const payload = {
            id: ctx.state.currentNoteId,
            title,
            blocks,
            is_pinned: true,
            category_id: categoryId ? parseInt(categoryId) : null,
            status: ctx.state.currentNoteStatus || "none"
        };

        const res = await DialecticsAPI.save(payload, ctx.state.currentNoteId);
        if (res) {
            window.showToast(window._("toast.pinned_successfully"), "success");
        }
    },

    async toggleListNoteStatus(ctx, e, noteId, el) {
        if (e) e.stopPropagation();
        let current = el.dataset.status || 'none';
        let next = 'none';
        if (current === 'none') next = 'in_progress';
        else if (current === 'in_progress') next = 'ready';
        else if (current === 'ready') next = 'none';
        
        el.dataset.status = next;
        el.className = `note-status-circle status-${next}`;
        let tooltip = 'Статус: Не указано (нажмите для смены)';
        if (next === 'in_progress') tooltip = 'В работе';
        else if (next === 'ready') tooltip = 'Готовый конспект';
        el.title = tooltip;
        
        await DialecticsAPI.updateStatus(noteId, next);
        
        if (ctx.state && Number(ctx.state.currentNoteId) === Number(noteId)) {
            if (ctx.updateStatusButtonDisplay) ctx.updateStatusButtonDisplay(next);
        }
        
        if (window.showToast) {
            let msg = 'Статус изменён: Не указано';
            if (next === 'in_progress') msg = 'Статус изменён: В работе';
            if (next === 'ready') msg = 'Статус изменён: Готовый конспект';
            window.showToast(msg, 'success');
        }
    }
};
