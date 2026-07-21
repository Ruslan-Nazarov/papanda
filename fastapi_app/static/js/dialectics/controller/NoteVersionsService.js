/**
 * NoteVersionsService.js - Управление версиями конспекта (загрузка, сохранение ручных версий, восстановление, удаление, закрепление)
 */
import { DialecticsAPI } from '../api.js';
import { customConfirm } from '../../modal_controller.js';

export const NoteVersionsService = {
    updateCurrentVersionDisplay(ctx, note) {
        if (typeof ctx.updateStatusButtonDisplay === 'function') {
            ctx.updateStatusButtonDisplay(note ? (note.status || 'none') : 'none');
        }
        const label = document.getElementById('currentVersionLabel');
        if (!label) return;
        if (!note) {
            label.innerText = 'Новый конспект';
            return;
        }
        let dtStr = note.updated_at || note.created_at;
        if (dtStr) {
            if (typeof dtStr === 'string') {
                dtStr = dtStr.replace(' ', 'T');
                if (!dtStr.endsWith('Z') && !dtStr.includes('+')) {
                    dtStr += 'Z';
                }
            }
            const dt = new Date(dtStr);
            if (!isNaN(dt.getTime())) {
                label.innerText = `Сохранено: ${dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            } else {
                label.innerText = 'Сохранено';
            }
        } else {
            label.innerText = 'Сохранено';
        }
    },

    toggleVersionsMenu(ctx, e) {
        if (e) e.stopPropagation();
        if (!ctx.state.currentNoteId) {
            if (window.showToast) window.showToast("Сначала сохраните конспект, чтобы работать с версиями", "warning");
            return;
        }
        let menu = document.getElementById('versionsMenu');
        if (!menu) return;
        let tocMenu = document.getElementById('tableOfContentsMenu');
        if (tocMenu) tocMenu.style.display = 'none';

        if (menu.style.display === 'none' || !menu.style.display) {
            ctx.loadVersions();
            menu.style.display = 'block';
            const closeHandler = (evt) => {
                if (!menu.contains(evt.target) && !evt.target.closest('#btnVersionsMenu')) {
                    menu.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 10);
        } else {
            menu.style.display = 'none';
        }
    },

    async loadVersions(ctx) {
        if (!ctx.state.currentNoteId) return;
        const container = document.getElementById('versionsListContainer');
        if (!container) return;
        container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.85rem; padding: 20px 0;">Загрузка версий...</div>';

        const versions = await DialecticsAPI.getVersions(ctx.state.currentNoteId);
        container.innerHTML = '';
        if (!versions || versions.length === 0) {
            container.innerHTML = '<div style="padding: 12px; color: #94a3b8; font-size: 0.85rem; text-align: center;">Нет сохраненных версий.</div>';
            return;
        }

        versions.forEach(v => {
            let dateStr = v.created_at;
            if (typeof dateStr === 'string') {
                dateStr = dateStr.replace(' ', 'T');
                if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
                    dateStr += 'Z';
                }
            }
            const dt = new Date(dateStr);
            const timeStr = isNaN(dt.getTime()) ? v.created_at : dt.toLocaleString();
            const badgeStyle = v.is_manual 
                ? 'background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;' 
                : 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;';
            const badgeText = v.is_manual ? '📌 Ручная' : '🤖 Авто';
            const pinIcon = v.is_manual ? '🔓 Открепить' : '📌 Закрепить';
            const pinTitle = v.is_manual ? 'Разрешить автоудаление версии' : 'Защитить от автоудаления (закрепить)';

            const el = document.createElement('div');
            el.style.cssText = 'border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; display: flex; flex-direction: column; gap: 6px;';
            el.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <span style="font-weight: 700; color: #1e293b; font-size: 0.9rem; word-break: break-word;">${v.title || 'Без названия'}</span>
                    <span style="font-size: 0.75rem; font-weight: 600; padding: 2px 6px; border-radius: 6px; white-space: nowrap; ${badgeStyle}">${badgeText}</span>
                </div>
                <div style="font-size: 0.75rem; color: #64748b;">${timeStr}</div>
                <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 4px;">
                    <button onclick="if(window.app) window.app.restoreVersion(${v.id})" style="background: #10b981; color: white; border: none; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer;" title="Восстановить эту версию">↩️ Восстановить</button>
                    <button onclick="if(window.app) window.app.togglePinVersion(${v.id})" style="background: white; border: 1px solid #cbd5e1; color: #334155; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer;" title="${pinTitle}">${pinIcon}</button>
                    <button onclick="if(window.app) window.app.deleteVersion(${v.id})" style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer;" title="Удалить версию">✕</button>
                </div>
            `;
            container.appendChild(el);
        });
    },

    async saveManualVersion(ctx) {
        if (!ctx.state.currentNoteId) {
            if (window.showToast) window.showToast("Сначала сохраните сам конспект", "warning");
            return;
        }
        const input = document.getElementById('newVersionTitleInput');
        const title = input ? input.value.trim() : "";
        
        await ctx.saveGlobal(false);
        
        const res = await DialecticsAPI.createVersion(ctx.state.currentNoteId, title);
        if (res) {
            if (input) input.value = '';
            if (window.showToast) window.showToast("Версия успешно сохранена", "success");
            await ctx.loadVersions();
        } else {
            if (window.showToast) window.showToast("Ошибка при сохранении версии", "error");
        }
    },

    async restoreVersion(ctx, versionId) {
        if (!ctx.state.currentNoteId) return;
        const confirmed = await customConfirm({
            title: "Восстановление версии",
            message: "Восстановить конспект из этой версии? Текущее состояние будет сохранено как резервная копия в истории.",
            icon: '↩️',
            buttons: [
                { label: 'Отмена', value: false, class: 'confirm-btn-secondary' },
                { label: 'Восстановить', value: true, class: 'confirm-btn-primary' }
            ]
        });
        if (!confirmed) return;
        
        const restoredNote = await DialecticsAPI.restoreVersion(ctx.state.currentNoteId, versionId);
        if (restoredNote) {
            ctx.state.isDirty = false;
            if (window.showToast) window.showToast("Версия восстановлена!", "success");
            await ctx.loadNoteToEditor(restoredNote.id, true, restoredNote);
            const menu = document.getElementById('versionsMenu');
            if (menu) menu.style.display = 'none';
        } else {
            if (window.showToast) window.showToast("Ошибка при восстановлении", "error");
        }
    },

    async togglePinVersion(ctx, versionId) {
        if (!ctx.state.currentNoteId) return;
        const res = await DialecticsAPI.togglePinVersion(ctx.state.currentNoteId, versionId);
        if (res) {
            if (window.showToast) window.showToast(res.is_manual ? "Версия закреплена от автоудаления" : "Версия откреплена (разрешено автоудаление)", "info");
            await ctx.loadVersions();
        } else {
            if (window.showToast) window.showToast("Ошибка при изменении статуса", "error");
        }
    },

    async deleteVersion(ctx, versionId) {
        if (!ctx.state.currentNoteId) return;
        const confirmed = await customConfirm({
            title: "Удаление версии",
            message: "Вы уверены, что хотите удалить эту версию из истории?",
            icon: '',
            buttons: [
                { label: 'Отмена', value: false, class: 'confirm-btn-secondary' },
                { label: 'Удалить', value: true, class: 'confirm-btn-danger' }
            ]
        });
        if (!confirmed) return;
        const ok = await DialecticsAPI.deleteVersion(ctx.state.currentNoteId, versionId);
        if (ok) {
            if (window.showToast) window.showToast("Версия удалена", "info");
            await ctx.loadVersions();
        } else {
            if (window.showToast) window.showToast("Ошибка при удалении версии", "error");
        }
    }
};
