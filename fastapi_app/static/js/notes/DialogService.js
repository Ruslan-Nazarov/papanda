import NotesAPI from './api.js';

import { t } from '../i18n.js';
class DialogService {
    static async selectInternalLink(isEditing = false) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '4000';

            const dialog = document.createElement('div');
            dialog.className = 'modal-dialog';
            dialog.style.maxWidth = '600px';
            dialog.style.width = '90%';
            dialog.style.maxHeight = '80vh';
            dialog.style.display = 'flex';
            dialog.style.flexDirection = 'column';
            dialog.style.borderRadius = '16px';
            dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
            dialog.style.background = '#ffffff';

            dialog.innerHTML = `
                <div class="modal-dialog-header" style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                        <span>🔗</span> ${t('dlg_internal_link')}
                    </h2>
                    <button class="btn-close-dialog" style="background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer;">✕</button>
                </div>
                <div class="modal-dialog-body" style="padding: 0; flex: 1; overflow-y: auto; background: #f8fafc;">
                    <div id="internal-link-list" style="padding: 12px;">
                        <div style="text-align: center; padding: 20px; color: #64748b;">${t('loading')}</div>
                    </div>
                </div>
                <div class="modal-dialog-footer" style="padding: 12px 20px; background: #ffffff; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                    <div id="internal-link-selected" style="font-size: 0.9rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50%;">${t('dlg_nothing_selected')}</div>
                    <div style="display: flex; gap: 10px;">
                        ${isEditing ? `<button class="btn-delete-dialog" style="background: #ef4444; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">${t('tt_delete')}</button>` : ''}
                        <button class="btn-cancel-dialog" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">${t('cancel')}</button>
                        <button class="btn-confirm-dialog" style="background: #2563eb; color: white; border: none; padding: 8px 22px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;" disabled>${t('insert_word')}</button>
                    </div>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            let selectedUrl = null;
            const confirmBtn = dialog.querySelector('.btn-confirm-dialog');
            const cancelBtn = dialog.querySelector('.btn-cancel-dialog');
            const closeBtn = dialog.querySelector('.btn-close-dialog');
            const deleteBtn = dialog.querySelector('.btn-delete-dialog');
            const listContainer = dialog.querySelector('#internal-link-list');
            const selectedText = dialog.querySelector('#internal-link-selected');

            const finish = (val) => {
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                resolve(val);
            };

            confirmBtn.addEventListener('click', () => finish(selectedUrl));
            cancelBtn.addEventListener('click', () => finish(null));
            closeBtn.addEventListener('click', () => finish(null));
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => finish(''));
            }
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) finish(null);
            });

            const updateSelection = (url, label) => {
                selectedUrl = url;
                if (url) {
                    selectedText.textContent = label;
                    selectedText.style.color = '#2563eb';
                    confirmBtn.disabled = false;
                } else {
                    selectedText.textContent = t('picker_nothing');
                    selectedText.style.color = '#64748b';
                    confirmBtn.disabled = true;
                }
            };

            const renderNotes = async () => {
                try {
                    const notes = await NotesAPI.getNotes();
                    listContainer.innerHTML = '';
                    if (notes.length === 0) {
                        listContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #64748b;">${t('picker_no_notes')}</div>`;
                        return;
                    }
                    
                    notes.forEach(note => {
                        const noteEl = document.createElement('div');
                        noteEl.style.cssText = 'background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; overflow: hidden; transition: all 0.2s;';
                        
                        const noteHeader = document.createElement('div');
                        noteHeader.style.cssText = 'padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;';
                        noteHeader.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                <span style="font-size: 1.2rem;">📓</span>
                                <span style="font-weight: 600; color: #1e293b;">${this.escapeHtml(note.title || t('untitled'))}</span>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                <button class="btn-select-note" style="padding: 4px 10px; background: #e0e7ff; color: #4f46e5; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">${t('dlg_select')}</button>
                                <button class="btn-expand-note" style="padding: 4px 10px; background: #f1f5f9; color: #64748b; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">${t('picker_blocks')} ▾</button>
                            </div>
                        `;
                        
                        const blocksContainer = document.createElement('div');
                        blocksContainer.style.cssText = 'display: none; padding: 8px; background: #f8fafc; border-top: 1px solid #f1f5f9; max-height: 200px; overflow-y: auto;';
                        
                        noteEl.appendChild(noteHeader);
                        noteEl.appendChild(blocksContainer);
                        listContainer.appendChild(noteEl);

                        noteHeader.querySelector('.btn-select-note').addEventListener('click', (e) => {
                            e.stopPropagation();
                            document.querySelectorAll('.internal-link-active').forEach(el => {
                                el.classList.remove('internal-link-active');
                                el.style.border = '1px solid #e2e8f0';
                            });
                            noteEl.classList.add('internal-link-active');
                            noteEl.style.border = '1px solid #3b82f6';
                            updateSelection(`internal://note/${note.id}`, note.title || t('untitled'));
                        });

                        noteHeader.querySelector('.btn-expand-note').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            if (blocksContainer.style.display === 'block') {
                                blocksContainer.style.display = 'none';
                                e.target.textContent = t('picker_blocks') + ' ▾';
                                return;
                            }
                            
                            e.target.textContent = t('loading');
                            try {
                                const fullNote = await NotesAPI.getNote(note.id);
                                blocksContainer.innerHTML = '';
                                const blocks = (fullNote.content_json || fullNote.blocks || []).filter(b => b.role !== 'section' && b.title);
                                
                                if (blocks.length === 0) {
                                    blocksContainer.innerHTML = `<div style="padding: 8px 12px; color: #94a3b8; font-size: 0.85rem;">${t('picker_no_blocks')}</div>`;
                                } else {
                                    blocks.forEach(block => {
                                        const blockEl = document.createElement('div');
                                        blockEl.style.cssText = 'padding: 8px 12px; margin-bottom: 4px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 0.9rem; color: #334155; display: flex; align-items: center; gap: 8px; transition: background 0.2s;';
                                        blockEl.innerHTML = `<span>🔹</span> <span style="flex: 1;">${this.escapeHtml(block.title)}</span>`;
                                        
                                        blockEl.addEventListener('click', () => {
                                            document.querySelectorAll('.internal-link-active').forEach(el => {
                                                el.classList.remove('internal-link-active');
                                                el.style.border = '1px solid #e2e8f0';
                                                el.style.background = '#ffffff';
                                            });
                                            blockEl.classList.add('internal-link-active');
                                            blockEl.style.border = '1px solid #3b82f6';
                                            blockEl.style.background = '#eff6ff';
                                            updateSelection(`internal://note/${note.id}/block/${block.id}`, `${note.title || t('untitled')} → ${block.title}`);
                                        });
                                        
                                        blocksContainer.appendChild(blockEl);
                                    });
                                }
                                blocksContainer.style.display = 'block';
                                e.target.textContent = t('picker_blocks') + ' ▴';
                            } catch (err) {
                                e.target.textContent = t('error_word');
                            }
                        });
                    });
                } catch (err) {
                    listContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #ef4444;">${t('picker_load_err')}: ${this.escapeHtml(err.message)}</div>`;
                }
            };

            renderNotes();
        });
    }

    static alert(titleOrMessage, message = null, options = {}) {
        let title = t('dlg_notice');
        let content = '';

        if (message === null) {
            content = titleOrMessage;
        } else {
            title = titleOrMessage;
            content = message;
        }

        const icon = options.icon || (title.includes(t('dlg_err_marker')) ? '⚠️' : 'ℹ️');
        const buttonText = options.buttonText || 'OK';

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '4000';

            const dialog = document.createElement('div');
            dialog.className = 'modal-dialog';
            dialog.style.maxWidth = '420px';
            dialog.style.borderRadius = '16px';
            dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
            dialog.style.background = '#ffffff';

            dialog.innerHTML = `
                <div class="modal-dialog-header" style="padding: 14px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                    <h2 style="display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: 700; color: #1e293b;">
                        <span>${icon}</span>
                        <span>${this.escapeHtml(title)}</span>
                    </h2>
                    <button class="icon-btn btn-close-dialog" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 2px 6px; border-radius: 4px;">✕</button>
                </div>
                <div class="modal-dialog-body" style="padding: 20px 22px; color: #334155; font-size: 0.95rem; line-height: 1.5;">
                    ${this.escapeHtml(content)}
                </div>
                <div class="modal-dialog-footer" style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end;">
                    <button class="btn-ok-dialog" style="background: #2563eb; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer; transition: background 0.15s;">
                        ${this.escapeHtml(buttonText)}
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const close = () => {
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                resolve();
            };

            const okBtn = dialog.querySelector('.btn-ok-dialog');
            okBtn.focus();
            okBtn.addEventListener('click', close);
            dialog.querySelector('.btn-close-dialog').addEventListener('click', close);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });

            const onKey = (e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    document.removeEventListener('keydown', onKey);
                    close();
                }
            };
            document.addEventListener('keydown', onKey);
        });
    }

    static confirm(optionsOrMessage, message = null) {
        let options;
        if (typeof optionsOrMessage === 'string') {
            if (message !== null) {
                options = { title: optionsOrMessage, message };
            } else {
                options = { title: t('dlg_confirm_title'), message: optionsOrMessage };
            }
        } else {
            options = optionsOrMessage || {};
        }

        const title = options.title || t('dlg_confirm_title');
        const content = options.message || '';
        const icon = options.icon || (options.isDestructive ? '🗑️' : '❓');
        const confirmText = options.confirmText || (options.isDestructive ? t('delete') : t('dlg_confirm_yes'));
        const cancelText = options.cancelText || t('cancel');
        const isDestructive = !!options.isDestructive;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '4000';

            const dialog = document.createElement('div');
            dialog.className = 'modal-dialog';
            dialog.style.maxWidth = '440px';
            dialog.style.borderRadius = '16px';
            dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
            dialog.style.background = '#ffffff';

            dialog.innerHTML = `
                <div class="modal-dialog-header" style="padding: 14px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                    <h2 style="display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: 700; color: #1e293b;">
                        <span>${icon}</span>
                        <span>${this.escapeHtml(title)}</span>
                    </h2>
                    <button class="icon-btn btn-close-dialog" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 2px 6px; border-radius: 4px;">✕</button>
                </div>
                <div class="modal-dialog-body" style="padding: 20px 22px; color: #334155; font-size: 0.95rem; line-height: 1.5;">
                    ${this.escapeHtml(content)}
                </div>
                <div class="modal-dialog-footer" style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-cancel-dialog" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">
                        ${this.escapeHtml(cancelText)}
                    </button>
                    <button class="btn-confirm-dialog" style="background: ${isDestructive ? '#ef4444' : '#2563eb'}; color: white; border: none; padding: 8px 22px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">
                        ${this.escapeHtml(confirmText)}
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            let finished = false;
            const finish = (result) => {
                if (finished) return;
                finished = true;
                document.removeEventListener('keydown', onKey);
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                resolve(result);
            };

            const confirmBtn = dialog.querySelector('.btn-confirm-dialog');
            const cancelBtn = dialog.querySelector('.btn-cancel-dialog');
            const closeBtn = dialog.querySelector('.btn-close-dialog');

            confirmBtn.focus();
            confirmBtn.addEventListener('click', () => finish(true));
            cancelBtn.addEventListener('click', () => finish(false));
            closeBtn.addEventListener('click', () => finish(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) finish(false);
            });

            const onKey = (e) => {
                if (e.key === 'Escape') finish(false);
            };
            document.addEventListener('keydown', onKey);
        });
    }

    static prompt(optionsOrMessage, defaultValue = '', placeholder = '') {
        let options;
        if (typeof optionsOrMessage === 'string') {
            options = {
                title: t('dlg_input_title'),
                message: optionsOrMessage,
                defaultValue,
                placeholder
            };
        } else {
            options = optionsOrMessage || {};
        }

        const title = options.title || t('dlg_input_title');
        const content = options.message || '';
        const defVal = options.defaultValue || '';
        const ph = options.placeholder || '';
        const icon = options.icon || '✏️';
        const confirmText = options.confirmText || t('save');
        const cancelText = options.cancelText || t('cancel');

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '4000';

            const dialog = document.createElement('div');
            dialog.className = 'modal-dialog';
            dialog.style.maxWidth = '460px';
            dialog.style.borderRadius = '16px';
            dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
            dialog.style.background = '#ffffff';

            dialog.innerHTML = `
                <div class="modal-dialog-header" style="padding: 14px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                    <h2 style="display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: 700; color: #1e293b;">
                        <span>${icon}</span>
                        <span>${this.escapeHtml(title)}</span>
                    </h2>
                    <button class="icon-btn btn-close-dialog" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 2px 6px; border-radius: 4px;">✕</button>
                </div>
                <div class="modal-dialog-body" style="padding: 20px 22px; display: flex; flex-direction: column; gap: 10px;">
                    ${content ? `<div style="color: #334155; font-size: 0.95rem; line-height: 1.5;">${this.escapeHtml(content)}</div>` : ''}
                    <input type="text" id="dialog-prompt-input" value="${this.escapeHtml(defVal)}" placeholder="${this.escapeHtml(ph)}" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border: 1.5px solid #2563eb; border-radius: 10px; font-size: 0.95rem; outline: none; margin-top: 4px;">
                </div>
                <div class="modal-dialog-footer" style="padding: 12px 20px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-cancel-dialog" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">
                        ${this.escapeHtml(cancelText)}
                    </button>
                    <button class="btn-confirm-dialog" style="background: #2563eb; color: white; border: none; padding: 8px 22px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">
                        ${this.escapeHtml(confirmText)}
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const input = dialog.querySelector('#dialog-prompt-input');
            input.focus();
            input.select();

            let finished = false;
            const finish = (val) => {
                if (finished) return;
                finished = true;
                document.removeEventListener('keydown', onKey);
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                resolve(val);
            };

            const confirmBtn = dialog.querySelector('.btn-confirm-dialog');
            const cancelBtn = dialog.querySelector('.btn-cancel-dialog');
            const closeBtn = dialog.querySelector('.btn-close-dialog');

            confirmBtn.addEventListener('click', () => finish(input.value));
            cancelBtn.addEventListener('click', () => finish(null));
            closeBtn.addEventListener('click', () => finish(null));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) finish(null);
            });

            const onKey = (e) => {
                if (e.key === 'Enter') finish(input.value);
                if (e.key === 'Escape') finish(null);
            };
            document.addEventListener('keydown', onKey);
        });
    }

    static parseDate(dateStr) {
        if (!dateStr) return new Date();
        if (dateStr instanceof Date) return dateStr;
        let s = String(dateStr).trim();
        if (!s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) {
            s = s.replace(' ', 'T') + 'Z';
        }
        return new Date(s);
    }

    static formatDateTime(dateStr) {
        if (!dateStr) return '';
        const d = this.parseDate(dateStr);
        return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleString('ru-RU');
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
}

// Make globally available
window.DialogService = DialogService;

export default DialogService;
