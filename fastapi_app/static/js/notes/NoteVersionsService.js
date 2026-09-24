import NotesAPI from './api.js';
import AppState from './AppState.js';
import NoteController from './NoteController.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import DialogService from './DialogService.js';
import { t } from '../i18n.js';

class NoteVersionsService {
    static init() {
        window.app = window.app || {};
        window.app.versionsService = this;
    }

    static async show(app) {
        const noteId = AppState.currentNote.id;
        if (!noteId) {
            await DialogService.alert(t('versions_title'), t('versions_need_save'));
            return;
        }

        try {
            const versions = await NotesAPI.getVersions(noteId);

            const listHTML = versions && versions.length > 0
                ? `<div class="versions-cards-list" style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px; max-height: 400px; overflow-y: auto;">
                    ${versions.map(v => `
                        <div class="version-card-item" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="font-size: 1.05rem; font-weight: 700; color: #1e293b;">${this.escapeHtml(v.title)}</strong>
                                ${v.is_manual
                                    ? `<span style="background: #e0f2fe; color: #0284c7; padding: 3px 10px; border-radius: 8px; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><span style="color: #ec4899;">📌</span> ${t('version_manual')}</span>`
                                    : `<span style="background: #f1f5f9; color: #64748b; padding: 3px 10px; border-radius: 8px; font-size: 0.82rem; font-weight: 600;">🤖 ${t('version_auto')}</span>`}
                            </div>
                            <div style="color: #64748b; font-size: 0.88rem;">
                                ${DialogService.formatDateTime(v.created_at)}
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center; margin-top: 2px;">
                                <button class="action-btn" onclick="window.app.versionsService.restore(${v.id})" style="background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 0.95rem;">↪</span> ${t('restore_word')}
                                </button>
                                <button class="action-btn" onclick="window.app.versionsService.togglePin(${v.id}, ${v.is_manual})" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                    <span>${v.is_manual ? t('unpin_word') : t('pin_word')}</span>
                                </button>
                                <button class="action-btn" onclick="window.app.versionsService.delete(${v.id})" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 6px 10px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer;">
                                    ✕
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>`
                : `<p style="color: #94a3b8; padding: 1.5rem 0; text-align: center;">${t('versions_empty')}</p>`;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'modal-dialog version-history-modal';
            dialog.style.maxWidth = '520px';
            dialog.style.width = '90%';

            dialog.innerHTML = `
                <div class="modal-dialog-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.25rem;">⏱️</span>
                        <h2 style="font-size: 1.2rem; font-weight: 700; color: #1e293b; margin: 0;">${t('versions_title')}</h2>
                        <span style="color: #ec4899; font-weight: 800; font-size: 1.1rem; cursor: pointer;" title="${t('versions_autosave_note')}">❓</span>
                    </div>
                    <button class="icon-btn btn-close-modal" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer;">✕</button>
                </div>
                <div class="modal-dialog-body" style="padding: 18px 20px;">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="new-version-title" placeholder="${t('version_name_ph')}" style="flex: 1; padding: 9px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.92rem; outline: none;">
                        <button id="btn-save-custom-version" style="background: #2563eb; color: #ffffff; border: none; padding: 9px 18px; border-radius: 8px; font-size: 0.92rem; font-weight: 600; cursor: pointer; white-space: nowrap;">+ ${t('save')}</button>
                    </div>

                    ${listHTML}
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            this.currentModal = { overlay, dialog, close: () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); } };

            dialog.querySelector('.btn-close-modal').addEventListener('click', () => this.currentModal.close());
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.currentModal.close();
            });

            dialog.querySelector('#btn-save-custom-version').addEventListener('click', async () => {
                const input = dialog.querySelector('#new-version-title');
                const title = input.value.trim() || `${t('version')} ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
                await NoteController.createCheckpoint(title);
                this.currentModal.close();
                this.show(app);
            });

        } catch (e) {
            console.error(e);
            await DialogService.alert(t('error_word'), t('versions_load_failed'));
        }
    }

    static async restore(versionId) {
        const note = AppState.currentNote;
        const confirmed = await DialogService.confirm({
            title: t('confirm_restore_ver_title'),
            message: t('confirm_restore_ver_msg'),
            icon: '⏪',
            confirmText: t('restore_word')
        });
        if (!confirmed || AppState.currentNote !== note) return;

        try {
            const saved = await NoteController.saveCurrentNote();
            if (AppState.currentNote !== note || saved.id !== note.id) return;
            const editRevision = AppState.editRevision;
            const updatedNote = await NotesAPI.restoreVersion(note.id, versionId, saved.revision);
            if (AppState.currentNote !== note) return;
            if (AppState.editRevision !== editRevision) throw new Error('Local edits preserved; version restored on server');
            AppState.setNote(updatedNote);
            BlockDOMRenderer.renderAll();
            const oldModal = this.currentModal;
            await this.show(window.app);
            if (oldModal) oldModal.close();
            NoteController._showToast(t('version_restored'));
        } catch (e) {
            console.error(e);
            NoteController._showToast(t('version_restore_failed'), 'error');
        }
    }

    static async togglePin(versionId, isManual) {
        try {
            const noteId = AppState.currentNote.id;
            if (isManual) {
                // Unpin or delete/toggle
                await NotesAPI.pinVersion(noteId, versionId);
            } else {
                await NotesAPI.pinVersion(noteId, versionId);
            }
            const oldModal = this.currentModal;
            await this.show(window.app);
            if (oldModal) oldModal.close();
            NoteController._showToast(isManual ? t('version_unpinned') : t('version_pinned'));
        } catch (e) {
            console.error(e);
            NoteController._showToast(t('version_pin_failed'), 'error');
        }
    }

    static async delete(versionId) {
        const confirmed = await DialogService.confirm({
            title: t('confirm_del_ver_title'),
            message: t('confirm_del_ver_msg'),
            isDestructive: true,
            confirmText: t('tt_delete')
        });
        if (!confirmed) return;

        try {
            const noteId = AppState.currentNote.id;
            await NotesAPI.deleteVersion(noteId, versionId);
            const oldModal = this.currentModal;
            await this.show(window.app);
            if (oldModal) oldModal.close();
        } catch (e) {
            console.error(e);
            NoteController._showToast(t('version_del_failed'), 'error');
        }
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default NoteVersionsService;
