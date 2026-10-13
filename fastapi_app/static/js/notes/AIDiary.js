import NotesAPI from './api.js';
import NoteStorageService from './NoteStorageService.js';
import { showToast } from './ToastService.js';
import { t } from '../i18n.js';
import AppState from './AppState.js';
import Lifecycle from './Lifecycle.js';
import AIDiaryView from './AIDiaryView.js';

const kinds = new Set(['ai_request', 'ai_proposed', 'ai_full_review', 'question_answer']);

class AIDiary {
    static session = null;

    static init() {
        NotesAPI.captureAI = async (endpoint, body, operation) => {
            const note = await NoteStorageService.saveCurrentNote();
            const request = body instanceof FormData
                ? [...body.entries()].map(([key, value]) => `${key}: ${typeof value === 'string' ? value : value.name}`).join('\n')
                : typeof body === 'string' ? body : JSON.stringify(body, null, 2);
            let answer = '', status = 'completed';
            const startedMs = Date.now();
            try {
                const result = await operation();
                const value = result instanceof Response ? await result.clone().json() : result;
                answer = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                return result;
            } catch (error) {
                status = error.name === 'AbortError' ? 'cancelled' : 'failed';
                answer = [error.partialText, error.message].filter(Boolean).join('\n\n');
                throw error;
            } finally {
                try {await NotesAPI.addActivity(note.id, {kind:'ai_request', request:request || '',
                    text:answer || '', status, operation:endpoint,
                    started_at:new Date(startedMs).toISOString(), duration_ms:Math.max(0, Date.now() - startedMs)});}
                catch (error) {showToast(t('ai_diary_save_failed'), 'error'); console.error(error);}
            }
        };
    }

    static async open() {
        this.session?.dispose();
        const session = this.session = new Lifecycle();
        const note = AppState.currentNote, epoch = AppState.documentEpoch;
        const previous = document.activeElement;
        const view = new AIDiaryView(note.title);
        session.own(() => {view.overlay.remove(); if (previous?.isConnected) previous.focus();});
        session.on(document, 'noteOpened', () => session.dispose());
        const close = () => session.dispose();
        session.on(view.closeButton, 'click', close);
        session.on(view.overlay, 'click', event => {if (event.target === view.overlay) close();});
        session.on(view.overlay, 'keydown', event => {
            if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); close();}
            if (event.key === 'Tab') {
                const controls = [...view.overlay.querySelectorAll('button, input, select, summary')]
                    .filter(el => !el.disabled && el.getClientRects().length);
                const first = controls[0], last = controls.at(-1);
                if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
                else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
            }
        });
        session.on(view.search, 'input', () => view.render());
        session.on(view.filter, 'change', () => view.render());
        const refresh = async () => {
            view.setLoading();
            try {
                const events = note.id ? await NotesAPI.getActivity(note.id) : [];
                if (session.disposed || epoch !== AppState.documentEpoch) return;
                view.setEvents(events.filter(event => kinds.has(event.kind) && event.note_id === note.id));
            } catch {
                if (!session.disposed) view.setError();
            }
        };
        session.on(view.refreshButton, 'click', refresh);
        session.on(view.retryButton, 'click', refresh);
        document.body.appendChild(view.overlay);
        view.closeButton.focus();
        await refresh();
    }
}

export default AIDiary;
