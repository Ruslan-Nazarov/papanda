import NotesAPI from './api.js';
import AppState from './AppState.js';

import { t } from '../i18n.js';
class DialogService {
    static async selectInternalLinks(context = {}) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '4000';
            const dialog = document.createElement('div');
            dialog.className = 'modal-dialog internal-links-dialog';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-label', t('dlg_internal_link'));
            dialog.innerHTML = `
                <header class="internal-links-header">
                    <div><h2>🔗 ${t('dlg_internal_link')}</h2><p>${t('picker_multi_hint')}</p></div>
                    <button type="button" class="internal-links-close" aria-label="${t('close')}">✕</button>
                </header>
                <div class="internal-links-body">
                    <input type="search" class="internal-links-search" placeholder="${t('search_input_ph')}" aria-label="${t('search_input_ph')}">
                    <div class="internal-links-list" aria-live="polite">${t('loading')}</div>
                </div>
                <footer class="internal-links-footer">
                    <div class="internal-links-selected" aria-live="polite"></div>
                    <div class="internal-links-error" role="status"></div>
                    <div class="internal-links-actions">
                        ${context.isEditing ? `<button type="button" class="internal-links-delete" title="${t('ed_unlink_hint')}">${t('ed_unlink')}</button>` : ''}
                        <button type="button" class="internal-links-cancel">${t('cancel')}</button>
                        <button type="button" class="internal-links-confirm" disabled>${t('insert_word')}</button>
                    </div>
                </footer>`;
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            const list = dialog.querySelector('.internal-links-list');
            const search = dialog.querySelector('.internal-links-search');
            const selected = dialog.querySelector('.internal-links-selected');
            const notice = dialog.querySelector('.internal-links-error');
            const confirm = dialog.querySelector('.internal-links-confirm');
            const targets = new Map((context.existingLinks || []).filter(item => item?.url?.startsWith('internal://note/'))
                .map(item => [item.url, item]));
            let done = false;
            const finish = value => {
                if (done) return;
                done = true;
                document.removeEventListener('keydown', onKey);
                overlay.remove();
                resolve(value);
            };
            const onKey = event => { if (event.key === 'Escape') finish(null); };
            document.addEventListener('keydown', onKey);
            dialog.querySelector('.internal-links-close').addEventListener('click', () => finish(null));
            dialog.querySelector('.internal-links-cancel').addEventListener('click', () => finish(null));
            dialog.querySelector('.internal-links-delete')?.addEventListener('click', () => finish([]));
            overlay.addEventListener('click', event => { if (event.target === overlay) finish(null); });
            confirm.addEventListener('click', () => finish([...targets.values()]));

            const refresh = () => {
                notice.textContent = '';
                selected.replaceChildren();
                if (!targets.size) selected.textContent = t('dlg_nothing_selected');
                targets.forEach((target, url) => {
                    const chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'internal-links-chip';
                    chip.textContent = `${target.label || target.text} ×`;
                    chip.title = t('tt_delete');
                    chip.addEventListener('click', () => { targets.delete(url); refresh(); });
                    selected.appendChild(chip);
                });
                list.querySelectorAll('[data-link-url]').forEach(button => {
                    const active = targets.has(button.dataset.linkUrl);
                    button.classList.toggle('is-selected', active);
                    button.setAttribute('aria-pressed', String(active));
                });
                confirm.disabled = !targets.size;
            };
            const addTarget = (url, text, label, displayLabel = label) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'internal-links-target';
                button.dataset.linkUrl = url;
                button.textContent = displayLabel;
                button.addEventListener('click', () => {
                    if (targets.has(url)) targets.delete(url);
                    else if (targets.size < 24) targets.set(url, {url, text, label});
                    else { notice.textContent = t('picker_limit'); return; }
                    refresh();
                });
                return button;
            };
            search.addEventListener('input', () => {
                const query = search.value.trim().toLocaleLowerCase();
                list.querySelectorAll('.internal-links-note').forEach(note => {
                    const noteMatches = note.dataset.search.includes(query);
                    let blockMatches = false;
                    note.querySelectorAll('.internal-links-block').forEach(block => {
                        const matches = block.dataset.search.includes(query);
                        block.hidden = !!query && !noteMatches && !matches;
                        blockMatches ||= matches;
                    });
                    note.hidden = !!query && !noteMatches && !blockMatches;
                    if (blockMatches && !noteMatches) note.querySelector('.internal-links-blocks').hidden = false;
                });
            });
            const loadNotes = async () => {
                try {
                    const notes = await NotesAPI.getNotes();
                    if (done) return;
                    list.replaceChildren();
                    if (!notes.length) list.textContent = t('picker_no_notes');
                    notes.forEach(note => {
                        const card = document.createElement('section');
                        card.className = 'internal-links-note';
                        card.dataset.search = (note.title || t('untitled')).toLocaleLowerCase();
                        const row = document.createElement('div');
                        row.className = 'internal-links-note-row';
                        const title = document.createElement('span');
                        title.className = 'internal-links-note-title';
                        title.textContent = `📓 ${note.title || t('untitled')}`;
                        const choose = addTarget(`internal://note/${note.id}`, note.title || t('untitled'), t('dlg_select'));
                        const expand = document.createElement('button');
                        expand.type = 'button';
                        expand.className = 'internal-links-expand';
                        expand.textContent = `${t('picker_blocks')} ▾`;
                        const blocksArea = document.createElement('div');
                        blocksArea.className = 'internal-links-blocks';
                        blocksArea.hidden = true;
                        row.append(title, choose, expand);
                        card.append(row, blocksArea);
                        list.appendChild(card);
                        expand.addEventListener('click', async () => {
                            if (blocksArea.dataset.loaded) {
                                blocksArea.hidden = !blocksArea.hidden;
                                expand.setAttribute('aria-expanded', String(!blocksArea.hidden));
                                return;
                            }
                            expand.disabled = true;
                            try {
                                const full = context.noteId != null && String(note.id) === String(context.noteId)
                                    ? AppState.currentNote : await NotesAPI.getNote(note.id);
                                if (done) return;
                                const stored = (full?.content_json || full?.blocks || []).filter(block => !block.isDraft);
                                const ordered = [...stored.filter(block => block.role !== 'anchor'),
                                    ...stored.filter(block => block.role === 'anchor')]
                                    .filter(block => block.role !== 'section');
                                ordered.forEach((block, index) => {
                                    if (!block.title) return;
                                    const label = `${index + 1}. ${block.title}`;
                                    const button = addTarget(`internal://note/${note.id}/block/${block.id}`, block.title,
                                        `${note.title || t('untitled')} → ${label}`, label);
                                    button.classList.add('internal-links-block');
                                    if (context.noteId != null && context.blockId != null
                                        && String(note.id) === String(context.noteId)
                                        && String(block.id) === String(context.blockId)) {
                                        button.classList.add('is-current');
                                        button.setAttribute('aria-current', 'location');
                                        const dot = document.createElement('span');
                                        dot.className = 'internal-links-current-dot';
                                        dot.title = t('picker_you_are_here');
                                        dot.setAttribute('role', 'img');
                                        dot.setAttribute('aria-label', t('picker_you_are_here'));
                                        button.appendChild(dot);
                                    }
                                    button.dataset.search = `${note.title || t('untitled')} ${label}`.toLocaleLowerCase();
                                    blocksArea.appendChild(button);
                                });
                                if (!blocksArea.childElementCount) blocksArea.textContent = t('picker_no_blocks');
                                blocksArea.dataset.loaded = 'true';
                                blocksArea.hidden = false;
                                expand.setAttribute('aria-expanded', 'true');
                                refresh();
                                search.dispatchEvent(new document.defaultView.Event('input'));
                            } catch { blocksArea.textContent = t('picker_load_err'); blocksArea.hidden = false; }
                            finally { expand.disabled = false; }
                        });
                    });
                    refresh();
                } catch (error) { if (!done) list.textContent = `${t('picker_load_err')}: ${error.message}`; }
            };
            refresh();
            loadNotes();
            search.focus();
        });
    }

    static chooseInternalDestination(targets) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '4000';
            const dialog = document.createElement('div');
            dialog.className = 'modal-dialog internal-links-dialog internal-links-chooser';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.innerHTML = `<header class="internal-links-header"><h2>🔗 ${t('picker_choose_destination')}</h2><button type="button" class="internal-links-close" aria-label="${t('close')}">✕</button></header><div class="internal-links-choices"></div>`;
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            const onKey = event => { if (event.key === 'Escape') finish(null); };
            const finish = value => { document.removeEventListener('keydown', onKey); overlay.remove(); resolve(value); };
            document.addEventListener('keydown', onKey);
            dialog.querySelector('.internal-links-close').addEventListener('click', () => finish(null));
            overlay.addEventListener('click', event => { if (event.target === overlay) finish(null); });
            targets.forEach(target => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'internal-links-choice';
                button.textContent = target.label || target.text;
                button.addEventListener('click', () => finish(target.url));
                dialog.querySelector('.internal-links-choices').appendChild(button);
            });
            dialog.querySelector('.internal-links-choice')?.focus();
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

            (options.focusCancel ? cancelBtn : confirmBtn).focus();
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
        const deleteText = options.deleteText || '';

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
                    ${deleteText ? `<button class="btn-delete-dialog" style="margin-right: auto; background: #fff; color: #b91c1c; border: 1px solid #fecaca; padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">${this.escapeHtml(deleteText)}</button>` : ''}
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
            const deleteBtn = dialog.querySelector('.btn-delete-dialog');

            confirmBtn.addEventListener('click', () => finish(input.value));
            cancelBtn.addEventListener('click', () => finish(null));
            closeBtn.addEventListener('click', () => finish(null));
            deleteBtn?.addEventListener('click', () => finish(''));
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
