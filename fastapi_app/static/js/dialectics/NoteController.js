import { DialecticsAPI } from './api.js';
import { DialecticsUI } from './ui_utils.js';
import { BlockManager } from './BlockManager.js';
import { CanvasManager } from './CanvasManager.js';
import { customConfirm } from '../modal_controller.js';

class NoteControllerClass {
    async saveGlobal(shouldClose = true, toastKey = "toast.dialectics_saved") {
        const title = this.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        const html = this.editor.getHTML();
        const customBlockTitle = document.getElementById('editorBlockTitleInput')?.value?.trim() || "";
        console.log("TipTap HTML Output -> length:", html.length);
        if (this.state.editingAltCard && this.state.editingBlock) {
            const inner = this.state.editingAltCard.querySelector('.dialectics-content-inner');
            if (inner) {
                inner.innerHTML = html;
            }
            if (customBlockTitle) {
                const titleSpan = this.state.editingAltCard.querySelector('.alt-title');
                if (titleSpan) titleSpan.innerText = customBlockTitle;
            }
            const blocks = BlockManager.getBlocks(this.dom.canvas);
            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
        } else if (this.state.editingBlock) {
            const inner = this.state.editingBlock.querySelector('.dialectics-content-inner');
            if (inner) {
                inner.innerHTML = html;
            }
            if (customBlockTitle) {
                this.state.editingBlock.dataset.title = customBlockTitle;
            } else {
                delete this.state.editingBlock.dataset.title;
            }
            const blocks = BlockManager.getBlocks(this.dom.canvas);
            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
        } else if (this.state.pendingSide) {
            if (html !== '<p></p>' && html.trim() !== '') {
                const currentBlocks = BlockManager.getBlocks(this.dom.canvas);
                const newBlock = { 
                    id: this.state.pendingBlockId, 
                    side: this.state.pendingSide, 
                    html,
                    title: customBlockTitle || undefined
                };
                if (this.state.pendingRole) {
                    newBlock.role = this.state.pendingRole;
                }
                let newBlocks;
                if (this.state.insertAfterIndex !== null) {
                    // Insert after the specified index
                    newBlocks = [
                        ...currentBlocks.slice(0, this.state.insertAfterIndex + 1),
                        newBlock,
                        ...currentBlocks.slice(this.state.insertAfterIndex + 1)
                    ];
                } else {
                    newBlocks = [...currentBlocks, newBlock];
                }
                this.state.insertAfterIndex = null;
                this.state.pendingRole = null;
                BlockManager.render(this.dom.canvas, newBlocks, this._blockCallbacks());
            }
        }

        const blocks = BlockManager.getBlocks(this.dom.canvas);
        const categoryId = this.dom.categorySelect ? this.dom.categorySelect.value : null;

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
                tabs: b.tabs || undefined,
                active_tab_id: b.active_tab_id || undefined,
                split_view_tab_id: b.split_view_tab_id || undefined
            })),
            is_pinned: this.state.isPinned || false,
            category_id: categoryId ? parseInt(categoryId) : null,
            status: this.state.currentNoteStatus || "none",
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        if (this.state.currentNoteId) {
            payload.id = Number(this.state.currentNoteId);
        }

        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            this.state.currentNoteId = res.id;
            localStorage.setItem('dialectics_last_note_id', res.id);
            this.updateCurrentVersionDisplay(res);
            
            // Sync URL query parameter
            const url = new URL(window.location);
            if (url.searchParams.get('id') !== String(res.id)) {
                url.searchParams.set('id', res.id);
                window.history.pushState({}, '', url);
            }

            window.showToast(window._(toastKey) || window._("toast.dialectics_saved"), "success");
            if (shouldClose) {
                this.close();
            }
            if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'block';
            return res.id;
        }
        return null;
    }

    async openStickersForCurrent(forceBlockId = null) {
        if (!this.state.currentNoteId) {
            if (window.showToast) window.showToast(window._("toast.saving_note_to_attach_sticker"), "info");
            const savedId = await this.saveGlobal(false);
            if (!savedId) {
                if (window.showToast) window.showToast(window._("toast.failed_to_save_note"), "error");
                return;
            }
        }
        
        let blockId = forceBlockId;
        if (!blockId) {
            if (this.state.editingBlock) {
                blockId = this.state.editingBlock.dataset.blockId;
            } else if (this.state.pendingBlockId) {
                blockId = this.state.pendingBlockId;
            }
        }

        if (window.openParentStickers) {
            window.openParentStickers('dialectics', this.state.currentNoteId, blockId);
        }
    }

    async saveAndPin() {
        const title = this.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        let html = this.editor.getHTML() || (this.dom.dashboardTextarea?.value.replace(/\n/g, '<br>') || "");
        const categoryId = this.dom.categorySelect ? this.dom.categorySelect.value : null;

        const payload = {
            title,
            blocks: [{ side: 'left', html }],
            is_pinned: true,
            category_id: categoryId ? parseInt(categoryId) : null,
            status: this.state.currentNoteStatus || "none",
            sticker_text: document.getElementById('dialecticsStickerText')?.value || "",
            sticker_title: document.getElementById('dialecticsStickerTitle')?.value || "",
            sticker_color: document.getElementById('dialecticsStickerColor')?.value || "#fff9c4",
            sticker_type: document.getElementById('dialecticsStickerType')?.value || "text"
        };
        if (this.state.currentNoteId) {
            payload.id = this.state.currentNoteId;
        }

        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            this.updateCurrentVersionDisplay(res);
            window.showToast(window._("toast.saved_and_pinned"), "success");
            this.close();
            setTimeout(() => location.reload(), 500);
        }
    }

    async loadNoteToEditor(id, addToHistory = true, noteData = null) {
        if (typeof this.close === 'function') {
            this.close();
        }
        const n = noteData || await DialecticsAPI.get(id);
        if (n) {
            if (addToHistory && this.state.currentNoteId && this.state.currentNoteId !== n.id) {
                const history = this.getNoteHistory();
                if (history.length === 0 || history[history.length - 1] !== this.state.currentNoteId) {
                    history.push(this.state.currentNoteId);
                    this.saveNoteHistory(history);
                }
            }
            this.state.currentNoteId = n.id;
            localStorage.setItem('dialectics_last_note_id', n.id);
            this.updateCurrentVersionDisplay(n);
            this.dom.title.value = n.title;
            const blocks = typeof n.content_json === 'string' ? JSON.parse(n.content_json) : n.content_json;

            if (this.dom.categorySelect) {
                this.dom.categorySelect.value = n.category_id || "";
            }

            let stickersCountMap = {};
            try {
                const stickers = await fetch(`/api/stickers/dialectics/${n.id}/`).then(r => r.json());
                if (Array.isArray(stickers)) {
                    stickers.forEach(s => {
                        if (s.dialectics_block_id) {
                            stickersCountMap[s.dialectics_block_id] = (stickersCountMap[s.dialectics_block_id] || 0) + 1;
                        }
                    });
                }
            } catch(e) {
                console.error("Failed to load block stickers:", e);
            }
            this.state.blockStickersCount = stickersCountMap;

            const toggleOnlyTitles = document.getElementById('toggleOnlyTitlesMode');
            if (toggleOnlyTitles) {
                toggleOnlyTitles.checked = false;
                if (window.toggleOnlyTitlesMode) window.toggleOnlyTitlesMode(false);
            }

            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());

            this._revealInterface();
            this.hideLoadModal();
            if (this.dom.deleteBtn) {
                const cleanTitle = (n.title || "").trim().toLowerCase();
                const isDefaultNote = ["example note", "пример конспекта", "конспект мысалы", "summation", "суммирование", "суммалау"].includes(cleanTitle) || cleanTitle.includes("сумм") || cleanTitle.includes("summation") || cleanTitle.includes("пример конспекта");
                this.dom.deleteBtn.style.display = isDefaultNote ? 'none' : 'block';
            }

            // Sync URL query parameter
            const url = new URL(window.location);
            if (url.searchParams.get('id') !== String(n.id)) {
                url.searchParams.set('id', n.id);
                window.history.pushState({}, '', url);
            }
        } else {
            // Note not found (e.g. deleted), clear stored id and show empty
            localStorage.removeItem('dialectics_last_note_id');
            this.updateCurrentVersionDisplay(null);
            this._revealInterface();
        }
    }

    async loadExample(type = null) {
        if (typeof type !== 'string' || !type) {
            if (window.openExampleChoiceModal) {
                window.openExampleChoiceModal();
                return;
            }
            type = 'pythagoras';
        }
        await this.loadExampleNoteByType(type);
    }

    async loadExampleNoteByType(type = 'pythagoras') {
        DialecticsUI.setLoading(this.dom.canvas);
        try {
            const response = await fetch(`/api/dialectics/example/get_or_create_id?type=${type}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.id) {
                    await this.loadNoteToEditor(data.id);
                    const msg = type === 'summation' ? 
                        (window._ ? window._("toast.opened_summation_note") : "Конспект «Суммирование» загружен") : 
                        (window._ ? window._("toast.opened_existing_example_note") : "Пример конспекта загружен");
                    if (window.showToast) window.showToast(msg || "Пример конспекта загружен", "info");
                }
            } else {
                console.error("Failed to load example note ID.");
                DialecticsUI.clearLoading(this.dom.canvas);
            }
        } catch (e) {
            console.error(e);
            DialecticsUI.clearLoading(this.dom.canvas);
        }
    }

    async createNewNote() {
        if (this.state.isDirty) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_new_msg') : "Есть несохранённые изменения. Создать новый конспект?",
                icon: '⚠️',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.create_btn') : 'Создать', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (confirmed) {
                this.state.isDirty = false;
                this._resetToNewNote();
            }
        } else {
            this._resetToNewNote();
        }
    }

    _resetToNewNote() {
        if (this.state.currentNoteId) {
            const history = this.getNoteHistory();
            if (history.length === 0 || history[history.length - 1] !== this.state.currentNoteId) {
                history.push(this.state.currentNoteId);
                this.saveNoteHistory(history);
            }
        }
        this.state.currentNoteId = null;
        localStorage.removeItem('dialectics_last_note_id');
        this.updateCurrentVersionDisplay(null);
        if (this.dom.title) this.dom.title.value = "";
        if (this.dom.categorySelect) this.dom.categorySelect.value = "";
        if (this.dom.canvas) BlockManager.render(this.dom.canvas, [], this._blockCallbacks());
        if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'none';
        
        // Remove ?id=... query parameter from the URL
        const url = new URL(window.location);
        url.searchParams.delete('id');
        window.history.pushState({}, '', url);
        
        window.showToast(window._("toast.created_a_new_blank_note"), "success");
    }

    getNoteHistory() {
        try {
            const data = sessionStorage.getItem('dialectics_note_history');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveNoteHistory(history) {
        try {
            sessionStorage.setItem('dialectics_note_history', JSON.stringify(history));
        } catch (e) {}
    }

    loadPreviousNote() {
        const history = this.getNoteHistory();
        if (history.length > 0) {
            const prevId = history.pop();
            this.saveNoteHistory(history);
            this.loadNoteToEditor(prevId, false);
            window.showToast(window._("toast.loaded_previous_note"), "info");
        } else {
            window.location.href = '/';
        }
    }

    updateCurrentVersionDisplay(note) {
        this.updateStatusButtonDisplay(note ? (note.status || 'none') : 'none');
        const label = document.getElementById('currentVersionLabel');
        if (!label) return;
        if (!note) {
            label.innerText = 'Новый конспект';
            return;
        }
        const dtStr = note.updated_at || note.created_at;
        if (dtStr) {
            const dt = new Date(dtStr);
            label.innerText = `Сохранено: ${dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        } else {
            label.innerText = 'Сохранено';
        }
    }

    updateStatusButtonDisplay(status = 'none') {
        if (this.state) this.state.currentNoteStatus = status;
        const btn = document.getElementById('currentNoteStatusBtn');
        if (!btn) return;
        btn.className = `note-status-circle status-${status}`;
        let tooltip = 'Статус: Не указано (нажмите для смены)';
        if (status === 'in_progress') tooltip = 'В работе';
        else if (status === 'ready') tooltip = 'Готовый конспект';
        btn.title = tooltip;
    }

    async toggleCurrentNoteStatus(e) {
        if (e) e.stopPropagation();
        const current = (this.state && this.state.currentNoteStatus) || 'none';
        let next = 'none';
        if (current === 'none') next = 'in_progress';
        else if (current === 'in_progress') next = 'ready';
        else if (current === 'ready') next = 'none';
        
        this.updateStatusButtonDisplay(next);
        if (this.state && this.state.currentNoteId) {
            await DialecticsAPI.updateStatus(this.state.currentNoteId, next);
            if (window.showToast) {
                let msg = 'Статус изменён: Не указано';
                if (next === 'in_progress') msg = 'Статус изменён: В работе';
                if (next === 'ready') msg = 'Статус изменён: Готовый конспект';
                window.showToast(msg, 'success');
            }
        } else {
            if (window.showToast) {
                let msg = 'Статус установлен: Не указано (сохранится с конспектом)';
                if (next === 'in_progress') msg = 'Статус установлен: В работе (сохранится с конспектом)';
                if (next === 'ready') msg = 'Статус установлен: Готовый конспект (сохранится с конспектом)';
                window.showToast(msg, 'info');
            }
        }
    }

    toggleVersionsMenu(e) {
        if (e) e.stopPropagation();
        if (!this.state.currentNoteId) {
            if (window.showToast) window.showToast("Сначала сохраните конспект, чтобы работать с версиями", "warning");
            return;
        }
        let menu = document.getElementById('versionsMenu');
        if (!menu) return;
        let tocMenu = document.getElementById('tableOfContentsMenu');
        if (tocMenu) tocMenu.style.display = 'none';

        if (menu.style.display === 'none' || !menu.style.display) {
            this.loadVersions();
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
    }

    async loadVersions() {
        if (!this.state.currentNoteId) return;
        const container = document.getElementById('versionsListContainer');
        if (!container) return;
        container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.85rem; padding: 20px 0;">Загрузка версий...</div>';

        const versions = await DialecticsAPI.getVersions(this.state.currentNoteId);
        container.innerHTML = '';
        if (!versions || versions.length === 0) {
            container.innerHTML = '<div style="padding: 12px; color: #94a3b8; font-size: 0.85rem; text-align: center;">Нет сохраненных версий.</div>';
            return;
        }

        versions.forEach(v => {
            let dateStr = v.created_at;
            if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
                dateStr += 'Z';
            }
            const dt = new Date(dateStr);
            const timeStr = dt.toLocaleString();
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
                    <button onclick="if(window.app) window.app.deleteVersion(${v.id})" style="background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer;" title="Удалить версию">🗑️</button>
                </div>
            `;
            container.appendChild(el);
        });
    }

    async saveManualVersion() {
        if (!this.state.currentNoteId) {
            if (window.showToast) window.showToast("Сначала сохраните сам конспект", "warning");
            return;
        }
        const input = document.getElementById('newVersionTitleInput');
        const title = input ? input.value.trim() : "";
        
        await this.saveGlobal(false);
        
        const res = await DialecticsAPI.createVersion(this.state.currentNoteId, title);
        if (res) {
            if (input) input.value = '';
            if (window.showToast) window.showToast("Версия успешно сохранена", "success");
            await this.loadVersions();
        } else {
            if (window.showToast) window.showToast("Ошибка при сохранении версии", "error");
        }
    }

    async restoreVersion(versionId) {
        if (!this.state.currentNoteId) return;
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
        
        const restoredNote = await DialecticsAPI.restoreVersion(this.state.currentNoteId, versionId);
        if (restoredNote) {
            this.state.isDirty = false;
            if (window.showToast) window.showToast("Версия восстановлена!", "success");
            await this.loadNoteToEditor(restoredNote.id, true, restoredNote);
            const menu = document.getElementById('versionsMenu');
            if (menu) menu.style.display = 'none';
        } else {
            if (window.showToast) window.showToast("Ошибка при восстановлении", "error");
        }
    }

    async togglePinVersion(versionId) {
        if (!this.state.currentNoteId) return;
        const res = await DialecticsAPI.togglePinVersion(this.state.currentNoteId, versionId);
        if (res) {
            if (window.showToast) window.showToast(res.is_manual ? "Версия закреплена от автоудаления" : "Версия откреплена (разрешено автоудаление)", "info");
            await this.loadVersions();
        } else {
            if (window.showToast) window.showToast("Ошибка при изменении статуса", "error");
        }
    }

    async deleteVersion(versionId) {
        if (!this.state.currentNoteId) return;
        const confirmed = await customConfirm({
            title: "Удаление версии",
            message: "Вы уверены, что хотите удалить эту версию из истории?",
            icon: '🗑️',
            buttons: [
                { label: 'Отмена', value: false, class: 'confirm-btn-secondary' },
                { label: 'Удалить', value: true, class: 'confirm-btn-danger' }
            ]
        });
        if (!confirmed) return;
        const ok = await DialecticsAPI.deleteVersion(this.state.currentNoteId, versionId);
        if (ok) {
            if (window.showToast) window.showToast("Версия удалена", "info");
            await this.loadVersions();
        } else {
            if (window.showToast) window.showToast("Ошибка при удалении версии", "error");
        }
    }

    exportMarkdown() {
        const title = this.dom.title?.value || (window._ ? window._('dialectics.topic_placeholder') : "Конспект");
        const blocks = BlockManager.getBlocks(this.dom.canvas);
        if (!blocks || blocks.length === 0) {
            window.showToast(window._ ? window._('toast.no_blocks_to_export') || "Нет блоков для экспорта!" : "Нет блоков для экспорта!", "warning");
            return;
        }

        const htmlToMd = (html) => {
            if (!html) return '';
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            for (let i = 1; i <= 6; i++) {
                temp.querySelectorAll(`h${i}`).forEach(el => {
                    el.outerHTML = `\n${'#'.repeat(i)} ${el.innerText.trim()}\n\n`;
                });
            }
            temp.querySelectorAll('strong, b').forEach(el => {
                el.outerHTML = `**${el.innerText.trim()}**`;
            });
            temp.querySelectorAll('em, i').forEach(el => {
                el.outerHTML = `*${el.innerText.trim()}*`;
            });
            temp.querySelectorAll('code').forEach(el => {
                el.outerHTML = `\`${el.innerText.trim()}\``;
            });
            temp.querySelectorAll('a').forEach(el => {
                el.outerHTML = `[${el.innerText.trim()}](${el.getAttribute('href') || ''})`;
            });
            temp.querySelectorAll('img').forEach(el => {
                const alt = el.getAttribute('alt') || 'image';
                const src = el.getAttribute('src') || '';
                el.outerHTML = `\n![${alt}](${src})\n`;
            });
            temp.querySelectorAll('ul').forEach(ul => {
                let listMd = '\n';
                ul.querySelectorAll('li').forEach(li => {
                    listMd += `- ${li.innerText.trim()}\n`;
                });
                ul.outerHTML = listMd + '\n';
            });
            temp.querySelectorAll('ol').forEach(ol => {
                let listMd = '\n';
                ol.querySelectorAll('li').forEach((li, idx) => {
                    listMd += `${idx + 1}. ${li.innerText.trim()}\n`;
                });
                ol.outerHTML = listMd + '\n';
            });
            temp.querySelectorAll('p').forEach(el => {
                el.outerHTML = `${el.innerText.trim()}\n\n`;
            });
            temp.querySelectorAll('br').forEach(el => {
                el.outerHTML = '\n';
            });
            
            return temp.innerText.replace(/\n{3,}/g, '\n\n').trim();
        };

        let md = `# ${title}\n\n`;
        const categorySelect = this.dom.categorySelect || document.getElementById('dialecticsCategorySelect');
        if (categorySelect && categorySelect.selectedIndex > 0 && categorySelect.value !== "") {
            md += `**Категория:** ${categorySelect.options[categorySelect.selectedIndex].text}\n\n`;
        }
        md += `---\n\n`;

        blocks.forEach(block => {
            if (block.isSection || block.side === 'section') {
                md += `## ${block.title || 'Раздел'}\n\n`;
            } else {
                let sideLabel = '';
                if (block.side === 'left') sideLabel = '🔴 ТЕЗИС / ВОПРОС';
                else if (block.side === 'right') sideLabel = '🔵 АНТИТЕЗИС / ОТВЕТ';
                else if (block.side === 'center') sideLabel = '🟣 СИНТЕЗ / ВЫВОД';
                
                if (block.title) {
                    md += `### ${block.title}\n`;
                }
                if (sideLabel) {
                    md += `*${sideLabel}*\n\n`;
                }
                const contentMd = htmlToMd(block.html);
                if (contentMd) {
                    md += `${contentMd}\n\n`;
                }
                if (block.sources && block.sources.length > 0) {
                    md += `**Источники:**\n`;
                    block.sources.forEach(src => {
                        if (src.title || src.url) {
                            md += `- [${src.title || src.url}](${src.url || '#'}) ${src.quote ? `"${src.quote}"` : ''}\n`;
                        }
                    });
                    md += `\n`;
                }
                md += `---\n\n`;
            }
        });

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (title || 'dialectics_note').replace(/[^a-zA-Z0-9а-яА-Яw\-_ ]/g, '_');
        a.download = `${safeTitle}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.showToast(window._ ? window._('toast.export_md_success') || "Конспект экспортирован в Markdown!" : "Конспект экспортирован в Markdown!", "success");
    }

    exportPDF() {
        const title = this.dom.title?.value || (window._ ? window._('dialectics.topic_placeholder') : "Конспект");
        const blocks = BlockManager.getBlocks(this.dom.canvas);
        if (!blocks || blocks.length === 0) {
            window.showToast(window._ ? window._('toast.no_blocks_to_export') || "Нет блоков для экспорта!" : "Нет блоков для экспорта!", "warning");
            return;
        }

        const categorySelect = this.dom.categorySelect || document.getElementById('dialecticsCategorySelect');
        let categoryText = '';
        if (categorySelect && categorySelect.selectedIndex > 0 && categorySelect.value !== "") {
            categoryText = categorySelect.options[categorySelect.selectedIndex].text;
        }

        let htmlContent = '';
        blocks.forEach(block => {
            if (block.isSection || block.side === 'section') {
                htmlContent += `<div class="section-title">${block.title || 'Раздел'}</div>`;
            } else {
                let sideClass = 'block-left';
                let roleClass = 'role-left';
                let roleText = 'Тезис / Вопрос';
                if (block.side === 'right') {
                    sideClass = 'block-right';
                    roleClass = 'role-right';
                    roleText = 'Антитезис / Ответ';
                } else if (block.side === 'center') {
                    sideClass = 'block-center';
                    roleClass = 'role-center';
                    roleText = 'Синтез / Вывод';
                }

                htmlContent += `<div class="block-card ${sideClass}">`;
                htmlContent += `<div class="block-role ${roleClass}">${block.role || roleText}</div>`;
                if (block.title) {
                    htmlContent += `<div class="block-title">${block.title}</div>`;
                }
                htmlContent += `<div class="block-content">${block.html || ''}</div>`;
                if (block.sources && block.sources.length > 0) {
                    htmlContent += `<div class="block-sources"><strong>Источники:</strong><ul>`;
                    block.sources.forEach(src => {
                        if (src.title || src.url) {
                            htmlContent += `<li><a href="${src.url || '#'}" target="_blank">${src.title || src.url}</a> ${src.quote ? `— "${src.quote}"` : ''}</li>`;
                        }
                    });
                    htmlContent += `</ul></div>`;
                }
                htmlContent += `</div>`;
            }
        });

        const printWin = window.open('', '_blank');
        if (!printWin) {
            window.showToast("Пожалуйста, разрешите всплывающие окна для экспорта в PDF", "error");
            return;
        }

        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>
        @page {
            margin: 20mm;
            size: A4;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #fff;
        }
        .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .title {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 8px 0;
        }
        .category-badge {
            display: inline-block;
            background: #f1f5f9;
            color: #475569;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 600;
        }
        .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 32px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #cbd5e1;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        .block-card {
            margin-bottom: 16px;
            padding: 16px 20px;
            border-radius: 8px;
            page-break-inside: avoid;
            box-sizing: border-box;
        }
        .block-left { border-left: 5px solid #ea580c; background: #fffaf5; }
        .block-right { border-left: 5px solid #2563eb; background: #f8fafc; }
        .block-center { border-left: 5px solid #9333ea; background: #faf5ff; }
        .block-role {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .role-left { color: #ea580c; }
        .role-right { color: #2563eb; }
        .role-center { color: #9333ea; }
        .block-title {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #0f172a;
        }
        .block-content { font-size: 14px; }
        .block-content p { margin: 0 0 8px 0; }
        .block-content p:last-child { margin-bottom: 0; }
        .block-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
        .block-sources {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 12px;
            color: #64748b;
        }
        .block-sources ul { margin: 4px 0 0 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${title}</h1>
        ${categoryText ? `<div class="category-badge">${categoryText}</div>` : ''}
    </div>
    <div class="content">
        ${htmlContent}
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>`;

        printWin.document.open();
        printWin.document.write(fullHtml);
        printWin.document.close();
        window.showToast(window._ ? window._('toast.export_pdf_success') || "Открыто окно для печати в PDF!" : "Открыто окно для печати в PDF!", "info");
    }
}

export const NoteControllerMixin = {};
Object.getOwnPropertyNames(NoteControllerClass.prototype).forEach(key => {
    if (key !== 'constructor') NoteControllerMixin[key] = NoteControllerClass.prototype[key];
});
