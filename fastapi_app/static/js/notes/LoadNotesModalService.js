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

        const modalStyles = '';

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
                        <div class="note-item premium-note-card" data-id="${n.id}" style="cursor: pointer;">
                            <div style="min-width:0; flex:1;">
                                <span class="note-title-link" data-id="${n.id}" style="font-weight: 700; font-size: 1.05rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color: #0f172a; margin-bottom: 4px; transition: color 0.2s;">
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
                                <svg style="pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
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
                    loadNotes(dialog);
                });
            }

            dialog.querySelectorAll('.premium-note-card').forEach(card => {
                card.addEventListener('click', async (e) => {
                    if (e.target.closest('.btn-delete-note')) return;
                    const id = card.dataset.id;
                    if (id) {
                        await NoteStorageService.loadNote(id);
                        if (dialog.closeModal) dialog.closeModal();
                    }
                });
            });

            dialog.querySelectorAll('.btn-delete-note').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const confirmed = await DialogService.confirm({
                        title: 'В корзину',
                        message: 'Переместить конспект в корзину?',
                        isDestructive: true,
                        confirmText: 'В корзину'
                    });
                    if (confirmed && id) {
                        try {
                            await NotesAPI.deleteNote(id);
                            if (AppState.currentNote && String(AppState.currentNote.id) === String(id)) {
                                const remaining = await NotesAPI.getNotes(currentSearch, currentCategory);
                                if (remaining && remaining.length > 0) {
                                    await NoteStorageService.loadNote(remaining[0].id);
                                } else {
                                    await NoteStorageService.createNewNote();
                                }
                            }
                            loadNotes(dialog);
                        } catch(err) {
                            console.error('Delete error:', err);
                            await DialogService.alert('Ошибка', 'Не удалось переместить конспект в корзину.');
                        }
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
                    e.stopPropagation();
                    const id = btn.dataset.id;
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
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const confirmed = await DialogService.confirm({
                        title: 'Удаление навсегда',
                        message: 'Удалить конспект безвозвратно? Это действие нельзя отменить.',
                        isDestructive: true,
                        confirmText: 'Удалить навсегда'
                    });
                    if (confirmed && id) {
                        try {
                            await NotesAPI.permanentDelete(id);
                            // If we just permanently deleted the currently open note — clear state
                            if (AppState.currentNote && String(AppState.currentNote.id) === String(id)) {
                                const remaining = await NotesAPI.getNotes();
                                if (remaining && remaining.length > 0) {
                                    await NoteStorageService.loadNote(remaining[0].id);
                                } else {
                                    await NoteStorageService.createNewNote();
                                }
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
