import AppState from './AppState.js';
import NoteStorageService from './NoteStorageService.js';
import NotesAPI from './api.js';
import NoteLocation from './NoteLocation.js';
import {t} from '../i18n.js';

class LibraryPublisher {
    static init() {
        const button = document.getElementById('btn-library-publish');
        button?.addEventListener('click', async () => {
            button.disabled = true;
            try {
                const note = await NoteStorageService.saveCurrentNote();
                if (!note.id || !note.title.trim() || !note.blocks?.length) throw new Error(t('library_need_content'));
                const state = await NotesAPI.request(`/author/deployment/${note.id}`);
                this.open(note, state);
            } catch (error) { window.alert(error.message); }
            finally { button.disabled = false; }
        });
    }

    static open(note, initialState) {
        let state = initialState;
        const dialog = document.createElement('dialog');
        dialog.className = 'library-publisher';
        const heading = document.createElement('h2');
        heading.textContent = note.title;
        const hint = document.createElement('p');
        hint.textContent = t('library_deploy_hint');
        const status = document.createElement('p');
        status.id = 'library-publish-status';
        status.setAttribute('role', 'status');
        const links = document.createElement('div');
        const publish = document.createElement('button');
        publish.id = 'library-publish';
        const remove = document.createElement('button');
        remove.id = 'library-unpublish';
        remove.textContent = t('library_unpublish');
        const refresh = () => {
            publish.textContent = t(state.included ? 'library_update' : 'library_publish');
            remove.hidden = !state.included;
            links.replaceChildren();
            if (!state.included) return;
            for (const language of state.languages) {
                const link = document.createElement('a');
                const url = new URL(state.url, location.origin);
                url.searchParams.set('lang', language);
                link.href = url.toString();
                link.textContent = `${t('library_open')} · ${language.toUpperCase()}`;
                link.target = '_blank';
                link.rel = 'noopener';
                links.append(link, document.createTextNode(' '));
            }
        };
        const run = async method => {
            publish.disabled = remove.disabled = true;
            try {
                if (AppState.currentNote !== note || AppState.isDirty) throw new Error(t('library_note_changed'));
                state = await NotesAPI.request(`/author/deployment/${note.id}`, method,
                    method === 'PUT' ? {revision: note.revision} : null);
                AppState.setViewMetadata({revision: state.revision, library_slug: state.included ? state.id : null});
                NoteLocation.remember(note.id, state.included ? state.id : null);
                refresh();
                status.textContent = t('library_deploy_saved');
            } catch (error) { status.textContent = error.message; }
            finally { publish.disabled = remove.disabled = false; }
        };
        publish.addEventListener('click', () => run('PUT'));
        remove.addEventListener('click', () => run('DELETE'));
        const close = document.createElement('button');
        close.textContent = t('library_close');
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => dialog.remove());
        const actions = document.createElement('div');
        actions.className = 'library-actions';
        actions.append(publish, remove, close);
        refresh();
        dialog.append(heading, hint, links, status, actions);
        document.body.append(dialog);
        dialog.showModal();
    }
}
export default LibraryPublisher;
