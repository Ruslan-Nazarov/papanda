/**
 * ConnectionsModalService.js - Управление категориями и модальным окном связей/разделов
 */
import { DialecticsAPI } from '../api.js';

function parseUTCDate(dateStr) {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr += 'Z';
    }
    return new Date(dateStr);
}

export const ConnectionsModalService = {
    async loadCategories(ctx) {
        try {
            ctx.state.categories = await DialecticsAPI.listCategories();
            ctx.renderCategorySelect();
            ctx.renderConnectionsCategories();
        } catch (e) {
            console.error("Error loading categories", e);
        }
    },

    renderCategorySelect(ctx) {
        if (!ctx.dom.categorySelect) return;
        const currentVal = ctx.dom.categorySelect.value;
        ctx.dom.categorySelect.innerHTML = '<option value="">Без категории</option>';
        ctx.state.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            ctx.dom.categorySelect.appendChild(opt);
        });
        
        const addOpt = document.createElement('option');
        addOpt.value = '__add_new__';
        addOpt.textContent = '➕ Новая категория...';
        addOpt.style.fontWeight = 'bold';
        addOpt.style.color = 'var(--color-primary)';
        ctx.dom.categorySelect.appendChild(addOpt);
        
        ctx.dom.categorySelect.value = currentVal;
    },

    renderConnectionsCategories(ctx) {
        if (!ctx.dom.connCategoriesList) return;
        ctx.dom.connCategoriesList.innerHTML = '';
        ctx.state.categories.forEach(cat => {
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
                if (searchInput) searchInput.value = '';
                ctx.searchConnectionsByCategory(cat.id, cat.name);
            });
            ctx.dom.connCategoriesList.appendChild(li);
        });
    },

    async addCategory(ctx, e) {
        if (e) e.preventDefault();
        if (!ctx.dom.newCategoryInput) return;
        const name = ctx.dom.newCategoryInput.value.trim();
        if (!name) return;
        
        const success = await ctx.createNewCategory(name);
        if (success) {
            ctx.dom.newCategoryInput.value = '';
        }
    },

    async createNewCategory(ctx, name) {
        try {
            const newCat = await DialecticsAPI.createCategory(name);
            if (newCat) {
                ctx.state.categories.push(newCat);
                ctx.state.categories.sort((a,b) => a.name.localeCompare(b.name));
                ctx.renderCategorySelect();
                ctx.renderConnectionsCategories();
                
                if (ctx.dom.categorySelect) {
                    ctx.dom.categorySelect.value = newCat.id;
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

    async showConnectionsModal(ctx, e) {
        if (e) e.preventDefault();
        
        const modal = document.getElementById('dialectics-connections-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.offsetHeight; // trigger reflow
            modal.classList.add('active');
            ctx.dom.connectionsModal = modal;
            ctx.renderConnectionsCategories();
            const searchInput = document.getElementById('connections-search-input');
            if (searchInput) searchInput.value = '';
            ctx.searchConnections('');
        } else {
            console.error("Connections modal element not found in DOM!");
            if (window.showToast) window.showToast("Ошибка: модальное окно не найдено", "error");
        }
    },

    hideConnectionsModal(ctx) {
        if (ctx.dom.connectionsModal) {
            ctx.dom.connectionsModal.classList.remove('active');
            setTimeout(() => ctx.dom.connectionsModal.style.display = 'none', 200);
        }
    },

    async searchConnections(ctx, query) {
        if (!ctx.dom.connResultsContainer) return;
        
        const titleEl = document.getElementById('connections-pane-title');
        if (titleEl) {
            if (!query || query.trim().length === 0) {
                titleEl.textContent = 'Все конспекты';
            } else {
                titleEl.textContent = 'Результаты поиска';
            }
        }
        
        ctx.dom.connResultsContainer.innerHTML = '<div style="color:#64748b; padding:20px; text-align:center; font-style: italic;"><i class="fas fa-circle-notch fa-spin" style="margin-right: 8px;"></i> Поиск...</div>';
        
        try {
            let results = [];
            if (!query || query.trim().length < 2) {
                results = await DialecticsAPI.list(''); 
            } else {
                results = await DialecticsAPI.searchNotes(query);
            }
            
            if (!results || results.length === 0) {
                ctx.dom.connResultsContainer.innerHTML = `
                    <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-light); opacity: 0.7; padding: 40px 0;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; color: var(--color-bg-app);"></i>
                        <p class="connections-empty-state" data-i18n="dialectics_search_empty" style="margin: 0; font-size: 0.95rem;">Ничего не найдено</p>
                    </div>`;
                return;
            }
            
            ctx.dom.connResultsContainer.innerHTML = '';
            results.forEach(note => {
                const item = document.createElement('div');
                item.className = 'connections-result-item';
                item.style.cssText = 'padding: 16px; border-radius: var(--radius-lg); background: var(--color-bg-white); border: 1px solid var(--color-border); cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;';
                item.onmouseover = () => { item.style.transform = 'translateY(-2px)'; item.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; item.style.borderColor = 'var(--color-primary)'; };
                item.onmouseout = () => { item.style.transform = 'translateY(0)'; item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; item.style.borderColor = 'var(--color-border)'; };
                
                const title = note.title || "Untitled";
                const catName = note.category ? note.category.name : "Без категории";
                const catColor = note.category && note.category.color ? note.category.color : "#cbd5e1";
                
                const status = note.status || 'none';
                let tooltip = 'Статус: Не указано (нажмите для смены)';
                if (status === 'in_progress') tooltip = 'В работе';
                else if (status === 'ready') tooltip = 'Готовый конспект';

                item.innerHTML = `
                    <div class="connections-result-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="note-status-circle status-${status}" data-status="${status}" title="${tooltip}" onclick="if(window.app) window.app.toggleListNoteStatus(event, ${note.id}, this);"></button>
                            <strong style="font-size: 1.05rem; font-weight: 700; color: var(--color-text); line-height: 1.3;">${title}</strong>
                        </div>
                        <span class="connections-result-cat" style="background-color: ${catColor}15; color: ${catColor}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; border: 1px solid ${catColor}30;">${catName}</span>
                    </div>
                    <div class="connections-result-date" style="font-size: 0.8rem; color: var(--color-text-light);"><i class="far fa-clock" style="margin-right: 4px;"></i>${parseUTCDate(note.created_at).toLocaleDateString()}</div>
                `;
                
                item.addEventListener('click', () => {
                    ctx.loadNoteToEditor(note.id);
                    if (ctx.dom.connectionsModal) ctx.dom.connectionsModal.classList.remove('active');
                    setTimeout(() => { if(ctx.dom.connectionsModal) ctx.dom.connectionsModal.style.display = 'none'; }, 200);
                });
                
                ctx.dom.connResultsContainer.appendChild(item);
            });
            
        } catch (e) {
            console.error("Search error", e);
            ctx.dom.connResultsContainer.innerHTML = '<p class="connections-empty-state">Ошибка поиска</p>';
        }
    },

    async searchConnectionsByCategory(ctx, categoryId, categoryName) {
        if (!ctx.dom.connResultsContainer) return;
        
        const titleEl = document.getElementById('connections-pane-title');
        if (titleEl) {
            titleEl.textContent = `Конспекты раздела «${categoryName}»`;
        }
        
        ctx.dom.connResultsContainer.innerHTML = '<div style="color:#64748b; padding:20px; text-align:center; font-style: italic;"><i class="fas fa-circle-notch fa-spin" style="margin-right: 8px;"></i> Поиск...</div>';
        try {
            const results = await DialecticsAPI.listByCategory(categoryId);
            if (!results || results.length === 0) {
                ctx.dom.connResultsContainer.innerHTML = `
                    <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-light); opacity: 0.7; padding: 40px 0;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; color: var(--color-bg-app);"></i>
                        <p class="connections-empty-state" style="margin: 0; font-size: 0.95rem;">Нет конспектов в категории «${categoryName}»</p>
                    </div>`;
                return;
            }
            ctx.dom.connResultsContainer.innerHTML = '';
            results.forEach(note => {
                const item = document.createElement('div');
                item.className = 'connections-result-item';
                item.style.cssText = 'padding: 16px; border-radius: var(--radius-lg); background: var(--color-bg-white); border: 1px solid var(--color-border); cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;';
                item.onmouseover = () => { item.style.transform = 'translateY(-2px)'; item.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; item.style.borderColor = 'var(--color-primary)'; };
                item.onmouseout = () => { item.style.transform = 'translateY(0)'; item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; item.style.borderColor = 'var(--color-border)'; };
                const title = note.title || "Untitled";
                const catColor = note.category && note.category.color ? note.category.color : "#cbd5e1";
                const status = note.status || 'none';
                let tooltip = 'Статус: Не указано (нажмите для смены)';
                if (status === 'in_progress') tooltip = 'В работе';
                else if (status === 'ready') tooltip = 'Готовый конспект';

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="note-status-circle status-${status}" data-status="${status}" title="${tooltip}" onclick="if(window.app) window.app.toggleListNoteStatus(event, ${note.id}, this);"></button>
                            <strong style="font-size: 1.05rem; font-weight: 700; color: var(--color-text); line-height: 1.3;">${title}</strong>
                        </div>
                        <span style="background-color: ${catColor}15; color: ${catColor}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; border: 1px solid ${catColor}30;">${categoryName}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--color-text-light);"><i class="far fa-clock" style="margin-right: 4px;"></i>${parseUTCDate(note.created_at).toLocaleDateString()}</div>
                `;
                item.addEventListener('click', () => {
                    ctx.loadNoteToEditor(note.id);
                    if (ctx.dom.connectionsModal) ctx.dom.connectionsModal.classList.remove('active');
                    setTimeout(() => { if(ctx.dom.connectionsModal) ctx.dom.connectionsModal.style.display = 'none'; }, 200);
                });
                ctx.dom.connResultsContainer.appendChild(item);
            });
        } catch (e) {
            console.error("Category search error", e);
            ctx.dom.connResultsContainer.innerHTML = '<p class="connections-empty-state">Ошибка поиска</p>';
        }
    }
};
