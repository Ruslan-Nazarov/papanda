import AppState from './AppState.js';
import NotesAPI from './api.js';
import NoteStorageService from './NoteStorageService.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';
import AIDiary from './AIDiary.js';
import { showToast } from './ToastService.js';
import { t } from '../i18n.js';

class MaterialsPanel {
    static init() {
        this.button = document.getElementById('btn-note-materials');
        this.panel = document.getElementById('note-materials-panel');
        if (!this.button || !this.panel) return;
        this.button.addEventListener('click', event => {
            event.stopPropagation();
            const opening = this.panel.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
            if (opening) {
                this.render();
                this.panel.classList.remove('hidden');
                this.position();
                this.loadVersions();
            }
            this.button.setAttribute('aria-expanded', String(opening));
        });
        document.addEventListener('click', event => {
            if (!event.target.closest('.materials-wrapper')) this.close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !this.panel.classList.contains('hidden')) this.close();
        });
        window.addEventListener('resize', () => {
            if (!this.panel.classList.contains('hidden')) this.position();
        });
        document.addEventListener('noteOpened', () => {
            this.uploading?.abort();
            this.uploading = null;
            this.close();
            this.versions = [];
            this.versionsNoteId = null;
            this.updateCount();
            this.loadVersions();
        });
        document.addEventListener('stateDirty', () => {
            this.updateCount();
            if (!this.panel.classList.contains('hidden')) this.render();
        });
        document.addEventListener('noteSaved', () => {
            this.updateCount();
            if (!this.panel.classList.contains('hidden')) this.loadVersions();
        });
        document.addEventListener('materialsChanged', () => this.loadVersions());
        this.updateCount();
        this.loadVersions();
    }

    static anchor() {
        return AppState.currentNote?.blocks?.find(block => block.role === 'anchor');
    }

    static documents() {
        return this.anchor()?.attached_conspects || [];
    }

    static included() {
        return this.anchor()?.included_conspects || [];
    }

    static updateCount() {
        const badge = this.button?.querySelector('.materials-count');
        if (!badge) return;
        const count = this.documents().length + this.included().length
            + (this.versionsNoteId === AppState.currentNote?.id ? (this.versions || []).length : 0);
        badge.hidden = !count;
        badge.textContent = String(count);
    }

    static close() {
        this.panel?.classList.add('hidden');
        this.button?.setAttribute('aria-expanded', 'false');
    }

    static position() {
        const panel = this.panel;
        if (!panel) return;
        panel.style.position = '';
        panel.style.left = '';
        panel.style.right = '';
        panel.style.top = '';
        panel.style.width = '';
        const wrapper = this.button.getBoundingClientRect();
        const width = Math.min(440, window.innerWidth - 24);
        if (wrapper.right >= width + 12) return;
        if (wrapper.left + width <= window.innerWidth - 12) {
            panel.style.left = '0';
            panel.style.right = 'auto';
            return;
        }
        panel.style.position = 'fixed';
        panel.style.left = '12px';
        panel.style.right = '12px';
        panel.style.top = `${wrapper.bottom + 6}px`;
        panel.style.width = 'auto';
    }

    static node(tag, className, content) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content != null) element.textContent = content;
        return element;
    }

    static async loadVersions() {
        const noteId = AppState.currentNote?.id;
        if (!noteId) return;
        try {
            const versions = await NotesAPI.getMaterials(noteId);
            if (AppState.currentNote?.id !== noteId) return;
            this.versionsNoteId = noteId;
            this.versions = versions;
            // A background history refresh must not replace file inputs or an
            // open note picker while the reader is interacting with them.
            this.renderVersions();
            this.updateCount();
        } catch (error) {
            console.error(error);
            showToast(t('version_material_error'), 'error');
        }
    }

    static render() {
        if (!this.panel) return;
        const panel = this.panel;
        panel.replaceChildren();
        const header = this.node('div', 'materials-header');
        header.append(this.node('strong', '', t('materials_title')),
            this.node('span', 'materials-total', String(this.documents().length + this.included().length
                + (this.versions || []).length)));
        panel.append(header);

        const documentsSection = this.node('section', 'materials-section');
        const documentsTitle = this.node('h3', '', t('materials_documents'));
        documentsTitle.append(this.node('span', 'materials-section-count', String(this.documents().length)));
        documentsSection.append(documentsTitle);
        const input = this.node('input');
        input.type = 'file';
        input.accept = '.docx,.txt';
        input.multiple = true;
        input.hidden = true;
        input.addEventListener('change', () => this.attach([...input.files]));
        const add = this.node('button', 'materials-add', `＋ ${t('materials_add')}`);
        add.type = 'button';
        add.disabled = Boolean(this.uploading) || this.documents().length >= 20;
        add.addEventListener('click', () => input.click());
        documentsSection.append(add, input, this.node('p', 'materials-limit', t('materials_limit')));
        if (!this.documents().length) documentsSection.append(this.node('p', 'materials-empty', t('materials_empty_docs')));
        for (const documentData of this.documents()) {
            const card = this.node('div', 'materials-card');
            const row = this.node('div', 'materials-card-row');
            const name = this.node('strong', 'materials-name', documentData.name);
            name.title = documentData.name;
            const remove = this.node('button', 'materials-remove', '×');
            remove.type = 'button';
            remove.title = t('materials_remove');
            remove.setAttribute('aria-label', `${t('materials_remove')}: ${documentData.name}`);
            remove.addEventListener('click', () => this.remove(documentData.id));
            row.append(this.node('span', 'materials-file-icon', '📄'), name, remove);
            const preview = this.node('details', 'materials-preview');
            preview.append(this.node('summary', '', t('materials_preview')),
                this.node('pre', '', documentData.text));
            card.append(row, preview);
            documentsSection.append(card);
        }
        panel.append(documentsSection);

        const generatedSection = this.node('section', 'materials-section materials-generated');
        const generatedTitle = this.node('h3', '', t('materials_generated'));
        generatedTitle.append(this.node('span', 'materials-section-count', String(this.included().length)));
        generatedSection.append(generatedTitle);
        const addApp = this.node('button', 'materials-add-app', `＋ ${t('materials_add_app')}`);
        addApp.type = 'button';
        addApp.disabled = this.included().length >= 20;
        addApp.addEventListener('click', () => this.showPicker(generatedSection, addApp));
        generatedSection.append(addApp);
        if (!this.included().length) generatedSection.append(this.node('p', 'materials-empty', t('materials_empty_generated')));
        for (const included of this.included()) {
            const card = this.node('div', 'materials-card materials-app-card');
            const open = this.node('button', 'materials-open-app', included.title);
            open.type = 'button';
            open.title = t('materials_open');
            open.addEventListener('click', async () => {
                this.close();
                try { await NoteStorageService.openNote(included.note_id); }
                catch (error) { showToast(error.message || t('note_load_failed'), 'error'); }
            });
            const remove = this.node('button', 'materials-remove', '×');
            remove.type = 'button';
            remove.title = t('materials_remove_app');
            remove.setAttribute('aria-label', `${t('materials_remove_app')}: ${included.title}`);
            remove.addEventListener('click', () => this.removeIncluded(included.note_id));
            card.append(this.node('span', 'materials-file-icon', '📓'), open, remove);
            generatedSection.append(card);
        }
        const history = this.node('button', 'materials-history', `↗ ${t('materials_history')}`);
        history.type = 'button';
        history.addEventListener('click', () => {this.close(); AIDiary.open();});
        generatedSection.append(history);
        panel.append(generatedSection);
        this.renderVersions();
        this.updateCount();
    }

    static renderVersions() {
        if (!this.panel) return;
        const versionsSection = this.node('section', 'materials-section materials-versions');
        const versionsTitle = this.node('h3', '', t('materials_versions'));
        versionsTitle.append(this.node('span', 'materials-section-count', String(this.versions?.length || 0)));
        versionsSection.append(versionsTitle);
        for (const version of this.versions || []) {
            const card = this.node('div', 'materials-card materials-app-card');
            const link = this.node('a', 'materials-open-app', `🔒 ${version.title}`);
            link.href = `/v/${version.material_token}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.title = t('version_copy_material_link');
            const copy = this.node('button', 'materials-copy-link', t('version_copy_material_link'));
            copy.type = 'button';
            copy.addEventListener('click', async () => {
                const url = new URL(link.href, location.origin).href;
                try { await navigator.clipboard.writeText(url); }
                catch {
                    const input = this.node('textarea');
                    input.value = url;
                    document.body.append(input);
                    input.select();
                    document.execCommand('copy');
                    input.remove();
                }
                showToast(t('share_copied'));
            });
            card.append(link, copy);
            versionsSection.append(card);
        }
        const previous = this.panel.querySelector('.materials-versions');
        if (previous) previous.replaceWith(versionsSection);
        else this.panel.append(versionsSection);
        const total = this.panel.querySelector('.materials-total');
        if (total) total.textContent = String(this.documents().length + this.included().length
            + (this.versions || []).length);
    }

    static async attach(files) {
        if (!files.length || this.uploading) return;
        if (files.length + this.documents().length > 20 || files.some(file =>
            file.size > 2 * 1024 * 1024 || !/\.(docx|txt)$/i.test(file.name))) {
            showToast(t('materials_limit'), 'error');
            return;
        }
        const epoch = AppState.documentEpoch;
        const controller = new AbortController();
        this.uploading = controller;
        this.render();
        try {
            const extracted = [];
            for (const file of files) {
                const data = await NotesAPI.extractRequestDocument(file, controller.signal);
                if (epoch !== AppState.documentEpoch) return;
                extracted.push({id: crypto.randomUUID(), ...data});
            }
            let anchor = this.anchor();
            if (!anchor) {
                const step = ALGORITHM_STEPS.find(item => item.role === 'anchor');
                const id = crypto.randomUUID();
                AppState.addBlock({id, role: 'anchor', side: 'left', title: step?.title || '',
                    html: '', status: 'none', attached_conspects: extracted});
            } else AppState.updateBlock(anchor.id, {attached_conspects: [...this.documents(), ...extracted]});
        } catch (error) {
            if (!controller.signal.aborted && epoch === AppState.documentEpoch)
                showToast(error.message || t('request_document_error'), 'error');
        } finally {
            if (this.uploading === controller) this.uploading = null;
            if (epoch === AppState.documentEpoch) this.render();
        }
    }

    static remove(id) {
        const anchor = this.anchor();
        if (!anchor) return;
        AppState.updateBlock(anchor.id, {attached_conspects: this.documents().filter(item => item.id !== id)});
    }

    static async showPicker(section, button) {
        const existing = section.querySelector('.materials-picker');
        if (existing) { existing.remove(); return; }
        const epoch = AppState.documentEpoch;
        const picker = this.node('div', 'materials-picker');
        const search = this.node('input', 'materials-picker-search');
        search.type = 'search';
        search.placeholder = t('materials_find_app');
        search.setAttribute('aria-label', t('materials_find_app'));
        const list = this.node('div', 'materials-picker-list', t('loading'));
        picker.append(search, list);
        button.insertAdjacentElement('afterend', picker);
        search.focus();
        try {
            const notes = await NotesAPI.getNotes();
            if (epoch !== AppState.documentEpoch || !picker.isConnected) return;
            const available = notes.filter(note => note.id !== AppState.currentNote.id
                && !this.included().some(item => item.note_id === note.id));
            const renderChoices = () => {
                list.replaceChildren();
                const query = search.value.trim().toLocaleLowerCase();
                const matches = available.filter(note => (note.title || '').toLocaleLowerCase().includes(query));
                if (!matches.length) list.append(this.node('p', 'materials-empty', t('materials_no_app')));
                for (const note of matches) {
                    const choice = this.node('button', 'materials-picker-choice', note.title || t('untitled'));
                    choice.type = 'button';
                    choice.addEventListener('click', () => this.include(note));
                    list.append(choice);
                }
            };
            search.addEventListener('input', renderChoices);
            renderChoices();
        } catch (error) {
            if (epoch === AppState.documentEpoch && picker.isConnected)
                list.textContent = error.message || t('note_load_failed');
        }
    }

    static include(note) {
        if (!Number.isInteger(note.id) || this.included().some(item => item.note_id === note.id)
            || note.id === AppState.currentNote.id || this.included().length >= 20) return;
        const entry = {note_id: note.id, title: (note.title || t('untitled')).slice(0, 255)};
        const anchor = this.anchor();
        if (!anchor) {
            const step = ALGORITHM_STEPS.find(item => item.role === 'anchor');
            AppState.addBlock({id: crypto.randomUUID(), role: 'anchor', side: 'left', title: step?.title || '',
                html: '', status: 'none', included_conspects: [entry]});
        } else AppState.updateBlock(anchor.id, {included_conspects: [...this.included(), entry]});
    }

    static removeIncluded(noteId) {
        const anchor = this.anchor();
        if (!anchor) return;
        AppState.updateBlock(anchor.id, {included_conspects: this.included().filter(item => item.note_id !== noteId)});
    }
}

export default MaterialsPanel;
