import NotesAPI from './api.js';
import NoteStorageService from './NoteStorageService.js';
import DialogService from './DialogService.js';
import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';

class LoadNotesModalService {
    static async show(app, openTab = 'notes') {
        let currentStatus = 'all';
        let currentSearch = '';
        let currentCategory = '';
        let categories = [];
        let activeTab = openTab; // 'notes' | 'trash'
        
        try {
            const catRes = await fetch('/api/dialectics/categories/all');
            if (catRes.ok) categories = await catRes.json();
        } catch(e) {}

        const modalStyles = `
            <style>
                .premium-modal-content {
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .premium-tab-btn {
                    position: relative;
                    padding: 10px 20px;
                    border: none;
                    background: transparent;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    color: #64748b;
                    transition: color 0.3s ease;
                }
                .premium-tab-btn:hover {
                    color: #1e293b;
                }
                .premium-tab-btn.active {
                    color: #2563eb;
                }
                .premium-tab-btn.active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: #2563eb;
                    border-radius: 3px 3px 0 0;
                }
                .premium-tab-btn.trash.active {
                    color: #ef4444;
                }
                .premium-tab-btn.trash.active::after {
                    background: #ef4444;
                }
                .premium-input, .premium-select {
                    padding: 12px 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 0.95rem;
                    color: #1e293b;
                    background: #f8fafc;
                    transition: all 0.3s ease;
                    outline: none;
                }
                .premium-input:focus, .premium-select:focus {
                    background: #ffffff;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                }
                .premium-note-card {
                    padding: 14px 18px;
                    background: #ffffff;
                    border: 1px solid #f1f5f9;
                    border-radius: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    transition: all 0.25s ease;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.02);
                }
                .premium-note-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
                    border-color: #e2e8f0;
                }
                .premium-create-btn {
                    background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 14px;
                    font-weight: 600;
                    font-size: 1rem;
                    width: 100%;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                    margin-top: 10px;
                }
                .premium-create-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
                }
                .premium-create-btn:active {
                    transform: translateY(1px);
                }
                .premium-action-btn {
                    background: #fef2f2;
                    color: #ef4444;
                    border: none;
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    opacity: 0;
                    transform: scale(0.9);
                }
                .premium-note-card:hover .premium-action-btn {
                    opacity: 1;
                    transform: scale(1);
                }
                .premium-action-btn:hover {
                    background: #fee2e2;
                    transform: scale(1.05) !important;
                }
                .premium-restore-btn {
                    background: #f0fdf4;
                    color: #16a34a;
                    border: none;
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .premium-restore-btn:hover {
                    background: #dcfce7;
                    transform: translateY(-1px);
                }
                .premium-delete-perm-btn {
                    background: #fef2f2;
                    color: #ef4444;
                    border: none;
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .premium-delete-perm-btn:hover {
                    background: #fee2e2;
                    transform: translateY(-1px);
                }
                .premium-list {
                    padding: 4px;
                }
                .premium-list::-webkit-scrollbar {
                    width: 6px;
                }
                .premium-list::-webkit-scrollbar-track {
                    background: transparent; 
                }
                .premium-list::-webkit-scrollbar-thumb {
                    background: #cbd5e1; 
                    border-radius: 4px;
                }
                .premium-list::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8; 
                }
            </style>
        `;

        // --- Notes tab renderer ---
        const renderNotesTab = (notes) => {
            let html = `
                <div class="premium-modal-content">
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                    <input type="text" id="modal-search" class="premium-input" placeholder="Поиск конспектов..." value="${this.escapeHtml(currentSearch)}">
                    <div style="display:flex; gap:12px;">
                        <select id="modal-category" class="premium-select" style="flex:1;">
                            <option value="">Все категории</option>
                            ${categories.map(c => `<option value="${c.id}" ${currentCategory == c.id ? 'selected' : ''}>${this.escapeHtml(c.name)}</option>`).join('')}
                        </select>
                        <select id="modal-status" class="premium-select" style="flex:1;">
                            <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Все статусы</option>
                            <option value="none" ${currentStatus === 'none' ? 'selected' : ''}>Черновик</option>
                            <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>В процессе</option>
                            <option value="ready" ${currentStatus === 'ready' ? 'selected' : ''}>Готово</option>
                        </select>
                    </div>
                </div>
                <div class="notes-list premium-list" style="max-height: 380px; overflow-y: auto; overflow-x: hidden; margin-bottom:12px;">
            `;

            const filteredNotes = currentStatus === 'all' ? notes : notes.filter(n => n.status === currentStatus);

            if (filteredNotes.length === 0) {
                html += `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0; opacity: 0.7;">
                        <span style="font-size: 3rem; margin-bottom: 12px;">🔍</span>
                        <p style="color:#64748b; font-weight: 500; font-size: 1.05rem;">Ничего не найдено.</p>
                    </div>
                `;
            } else {
                filteredNotes.forEach(n => {
                    const statusColor = n.status === 'ready' ? '#10b981' : (n.status === 'in_progress' ? '#f59e0b' : '#94a3b8');
                    const statusName = n.status === 'ready' ? 'Готово' : (n.status === 'in_progress' ? 'В процессе' : 'Черновик');
                    const updatedAt = n.updated_at ? new Date(n.updated_at).toLocaleDateString('ru-RU') : '—';
                    
                    html += `
                        <div class="note-item premium-note-card">
                            <div style="min-width:0; flex:1;">
                                <span class="note-title-link" data-id="${n.id}" style="font-weight: 700; font-size: 1.05rem; cursor: pointer; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color: #0f172a; margin-bottom: 4px; transition: color 0.2s;">
                                    ${this.escapeHtml(n.title || 'Без названия')}
                                </span>
                                <span style="font-size: 0.85rem; color: #64748b; display: flex; align-items: center;">
                                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${statusColor}; margin-right:6px; box-shadow: 0 0 0 2px ${statusColor}33;"></span>
                                    <span style="font-weight: 500; margin-right: 8px;">${this.escapeHtml(statusName)}</span>
                                    <span style="color: #cbd5e1; margin-right: 8px;">•</span>
                                    <span>${updatedAt}</span>
                                </span>
                            </div>
                            <button class="premium-action-btn btn-delete-note" data-id="${n.id}" title="В корзину">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    `;
                });
            }
            html += `
                </div>
                <button class="premium-create-btn" id="btn-create-new-note">✨ Создать новый конспект</button>
                </div>
            `;
            return html;
        };

        // --- Trash tab renderer ---
        const renderTrashTab = (trashedNotes) => {
            if (!trashedNotes || trashedNotes.length === 0) {
                return `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; opacity: 0.7;">
                        <span style="font-size: 3.5rem; margin-bottom: 16px;">🗑️</span>
                        <p style="color:#64748b; font-weight: 500; font-size: 1.1rem;">Корзина пуста.</p>
                    </div>
                `;
            }
            let html = `<div class="notes-list premium-list" style="max-height: 420px; overflow-y: auto; overflow-x: hidden;">`;
            trashedNotes.forEach(n => {
                const deletedAt = n.deleted_at ? new Date(n.deleted_at).toLocaleDateString('ru-RU') : '—';
                html += `
                    <div class="note-item premium-note-card">
                        <div style="min-width:0; flex:1; padding-right: 12px;">
                            <span style="font-weight: 600; font-size: 1.05rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#475569; text-decoration: line-through; margin-bottom: 4px;">
                                ${this.escapeHtml(n.title || 'Без названия')}
                            </span>
                            <span style="font-size:0.85rem; color:#94a3b8; font-weight: 500;">Удалён: ${deletedAt}</span>
                        </div>
                        <div style="display:flex; gap:8px; flex-shrink:0;">
                            <button class="premium-restore-btn btn-restore-note" data-id="${n.id}" title="Восстановить">
                                <span style="margin-right: 4px;">↩</span> Восстановить
                            </button>
                            <button class="premium-delete-perm-btn btn-permanent-delete" data-id="${n.id}" title="Удалить навсегда">
                                ✕ Навсегда
                            </button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
            return html;
        };

        // --- Tab bar renderer ---
        const renderTabBar = () => `
            ${modalStyles}
            <div style="display:flex; gap:8px; margin-bottom:20px; border-bottom:2px solid #f1f5f9; padding-bottom:0; font-family: 'Inter', system-ui, sans-serif;">
                <button id="tab-btn-notes" class="premium-tab-btn ${activeTab === 'notes' ? 'active' : ''}">📄 Конспекты</button>
                <button id="tab-btn-trash" class="premium-tab-btn trash ${activeTab === 'trash' ? 'active' : ''}">🗑 Корзина</button>
            </div>
        `;

        // --- Load and re-render notes tab ---
        const loadNotes = async (dialog) => {
            const body = dialog.querySelector('.modal-dialog-body');
            try {
                const notes = await NotesAPI.getNotes(currentSearch, currentCategory);
                body.innerHTML = renderTabBar() + `<div id="tab-content">${renderNotesTab(notes)}</div>`;
                bindTabButtons(dialog);
                bindNotesEvents(dialog, notes);
            } catch(e) {
                body.innerHTML = renderTabBar() + '<p style="color:#ef4444;">Ошибка загрузки.</p>';
                bindTabButtons(dialog);
            }
        };

        // --- Load and re-render trash tab ---
        const loadTrash = async (dialog) => {
            const body = dialog.querySelector('.modal-dialog-body');
            try {
                const trashedNotes = await NotesAPI.getTrash();
                body.innerHTML = renderTabBar() + `<div id="tab-content">${renderTrashTab(trashedNotes)}</div>`;
                bindTabButtons(dialog);
                bindTrashEvents(dialog, trashedNotes);
            } catch(e) {
                body.innerHTML = renderTabBar() + '<p style="color:#ef4444;">Ошибка загрузки корзины.</p>';
                bindTabButtons(dialog);
            }
        };

        // --- Tab button bindings ---
        const bindTabButtons = (dialog) => {
            dialog.querySelector('#tab-btn-notes')?.addEventListener('click', () => {
                activeTab = 'notes';
                loadNotes(dialog);
            });
            dialog.querySelector('#tab-btn-trash')?.addEventListener('click', () => {
                activeTab = 'trash';
                loadTrash(dialog);
            });
        };

        let debounceTimer;
        // --- Notes tab event bindings ---
        const bindNotesEvents = (dialog, currentNotes) => {
            const searchInput = dialog.querySelector('#modal-search');
            const categorySelect = dialog.querySelector('#modal-category');
            const statusSelect = dialog.querySelector('#modal-status');

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    currentSearch = e.target.value;
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => loadNotes(dialog), 300);
                });
                const len = searchInput.value.length;
                searchInput.focus();
                searchInput.setSelectionRange(len, len);
            }

            if (categorySelect) {
                categorySelect.addEventListener('change', (e) => {
                    currentCategory = e.target.value;
                    loadNotes(dialog);
                });
            }

            if (statusSelect) {
                statusSelect.addEventListener('change', (e) => {
                    currentStatus = e.target.value;
                    const tabContent = dialog.querySelector('#tab-content');
                    if (tabContent) {
                        const filtered = currentStatus === 'all' ? currentNotes : currentNotes.filter(n => n.status === currentStatus);
                        tabContent.innerHTML = renderNotesTab(filtered.length > 0 ? filtered : []);
                        // Re-bind after re-render (note: filtered is a subset, rebind fresh)
                    }
                    loadNotes(dialog);
                });
            }

            dialog.querySelectorAll('.note-title-link').forEach(link => {
                link.addEventListener('click', async (e) => {
                    const id = e.target.closest('.note-title-link').dataset.id;
                    await NoteStorageService.loadNote(id);
                    if (dialog.closeModal) dialog.closeModal();
                });
            });

            dialog.querySelectorAll('.btn-delete-note').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const confirmed = await DialogService.confirm({
                        title: 'В корзину',
                        message: 'Переместить конспект в корзину?',
                        isDestructive: true,
                        confirmText: 'В корзину'
                    });
                    if (confirmed) {
                        const id = e.currentTarget.dataset.id;
                        await NotesAPI.deleteNote(id);
                        loadNotes(dialog);
                    }
                });
            });

            const btnNew = dialog.querySelector('#btn-create-new-note');
            if (btnNew) {
                btnNew.addEventListener('click', async () => {
                    await NoteStorageService.createNewNote();
                    if (dialog.closeModal) dialog.closeModal();
                });
            }
        };

        // --- Trash tab event bindings ---
        const bindTrashEvents = (dialog, trashedNotes) => {
            dialog.querySelectorAll('.btn-restore-note').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.dataset.id;
                    try {
                        const restored = await NotesAPI.restoreNote(id);
                        await NoteStorageService.loadNote(restored.id);
                        if (dialog.closeModal) dialog.closeModal();
                    } catch(err) {
                        await DialogService.alert('Ошибка', 'Не удалось восстановить конспект.');
                    }
                });
            });

            dialog.querySelectorAll('.btn-permanent-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const confirmed = await DialogService.confirm({
                        title: 'Удаление навсегда',
                        message: 'Удалить конспект безвозвратно? Это действие нельзя отменить.',
                        isDestructive: true,
                        confirmText: 'Удалить навсегда'
                    });
                    if (confirmed) {
                        const id = e.currentTarget.dataset.id;
                        try {
                            await NotesAPI.permanentDelete(id);
                            // If we just permanently deleted the currently open note — clear state
                            if (AppState.currentNote.id == id) {
                                AppState.setNote({ id: null, title: 'Новый конспект', blocks: [] });
                                BlockDOMRenderer.renderAll();
                            }
                            loadTrash(dialog);
                        } catch(err) {
                            await DialogService.alert('Ошибка', 'Не удалось удалить конспект.');
                        }
                    }
                });
            });
        };

        // --- Initial render ---
        try {
            let initialContent;
            if (activeTab === 'trash') {
                const trashedNotes = await NotesAPI.getTrash();
                initialContent = renderTabBar() + `<div id="tab-content">${renderTrashTab(trashedNotes)}</div>`;
                const modal = app.showModal('Корзина', initialContent);
                modal.dialog.closeModal = modal.close;
                bindTabButtons(modal.dialog);
                bindTrashEvents(modal.dialog, trashedNotes);
            } else {
                const initialNotes = await NotesAPI.getNotes();
                initialContent = renderTabBar() + `<div id="tab-content">${renderNotesTab(initialNotes)}</div>`;
                const modal = app.showModal('Открыть конспект', initialContent);
                modal.dialog.closeModal = modal.close;
                bindTabButtons(modal.dialog);
                bindNotesEvents(modal.dialog, initialNotes);
            }
        } catch(e) {
            console.error(e);
            app.showModal('Ошибка', '<p>Не удалось загрузить список конспектов.</p>');
        }
    }
    
    static escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
}

export default LoadNotesModalService;
