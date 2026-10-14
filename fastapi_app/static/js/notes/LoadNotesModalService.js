import NotesAPI from './api.js';
import NoteStorageService from './NoteStorageService.js';
import DialogService from './DialogService.js';
import AppState from './AppState.js';

import { t } from '../i18n.js';
class LoadNotesModalService {
    static async show(app, openTab = 'notes') {
        let currentStatus = 'all';
        let currentSearch = '';
        let currentCategory = '';
        let categories = [];
        const isTrash = openTab === 'trash';
        let requestSequence = 0;
        let debounceTimer;
        
        if (!isTrash) {
            try {
                const catRes = await fetch('/api/dialectics/categories/all');
                if (catRes.ok) categories = await catRes.json();
            } catch(e) {}
        }

        // --- Notes tab renderer ---
        const renderNotesTab = (notes) => {
            let html = `
                <div class="premium-modal-content">
                <p class="load-notes-hint">${t('load_notes_hint')}</p>
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                    <input type="search" id="modal-search" class="premium-input" aria-label="${t('load_search_ph')}" placeholder="${t('load_search_ph')}" value="${this.escapeHtml(currentSearch)}">
                    <div style="display:flex; gap:12px;">
                        <select id="modal-category" class="premium-select" style="flex:1;">
                            <option value="">${t('all_categories')}</option>
                            ${categories.map(c => `<option value="${c.id}" ${currentCategory == c.id ? 'selected' : ''}>${this.escapeHtml(c.name)}</option>`).join('')}
                        </select>
                        <select id="modal-status" class="premium-select" style="flex:1;">
                            <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>${t('all_statuses')}</option>
                            <option value="none" ${currentStatus === 'none' ? 'selected' : ''}>${t('st_draft')}</option>
                            <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>${t('st_in_progress')}</option>
                            <option value="ready" ${currentStatus === 'ready' ? 'selected' : ''}>${t('st_ready')}</option>
                        </select>
                    </div>
                </div>
                <div class="notes-list premium-list">
            `;

            const filteredNotes = currentStatus === 'all' ? notes : notes.filter(n => n.status === currentStatus);

            if (filteredNotes.length === 0) {
                html += `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 0; opacity: 0.7;">
                        <i class="ph ph-magnifying-glass load-empty-icon" aria-hidden="true"></i>
                        <p style="color:#64748b; font-weight: 500; font-size: 1.05rem;">${t('load_nothing')}</p>
                    </div>
                `;
            } else {
                filteredNotes.forEach(n => {
                    const statusColor = n.status === 'ready' ? '#10b981' : (n.status === 'in_progress' ? '#f59e0b' : '#94a3b8');
                    const statusName = n.status === 'ready' ? t('st_ready') : (n.status === 'in_progress' ? t('st_in_progress') : t('st_draft'));
                    const date = n.updated_at || n.created_at;
                    const updatedAt = date ? new Date(date).toLocaleDateString(document.documentElement.lang || 'ru') : '—';
                    
                    html += `
                        <div class="note-item premium-note-card" data-id="${n.id}" style="cursor: pointer;">
                            <div style="min-width:0; flex:1;">
                                <span class="note-title-link" data-id="${n.id}" title="${this.escapeHtml(n.title || t('untitled'))}" style="font-weight: 700; font-size: 1.05rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color: #0f172a; margin-bottom: 4px; transition: color 0.2s;">
                                    ${this.escapeHtml(n.title || t('untitled'))}
                                </span>
                                <span style="font-size: 0.85rem; color: #64748b; display: flex; align-items: center;">
                                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${statusColor}; margin-right:6px; box-shadow: 0 0 0 2px ${statusColor}33;"></span>
                                    <span style="font-weight: 500; margin-right: 8px;">${this.escapeHtml(statusName)}</span>
                                    <span style="color: #cbd5e1; margin-right: 8px;">•</span>
                                    <span>${updatedAt}</span>
                                </span>
                            </div>
                        </div>
                    `;
                });
            }
            html += `
                </div>
                </div>
            `;
            return html;
        };

        // --- Trash tab renderer ---
        const renderTrashTab = (trashedNotes) => {
            if (!trashedNotes || trashedNotes.length === 0) {
                return `
                    <p class="load-notes-hint">${t('trash_retention_hint')}</p>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; opacity: 0.7;">
                        <i class="ph ph-trash load-empty-icon" aria-hidden="true"></i>
                        <p style="color:#64748b; font-weight: 500; font-size: 1.1rem;">${t('trash_empty')}</p>
                    </div>
                `;
            }
            let html = `<p class="load-notes-hint">${t('trash_retention_hint')}</p><div class="notes-list premium-list">`;
            trashedNotes.forEach(n => {
                const deletedAt = n.deleted_at ? new Date(n.deleted_at).toLocaleDateString(document.documentElement.lang || 'ru') : '—';
                html += `
                    <div class="note-item premium-note-card">
                        <div style="min-width:0; flex:1; padding-right: 12px;">
                            <span style="font-weight: 600; font-size: 1.05rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#475569; text-decoration: line-through; margin-bottom: 4px;">
                                ${this.escapeHtml(n.title || t('untitled'))}
                            </span>
                            <span style="font-size:0.85rem; color:#94a3b8; font-weight: 500;">${t('deleted_at')}: ${deletedAt}</span>
                        </div>
                        <div style="display:flex; gap:8px; flex-shrink:0;">
                            <button class="premium-restore-btn btn-restore-note" data-id="${n.id}" title="${t('restore_permanently')}">
                                <i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i> ${t('restore_word')}
                            </button>
                            <button class="premium-delete-perm-btn btn-permanent-delete" data-id="${n.id}" title="${t('delete_forever')}">
                                <i class="ph ph-trash" aria-hidden="true"></i> ${t('forever_short')}
                            </button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
            return html;
        };

        // --- Load and re-render notes tab ---
        const loadNotes = async (dialog) => {
            clearTimeout(debounceTimer);
            const sequence = ++requestSequence;
            const body = dialog.querySelector('.modal-dialog-body');
            try {
                const notes = await NotesAPI.getNotes(currentSearch, currentCategory);
                if (!dialog.isConnected || sequence !== requestSequence) return;
                body.innerHTML = `<div id="tab-content">${renderNotesTab(notes)}</div>`;
                bindNotesEvents(dialog, notes);
            } catch(e) {
                if (!dialog.isConnected || sequence !== requestSequence) return;
                body.innerHTML = `<p style="color:#ef4444;">${t('load_error')}</p>`;
            }
        };

        // --- Load and re-render trash tab ---
        const loadTrash = async (dialog) => {
            clearTimeout(debounceTimer);
            const sequence = ++requestSequence;
            const body = dialog.querySelector('.modal-dialog-body');
            try {
                const trashedNotes = await NotesAPI.getTrash();
                if (!dialog.isConnected || sequence !== requestSequence) return;
                body.innerHTML = `<div id="tab-content">${renderTrashTab(trashedNotes)}</div>`;
                bindTrashEvents(dialog, trashedNotes);
            } catch(e) {
                if (!dialog.isConnected || sequence !== requestSequence) return;
                body.innerHTML = `<p style="color:#ef4444;">${t('trash_load_failed')}</p>`;
            }
        };

        // --- Notes tab event bindings ---
        const bindNotesEvents = (dialog, currentNotes) => {
            const searchInput = dialog.querySelector('#modal-search');
            const categorySelect = dialog.querySelector('#modal-category');
            const statusSelect = dialog.querySelector('#modal-status');

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    currentSearch = e.target.value;
                    ++requestSequence;
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
                    const id = card.dataset.id;
                    if (id) {
                        try {
                            await NoteStorageService.openNote(id);
                            if (dialog.closeModal) dialog.closeModal();
                        } catch {
                            await DialogService.alert(t('error_word'), t('note_load_failed'));
                        }
                    }
                });
            });

        };

        // --- Trash tab event bindings ---
        const bindTrashEvents = (dialog, trashedNotes) => {
            dialog.querySelectorAll('.btn-restore-note').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    try {
                        const restored = await NotesAPI.restoreNote(id);
                        await NoteStorageService.openNote(restored.id);
                        if (dialog.closeModal) dialog.closeModal();
                    } catch(err) {
                        await DialogService.alert(t('error_word'), t('restore_failed'));
                    }
                });
            });

            dialog.querySelectorAll('.btn-permanent-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const confirmed = await DialogService.confirm({
                        title: t('confirm_perma_title'),
                        message: t('confirm_perma_msg'),
                        isDestructive: true,
                        confirmText: t('delete_forever')
                    });
                    if (confirmed && id) {
                        try {
                            await NotesAPI.permanentDelete(id);
                            // If we just permanently deleted the currently open note — clear state
                            if (AppState.currentNote && String(AppState.currentNote.id) === String(id)) {
                                await NoteStorageService.createNewNote({preserveChanges: false});
                                const remaining = await NotesAPI.getNotes();
                                if (remaining && remaining.length > 0) {
                                    await NoteStorageService.loadNote(remaining[0].id);
                                }
                            }
                            loadTrash(dialog);
                        } catch(err) {
                            await DialogService.alert(t('error_word'), err.status === 409
                                ? t('version_material_delete_blocked') : t('perma_delete_failed'));
                        }
                    }
                });
            });
        };

        // --- Initial render ---
        try {
            let initialContent;
            if (isTrash) {
                const trashedNotes = await NotesAPI.getTrash();
                initialContent = `<div id="tab-content">${renderTrashTab(trashedNotes)}</div>`;
                const modal = app.showModal(t('trash_title'), initialContent, {className: 'load-notes-modal'});
                modal.dialog.closeModal = modal.close;
                bindTrashEvents(modal.dialog, trashedNotes);
            } else {
                const initialNotes = await NotesAPI.getNotes();
                initialContent = `<div id="tab-content">${renderNotesTab(initialNotes)}</div>`;
                const modal = app.showModal(t('load_notes_title'), initialContent, {className: 'load-notes-modal'});
                modal.dialog.closeModal = modal.close;
                bindNotesEvents(modal.dialog, initialNotes);
            }
        } catch(e) {
            console.error(e);
            app.showModal(t('error_word'), `<p>${t('load_list_failed')}</p>`);
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
