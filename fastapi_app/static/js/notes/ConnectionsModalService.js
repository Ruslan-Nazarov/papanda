import AppState from './AppState.js';
import DialogService from './DialogService.js';
import NotesAPI from './api.js';
import { showToast } from './ToastService.js';

import { t } from '../i18n.js';
class ConnectionsModalService {
    static async show(app) {
        // Ensure current note is saved
        if (!AppState.currentNote || !AppState.currentNote.id) {
            try {
                const NoteStorageService = (await import('./NoteStorageService.js')).default;
                await NoteStorageService.saveCurrentNote();
            } catch (e) {
                console.error('Error auto-saving before connections modal:', e);
            }
        }

        if (!AppState.currentNote || !AppState.currentNote.id) {
            await DialogService.alert(t('attention_word'), t('conn_need_save'));
            return;
        }

        const currentNoteId = AppState.currentNote.id;

        let connections = [];
        let allNotes = [];
        let categories = [];

        try {
            categories = await NotesAPI.getCategories();
        } catch (e) {
            console.error('Error loading categories in connections modal:', e);
            categories = [];
        }

        try {
            allNotes = await NotesAPI.getNotes();
        } catch (e) {
            console.error('Error loading notes in connections modal:', e);
            allNotes = [];
        }

        if (currentNoteId) {
            try {
                connections = await NotesAPI.getConnections(currentNoteId);
            } catch (e) {
                console.error('Error loading connections in connections modal:', e);
                connections = [];
            }
        }

        // Show all notes (including current note with indicator)
        let notes = Array.isArray(allNotes) ? allNotes : [];

        let selectedCategoryId = null; // null = all
        let searchQuery = '';

        // Create modal DOM
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '3500';

        const dialog = document.createElement('div');
        dialog.className = 'connections-modal-dialog';

        dialog.innerHTML = `
            <!-- Header -->
            <div class="connections-modal-header">
                <h2 class="connections-modal-title">${t('conn_title')}</h2>
                <button class="connections-modal-close-btn" id="btn-close-conn-modal" title="${t('close_word')}">✕</button>
            </div>

            <!-- Search Bar -->
            <div class="connections-search-wrapper">
                <svg class="connections-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="connections-search-input" class="connections-search-input" placeholder="${t('conn_search_ph')}" autocomplete="off">
            </div>

            <!-- Body Columns -->
            <div class="connections-body-columns">
                <!-- Left Sidebar: Categories -->
                <div class="connections-sidebar">
                    <div>
                        <div class="connections-column-heading">${t('conn_categories')}</div>
                        <div class="connections-categories-list" id="connections-cat-list"></div>
                    </div>

                    <!-- Add Category Form -->
                    <div class="connections-add-category-section">
                        <div class="connections-add-category-form">
                            <input type="text" id="new-cat-name-input" class="connections-add-category-input" placeholder="${t('conn_new_cat_ph')}">
                            <button id="btn-add-new-category" class="connections-add-category-btn" title="${t('add_word')}">+</button>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Notes Cards -->
                <div class="connections-main-content">
                    <div class="connections-column-heading" id="connections-notes-heading">${t('conn_all_notes')}</div>
                    <div class="connections-notes-list" id="connections-notes-container"></div>
                </div>
            </div>

            <!-- Footer -->
            <div class="connections-modal-footer">
                <button class="connections-btn-close" id="btn-footer-close-conn">${t('close_word')}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const closeModal = () => {
            document.removeEventListener('keydown', onKeyDown);
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        dialog.querySelector('#btn-close-conn-modal').addEventListener('click', closeModal);
        dialog.querySelector('#btn-footer-close-conn').addEventListener('click', closeModal);

        // Helper: Is note connected?
        const isNoteConnected = (noteId) => {
            return connections.some(c => 
                (c.note_id_from === currentNoteId && c.note_id_to === noteId) ||
                (c.note_id_to === currentNoteId && c.note_id_from === noteId)
            );
        };

        // Render Categories
        const catListContainer = dialog.querySelector('#connections-cat-list');
        const renderCategories = () => {
            let html = `
                <div class="connections-category-item ${selectedCategoryId === null ? 'active' : ''}" data-cat-id="all">
                    <span class="connections-category-dot"></span>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t('all_word')}</span>
                </div>
            `;

            categories.forEach(c => {
                const isActive = selectedCategoryId === c.id;
                html += `
                    <div class="connections-category-item ${isActive ? 'active' : ''}" data-cat-id="${c.id}">
                        <span class="connections-category-dot" style="${c.color ? `background: ${c.color};` : ''}"></span>
                        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(c.name)}</span>
                    </div>
                `;
            });

            catListContainer.innerHTML = html;

            catListContainer.querySelectorAll('.connections-category-item').forEach(item => {
                item.addEventListener('click', () => {
                    const catIdAttr = item.dataset.catId;
                    if (catIdAttr === 'all') {
                        selectedCategoryId = null;
                    } else {
                        const parsed = parseInt(catIdAttr, 10);
                        selectedCategoryId = (selectedCategoryId === parsed) ? null : parsed;
                    }
                    renderCategories();
                    renderNotes();
                });
            });
        };

        // Render Notes
        const notesContainer = dialog.querySelector('#connections-notes-container');
        const notesHeading = dialog.querySelector('#connections-notes-heading');

        const renderNotes = () => {
            // Update heading
            if (selectedCategoryId !== null) {
                const curCat = categories.find(c => c.id === selectedCategoryId);
                notesHeading.textContent = curCat ? curCat.name.toUpperCase() : t('conn_notes');
            } else {
                notesHeading.textContent = t('conn_all_notes');
            }

            // Filter
            let filtered = notes.filter(n => {
                // Category filter
                if (selectedCategoryId !== null && n.category_id !== selectedCategoryId) {
                    return false;
                }
                // Search filter
                if (searchQuery) {
                    const titleMatch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase());
                    const catMatch = (n.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
                    if (!titleMatch && !catMatch) return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                notesContainer.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; padding: 40px 10px; font-size: 0.95rem;">
                        ${t('conn_notes_not_found')}
                    </div>
                `;
                return;
            }

            notesContainer.innerHTML = filtered.map(n => {
                const isCurrent = (n.id === currentNoteId);
                const connected = isNoteConnected(n.id);
                
                // Status dot: Green if ready/done, Orange if in_progress/draft/none
                const isReady = (n.status === 'ready' || n.status === 'done');
                const statusColor = isReady ? '#10b981' : '#ea580c';

                const catName = (n.category && n.category.name) ? n.category.name.toUpperCase() : t('conn_no_category');
                const formattedDate = this.formatDate(n.updated_at || n.created_at);

                return `
                    <div class="connections-note-card ${connected ? 'is-connected' : ''}" data-id="${n.id}">
                        <div class="connections-note-card-header">
                            <div class="connections-note-title-wrap">
                                <span class="connections-note-status-dot" style="background: ${statusColor};" title="${isReady ? t('st_ready') : t('st_draft')}"></span>
                                <span class="connections-note-title" title="${this.escapeHtml(n.title || t('untitled'))}">${this.escapeHtml(n.title || t('untitled'))}</span>
                                ${isCurrent ? `<span class="connections-current-badge">${t('conn_current')}</span>` : ''}
                            </div>
                            <span class="connections-note-category-badge">${this.escapeHtml(catName)}</span>
                        </div>

                        <div class="connections-note-card-footer">
                            <span class="connections-note-date">${formattedDate}</span>
                            <div class="connections-note-actions">
                                ${isCurrent ? `
                                    <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">${t('conn_open_now')}</span>
                                ` : `
                                    <button class="connections-card-btn btn-open-note" data-id="${n.id}" title="${t('load_notes_title')}">${t('conn_go')}</button>
                                    <button class="connections-card-btn btn-toggle-link ${connected ? 'is-connected' : ''}" data-id="${n.id}">
                                        ${connected ? t('conn_unlink') : t('conn_link')}
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Bind Card Events
            notesContainer.querySelectorAll('.connections-note-card').forEach(card => {
                const targetId = parseInt(card.dataset.id, 10);

                // Clicking the card toggles connection (unless clicking a specific action button)
                card.addEventListener('click', async (e) => {
                    if (e.target.closest('.btn-open-note')) return;
                    if (targetId === currentNoteId) {
                        showToast(t('conn_already_open'));
                        return;
                    }
                    await toggleConnection(targetId);
                });

                // Open note button
                const openBtn = card.querySelector('.btn-open-note');
                if (openBtn) {
                    openBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        try {
                            const NoteController = (await import('./NoteController.js')).default;
                            await NoteController.saveCurrentNote();
                            await NoteController.loadNote(targetId);
                            closeModal();
                        } catch (err) {
                            await DialogService.alert(t('error_word'), t('conn_open_failed') + err.message);
                        }
                    });
                }
            });
        };

        // Toggle Connection Logic
        const toggleConnection = async (targetId) => {
            const existing = connections.find(c => 
                (c.note_id_from === currentNoteId && c.note_id_to === targetId) ||
                (c.note_id_to === currentNoteId && c.note_id_from === targetId)
            );

            if (existing) {
                try {
                    await NotesAPI.deleteConnection(existing.id);
                    connections = connections.filter(c => c.id !== existing.id);
                    renderNotes();
                    showToast(t('conn_removed'));
                } catch (err) {
                    await DialogService.alert(t('error_word'), t('conn_remove_err') + err.message);
                }
            } else {
                try {
                    const newConn = await NotesAPI.createConnection(currentNoteId, targetId, 'related');
                    connections.push(newConn);
                    renderNotes();
                    showToast(t('conn_created'));
                } catch (err) {
                    await DialogService.alert(t('error_word'), t('conn_create_err') + err.message);
                }
            }
        };

        // Add Category Logic
        const newCatInput = dialog.querySelector('#new-cat-name-input');
        const newCatBtn = dialog.querySelector('#btn-add-new-category');

        const createNewCategory = async () => {
            const name = newCatInput.value.trim();
            if (!name) return;

            try {
                const created = await NotesAPI.createCategory(name);
                categories.push(created);
                newCatInput.value = '';
                selectedCategoryId = created.id;
                renderCategories();
                renderNotes();
                showToast(`«${name}» ${t('conn_cat_created')}`);
            } catch (err) {
                await DialogService.alert(t('error_word'), t('cat_create_err') + err.message);
            }
        };

        newCatBtn.addEventListener('click', createNewCategory);
        newCatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                createNewCategory();
            }
        });

        // Search Input Logic
        const searchInput = dialog.querySelector('#connections-search-input');
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderNotes();
        });

        // Initial Render
        renderCategories();
        renderNotes();

        setTimeout(() => {
            searchInput.focus();
        }, 50);
    }

    static formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}.${month}.${year}`;
        } catch (e) {
            return '';
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

export default ConnectionsModalService;
