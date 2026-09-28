import NotesAPI from './api.js';
import NoteStorageService from './NoteStorageService.js';
import { showToast } from './ToastService.js';
import { t } from '../i18n.js';

const kinds = new Set(['ai_request', 'ai_proposed', 'ai_full_review', 'question_answer']);

class AIDiary {
    static init() {
        NotesAPI.captureAI = async (endpoint, body, operation) => {
            const note = await NoteStorageService.saveCurrentNote();
            const request = body instanceof FormData
                ? [...body.entries()].map(([key, value]) => `${key}: ${typeof value === 'string' ? value : value.name}`).join('\n')
                : typeof body === 'string' ? body : JSON.stringify(body, null, 2);
            let answer = '', status = 'completed';
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
                    text:answer || '', status, operation:endpoint});}
                catch (error) {showToast(t('ai_diary_save_failed'), 'error'); console.error(error);}
            }
        };
    }

    static async open() {
        try {
            const events = (await NotesAPI.getAllActivity()).filter(event => kinds.has(event.kind));
            document.querySelector('.ai-diary-overlay')?.remove();
            const previous = document.activeElement;
            const overlay = document.createElement('div');
            overlay.className = 'ai-diary-overlay';
            overlay.innerHTML = '<section class="ai-diary-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-diary-title">'
                + '<header><h2 id="ai-diary-title"></h2><button type="button" class="ai-diary-close">×</button></header>'
                + '<div class="ai-diary-entries"></div></section>';
            overlay.querySelector('h2').textContent = t('ai_diary_title');
            const closeButton = overlay.querySelector('button');
            closeButton.setAttribute('aria-label', t('close'));
            const close = () => {overlay.remove(); previous?.focus();};
            closeButton.addEventListener('click', close);
            overlay.addEventListener('click', event => {if (event.target === overlay) close();});
            overlay.addEventListener('keydown', event => {
                if (event.key === 'Escape') close();
                if (event.key === 'Tab') {event.preventDefault(); closeButton.focus();}
            });
            const entries = overlay.querySelector('.ai-diary-entries');
            const locale = {ru:'ru-RU', en:'en-US', kz:'kk-KZ'}[document.documentElement.lang] || 'ru-RU';
            for (const event of [...events].reverse()) {
                const data = event.data || {};
                const article = document.createElement('article');
                const when = document.createElement('time');
                when.textContent = new Date(event.created_at).toLocaleString(locale);
                article.appendChild(when);
                const heading = document.createElement('h3');
                heading.textContent = [event.note_title, data.step ? `${t('ai_diary_step')} ${data.step}` : ''].filter(Boolean).join(' · ') || t('ai_diary_request');
                article.appendChild(heading);
                const add = (label, text) => {
                    if (!text) return;
                    const title = document.createElement('strong'), body = document.createElement('pre');
                    title.textContent = label; body.textContent = text;
                    article.append(title, body);
                };
                add(t('ai_diary_request'), [data.request, data.question].filter(Boolean).join('\n\n'));
                add(t('ai_diary_answer'), data.answer || data.text || '');
                if (data.status) {
                    const status = document.createElement('p');
                    status.textContent = t(`ai_diary_${data.status}`);
                    article.appendChild(status);
                }
                entries.appendChild(article);
            }
            if (!events.length) entries.textContent = t('ai_diary_empty');
            document.body.appendChild(overlay);
            closeButton.focus();
        } catch (error) {showToast(error.message, 'error');}
    }
}

export default AIDiary;
