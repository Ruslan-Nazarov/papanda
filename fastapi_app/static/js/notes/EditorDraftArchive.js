import { t } from '../i18n.js';
import HtmlSafety from './HtmlSafety.js';
import NoteText from './NoteText.js';

// Modal-local changes are committed together with the replacement text.
export default class EditorDraftArchive {
    constructor(container, editor, drafts, session) {
        this.editor = editor;
        this.drafts = JSON.parse(JSON.stringify(drafts || []));
        this.initialIds = new Set(this.drafts.map(draft => draft.id));
        this.host = container.querySelector('.editor-draft-archive');
        this.modal = container.querySelector('.modal-editor-floating');
        this.button = container.querySelector('#btn-editor-rewrite');
        this.undo = container.querySelector('#btn-editor-rewrite-undo');
        this.notice = container.querySelector('.editor-rewrite-notice');
        this.lastArchivedId = null;
        session.on(this.button, 'click', () => this.archive());
        session.on(this.undo, 'click', () => this.undoArchive());
        editor.on('update', () => this.updateActions());
        this.render();
    }

    get hasNewDrafts() {
        return this.drafts.some(draft => !this.initialIds.has(draft.id));
    }

    updateActions() {
        this.button.disabled = this.editor.isEmpty || this.drafts.length >= 100;
        this.button.title = t(this.drafts.length >= 100 ? 'ed_archive_limit' : 'ed_rewrite_hint');
        this.undo.hidden = !this.lastArchivedId || !this.editor.isEmpty;
    }

    archive() {
        if (this.editor.isEmpty || this.drafts.length >= 100) return;
        const draft = {id: crypto.randomUUID(), html: this.editor.getHTML(),
            created_at: new Date().toISOString(), reason: ''};
        this.drafts.push(draft);
        this.lastArchivedId = draft.id;
        this.editor.commands.clearContent();
        this.notice.textContent = t('ed_rewrite_done');
        this.render();
        this.editor.commands.focus();
    }

    undoArchive() {
        if (!this.editor.isEmpty) return;
        const draft = this.drafts.find(item => item.id === this.lastArchivedId);
        if (!draft) return;
        this.drafts = this.drafts.filter(item => item.id !== draft.id);
        this.lastArchivedId = null;
        this.editor.commands.setContent(draft.html);
        this.notice.textContent = '';
        this.render();
        this.editor.commands.focus();
    }

    render() {
        const esc = HtmlSafety.escape;
        this.host.hidden = !this.drafts.length;
        if (this.drafts.length) this.modal.classList.add('has-draft-archive');
        if (this.drafts.length && window.innerWidth > 768 && !this.modal.classList.contains('expanded')) {
            const height = Math.min(660, window.innerHeight - 80);
            this.modal.style.top = Math.max(64, Math.min(parseFloat(this.modal.style.top), window.innerHeight - height - 16)) + 'px';
        }
        this.host.innerHTML = `<div class="draft-archive-heading"><span><i class="ph ph-archive" aria-hidden="true"></i> ${t('ed_archive_title')}</span><span class="draft-archive-count">${this.drafts.length}</span></div>
            <p class="draft-archive-caption">${t('ed_archive_hint')}</p>`;
        [...this.drafts].reverse().forEach((draft, index) => {
            const item = document.createElement('details');
            item.className = 'draft-archive-item';
            const date = new Date(draft.created_at);
            const stamp = Number.isNaN(date.getTime()) ? '' : date.toLocaleString(document.documentElement.lang || 'ru',
                {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
            const preview = NoteText.fromHtml(draft.html).replace(/\s+/g, ' ').trim();
            item.innerHTML = `<summary><span class="draft-archive-chevron" aria-hidden="true">›</span><span class="draft-archive-summary"><span class="draft-archive-meta"><strong>${t('ed_archive_variant')} ${this.drafts.length - index}</strong><time>${esc(stamp)}</time><span class="draft-archive-badge">${t('ed_archive_rejected')}</span></span><span class="draft-archive-preview">${esc(preview || t('ed_archive_media'))}</span></span></summary>
                <div class="draft-archive-content">${HtmlSafety.rich(draft.html)}</div>
                <label class="draft-archive-reason">${t('ed_archive_reason')}<textarea rows="2" maxlength="2000" placeholder="${t('ed_archive_reason_hint')}"></textarea></label>`;
            const reason = item.querySelector('textarea');
            reason.value = draft.reason || '';
            reason.addEventListener('input', () => { draft.reason = reason.value; });
            this.host.appendChild(item);
        });
        this.updateActions();
    }
}
