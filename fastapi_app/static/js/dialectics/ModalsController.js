/**
 * ModalsController.js - Контроллер модальных окон, категорий и связей Диалектики
 */
import { DialecticsAPI } from './api.js';
import { DialecticsUI } from './ui_utils.js';
import { BlockManager } from './BlockManager.js';
import { customConfirm } from '../modal_controller.js';

export const ModalsControllerMixin = {
    async showReferenceModal() {
        const modal = document.getElementById('referenceDialecticsModal');
        if (!modal) return;
        modal.style.display = 'flex';

        const contentEl = document.getElementById('dialecticsReferenceContent');
        if (!contentEl) return;

        if (contentEl.dataset.loaded === 'true') return;

        try {
            contentEl.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Загрузка справочника...</div>';
            const res = await fetch('/api/dialectics/reference');
            if (!res.ok) throw new Error("Failed to load reference");
            const data = await res.json();
            contentEl.innerHTML = `<div class="guide-markdown-content">${data.html}</div>`;
            contentEl.dataset.loaded = 'true';
        } catch (err) {
            console.error(err);
            contentEl.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Не удалось загрузить справочник.</div>';
        }
    },

    async showGuideModal() {
        const modal = document.getElementById('guideDialecticsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.offsetHeight; // trigger reflow
        modal.classList.add('active');

        const contentEl = document.getElementById('dialecticsGuideContent');
        if (!contentEl) return;

        if (contentEl.dataset.loaded === 'true') return;

        try {
            contentEl.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Загрузка инструкции...</div>';
            const res = await fetch('/api/dialectics/guide');
            if (!res.ok) throw new Error("Failed to load guide");
            const data = await res.json();
            contentEl.innerHTML = `<div class="guide-markdown-content">${data.html}</div>`;
            contentEl.dataset.loaded = 'true';
        } catch (err) {
            console.error(err);
            contentEl.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Не удалось загрузить инструкцию.</div>';
        }
    },

    hideGuideModal() {
        const modal = document.getElementById('guideDialecticsModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 200);
        }
    },

    showLoadModal() {
        this.logDebug("showLoadModal() called");
        if (this.dom.loadModal) {
            this.dom.loadModal.style.display = 'flex';
            this.dom.loadModal.offsetHeight; // trigger reflow
            this.dom.loadModal.classList.add('active');
            this.logDebug("loadModal display set to flex and active class added");
        } else {
            this.logDebug("ERROR: this.dom.loadModal is undefined!");
        }
        this.searchNotes("");
    },

    hideLoadModal() { 
        if (this.dom.loadModal) {
            this.dom.loadModal.classList.remove('active');
            setTimeout(() => this.dom.loadModal.style.display = 'none', 200);
        }
    },

    async searchNotes(query) {
        this.logDebug("searchNotes called with query: " + query);
        if (!this.dom.loadList) {
            this.logDebug("ERROR: this.dom.loadList is undefined!");
            return;
        }
        DialecticsUI.setLoading(this.dom.loadList);
        try {
            const notes = await DialecticsAPI.list(query);
            this.logDebug("DialecticsAPI.list returned " + notes.length + " notes");
            this.renderNotesList(notes);
        } catch (err) {
            this.logDebug("ERROR in DialecticsAPI.list: " + err.message);
        }
    },

    renderNotesList(notes) {
        this.dom.loadList.innerHTML = notes.length ? '' : '<div style="color: #64748b; text-align: center; padding: 20px;">Nothing found</div>';
        notes.forEach(n => {
            const i = document.createElement('div');
            i.className = 'load-note-item';

            const d = new Date(n.updated_at || n.created_at);
            let dateStr = "";
            if (d.getFullYear() > 1970) {
                dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            const pinnedIcon = n.is_pinned ? '<span style="color: #f59e0b; margin-right: 8px;" title="Pinned">📌</span>' : '';
            const delBtnHTML = (n.title === "Example Note" || n.title === "Пример конспекта" || n.title === "Конспект мысалы") ? '' : '<button class="load-note-item-delete" title="Delete">🗑️</button>';

            i.innerHTML = `
                <div class="load-note-item-content" style="flex: 1;">
                    <div class="load-note-item-title" style="display: flex; align-items: center; color: #1e293b; font-size: 1.05em; margin-bottom: 4px;">${pinnedIcon}<strong>${n.title || (window._ ? window._('dialectics.topic_placeholder') : "Untitled")}</strong></div>
                    <div class="load-note-item-date" style="color: #94a3b8; font-size: 0.85em;">${dateStr}</div>
                </div>
                ${delBtnHTML}
            `;

            i.onclick = () => this.loadNoteToEditor(n.id);

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
                        icon: '🗑️',
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
                            if (this.dom.loadList.children.length === 0) {
                                this.dom.loadList.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Nothing found</div>';
                            }
                            if (this.state.currentNoteId === n.id) {
                                this.close();
                                this.dom.title.value = "";
                                BlockManager.render(this.dom.canvas, []);
                                this.state.currentNoteId = null;
                                if (this.dom.deleteBtn) this.dom.deleteBtn.style.display = 'none';
                            }
                        }
                    }
                };
            }

            this.dom.loadList.appendChild(i);
        });
    },

    async deleteGlobal() {
        if (!this.state.currentNoteId) return;
        if (this.dom.title && (this.dom.title.value === "Example Note" || this.dom.title.value === "Пример конспекта" || this.dom.title.value === "Конспект мысалы")) {
            if(window.showToast) window.showToast(window._("toast.cannot_delete_the_example_note"), "error");
            return;
        }
        const confirmed = await customConfirm({
            title: window._ ? window._('dialectics.delete_note_title') : 'Удаление конспекта',
            message: window._ ? window._('dialectics.delete_note_msg') : 'Вы уверены, что хотите удалить этот конспект?',
            icon: '🗑️',
            buttons: [
                { label: window._ ? window._('dialectics.cancel') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                { label: window._ ? window._('dialectics.delete') : 'Удалить', value: true, class: 'confirm-btn-danger' }
            ]
        });
        if (confirmed) {
            const ok = await DialecticsAPI.delete(this.state.currentNoteId);
            if (ok) {
                window.showToast(window._("toast.dialectics_deleted"), "info");
                location.reload();
            }
        }
    },

    async pinCurrent() {
        if (!this.state.currentNoteId) {
            window.showToast(window._("toast.save_first_to_pin"), "warning");
            return;
        }

        const title = this.dom.title.value || (window._ ? window._('dialectics.topic_placeholder') : "Untitled Dialectics");
        const blocks = BlockManager.getBlocks(this.dom.canvas);

        const payload = {
            id: this.state.currentNoteId,
            title,
            blocks,
            is_pinned: true
        };

        const res = await DialecticsAPI.save(payload, this.state.currentNoteId);
        if (res) {
            window.showToast(window._("toast.pinned_successfully"), "success");
        }
    },

    showViewModal(id, title, blocks) {
        this.state.viewingNoteId = id;
        this.dom.viewTitle.textContent = title;

        let fullHtml = "";
        blocks.forEach(b => {
            fullHtml += `<div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <small style="color: #94a3b8; text-transform: uppercase;">${b.side}</small>
                <div>${b.html}</div>
            </div>`;
        });

        this.dom.viewBody.innerHTML = fullHtml;
        this.dom.viewModal.style.display = 'flex';
        this.dom.viewModal.offsetHeight; // trigger reflow
        this.dom.viewModal.classList.add('active');
    },

    hideViewModal() {
        if (this.dom.viewModal) {
            this.dom.viewModal.classList.remove('active');
            setTimeout(() => this.dom.viewModal.style.display = 'none', 200);
        }
        this.state.viewingNoteId = null;
    },

    async loadCategories() {
        try {
            this.state.categories = await DialecticsAPI.listCategories();
            this.renderCategorySelect();
            this.renderConnectionsCategories();
        } catch (e) {
            console.error("Error loading categories", e);
        }
    },

    renderCategorySelect() {
        if (!this.dom.categorySelect) return;
        const currentVal = this.dom.categorySelect.value;
        this.dom.categorySelect.innerHTML = '<option value="">Без категории</option>';
        this.state.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            this.dom.categorySelect.appendChild(opt);
        });
        
        const addOpt = document.createElement('option');
        addOpt.value = '__add_new__';
        addOpt.textContent = '➕ Новая категория...';
        addOpt.style.fontWeight = 'bold';
        addOpt.style.color = 'var(--color-primary)';
        this.dom.categorySelect.appendChild(addOpt);
        
        this.dom.categorySelect.value = currentVal;
    },

    renderConnectionsCategories() {
        if (!this.dom.connCategoriesList) return;
        this.dom.connCategoriesList.innerHTML = '';
        this.state.categories.forEach(cat => {
            const li = document.createElement('li');
            li.className = 'connections-category-item';
            li.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s; border: 1px solid transparent;';
            li.onmouseover = () => { li.style.backgroundColor = 'var(--color-bg-subtle)'; li.style.borderColor = 'var(--color-border)'; };
            li.onmouseout = () => { li.style.backgroundColor = 'transparent'; li.style.borderColor = 'transparent'; };
            
            li.innerHTML = `
                <span class="category-color-dot" style="width: 10px; height: 10px; border-radius: 50%; display: inline-block; background-color: ${cat.color || '#94a3b8'}; box-shadow: 0 0 0 2px ${cat.color}33;"></span>
                <span style="font-weight: 500; font-size: 0.95rem;">${cat.name}</span>
            `;
            li.addEventListener('click', () => {
                const searchInput = document.getElementById('connections-search-input');
                if (searchInput) {
                    searchInput.value = cat.name;
                    this.searchConnections(cat.name);
                }
            });
            this.dom.connCategoriesList.appendChild(li);
        });
    },

    async addCategory(e) {
        if (e) e.preventDefault();
        if (!this.dom.newCategoryInput) return;
        const name = this.dom.newCategoryInput.value.trim();
        if (!name) return;
        
        const success = await this.createNewCategory(name);
        if (success) {
            this.dom.newCategoryInput.value = '';
        }
    },

    async createNewCategory(name) {
        try {
            const newCat = await DialecticsAPI.createCategory(name);
            if (newCat) {
                this.state.categories.push(newCat);
                this.state.categories.sort((a,b) => a.name.localeCompare(b.name));
                this.renderCategorySelect();
                this.renderConnectionsCategories();
                
                if (this.dom.categorySelect) {
                    this.dom.categorySelect.value = newCat.id;
                }
                
                window.showToast("Категория добавлена", "success");
                return true;
            }
        } catch (e) {
            console.error("Error adding category", e);
            window.showToast("Ошибка при добавлении категории", "error");
        }
        return false;
    },

    async showConnectionsModal(e) {
        console.log("showConnectionsModal called", e);
        if (e) e.preventDefault();
        
        const modal = document.getElementById('dialectics-connections-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.offsetHeight; // trigger reflow
            modal.classList.add('active');
            this.dom.connectionsModal = modal;
            this.renderConnectionsCategories();
            this.searchConnections('');
        } else {
            console.error("Connections modal element not found in DOM!");
            window.showToast("Ошибка: модальное окно не найдено", "error");
        }
    },

    hideConnectionsModal() {
        if (this.dom.connectionsModal) {
            this.dom.connectionsModal.classList.remove('active');
            setTimeout(() => this.dom.connectionsModal.style.display = 'none', 200);
        }
    },

    async searchConnections(query) {
        if (!this.dom.connResultsContainer) return;
        
        this.dom.connResultsContainer.innerHTML = '<div style="color:#64748b; padding:20px; text-align:center; font-style: italic;"><i class="fas fa-circle-notch fa-spin" style="margin-right: 8px;"></i> Поиск...</div>';
        
        try {
            let results = [];
            if (!query || query.trim().length < 2) {
                results = await DialecticsAPI.list(''); 
            } else {
                results = await DialecticsAPI.searchNotes(query);
            }
            
            if (!results || results.length === 0) {
                this.dom.connResultsContainer.innerHTML = `
                    <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-light); opacity: 0.7; padding: 40px 0;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; color: var(--color-bg-app);"></i>
                        <p class="connections-empty-state" data-i18n="dialectics_search_empty" style="margin: 0; font-size: 0.95rem;">Ничего не найдено</p>
                    </div>`;
                return;
            }
            
            this.dom.connResultsContainer.innerHTML = '';
            results.forEach(note => {
                const item = document.createElement('div');
                item.className = 'connections-result-item';
                item.style.cssText = 'padding: 16px; border-radius: var(--radius-lg); background: var(--color-bg-white); border: 1px solid var(--color-border); cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;';
                item.onmouseover = () => { item.style.transform = 'translateY(-2px)'; item.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; item.style.borderColor = 'var(--color-primary)'; };
                item.onmouseout = () => { item.style.transform = 'translateY(0)'; item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; item.style.borderColor = 'var(--color-border)'; };
                
                const title = note.title || "Untitled";
                const catName = note.category ? note.category.name : "Без категории";
                const catColor = note.category && note.category.color ? note.category.color : "#cbd5e1";
                
                item.innerHTML = `
                    <div class="connections-result-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <strong style="font-size: 1.05rem; font-weight: 700; color: var(--color-text); line-height: 1.3;">${title}</strong>
                        <span class="connections-result-cat" style="background-color: ${catColor}15; color: ${catColor}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; border: 1px solid ${catColor}30;">${catName}</span>
                    </div>
                    <div class="connections-result-date" style="font-size: 0.8rem; color: var(--color-text-light);"><i class="far fa-clock" style="margin-right: 4px;"></i>${new Date(note.created_at).toLocaleDateString()}</div>
                `;
                
                item.addEventListener('click', () => {
                    this.loadNoteToEditor(note.id);
                    if (this.dom.connectionsModal) this.dom.connectionsModal.classList.remove('active');
                    setTimeout(() => { if(this.dom.connectionsModal) this.dom.connectionsModal.style.display = 'none'; }, 200);
                });
                
                this.dom.connResultsContainer.appendChild(item);
            });
            
        } catch (e) {
            console.error("Search error", e);
            this.dom.connResultsContainer.innerHTML = '<p class="connections-empty-state">Ошибка поиска</p>';
        }
    }
};
