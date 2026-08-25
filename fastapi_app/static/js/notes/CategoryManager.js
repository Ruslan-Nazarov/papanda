import AppState from './AppState.js';
import NotesAPI from './api.js';
import { showToast } from './ToastService.js';
import DialogService from './DialogService.js';

class CategoryManager {
    static categories = [];

    static async init() {
        const btn = document.getElementById('btn-category-select');
        const menu = document.getElementById('category-dropdown-menu');
        
        if (btn && menu) {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const isHidden = menu.classList.contains('hidden');
                document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
                if (isHidden) {
                    await this.loadAndRender();
                    menu.classList.remove('hidden');
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.category-dropdown-wrapper')) {
                    menu.classList.add('hidden');
                }
            });
        }

        document.addEventListener('noteLoaded', (e) => {
            this.updateLabel(e.detail.category_id);
        });

        // Initial load of categories list
        try {
            this.categories = await NotesAPI.getCategories();
            this.updateLabel(AppState.currentNote.category_id);
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    }

    static updateLabel(categoryId) {
        const label = document.getElementById('category-label');
        if (!label) return;

        if (!categoryId) {
            label.textContent = 'Без категории';
            return;
        }

        const cat = this.categories.find(c => c.id === categoryId);
        label.textContent = cat ? cat.name : 'Без категории';
    }

    static async loadAndRender() {
        const menu = document.getElementById('category-dropdown-menu');
        if (!menu) return;

        try {
            this.categories = await NotesAPI.getCategories();
        } catch (err) {
            console.error('Error fetching categories:', err);
        }

        const currentCatId = AppState.currentNote.category_id;

        let categoriesHTML = this.categories.map(c => {
            const isSelected = currentCatId === c.id;
            return `
                <div class="category-item ${isSelected ? 'selected' : ''}" data-id="${c.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; cursor: pointer; border-radius: 6px; transition: background 0.15s; font-size: 0.9rem; color: #1e293b;">
                    <span class="cat-name" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(c.name)}</span>
                    <div class="cat-actions" style="display: flex; align-items: center; gap: 4px; opacity: 0.6; transition: opacity 0.15s;">
                        <button class="cat-action-btn btn-edit-cat" data-id="${c.id}" data-name="${this.escapeHtml(c.name)}" title="Переименовать" style="background: none; border: none; font-size: 0.8rem; cursor: pointer; padding: 2px 4px; border-radius: 4px;">✏️</button>
                        <button class="cat-action-btn btn-del-cat" data-id="${c.id}" data-name="${this.escapeHtml(c.name)}" title="Удалить" style="background: none; border: none; font-size: 0.8rem; cursor: pointer; padding: 2px 4px; border-radius: 4px;">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        menu.innerHTML = `
            <div class="category-item ${!currentCatId ? 'selected' : ''}" data-id="" style="display: flex; align-items: center; padding: 7px 12px; cursor: pointer; border-radius: 6px; transition: background 0.15s; font-size: 0.9rem; color: #1e293b; font-weight: ${!currentCatId ? '600' : '400'};">
                <span class="cat-name" style="flex: 1;">Без категории</span>
            </div>
            ${categoriesHTML}
            <div style="height: 1px; background: #f1f5f9; margin: 6px 0;"></div>
            <div id="new-cat-btn-row" style="padding: 7px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; color: #ea580c; font-size: 0.9rem; font-weight: 600; border-radius: 6px; transition: background 0.15s;">
                <span style="color: #7c3aed; font-size: 1.1rem; line-height: 1;">✚</span>
                <span>Новая категория...</span>
            </div>
            <div id="new-cat-form" class="hidden" style="padding: 8px 10px; display: flex; gap: 6px; align-items: center;">
                <input type="text" id="new-cat-input" placeholder="Название..." style="flex: 1; padding: 6px 8px; border: 1.5px solid #ea580c; border-radius: 6px; font-size: 0.85rem; outline: none; box-sizing: border-box;">
                <button id="btn-save-new-cat" style="background: #ea580c; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">OK</button>
            </div>
        `;

        // Bind item selection
        menu.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.cat-action-btn')) return;
                const idStr = item.dataset.id;
                const catId = idStr ? parseInt(idStr, 10) : null;
                AppState.currentNote.category_id = catId;
                AppState.markDirty();
                this.updateLabel(catId);
                menu.classList.add('hidden');
            });

            // Hover effect on cat-actions
            item.addEventListener('mouseenter', () => {
                const actions = item.querySelector('.cat-actions');
                if (actions) actions.style.opacity = '1';
                item.style.background = '#f1f5f9';
            });
            item.addEventListener('mouseleave', () => {
                const actions = item.querySelector('.cat-actions');
                if (actions) actions.style.opacity = '0.6';
                if (!item.classList.contains('selected')) {
                    item.style.background = 'transparent';
                }
            });
        });

        // Bind Edit Category
        menu.querySelectorAll('.btn-edit-cat').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const catId = parseInt(btn.dataset.id, 10);
                const oldName = btn.dataset.name;
                const newName = await DialogService.prompt({
                    title: 'Редактирование категории',
                    message: 'Введите новое название категории:',
                    defaultValue: oldName,
                    confirmText: 'Сохранить'
                });
                if (newName && newName.trim() && newName.trim() !== oldName) {
                    try {
                        await NotesAPI.updateCategory(catId, newName.trim());
                        showToast('Категория обновлена');
                        await this.loadAndRender();
                        this.updateLabel(AppState.currentNote.category_id);
                    } catch (err) {
                        await DialogService.alert('Ошибка', 'Ошибка обновления категории: ' + err.message);
                    }
                }
            });
        });

        // Bind Delete Category
        menu.querySelectorAll('.btn-del-cat').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const catId = parseInt(btn.dataset.id, 10);
                const name = btn.dataset.name;
                const confirmed = await DialogService.confirm({
                    title: 'Удаление категории',
                    message: `Удалить категорию "${name}"?`,
                    isDestructive: true,
                    confirmText: 'Удалить'
                });
                if (confirmed) {
                    try {
                        await NotesAPI.deleteCategory(catId);
                        if (AppState.currentNote.category_id === catId) {
                            AppState.currentNote.category_id = null;
                            AppState.markDirty();
                        }
                        showToast('Категория удалена');
                        await this.loadAndRender();
                        this.updateLabel(AppState.currentNote.category_id);
                    } catch (err) {
                        await DialogService.alert('Ошибка', 'Ошибка удаления категории: ' + err.message);
                    }
                }
            });
        });

        // Bind New Category Button & Form
        const newBtnRow = menu.querySelector('#new-cat-btn-row');
        const newForm = menu.querySelector('#new-cat-form');
        const newInput = menu.querySelector('#new-cat-input');
        const saveNewBtn = menu.querySelector('#btn-save-new-cat');

        if (newBtnRow && newForm && newInput && saveNewBtn) {
            newBtnRow.addEventListener('click', (e) => {
                e.stopPropagation();
                newBtnRow.classList.add('hidden');
                newForm.classList.remove('hidden');
                newInput.focus();
            });

            const createCat = async () => {
                const name = newInput.value.trim();
                if (!name) return;
                try {
                    const newCat = await NotesAPI.createCategory(name);
                    AppState.currentNote.category_id = newCat.id;
                    AppState.markDirty();
                    showToast(`Категория "${name}" создана`);
                    await this.loadAndRender();
                    this.updateLabel(newCat.id);
                    menu.classList.add('hidden');
                } catch (err) {
                    await DialogService.alert('Ошибка', 'Ошибка создания категории: ' + err.message);
                }
            };

            saveNewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                createCat();
            });

            newInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    createCat();
                } else if (e.key === 'Escape') {
                    e.stopPropagation();
                    newForm.classList.add('hidden');
                    newBtnRow.classList.remove('hidden');
                }
            });
        }
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default CategoryManager;
