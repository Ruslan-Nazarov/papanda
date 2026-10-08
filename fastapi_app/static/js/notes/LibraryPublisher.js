import AppState from './AppState.js';
import NoteStorageService from './NoteStorageService.js';
import NotesAPI from './api.js';
import { t } from '../i18n.js';

class LibraryPublisher {
    static init() {
        const button = document.getElementById('btn-library-publish');
        button?.addEventListener('click', async () => {
            button.disabled = true;
            try {
                const note = await NoteStorageService.saveCurrentNote();
                if (AppState.currentNote !== note) throw new Error(t('library_note_changed'));
                if (!note.id || !note.title.trim() || !note.blocks?.length) throw new Error(t('library_need_content'));
                const state = await NotesAPI.request(`/author/library/${note.id}`);
                this.open(note, state);
            } catch (error) {
                window.alert(error.message);
            } finally { button.disabled = false; }
        });
    }

    static open(note, state) {
        const id = note.id;
        const revision = note.revision;
        const dialog = document.createElement('dialog');
        dialog.className = 'library-publisher';
        const heading = document.createElement('h2');
        heading.textContent = note.title;
        const hint = document.createElement('p');
        hint.textContent = t(state.local_only ? 'library_local_hint' : 'library_snapshot_hint');
        const label = document.createElement('label');
        label.textContent = t('library_description');
        const description = document.createElement('textarea');
        description.id = 'library-description';
        description.maxLength = 1000;
        description.rows = 3;
        description.value = state.description;
        label.append(description);
        const status = document.createElement('p');
        status.id = 'library-publish-status';
        status.setAttribute('role', 'status');
        const preview = document.createElement('a');
        preview.id = 'library-preview';
        preview.textContent = t('library_preview');
        preview.target = '_blank';
        preview.rel = 'noopener';
        const refreshPreview = () => {
            preview.href = `/author/library/${id}/preview?` + new URLSearchParams({
                revision: String(revision), description: description.value});
        };
        refreshPreview();
        description.addEventListener('input', refreshPreview);
        const publish = document.createElement('button');
        publish.id = 'library-publish';
        publish.textContent = t(state.published ? 'library_update' : 'library_publish');
        const remove = document.createElement('button');
        remove.id = 'library-unpublish';
        remove.textContent = t('library_unpublish');
        remove.hidden = !state.published;
        const link = document.createElement('a');
        link.id = 'library-public-link';
        link.textContent = t('library_open');
        link.href = state.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.hidden = !state.published;
        const close = document.createElement('button');
        close.textContent = t('library_close');
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => dialog.remove());
        const run = async (method) => {
            publish.disabled = remove.disabled = true;
            status.textContent = t('library_sending');
            try {
                if (method === 'PUT' && (AppState.currentNote !== note || AppState.isDirty
                        || note.revision !== revision)) throw new Error(t('library_note_changed'));
                const result = await NotesAPI.request(`/author/library/${id}`, method,
                    method === 'PUT' ? {revision, description: description.value} : null);
                const published = method === 'PUT';
                link.hidden = remove.hidden = !published;
                if (published) link.href = result.url;
                publish.textContent = t(published ? 'library_update' : 'library_publish');
                status.textContent = t(published ? 'library_published' : 'library_removed');
            } catch (error) { status.textContent = error.message; }
            finally { publish.disabled = remove.disabled = false; }
        };
        publish.addEventListener('click', () => run('PUT'));
        remove.addEventListener('click', () => run('DELETE'));
        const actions = document.createElement('div');
        actions.className = 'library-actions';
        actions.append(preview, publish, remove, link, close);
        dialog.append(heading, hint, label, status, actions);
        document.body.append(dialog);
        dialog.showModal();
    }
}

export default LibraryPublisher;
